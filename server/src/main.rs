mod sql_compat;

use std::{
    collections::HashMap,
    env,
    net::SocketAddr,
    sync::Arc,
    time::{Duration, Instant},
};

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, SaltString},
    Argon2, PasswordVerifier,
};
use axum::{
    body::Body,
    extract::{Multipart, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use sqlx::{
    mysql::{MySqlPoolOptions, MySqlRow},
    Column, MySql, MySqlPool, QueryBuilder, Row, TypeInfo, ValueRef,
};
use tokio::{process::Command, sync::RwLock};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::{error, info, warn};
use url::Url;
use uuid::Uuid;

const USUARIO_INICIAL: &str = "calificador";
const PASSWORD_HASH_INICIAL: &str = "$argon2id$v=19$m=65536,t=3,p=1$EnQ9ZasZWx+KiRdPL2Z50A$YMWgX8qL3kmdBp5X3pI8aZ3YZPLN7QO+quPX2CEdhaE";
const SESSION_TTL: Duration = Duration::from_secs(12 * 60 * 60);

#[derive(Clone)]
struct AppState {
    pool: MySqlPool,
    sessions: Arc<RwLock<HashMap<String, Instant>>>,
    database_url: String,
}

#[derive(Debug, Serialize)]
struct ApiError {
    error: String,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (StatusCode::BAD_REQUEST, Json(self)).into_response()
    }
}

fn err<T: Into<String>>(value: T) -> ApiError {
    ApiError { error: value.into() }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoginRequest {
    usuario: String,
    password: String,
}

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
    rows_affected: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_insert_id: Option<u64>,
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

#[derive(Serialize)]
struct Health {
    ok: bool,
    service: &'static str,
    database: &'static str,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "hvdigital_web_server=info,tower_http=info".into()),
        )
        .init();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "mysql://hvdigital:hvdigital@127.0.0.1:3306/hvdigital".to_string());
    let bind = env::var("HVDIGITAL_BIND").unwrap_or_else(|_| "127.0.0.1:8080".to_string());

    let pool = MySqlPoolOptions::new()
        .max_connections(12)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(10))
        .after_connect(|conn, _| {
            Box::pin(async move {
                sqlx::query("SET SESSION sql_mode = CONCAT(@@sql_mode, ',PIPES_AS_CONCAT')")
                    .execute(&mut *conn)
                    .await?;
                sqlx::query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci")
                    .execute(&mut *conn)
                    .await?;
                Ok(())
            })
        })
        .connect(&database_url)
        .await
        .unwrap_or_else(|e| panic!("No fue posible conectar con MariaDB: {e}"));

    ejecutar_migraciones(&pool)
        .await
        .unwrap_or_else(|e| panic!("No fue posible preparar MariaDB: {e}"));
    asegurar_usuario_inicial(&pool)
        .await
        .unwrap_or_else(|e| panic!("No fue posible preparar el usuario inicial: {e}"));

    let state = AppState {
        pool,
        sessions: Arc::new(RwLock::new(HashMap::new())),
        database_url,
    };

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/auth/login", post(login))
        .route("/api/auth/password", post(cambiar_password))
        .route("/api/db/select", post(db_select))
        .route("/api/db/execute", post(db_execute))
        .route("/api/backup/status", get(backup_status))
        .route("/api/backup/download", get(backup_download))
        .route("/api/backup/restore", post(backup_restore))
        .with_state(state)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let addr: SocketAddr = bind.parse().expect("HVDIGITAL_BIND no es válido");
    info!(%addr, "HVDigital Web API iniciado con MariaDB");
    let listener = tokio::net::TcpListener::bind(addr).await.expect("No fue posible abrir el puerto");
    axum::serve(listener, app).await.expect("El servidor finalizó inesperadamente");
}

async fn ejecutar_migraciones(pool: &MySqlPool) -> Result<(), sqlx::Error> {
    sqlx::migrate!("./migrations").run(pool).await
}

async fn asegurar_usuario_inicial(pool: &MySqlPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT IGNORE INTO autenticacion_local (id, usuario, password_hash) VALUES (1, ?, ?)",
    )
    .bind(USUARIO_INICIAL)
    .bind(PASSWORD_HASH_INICIAL)
    .execute(pool)
    .await?;
    Ok(())
}

async fn health(State(state): State<AppState>) -> impl IntoResponse {
    let ok = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.pool)
        .await
        .is_ok();
    let status = if ok { StatusCode::OK } else { StatusCode::SERVICE_UNAVAILABLE };
    (
        status,
        Json(Health {
            ok,
            service: "HVDigital Web API",
            database: "MariaDB",
        }),
    )
}

async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, Json<ApiError>)> {
    let row = sqlx::query("SELECT usuario, password_hash FROM autenticacion_local WHERE id = 1 LIMIT 1")
        .fetch_one(&state.pool)
        .await
        .map_err(internal)?;
    let usuario_guardado: String = row.try_get("usuario").map_err(internal)?;
    let hash_guardado: String = row.try_get("password_hash").map_err(internal)?;

    let hash = PasswordHash::new(&hash_guardado)
        .map_err(|_| unauthorized("La configuración de autenticación no es válida."))?;
    let valida = Argon2::default()
        .verify_password(req.password.as_bytes(), &hash)
        .is_ok();

    if !valida || !req.usuario.trim().eq_ignore_ascii_case(&usuario_guardado) {
        return Err(unauthorized("Usuario o contraseña incorrectos."));
    }

    let token = Uuid::new_v4().to_string();
    state.sessions.write().await.insert(token.clone(), Instant::now() + SESSION_TTL);

    Ok(Json(LoginResponse {
        autenticado: true,
        usuario: usuario_guardado,
        mensaje: "Acceso autorizado.".to_string(),
        token,
    }))
}

async fn cambiar_password(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<PasswordRequest>,
) -> Result<Json<Value>, (StatusCode, Json<ApiError>)> {
    autorizar(&state, &headers).await?;
    if req.password_nueva.len() < 10 {
        return Err(bad("La nueva contraseña debe tener al menos 10 caracteres."));
    }
    if req.password_nueva == req.password_actual {
        return Err(bad("La nueva contraseña debe ser distinta de la actual."));
    }

    let row = sqlx::query("SELECT usuario, password_hash FROM autenticacion_local WHERE id = 1 LIMIT 1")
        .fetch_one(&state.pool)
        .await
        .map_err(internal)?;
    let usuario_guardado: String = row.try_get("usuario").map_err(internal)?;
    let hash_guardado: String = row.try_get("password_hash").map_err(internal)?;
    if !req.usuario.trim().eq_ignore_ascii_case(&usuario_guardado) {
        return Err(unauthorized("El usuario no corresponde a la sesión configurada."));
    }

    let hash = PasswordHash::new(&hash_guardado).map_err(|_| internal("Hash de autenticación inválido"))?;
    if Argon2::default().verify_password(req.password_actual.as_bytes(), &hash).is_err() {
        return Err(unauthorized("La contraseña actual no es correcta."));
    }

    let salt = SaltString::generate(&mut OsRng);
    let nuevo_hash = Argon2::default()
        .hash_password(req.password_nueva.as_bytes(), &salt)
        .map_err(|_| internal("No fue posible proteger la nueva contraseña."))?
        .to_string();

    sqlx::query(
        "UPDATE autenticacion_local SET password_hash=?, password_actualizada_en=NOW(), actualizada_en=NOW() WHERE id=1",
    )
    .bind(nuevo_hash)
    .execute(&state.pool)
    .await
    .map_err(internal)?;

    Ok(Json(serde_json::json!({ "message": "Contraseña actualizada correctamente." })))
}

async fn db_select(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<SqlRequest>,
) -> Result<Json<Value>, (StatusCode, Json<ApiError>)> {
    autorizar(&state, &headers).await?;
    if sql_compat::es_pragma(&req.query) {
        return Ok(Json(Value::Array(vec![])));
    }
    if !sql_compat::es_lectura(&req.query) {
        return Err(bad("La ruta select solo admite consultas de lectura."));
    }

    let sql = sql_compat::normalizar_sql(&req.query);
    let mut query = sqlx::query(&sql);
    for value in &req.params {
        query = bind_json(query, value);
    }

    let rows = query.fetch_all(&state.pool).await.map_err(|e| {
        error!(sql=%sql, error=%e, "Error de consulta MariaDB");
        bad(format!("Error de consulta: {e}"))
    })?;

    let mut salida = Vec::with_capacity(rows.len());
    for row in rows {
        salida.push(row_to_json(&row).map_err(internal)?);
    }
    Ok(Json(Value::Array(salida)))
}

async fn db_execute(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<SqlRequest>,
) -> Result<Json<ExecuteResponse>, (StatusCode, Json<ApiError>)> {
    autorizar(&state, &headers).await?;
    if sql_compat::es_pragma(&req.query) {
        return Ok(Json(ExecuteResponse { rows_affected: 0, last_insert_id: None }));
    }
    if sql_compat::es_lectura(&req.query) {
        return Err(bad("La ruta execute no admite SELECT."));
    }

    let sql = sql_compat::normalizar_sql(&req.query);
    let mut query = sqlx::query(&sql);
    for value in &req.params {
        query = bind_json(query, value);
    }

    let result = query.execute(&state.pool).await.map_err(|e| {
        error!(sql=%sql, error=%e, "Error de escritura MariaDB");
        bad(format!("Error de escritura: {e}"))
    })?;

    Ok(Json(ExecuteResponse {
        rows_affected: result.rows_affected(),
        last_insert_id: match result.last_insert_id() { 0 => None, id => Some(id) },
    }))
}

fn bind_json<'q>(
    query: sqlx::query::Query<'q, MySql, sqlx::mysql::MySqlArguments>,
    value: &'q Value,
) -> sqlx::query::Query<'q, MySql, sqlx::mysql::MySqlArguments> {
    match value {
        Value::Null => query.bind(Option::<String>::None),
        Value::Bool(v) => query.bind(*v),
        Value::Number(v) if v.is_i64() => query.bind(v.as_i64().unwrap_or_default()),
        Value::Number(v) if v.is_u64() => query.bind(v.as_u64().unwrap_or_default()),
        Value::Number(v) => query.bind(v.as_f64().unwrap_or_default()),
        Value::String(v) => query.bind(v),
        Value::Array(_) | Value::Object(_) => query.bind(value.to_string()),
    }
}

fn row_to_json(row: &MySqlRow) -> Result<Value, sqlx::Error> {
    let mut object = Map::new();
    for (i, column) in row.columns().iter().enumerate() {
        let raw = row.try_get_raw(i)?;
        if raw.is_null() {
            object.insert(column.name().to_string(), Value::Null);
            continue;
        }

        let type_name = column.type_info().name().to_uppercase();
        let value = if ["TINYINT", "SMALLINT", "MEDIUMINT", "INT", "INTEGER", "BIGINT", "YEAR"]
            .iter().any(|t| type_name.contains(t))
        {
            match row.try_get::<i64, _>(i) {
                Ok(v) => Value::from(v),
                Err(_) => Value::String(row.try_get::<String, _>(i).unwrap_or_default()),
            }
        } else if ["FLOAT", "DOUBLE", "DECIMAL", "NUMERIC"]
            .iter().any(|t| type_name.contains(t))
        {
            match row.try_get::<f64, _>(i) {
                Ok(v) => serde_json::Number::from_f64(v).map(Value::Number).unwrap_or(Value::Null),
                Err(_) => Value::String(row.try_get::<String, _>(i).unwrap_or_default()),
            }
        } else if ["BLOB", "BINARY", "VARBINARY"]
            .iter().any(|t| type_name.contains(t))
        {
            let bytes = row.try_get::<Vec<u8>, _>(i).unwrap_or_default();
            Value::String(hex::encode(bytes))
        } else {
            Value::String(row.try_get::<String, _>(i).unwrap_or_default())
        };
        object.insert(column.name().to_string(), value);
    }
    Ok(Value::Object(object))
}

async fn autorizar(state: &AppState, headers: &HeaderMap) -> Result<(), (StatusCode, Json<ApiError>)> {
    let token = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| unauthorized("Sesión requerida."))?;

    let mut sessions = state.sessions.write().await;
    sessions.retain(|_, expires| *expires > Instant::now());
    let Some(expires) = sessions.get_mut(token) else {
        return Err(unauthorized("La sesión expiró. Inicie sesión nuevamente."));
    };
    *expires = Instant::now() + SESSION_TTL;
    Ok(())
}

async fn backup_status(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<DatabaseStatus>>, (StatusCode, Json<ApiError>)> {
    autorizar(&state, &headers).await?;
    let nombre: String = sqlx::query_scalar("SELECT DATABASE()")
        .fetch_one(&state.pool)
        .await
        .map_err(internal)?;
    let size: Option<i64> = sqlx::query_scalar(
        "SELECT SUM(data_length + index_length) FROM information_schema.tables WHERE table_schema = DATABASE()",
    )
    .fetch_one(&state.pool)
    .await
    .map_err(internal)?;
    Ok(Json(vec![DatabaseStatus {
        name: nombre.clone(),
        path: format!("MariaDB: {nombre}"),
        exists: true,
        size_bytes: size.unwrap_or(0).max(0) as u64,
        modified_unix: None,
    }]))
}

async fn backup_download(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Response, (StatusCode, Json<ApiError>)> {
    autorizar(&state, &headers).await?;
    let cfg = DbCliConfig::from_url(&state.database_url).map_err(bad)?;
    let output = Command::new("mariadb-dump")
        .args(cfg.dump_args())
        .output()
        .await
        .map_err(|e| internal(format!("No fue posible ejecutar mariadb-dump: {e}")))?;
    if !output.status.success() {
        return Err(internal(String::from_utf8_lossy(&output.stderr).to_string()));
    }

    let filename = format!("HVDigital_MariaDB_{}.sql", chrono::Local::now().format("%Y%m%d-%H%M"));
    let mut response = Response::new(Body::from(output.stdout));
    response.headers_mut().insert(header::CONTENT_TYPE, HeaderValue::from_static("application/sql"));
    response.headers_mut().insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&format!("attachment; filename=\"{filename}\"")).unwrap(),
    );
    Ok(response)
}

async fn backup_restore(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<Value>, (StatusCode, Json<ApiError>)> {
    autorizar(&state, &headers).await?;
    let mut sql_bytes: Option<Vec<u8>> = None;
    while let Some(field) = multipart.next_field().await.map_err(|e| bad(e.to_string()))? {
        if field.name() == Some("file") {
            sql_bytes = Some(field.bytes().await.map_err(|e| bad(e.to_string()))?.to_vec());
            break;
        }
    }
    let sql_bytes = sql_bytes.ok_or_else(|| bad("Debe adjuntar un respaldo SQL de HVDigital."))?;
    if sql_bytes.len() > 512 * 1024 * 1024 {
        return Err(bad("El respaldo supera el máximo permitido de 512 MB."));
    }

    let cfg = DbCliConfig::from_url(&state.database_url).map_err(bad)?;
    let mut child = Command::new("mariadb")
        .args(cfg.client_args())
        .stdin(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| internal(format!("No fue posible ejecutar mariadb: {e}")))?;
    if let Some(mut stdin) = child.stdin.take() {
        use tokio::io::AsyncWriteExt;
        stdin.write_all(&sql_bytes).await.map_err(internal)?;
    }
    let output = child.wait_with_output().await.map_err(internal)?;
    if !output.status.success() {
        return Err(internal(String::from_utf8_lossy(&output.stderr).to_string()));
    }
    Ok(Json(serde_json::json!({
        "sourcePath": "archivo subido desde navegador",
        "safetyBackupPath": "administrado por MariaDB",
        "restoredDatabases": [cfg.database],
        "restoredUnix": chrono::Utc::now().timestamp()
    })))
}

struct DbCliConfig {
    host: String,
    port: u16,
    user: String,
    password: String,
    database: String,
}

impl DbCliConfig {
    fn from_url(value: &str) -> Result<Self, String> {
        let url = Url::parse(value).map_err(|e| format!("DATABASE_URL inválida: {e}"))?;
        Ok(Self {
            host: url.host_str().unwrap_or("127.0.0.1").to_string(),
            port: url.port().unwrap_or(3306),
            user: url.username().to_string(),
            password: url.password().unwrap_or("").to_string(),
            database: url.path().trim_start_matches('/').to_string(),
        })
    }

    fn common_args(&self) -> Vec<String> {
        vec![
            format!("--host={}", self.host),
            format!("--port={}", self.port),
            format!("--user={}", self.user),
            format!("--password={}", self.password),
            "--default-character-set=utf8mb4".to_string(),
        ]
    }

    fn dump_args(&self) -> Vec<String> {
        let mut args = self.common_args();
        args.extend([
            "--single-transaction".to_string(),
            "--routines".to_string(),
            "--triggers".to_string(),
            "--events".to_string(),
            "--hex-blob".to_string(),
            self.database.clone(),
        ]);
        args
    }

    fn client_args(&self) -> Vec<String> {
        let mut args = self.common_args();
        args.push(self.database.clone());
        args
    }
}

fn bad<T: Into<String>>(message: T) -> (StatusCode, Json<ApiError>) {
    (StatusCode::BAD_REQUEST, Json(ApiError { error: message.into() }))
}

fn unauthorized<T: Into<String>>(message: T) -> (StatusCode, Json<ApiError>) {
    (StatusCode::UNAUTHORIZED, Json(ApiError { error: message.into() }))
}

fn internal<E: std::fmt::Display>(error: E) -> (StatusCode, Json<ApiError>) {
    error!(%error, "Error interno HVDigital Web");
    (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiError { error: error.to_string() }))
}
