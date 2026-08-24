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
    out = out.replace("CURRENT_TIMESTAMP", "CURRENT_TIMESTAMP");
    out = out.replace("COLLATE NOCASE", "COLLATE utf8mb4_unicode_ci");
    out = out.replace("collate nocase", "COLLATE utf8mb4_unicode_ci");

    // SQLite usa || como concatenación; MariaDB usa CONCAT(). Los casos
    // complejos se migrarán progresivamente a endpoints de dominio. Para
    // consultas simples mantenemos PIPES_AS_CONCAT a nivel de sesión.

    // ON CONFLICT(col) DO UPDATE SET a = excluded.a -> ON DUPLICATE KEY UPDATE a = VALUES(a)
    if let Some(pos) = out.to_uppercase().find(" ON CONFLICT") {
        if let Some(update_pos_rel) = out[pos..].to_uppercase().find(" DO UPDATE SET ") {
            let update_pos = pos + update_pos_rel;
            let asignaciones = out[(update_pos + " DO UPDATE SET ".len())..].to_string();
            let asignaciones = reemplazar_excluded(&asignaciones);
            out = format!("{} ON DUPLICATE KEY UPDATE {}", &out[..pos], asignaciones);
        }
    }

    // SQLite ON CONFLICT DO NOTHING.
    let upper = out.to_uppercase();
    if let Some(pos) = upper.find(" ON CONFLICT") {
        if upper[pos..].contains("DO NOTHING") {
            let mut prefijo = out[..pos].to_string();
            prefijo = prefijo.replacen("INSERT INTO", "INSERT IGNORE INTO", 1);
            out = prefijo;
        }
    }

    out
}

fn reemplazar_excluded(input: &str) -> String {
    let mut salida = input.to_string();
    loop {
        let lower = salida.to_lowercase();
        let Some(pos) = lower.find("excluded.") else { break };
        let inicio = pos + "excluded.".len();
        let resto = &salida[inicio..];
        let fin_rel = resto
            .find(|c: char| !(c.is_ascii_alphanumeric() || c == '_'))
            .unwrap_or(resto.len());
        let columna = &resto[..fin_rel];
        let reemplazo = format!("VALUES({columna})");
        salida.replace_range(pos..inicio + fin_rel, &reemplazo);
    }
    salida
}

pub fn es_pragma(sql: &str) -> bool {
    sql.trim_start().to_uppercase().starts_with("PRAGMA ")
}

pub fn es_lectura(sql: &str) -> bool {
    let upper = sql.trim_start().to_uppercase();
    upper.starts_with("SELECT ")
        || upper.starts_with("WITH ")
        || upper.starts_with("SHOW ")
        || upper.starts_with("DESCRIBE ")
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
