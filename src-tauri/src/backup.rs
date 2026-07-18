use std::{
    collections::BTreeMap,
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use rusqlite::{backup::Backup, Connection};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};
use zip::{write::SimpleFileOptions, CompressionMethod, ZipArchive, ZipWriter};

const BACKUP_FORMAT_VERSION: u32 = 1;
const DATABASE_NAMES: [&str; 2] = ["hvdigital.db", "catalog.db"];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseStatus {
    pub name: String,
    pub path: String,
    pub exists: bool,
    pub size_bytes: u64,
    pub modified_unix: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupManifest {
    format: String,
    format_version: u32,
    application: String,
    application_version: String,
    created_unix: u64,
    databases: Vec<String>,
    checksums_sha256: BTreeMap<String, String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupResult {
    pub path: String,
    pub created_unix: u64,
    pub databases: Vec<String>,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResult {
    pub source_path: String,
    pub safety_backup_path: String,
    pub restored_databases: Vec<String>,
    pub restored_unix: u64,
}

fn now_unix() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs())
        .map_err(|error| format!("No fue posible obtener la fecha del sistema: {error}"))
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("No fue posible resolver la carpeta de datos: {error}"))?;

    fs::create_dir_all(&path)
        .map_err(|error| format!("No fue posible crear la carpeta de datos: {error}"))?;

    Ok(path)
}

fn database_paths(app: &AppHandle) -> Result<Vec<(String, PathBuf)>, String> {
    let root = app_data_dir(app)?;
    Ok(DATABASE_NAMES
        .iter()
        .map(|name| ((*name).to_string(), root.join(name)))
        .collect())
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = File::open(path)
        .map_err(|error| format!("No fue posible leer {}: {error}", path.display()))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];

    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|error| format!("No fue posible calcular el checksum: {error}"))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }

    Ok(hex::encode(hasher.finalize()))
}

fn snapshot_database(source_path: &Path, destination_path: &Path) -> Result<(), String> {
    if destination_path.exists() {
        fs::remove_file(destination_path).map_err(|error| {
            format!(
                "No fue posible reemplazar la copia temporal {}: {error}",
                destination_path.display()
            )
        })?;
    }

    let source = Connection::open(source_path).map_err(|error| {
        format!(
            "No fue posible abrir la base {} para respaldarla: {error}",
            source_path.display()
        )
    })?;
    let mut destination = Connection::open(destination_path).map_err(|error| {
        format!(
            "No fue posible crear la copia temporal {}: {error}",
            destination_path.display()
        )
    })?;

    let backup = Backup::new(&source, &mut destination)
        .map_err(|error| format!("No fue posible iniciar el respaldo SQLite: {error}"))?;
    backup
        .run_to_completion(64, Duration::from_millis(20), None)
        .map_err(|error| format!("No fue posible completar el respaldo SQLite: {error}"))?;

    Ok(())
}

fn restore_database(source_path: &Path, destination_path: &Path) -> Result<(), String> {
    let source = Connection::open(source_path).map_err(|error| {
        format!(
            "No fue posible abrir la base respaldada {}: {error}",
            source_path.display()
        )
    })?;
    let mut destination = Connection::open(destination_path).map_err(|error| {
        format!(
            "No fue posible abrir la base local {}: {error}",
            destination_path.display()
        )
    })?;

    let backup = Backup::new(&source, &mut destination)
        .map_err(|error| format!("No fue posible iniciar la restauración SQLite: {error}"))?;
    backup
        .run_to_completion(64, Duration::from_millis(20), None)
        .map_err(|error| format!("No fue posible completar la restauración SQLite: {error}"))?;

    Ok(())
}

fn create_backup_internal(app: &AppHandle, destination: &Path) -> Result<BackupResult, String> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("No fue posible crear la carpeta de respaldo: {error}"))?;
    }

    let created_unix = now_unix()?;
    let temporary_root = app_data_dir(app)?
        .join("backup-temp")
        .join(created_unix.to_string());
    fs::create_dir_all(&temporary_root)
        .map_err(|error| format!("No fue posible preparar el respaldo: {error}"))?;

    let result = (|| {
        let mut databases = Vec::new();
        let mut checksums = BTreeMap::new();
        let mut snapshots = Vec::new();

        for (name, source_path) in database_paths(app)? {
            if !source_path.exists() {
                continue;
            }

            let snapshot_path = temporary_root.join(&name);
            snapshot_database(&source_path, &snapshot_path)?;
            checksums.insert(name.clone(), sha256_file(&snapshot_path)?);
            databases.push(name.clone());
            snapshots.push((name, snapshot_path));
        }

        if databases.is_empty() {
            return Err("No se encontraron bases de datos locales para respaldar.".to_string());
        }

        let manifest = BackupManifest {
            format: "HVDigital Backup".to_string(),
            format_version: BACKUP_FORMAT_VERSION,
            application: "HVDigital".to_string(),
            application_version: env!("CARGO_PKG_VERSION").to_string(),
            created_unix,
            databases: databases.clone(),
            checksums_sha256: checksums,
        };

        let output = File::create(destination).map_err(|error| {
            format!(
                "No fue posible crear el archivo de respaldo {}: {error}",
                destination.display()
            )
        })?;
        let mut zip = ZipWriter::new(output);
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o600);

        zip.start_file("manifest.json", options)
            .map_err(|error| format!("No fue posible escribir el manifiesto: {error}"))?;
        let manifest_json = serde_json::to_vec_pretty(&manifest)
            .map_err(|error| format!("No fue posible serializar el manifiesto: {error}"))?;
        zip.write_all(&manifest_json)
            .map_err(|error| format!("No fue posible escribir el manifiesto: {error}"))?;

        for (name, snapshot_path) in snapshots {
            zip.start_file(format!("databases/{name}"), options)
                .map_err(|error| format!("No fue posible agregar {name} al respaldo: {error}"))?;
            let mut source = File::open(&snapshot_path)
                .map_err(|error| format!("No fue posible leer la copia de {name}: {error}"))?;
            std::io::copy(&mut source, &mut zip)
                .map_err(|error| format!("No fue posible comprimir {name}: {error}"))?;
        }

        zip.finish()
            .map_err(|error| format!("No fue posible finalizar el respaldo: {error}"))?;

        let size_bytes = fs::metadata(destination)
            .map(|value| value.len())
            .unwrap_or_default();

        Ok(BackupResult {
            path: destination.to_string_lossy().to_string(),
            created_unix,
            databases,
            size_bytes,
        })
    })();

    let _ = fs::remove_dir_all(&temporary_root);
    result
}

#[tauri::command]
pub fn get_database_status(app: AppHandle) -> Result<Vec<DatabaseStatus>, String> {
    database_paths(&app)?
        .into_iter()
        .map(|(name, path)| {
            let metadata = fs::metadata(&path).ok();
            let modified_unix = metadata
                .as_ref()
                .and_then(|value| value.modified().ok())
                .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
                .map(|value| value.as_secs());

            Ok(DatabaseStatus {
                name,
                path: path.to_string_lossy().to_string(),
                exists: metadata.is_some(),
                size_bytes: metadata.as_ref().map(|value| value.len()).unwrap_or_default(),
                modified_unix,
            })
        })
        .collect()
}

#[tauri::command]
pub fn create_database_backup(app: AppHandle, destination_path: String) -> Result<BackupResult, String> {
    let destination = PathBuf::from(destination_path);
    create_backup_internal(&app, &destination)
}

#[tauri::command]
pub fn restore_database_backup(app: AppHandle, source_path: String) -> Result<RestoreResult, String> {
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err("El archivo de respaldo seleccionado no existe.".to_string());
    }

    let restored_unix = now_unix()?;
    let temporary_root = app_data_dir(&app)?
        .join("restore-temp")
        .join(restored_unix.to_string());
    fs::create_dir_all(&temporary_root)
        .map_err(|error| format!("No fue posible preparar la restauración: {error}"))?;

    let result = (|| {
        let input = File::open(&source)
            .map_err(|error| format!("No fue posible abrir el respaldo: {error}"))?;
        let mut archive = ZipArchive::new(input)
            .map_err(|error| format!("El archivo no es un respaldo HVDigital válido: {error}"))?;

        let manifest: BackupManifest = {
            let mut entry = archive
                .by_name("manifest.json")
                .map_err(|_| "El respaldo no contiene manifest.json.".to_string())?;
            let mut content = String::new();
            entry
                .read_to_string(&mut content)
                .map_err(|error| format!("No fue posible leer el manifiesto: {error}"))?;
            serde_json::from_str(&content)
                .map_err(|error| format!("El manifiesto del respaldo es inválido: {error}"))?
        };

        if manifest.format != "HVDigital Backup" || manifest.format_version != BACKUP_FORMAT_VERSION {
            return Err("El formato o la versión del respaldo no es compatible.".to_string());
        }

        let mut extracted = Vec::new();
        for name in &manifest.databases {
            if !DATABASE_NAMES.contains(&name.as_str()) {
                return Err(format!("El respaldo contiene una base no permitida: {name}"));
            }

            let archive_name = format!("databases/{name}");
            let destination = temporary_root.join(name);
            let mut entry = archive
                .by_name(&archive_name)
                .map_err(|_| format!("El respaldo no contiene {archive_name}."))?;
            let mut output = File::create(&destination)
                .map_err(|error| format!("No fue posible extraer {name}: {error}"))?;
            std::io::copy(&mut entry, &mut output)
                .map_err(|error| format!("No fue posible extraer {name}: {error}"))?;

            let expected = manifest
                .checksums_sha256
                .get(name)
                .ok_or_else(|| format!("El respaldo no contiene checksum para {name}."))?;
            let actual = sha256_file(&destination)?;
            if &actual != expected {
                return Err(format!("La verificación de integridad falló para {name}."));
            }

            Connection::open(&destination)
                .and_then(|connection| connection.query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0)))
                .map_err(|error| format!("No fue posible validar {name}: {error}"))
                .and_then(|integrity| {
                    if integrity.eq_ignore_ascii_case("ok") {
                        Ok(())
                    } else {
                        Err(format!("La base {name} no superó integrity_check: {integrity}"))
                    }
                })?;

            extracted.push((name.clone(), destination));
        }

        let safety_dir = app_data_dir(&app)?.join("backups");
        fs::create_dir_all(&safety_dir)
            .map_err(|error| format!("No fue posible crear la carpeta de respaldos: {error}"))?;
        let safety_path = safety_dir.join(format!("pre-restauracion-{restored_unix}.hvbk"));
        create_backup_internal(&app, &safety_path)?;

        let current_paths: BTreeMap<String, PathBuf> = database_paths(&app)?.into_iter().collect();
        let mut restored_databases = Vec::new();
        for (name, extracted_path) in extracted {
            let destination = current_paths
                .get(&name)
                .ok_or_else(|| format!("No se pudo resolver la ruta local de {name}."))?;
            restore_database(&extracted_path, destination)?;
            restored_databases.push(name);
        }

        Ok(RestoreResult {
            source_path,
            safety_backup_path: safety_path.to_string_lossy().to_string(),
            restored_databases,
            restored_unix,
        })
    })();

    let _ = fs::remove_dir_all(&temporary_root);
    result
}
