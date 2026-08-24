use regex::Regex;
use serde_json::Value;

pub fn normalizar_sql(sql: &str) -> String {
    let mut out = sql.trim().to_string();

    // Placeholders de tauri-plugin-sql / SQLite -> MariaDB.
    for indice in (1..=99).rev() {
        out = out.replace(&format!("${indice}"), "?");
    }

    // Compatibilidad de sintaxis frecuente usada por HVDigital.
    out = out.replace("INSERT OR IGNORE", "INSERT IGNORE");
    out = out.replace("insert or ignore", "INSERT IGNORE");
    out = out.replace("AUTOINCREMENT", "AUTO_INCREMENT");
    out = out.replace("autoincrement", "AUTO_INCREMENT");
    out = out.replace("COLLATE NOCASE", "COLLATE utf8mb4_unicode_ci");
    out = out.replace("collate nocase", "COLLATE utf8mb4_unicode_ci");

    // SQLite usa || como concatenación; MariaDB se ejecuta con
    // PIPES_AS_CONCAT configurado a nivel de sesión.

    out = convertir_on_conflict_do_update(&out);
    out = convertir_on_conflict_do_nothing(&out);

    out
}

fn convertir_on_conflict_do_update(sql: &str) -> String {
    // Admite formato en una o múltiples líneas, por ejemplo:
    // ON CONFLICT(periodo_id, codigo_regimen)
    // DO UPDATE SET
    //   campo = excluded.campo
    let re = Regex::new(
        r"(?is)\s+ON\s+CONFLICT\s*(?:\([^)]*\))?\s*DO\s+UPDATE\s+SET\s+",
    )
    .expect("regex ON CONFLICT DO UPDATE válida");

    let Some(m) = re.find(sql) else {
        return sql.to_string();
    };

    let prefijo = &sql[..m.start()];
    let asignaciones = reemplazar_excluded(&sql[m.end()..]);
    format!("{prefijo} ON DUPLICATE KEY UPDATE {asignaciones}")
}

fn convertir_on_conflict_do_nothing(sql: &str) -> String {
    let re = Regex::new(
        r"(?is)\s+ON\s+CONFLICT\s*(?:\([^)]*\))?\s*DO\s+NOTHING\s*;?\s*$",
    )
    .expect("regex ON CONFLICT DO NOTHING válida");

    if !re.is_match(sql) {
        return sql.to_string();
    }

    let sin_conflicto = re.replace(sql, "").to_string();
    let re_insert = Regex::new(r"(?i)^\s*INSERT\s+INTO\b").expect("regex INSERT válida");
    re_insert
        .replace(&sin_conflicto, "INSERT IGNORE INTO")
        .to_string()
}

fn reemplazar_excluded(input: &str) -> String {
    let re = Regex::new(r"(?i)\bexcluded\.([A-Za-z_][A-Za-z0-9_]*)")
        .expect("regex excluded válida");
    re.replace_all(input, "VALUES($1)").to_string()
}

/// Omite espacios y comentarios SQL iniciales y devuelve la primera palabra.
/// Esto permite reconocer correctamente consultas formateadas como `SELECT\n...`
/// o precedidas por comentarios, sin depender de un espacio literal después de
/// la palabra clave.
fn primera_palabra_sql(sql: &str) -> String {
    let bytes = sql.as_bytes();
    let mut i = 0usize;

    loop {
        while i < bytes.len() && bytes[i].is_ascii_whitespace() {
            i += 1;
        }

        // Comentario de línea: -- ...\n
        if i + 1 < bytes.len() && bytes[i] == b'-' && bytes[i + 1] == b'-' {
            i += 2;
            while i < bytes.len() && bytes[i] != b'\n' {
                i += 1;
            }
            continue;
        }

        // Comentario de bloque: /* ... */
        if i + 1 < bytes.len() && bytes[i] == b'/' && bytes[i + 1] == b'*' {
            i += 2;
            while i + 1 < bytes.len() && !(bytes[i] == b'*' && bytes[i + 1] == b'/') {
                i += 1;
            }
            if i + 1 < bytes.len() {
                i += 2;
            }
            continue;
        }

        break;
    }

    let inicio = i;
    while i < bytes.len() && (bytes[i].is_ascii_alphanumeric() || bytes[i] == b'_') {
        i += 1;
    }

    sql[inicio..i].to_ascii_uppercase()
}

pub fn es_pragma(sql: &str) -> bool {
    primera_palabra_sql(sql) == "PRAGMA"
}

pub fn es_lectura(sql: &str) -> bool {
    matches!(
        primera_palabra_sql(sql).as_str(),
        "SELECT" | "WITH" | "SHOW" | "DESCRIBE" | "DESC" | "EXPLAIN"
    )
}

pub fn valor_para_log(valor: &Value) -> String {
    match valor {
        Value::Null => "NULL".into(),
        Value::Bool(v) => v.to_string(),
        Value::Number(v) => v.to_string(),
        Value::String(v) => format!("string(len={})", v.len()),
        Value::Array(v) => format!("array(len={})", v.len()),
        Value::Object(v) => format!("object(len={})", v.len()),
    }
}

#[cfg(test)]
mod tests {
    use super::normalizar_sql;

    #[test]
    fn convierte_on_conflict_multilinea() {
        let sql = r#"
            INSERT INTO vigencias_periodo (
              periodo_id, codigo_regimen, nombre_regimen
            ) VALUES ($1, $2, $3)
            ON CONFLICT(
              periodo_id,
              codigo_regimen
            )
            DO UPDATE SET
              nombre_regimen = excluded.nombre_regimen,
              activo = 1
        "#;

        let convertido = normalizar_sql(sql);
        assert!(convertido.contains("ON DUPLICATE KEY UPDATE"));
        assert!(convertido.contains("nombre_regimen = VALUES(nombre_regimen)"));
        assert!(!convertido.to_uppercase().contains("ON CONFLICT"));
    }
}
