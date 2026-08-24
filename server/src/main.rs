use std::{
    collections::HashMap,
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, SaltString},
    Argon2, PasswordVerifier,
};
use axum::{
    body::Body,
    extract::{Multipart, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use rusqlite::{params_from_iter, types::{Value as SqlValue, ValueRef}, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};
use tokio::net::TcpListener;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::{error, info};
use uuid::Uuid;
use zip::{write::SimpleFileOptions, CompressionMethod, ZipArchive, ZipWriter};

const USUARIO_INICIAL: &str = "calificador";
const PASSWORD_HASH_INICIAL: &str = "$argon2id$v=19$m=65536,t=3,p=1$EnQ9ZasZWx+KiRdPL2Z50A$YMWgX8qL3kmdBp5X3pI8aZ3YZPLN7QO+quPX2CEdhaE";
const SESION_DURACION: Duration = Duration::from_secs(12 * 60 * 60);
const MAX_INTENTOS: u32 = 5;
const BLOQUEO: Duration = Duration::from_secs(30);

#[derive(Clone)]
struct AppState {
    db_path: PathBuf,
    backup_dir: PathBuf,
    sesiones: Arc<Mutex<HashMap<String, Instant>>>,
    intentos: Arc<Mutex<EstadoIntentos>>,
}

#[derive(Default)]
struct EstadoIntentos {
    fallidos: u32,
    bloqueado_hasta: Option<Instant>,
}

#[derive(Deserialize)]
struct LoginRequest { usuario: String, password: String }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LoginResponse {
    autenticado: bool,
    usuario: String,
    mensaje: String,
    token: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PasswordRequest {
    usuario: String,
    password_actual: String,
    password_nueva: String,
}

#[derive(Deserialize)]
struct SqlRequest {
    query: String,
    #[serde(default)]
    params: Vec<Value>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExecuteResponse {
    rows_affected: usize,
    last_insert_id: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DatabaseStatus {
    name: String,
    path: String,
    exists: bool,
    size_bytes: u64,
    modified_unix: Option<u64>,
}

#[derive(Serialize, Deserialize)]
struct BackupManifest {
    format: String,
    format_version: u32,
    application: String,
    created_unix: u64,
    sha256: String,
}

fn now_unix() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()
}

fn abrir_db(path: &Path) -> Result<Connection, String> {
    let db = Connection::open(path).map_err(|e| format!("No fue posible abrir la base de datos: {e}"))?;
    db.busy_timeout(Duration::from_secs(10)).map_err(|e| e.to_string())?;
    db.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")
        .map_err(|e| format!("No fue posible configurar SQLite: {e}"))?;
    Ok(db)
}

fn aplicar_migraciones(path: &Path) -> Result<(), String> {
    let db = abrir_db(path)?;
    db.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS _hvdigital_web_migrations (
            version INTEGER PRIMARY KEY,
            aplicada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS configuracion (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            unidad_nombre TEXT NOT NULL,
            unidad_sigla TEXT NOT NULL,
            responsable TEXT NOT NULL,
            periodo_activo_id INTEGER NULL,
            configurado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS periodos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            anio INTEGER NOT NULL,
            fecha_inicio TEXT NOT NULL,
            fecha_termino TEXT NOT NULL,
            estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','cerrado')),
            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ux_periodos_anio ON periodos(anio);
        INSERT OR IGNORE INTO _hvdigital_web_migrations(version) VALUES (1);
        "#,
    ).map_err(|e| format!("Migración base: {e}"))?;

    let migraciones: &[(i64, &str)] = &[
        (2, include_str!("../../src-tauri/migrations/002_catalogos_normativos.sql")),
        (3, include_str!("../../src-tauri/migrations/003_grados_calidades.sql")),
        (4, include_str!("../../src-tauri/migrations/004_factores_normativos.sql")),
        (5, include_str!("../../src-tauri/migrations/005_catalogo_anotaciones.sql")),
        (6, include_str!("../../src-tauri/migrations/006_motor_plantillas_anotacion.sql")),
        (7, include_str!("../../src-tauri/migrations/007_puntajes_y_efectos_anotaciones.sql")),
        (8, include_str!("../../src-tauri/migrations/008_personas_hojas_vida_anotaciones.sql")),
        (9, include_str!("../../src-tauri/migrations/009_vincular_borrador_anotacion.sql")),
        (11, include_str!("../../src-tauri/migrations/011_configuracion_inicial.sql")),
        (12, include_str!("../../src-tauri/migrations/012_designaciones_expedientes.sql")),
        (13, include_str!("../../src-tauri/migrations/013_panel_periodo.sql")),
        (14, include_str!("../../src-tauri/migrations/014_expediente_detalle.sql")),
        (15, include_str!("../../src-tauri/migrations/015_hoja_vida_operativa.sql")),
        (16, include_str!("../../src-tauri/migrations/016_evint.sql")),
        (18, include_str!("../../src-tauri/migrations/018_formato_oficial_evint.sql")),
        (19, include_str!("../../src-tauri/migrations/020_corregir_escala_calculo_evint.sql")),
        (20, include_str!("../../src-tauri/migrations/021_hoja_vida_cronologica.sql")),
        (21, include_str!("../../src-tauri/migrations/022_resoluciones_anotaciones_libres.sql")),
        (22, include_str!("../../src-tauri/migrations/023_resoluciones_documentales.sql")),
        (23, include_str!("../../src-tauri/migrations/024_vinculo_resolucion_documental_anotacion.sql")),
        (24, include_str!("../../src-tauri/migrations/025_hc2_calificaciones.sql")),
        (25, include_str!("../../src-tauri/migrations/026_hc1_ham_hapsem.sql")),
        (26, include_str!("../../src-tauri/migrations/027_fotografia_calificados.sql")),
    ];

    for (version, sql) in migraciones {
        let existe: i64 = db.query_row(
            "SELECT COUNT(*) FROM _hvdigital_web_migrations WHERE version=?1",
            [version], |r| r.get(0),
        ).map_err(|e| e.to_string())?;
        if existe == 0 {
            let tx = db.unchecked_transaction().map_err(|e| e.to_string())?;
            tx.execute_batch(sql).map_err(|e| format!("Migración {version}: {e}"))?;
            tx.execute("INSERT INTO _hvdigital_web_migrations(version) VALUES (?1)", [version])
                .map_err(|e| e.to_string())?;
            tx.commit().map_err(|e| e.to_string())?;
        }
    }

    db.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS autenticacion_local (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            usuario TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            password_actualizada_en TEXT,
            creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    ).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR IGNORE INTO autenticacion_local(id,usuario,password_hash) VALUES(1,?1,?2)",
        (USUARIO_INICIAL, PASSWORD_HASH_INICIAL),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

fn sql_value(v: &Value) -> SqlValue {
    match v {
        Value::Null => SqlValue::Null,
        Value::Bool(b) => SqlValue::Integer(if *b { 1 } else { 0 }),
        Value::Number(n) => n.as_i64().map(SqlValue::Integer)
            .or_else(|| n.as_f64().map(SqlValue::Real)).unwrap_or(SqlValue::Null),
        Value::String(s) => SqlValue::Text(s.clone()),
        other => SqlValue::Text(other.to_string()),
    }
}

fn json_value(v: ValueRef<'_>) -> Value {
    match v {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(i) => json!(i),
        ValueRef::Real(f) => json!(f),
        ValueRef::Text(t) => Value::String(String::from_utf8_lossy(t).into_owned()),
        ValueRef::Blob(b) => Value::String(format!("data:application/octet-stream;base64,{}", base64_simple(b))),
    }
}

fn base64_simple(data: &[u8]) -> String {
    const T: &[u8;64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    let mut i = 0;
    while i < data.len() {
        let b0 = data[i]; let b1 = if i+1 < data.len() { data[i+1] } else { 0 }; let b2 = if i+2 < data.len() { data[i+2] } else { 0 };
        out.push(T[(b0 >> 2) as usize] as char);
        out.push(T[(((b0 & 3) << 4) | (b1 >> 4)) as usize] as char);
        out.push(if i+1 < data.len() { T[(((b1 & 15) << 2) | (b2 >> 6)) as usize] as char } else { '=' });
        out.push(if i+2 < data.len() { T[(b2 & 63) as usize] as char } else { '=' });
        i += 3;
    }
    out
}

fn token(headers: &HeaderMap) -> Option<String> {
    headers.get(header::AUTHORIZATION)?.to_str().ok()?.strip_prefix("Bearer ").map(str::to_string)
}

fn autorizar(state: &AppState, headers: &HeaderMap) -> Result<(), (StatusCode, String)> {
    let t = token(headers).ok_or((StatusCode::UNAUTHORIZED, "Sesión requerida.".into()))?;
    let mut sesiones = state.sesiones.lock().map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Error de sesión.".into()))?;
    sesiones.retain(|_, expira| Instant::now() < *expira);
    if sesiones.get(&t).is_some_and(|expira| Instant::now() < *expira) { Ok(()) }
    else { Err((StatusCode::UNAUTHORIZED, "La sesión expiró.".into())) }
}

async fn health() -> Json<Value> { Json(json!({"ok":true,"service":"HVDigital Web API"})) }

async fn login(State(state): State<AppState>, Json(req): Json<LoginRequest>) -> Result<Json<LoginResponse>, (StatusCode,String)> {
    {
        let mut it = state.intentos.lock().map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR,"Error de autenticación.".into()))?;
        if let Some(hasta) = it.bloqueado_hasta {
            if Instant::now() < hasta {
                return Err((StatusCode::TOO_MANY_REQUESTS, format!("Demasiados intentos. Intente en {} segundos.", hasta.saturating_duration_since(Instant::now()).as_secs().max(1))));
            }
            it.fallidos = 0; it.bloqueado_hasta = None;
        }
    }

    let db = abrir_db(&state.db_path).map_err(internal)?;
    let (usuario, hash): (String,String) = db.query_row(
        "SELECT usuario,password_hash FROM autenticacion_local WHERE id=1", [], |r| Ok((r.get(0)?,r.get(1)?))
    ).map_err(|e| internal(e.to_string()))?;
    let parsed = PasswordHash::new(&hash).map_err(|_| internal("Hash de autenticación inválido.".into()))?;
    let ok = req.usuario.trim().eq_ignore_ascii_case(&usuario) && Argon2::default().verify_password(req.password.as_bytes(), &parsed).is_ok();
    if !ok {
        let mut it = state.intentos.lock().map_err(|_| internal("Error de autenticación.".into()))?;
        it.fallidos += 1;
        if it.fallidos >= MAX_INTENTOS { it.bloqueado_hasta = Some(Instant::now()+BLOQUEO); }
        return Err((StatusCode::UNAUTHORIZED, "Usuario o contraseña incorrectos.".into()));
    }
    let t = Uuid::new_v4().to_string();
    state.sesiones.lock().map_err(|_| internal("Error de sesión.".into()))?.insert(t.clone(), Instant::now()+SESION_DURACION);
    Ok(Json(LoginResponse { autenticado:true, usuario, mensaje:"Acceso autorizado.".into(), token:t }))
}

async fn cambiar_password(State(state): State<AppState>, headers: HeaderMap, Json(req): Json<PasswordRequest>) -> Result<Json<String>, (StatusCode,String)> {
    autorizar(&state,&headers)?;
    if req.password_nueva.len() < 10 { return Err((StatusCode::BAD_REQUEST,"La nueva contraseña debe tener al menos 10 caracteres.".into())); }
    let db = abrir_db(&state.db_path).map_err(internal)?;
    let (usuario, hash): (String,String) = db.query_row("SELECT usuario,password_hash FROM autenticacion_local WHERE id=1", [], |r| Ok((r.get(0)?,r.get(1)?))).map_err(|e| internal(e.to_string()))?;
    if !req.usuario.trim().eq_ignore_ascii_case(&usuario) { return Err((StatusCode::BAD_REQUEST,"El usuario no corresponde a la sesión configurada.".into())); }
    let parsed = PasswordHash::new(&hash).map_err(|_| internal("Hash inválido.".into()))?;
    if Argon2::default().verify_password(req.password_actual.as_bytes(), &parsed).is_err() { return Err((StatusCode::BAD_REQUEST,"La contraseña actual no es correcta.".into())); }
    if req.password_actual == req.password_nueva { return Err((StatusCode::BAD_REQUEST,"La nueva contraseña debe ser diferente.".into())); }
    let salt = SaltString::generate(&mut OsRng);
    let nuevo = Argon2::default().hash_password(req.password_nueva.as_bytes(), &salt).map_err(|_| internal("No fue posible proteger la contraseña.".into()))?.to_string();
    db.execute("UPDATE autenticacion_local SET password_hash=?1,password_actualizada_en=CURRENT_TIMESTAMP,actualizada_en=CURRENT_TIMESTAMP WHERE id=1", [nuevo]).map_err(|e| internal(e.to_string()))?;
    Ok(Json("Contraseña actualizada correctamente.".into()))
}

async fn db_select(State(state): State<AppState>, headers: HeaderMap, Json(req): Json<SqlRequest>) -> Result<Json<Value>, (StatusCode,String)> {
    autorizar(&state,&headers)?;
    let q = req.query.trim_start().to_uppercase();
    if !(q.starts_with("SELECT") || q.starts_with("WITH") || q.starts_with("PRAGMA")) {
        return Err((StatusCode::BAD_REQUEST,"La consulta no es de lectura.".into()));
    }
    let db = abrir_db(&state.db_path).map_err(internal)?;
    let mut stmt = db.prepare(&req.query).map_err(|e| (StatusCode::BAD_REQUEST,e.to_string()))?;
    let params: Vec<SqlValue> = req.params.iter().map(sql_value).collect();
    let names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    let rows = stmt.query_map(params_from_iter(params.iter()), |row| {
        let mut obj = Map::new();
        for (idx,name) in names.iter().enumerate() { obj.insert(name.clone(), json_value(row.get_ref(idx)?)); }
        Ok(Value::Object(obj))
    }).map_err(|e| (StatusCode::BAD_REQUEST,e.to_string()))?;
    let mut out = Vec::new();
    for row in rows { out.push(row.map_err(|e| internal(e.to_string()))?); }
    Ok(Json(Value::Array(out)))
}

async fn db_execute(State(state): State<AppState>, headers: HeaderMap, Json(req): Json<SqlRequest>) -> Result<Json<ExecuteResponse>, (StatusCode,String)> {
    autorizar(&state,&headers)?;
    let q = req.query.trim_start().to_uppercase();
    let permitidos = ["INSERT","UPDATE","DELETE","CREATE","ALTER","DROP","PRAGMA","REPLACE"];
    if !permitidos.iter().any(|p| q.starts_with(p)) { return Err((StatusCode::BAD_REQUEST,"Sentencia SQL no permitida.".into())); }
    let db = abrir_db(&state.db_path).map_err(internal)?;
    let params: Vec<SqlValue> = req.params.iter().map(sql_value).collect();
    let rows = db.execute(&req.query, params_from_iter(params.iter())).map_err(|e| (StatusCode::BAD_REQUEST,e.to_string()))?;
    let id = db.last_insert_rowid();
    Ok(Json(ExecuteResponse { rows_affected: rows, last_insert_id: if id > 0 { Some(id) } else { None } }))
}

async fn backup_status(State(state): State<AppState>, headers: HeaderMap) -> Result<Json<Vec<DatabaseStatus>>, (StatusCode,String)> {
    autorizar(&state,&headers)?;
    let meta = fs::metadata(&state.db_path).map_err(|e| internal(e.to_string()))?;
    let modified_unix = meta.modified().ok().and_then(|m| m.duration_since(UNIX_EPOCH).ok()).map(|d| d.as_secs());
    Ok(Json(vec![DatabaseStatus {
        name:"hvdigital.db".into(), path:state.db_path.display().to_string(), exists:true,
        size_bytes:meta.len(), modified_unix,
    }]))
}

fn sha256(path: &Path) -> Result<String,String> {
    let mut f = File::open(path).map_err(|e| e.to_string())?;
    let mut h = Sha256::new(); let mut buf=[0u8;65536];
    loop { let n=f.read(&mut buf).map_err(|e| e.to_string())?; if n==0 {break;} h.update(&buf[..n]); }
    Ok(hex::encode(h.finalize()))
}

async fn backup_download(State(state): State<AppState>, headers: HeaderMap) -> Result<Response,(StatusCode,String)> {
    autorizar(&state,&headers)?;
    fs::create_dir_all(&state.backup_dir).map_err(|e| internal(e.to_string()))?;
    let filename = format!("HVDigital_Backup_{}.hvbk", now_unix());
    let path = state.backup_dir.join(&filename);
    let checksum = sha256(&state.db_path).map_err(internal)?;
    let manifest = BackupManifest { format:"HVDigitalBackup".into(), format_version:1, application:"HVDigital Web".into(), created_unix:now_unix(), sha256:checksum };
    let out = File::create(&path).map_err(|e| internal(e.to_string()))?;
    let mut zip = ZipWriter::new(out); let opt=SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    zip.start_file("manifest.json",opt).map_err(|e| internal(e.to_string()))?;
    zip.write_all(serde_json::to_string_pretty(&manifest).unwrap().as_bytes()).map_err(|e| internal(e.to_string()))?;
    zip.start_file("hvdigital.db",opt).map_err(|e| internal(e.to_string()))?;
    let mut dbf=File::open(&state.db_path).map_err(|e| internal(e.to_string()))?; std::io::copy(&mut dbf,&mut zip).map_err(|e| internal(e.to_string()))?;
    zip.finish().map_err(|e| internal(e.to_string()))?;
    let bytes=fs::read(&path).map_err(|e| internal(e.to_string()))?;
    Ok(Response::builder().status(StatusCode::OK)
        .header(header::CONTENT_TYPE,"application/octet-stream")
        .header(header::CONTENT_DISPOSITION,format!("attachment; filename=\"{filename}\""))
        .body(Body::from(bytes)).unwrap())
}

async fn backup_restore(State(state): State<AppState>, headers: HeaderMap, mut multipart: Multipart) -> Result<Json<Value>,(StatusCode,String)> {
    autorizar(&state,&headers)?;
    let mut bytes=None;
    while let Some(field)=multipart.next_field().await.map_err(|e| (StatusCode::BAD_REQUEST,e.to_string()))? {
        if field.name()==Some("file") { bytes=Some(field.bytes().await.map_err(|e| (StatusCode::BAD_REQUEST,e.to_string()))?); break; }
    }
    let bytes=bytes.ok_or((StatusCode::BAD_REQUEST,"No se recibió el archivo de respaldo.".into()))?;
    fs::create_dir_all(&state.backup_dir).map_err(|e| internal(e.to_string()))?;
    let tmp=state.backup_dir.join(format!("restore-{}.hvbk",Uuid::new_v4())); fs::write(&tmp,&bytes).map_err(|e| internal(e.to_string()))?;
    let file=File::open(&tmp).map_err(|e| internal(e.to_string()))?; let mut zip=ZipArchive::new(file).map_err(|e| (StatusCode::BAD_REQUEST,e.to_string()))?;
    let manifest: BackupManifest={ let mut f=zip.by_name("manifest.json").map_err(|_| (StatusCode::BAD_REQUEST,"Respaldo sin manifiesto.".into()))?; let mut s=String::new(); f.read_to_string(&mut s).map_err(|e| internal(e.to_string()))?; serde_json::from_str(&s).map_err(|e| (StatusCode::BAD_REQUEST,e.to_string()))? };
    let extracted=state.backup_dir.join(format!("hvdigital-restore-{}.db",Uuid::new_v4()));
    { let mut z=zip.by_name("hvdigital.db").map_err(|_| (StatusCode::BAD_REQUEST,"Respaldo sin hvdigital.db.".into()))?; let mut out=File::create(&extracted).map_err(|e| internal(e.to_string()))?; std::io::copy(&mut z,&mut out).map_err(|e| internal(e.to_string()))?; }
    if sha256(&extracted).map_err(internal)? != manifest.sha256 { return Err((StatusCode::BAD_REQUEST,"El checksum del respaldo no coincide.".into())); }
    abrir_db(&extracted).map_err(|_| (StatusCode::BAD_REQUEST,"La base restaurada no es válida.".into()))?.execute_batch("PRAGMA integrity_check;").map_err(|e| (StatusCode::BAD_REQUEST,e.to_string()))?;
    let safety=state.backup_dir.join(format!("pre-restore-{}.db",now_unix())); fs::copy(&state.db_path,&safety).map_err(|e| internal(e.to_string()))?;
    fs::copy(&extracted,&state.db_path).map_err(|e| internal(e.to_string()))?;
    aplicar_migraciones(&state.db_path).map_err(internal)?;
    let _=fs::remove_file(tmp); let _=fs::remove_file(extracted);
    Ok(Json(json!({"sourcePath":"archivo cargado","safetyBackupPath":safety.display().to_string(),"restoredDatabases":["hvdigital.db"],"restoredUnix":now_unix()})))
}

fn internal(msg: String) -> (StatusCode,String) { error!("{msg}"); (StatusCode::INTERNAL_SERVER_ERROR,msg) }

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_env_filter(tracing_subscriber::EnvFilter::from_default_env().add_directive("hvdigital_web_server=info".parse().unwrap())).init();
    let data_dir=PathBuf::from(std::env::var("HVDIGITAL_DATA_DIR").unwrap_or_else(|_| "./data".into()));
    fs::create_dir_all(&data_dir).expect("No fue posible crear data");
    let db_path=data_dir.join("hvdigital.db");
    aplicar_migraciones(&db_path).expect("No fue posible preparar HVDigital Web");
    let state=AppState { db_path, backup_dir:data_dir.join("backups"), sesiones:Arc::new(Mutex::new(HashMap::new())), intentos:Arc::new(Mutex::new(EstadoIntentos::default())) };
    let app=Router::new()
        .route("/api/health",get(health))
        .route("/api/auth/login",post(login))
        .route("/api/auth/password",post(cambiar_password))
        .route("/api/db/select",post(db_select))
        .route("/api/db/execute",post(db_execute))
        .route("/api/backup/status",get(backup_status))
        .route("/api/backup/download",get(backup_download))
        .route("/api/backup/restore",post(backup_restore))
        .layer(TraceLayer::new_for_http()).layer(CorsLayer::permissive()).with_state(state);
    let addr=std::env::var("HVDIGITAL_BIND").unwrap_or_else(|_| "127.0.0.1:8080".into());
    let listener=TcpListener::bind(&addr).await.expect("No fue posible abrir el puerto");
    info!("HVDigital Web API escuchando en {addr}");
    axum::serve(listener,app).await.expect("Error del servidor");
}
