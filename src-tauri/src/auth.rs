use argon2::{Argon2, PasswordHash, PasswordVerifier};
use serde::Serialize;
use std::{
    sync::{Mutex, OnceLock},
    time::{Duration, Instant},
};

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

#[tauri::command]
pub fn login_local(usuario: String, password: String) -> Result<ResultadoLogin, String> {
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

    let hash = PasswordHash::new(PASSWORD_HASH_INICIAL)
        .map_err(|_| "La configuración de autenticación local no es válida.".to_string())?;

    let password_valida = Argon2::default()
        .verify_password(password.as_bytes(), &hash)
        .is_ok();

    if usuario_normalizado != USUARIO_INICIAL || !password_valida {
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
        usuario: USUARIO_INICIAL.to_string(),
        mensaje: "Acceso autorizado.".to_string(),
    })
}
