use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, SaltString},
    Argon2, PasswordVerifier,
};
use rusqlite::{params, Connection};
use serde::Serialize;
use std::{
    fs,
    path::PathBuf,
    sync::{Mutex, OnceLock},
    time::{Duration, Instant},
};
use tauri::{AppHandle, Manager};

const USUARIO_INICIAL: &str = "calificador";
const PASSWORD_HASH_INICIAL: &str = "$argon2id$v=19$m=65536,t=3,p=1$EnQ9ZasZWx+KiRdPL2Z50A$YMWgX8qL3kmdBp5X3pI8aZ3YZPLN7QO+quPX2CEdhaE";
const MAX_INTENTOS: u32 = 5;
const BLOQUEO: Duration = Duration::from_secs(30);

#[derive(Default)]
struct EstadoIntentos {
    fallidos: u32,
    bloqueado_hasta: Option<Instant>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultadoLogin {
    autenticado: bool,
    usuario: String,
    mensaje: String,
}

fn estado_intentos() -> &'static Mutex<EstadoIntentos> {
    static ESTADO: OnceLock<Mutex<EstadoIntentos>> = OnceLock::new();
    ESTADO.get_or_init(|| Mutex::new(EstadoIntentos::default()))
}

fn ruta_base_datos(app: &AppHandle) -> Result<PathBuf, String> {
    let directorio = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("No fue posible resolver la carpeta de datos: {error}"))?;

    fs::create_dir_all(&directorio)
        .map_err(|error| format!("No fue posible crear la carpeta de datos: {error}"))?;

    Ok(directorio.join("hvdigital.db"))
}

fn abrir_auth(app: &AppHandle) -> Result<Connection, String> {
    let ruta = ruta_base_datos(app)?;
    let conexion = Connection::open(&ruta)
        .map_err(|error| format!("No fue posible abrir la base de autenticación: {error}"))?;

    conexion
        .execute_batch(
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
        )
        .map_err(|error| format!("No fue posible preparar la autenticación local: {error}"))?;

    conexion
        .execute(
            "INSERT OR IGNORE INTO autenticacion_local (id, usuario, password_hash) VALUES (1, ?1, ?2)",
            params![USUARIO_INICIAL, PASSWORD_HASH_INICIAL],
        )
        .map_err(|error| format!("No fue posible inicializar la autenticación local: {error}"))?;

    Ok(conexion)
}

fn obtener_credencial(app: &AppHandle) -> Result<(String, String), String> {
    let conexion = abrir_auth(app)?;
    conexion
        .query_row(
            "SELECT usuario, password_hash FROM autenticacion_local WHERE id = 1 LIMIT 1",
            [],
            |fila| Ok((fila.get(0)?, fila.get(1)?)),
        )
        .map_err(|error| format!("No fue posible leer la autenticación local: {error}"))
}

fn verificar_password(password: &str, hash_guardado: &str) -> Result<bool, String> {
    let hash = PasswordHash::new(hash_guardado)
        .map_err(|_| "La configuración de autenticación local no es válida.".to_string())?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &hash)
        .is_ok())
}

#[tauri::command]
pub fn login_local(
    app: AppHandle,
    usuario: String,
    password: String,
) -> Result<ResultadoLogin, String> {
    let usuario_normalizado = usuario.trim().to_lowercase();
    let mut estado = estado_intentos()
        .lock()
        .map_err(|_| "No fue posible validar las credenciales.".to_string())?;

    if let Some(hasta) = estado.bloqueado_hasta {
        if Instant::now() < hasta {
            let segundos = hasta.saturating_duration_since(Instant::now()).as_secs().max(1);
            return Err(format!(
                "Demasiados intentos fallidos. Intente nuevamente en {segundos} segundos."
            ));
        }
        estado.fallidos = 0;
        estado.bloqueado_hasta = None;
    }

    let (usuario_guardado, hash_guardado) = obtener_credencial(&app)?;
    let password_valida = verificar_password(&password, &hash_guardado)?;

    if usuario_normalizado != usuario_guardado.to_lowercase() || !password_valida {
        estado.fallidos += 1;

        if estado.fallidos >= MAX_INTENTOS {
            estado.bloqueado_hasta = Some(Instant::now() + BLOQUEO);
            return Err(
                "Credenciales incorrectas. El acceso se bloqueó temporalmente por 30 segundos."
                    .to_string(),
            );
        }

        let restantes = MAX_INTENTOS - estado.fallidos;
        return Err(format!(
            "Usuario o contraseña incorrectos. Quedan {restantes} intentos antes del bloqueo temporal."
        ));
    }

    estado.fallidos = 0;
    estado.bloqueado_hasta = None;

    Ok(ResultadoLogin {
        autenticado: true,
        usuario: usuario_guardado,
        mensaje: "Acceso autorizado.".to_string(),
    })
}

#[tauri::command]
pub fn cambiar_password_local(
    app: AppHandle,
    usuario: String,
    password_actual: String,
    password_nueva: String,
) -> Result<String, String> {
    let usuario_normalizado = usuario.trim().to_lowercase();
    let (usuario_guardado, hash_guardado) = obtener_credencial(&app)?;

    if usuario_normalizado != usuario_guardado.to_lowercase() {
        return Err("El usuario de la sesión no corresponde al usuario local configurado.".to_string());
    }

    if !verificar_password(&password_actual, &hash_guardado)? {
        return Err("La contraseña actual no es correcta.".to_string());
    }

    if password_nueva.len() < 10 {
        return Err("La nueva contraseña debe tener al menos 10 caracteres.".to_string());
    }

    if password_nueva == password_actual {
        return Err("La nueva contraseña debe ser diferente de la contraseña actual.".to_string());
    }

    let salt = SaltString::generate(&mut OsRng);
    let nuevo_hash = Argon2::default()
        .hash_password(password_nueva.as_bytes(), &salt)
        .map_err(|_| "No fue posible proteger la nueva contraseña.".to_string())?
        .to_string();

    let conexion = abrir_auth(&app)?;
    conexion
        .execute(
            r#"
            UPDATE autenticacion_local
            SET password_hash = ?1,
                password_actualizada_en = CURRENT_TIMESTAMP,
                actualizada_en = CURRENT_TIMESTAMP
            WHERE id = 1 AND usuario = ?2
            "#,
            params![nuevo_hash, usuario_guardado],
        )
        .map_err(|error| format!("No fue posible guardar la nueva contraseña: {error}"))?;

    let mut estado = estado_intentos()
        .lock()
        .map_err(|_| "La contraseña fue actualizada, pero no fue posible reiniciar el contador de acceso.".to_string())?;
    estado.fallidos = 0;
    estado.bloqueado_hasta = None;

    Ok("Contraseña actualizada correctamente.".to_string())
}
