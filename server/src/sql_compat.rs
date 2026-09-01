use regex::{Captures, Regex};
use serde_json::Value;

pub fn normalizar_sql(sql: &str) -> String {
    let mut out = sql.trim().to_string();
    for indice in (1..=99).rev() { out = out.replace(&format!("${indice}"), "?"); }
    out = out.replace("INSERT OR IGNORE", "INSERT IGNORE");
    out = out.replace("insert or ignore", "INSERT IGNORE");
    out = out.replace("AUTOINCREMENT", "AUTO_INCREMENT");
    out = out.replace("autoincrement", "AUTO_INCREMENT");
    out = out.replace("COLLATE NOCASE", "COLLATE utf8mb4_unicode_ci");
    out = out.replace("collate nocase", "COLLATE utf8mb4_unicode_ci");
    out = convertir_on_conflict_do_update(&out);
    out = convertir_on_conflict_do_nothing(&out);
    out
}

fn convertir_on_conflict_do_update(sql: &str) -> String {
    let re = Regex::new(r"(?is)\s+ON\s+CONFLICT\s*(?:\([^)]*\))?\s*DO\s+UPDATE\s+SET\s+").expect("regex ON CONFLICT DO UPDATE válida");
    let Some(m) = re.find(sql) else { return sql.to_string(); };
    let prefijo = &sql[..m.start()];
    let asignaciones = reemplazar_excluded(&sql[m.end()..]);
    format!("{prefijo} ON DUPLICATE KEY UPDATE {asignaciones}")
}

fn convertir_on_conflict_do_nothing(sql: &str) -> String {
    let re = Regex::new(r"(?is)\s+ON\s+CONFLICT\s*(?:\([^)]*\))?\s*DO\s+NOTHING\s*;?\s*$").expect("regex ON CONFLICT DO NOTHING válida");
    if !re.is_match(sql) { return sql.to_string(); }
    let sin_conflicto = re.replace(sql, "").to_string();
    let re_insert = Regex::new(r"(?i)^\s*INSERT\s+INTO\b").expect("regex INSERT válida");
    re_insert.replace(&sin_conflicto, "INSERT IGNORE INTO").to_string()
}

fn reemplazar_excluded(input: &str) -> String {
    Regex::new(r"(?i)\bexcluded\.([A-Za-z_][A-Za-z0-9_]*)").expect("regex excluded válida").replace_all(input, "VALUES($1)").to_string()
}

fn primera_palabra_sql(sql: &str) -> String {
    let bytes = sql.as_bytes(); let mut i=0usize;
    loop {
        while i<bytes.len() && bytes[i].is_ascii_whitespace(){i+=1;}
        if i+1<bytes.len() && bytes[i]==b'-' && bytes[i+1]==b'-'{i+=2;while i<bytes.len()&&bytes[i]!=b'\n'{i+=1;}continue;}
        if i+1<bytes.len() && bytes[i]==b'/' && bytes[i+1]==b'*'{i+=2;while i+1<bytes.len()&&!(bytes[i]==b'*'&&bytes[i+1]==b'/'){i+=1;}if i+1<bytes.len(){i+=2;}continue;}
        break;
    }
    let inicio=i; while i<bytes.len()&&(bytes[i].is_ascii_alphanumeric()||bytes[i]==b'_'){i+=1;} sql[inicio..i].to_ascii_uppercase()
}

pub fn es_pragma(sql:&str)->bool{primera_palabra_sql(sql)=="PRAGMA"}
pub fn es_lectura(sql:&str)->bool{matches!(primera_palabra_sql(sql).as_str(),"SELECT"|"WITH"|"SHOW"|"DESCRIBE"|"DESC"|"EXPLAIN")}
pub fn es_ddl_notas_legacy(sql:&str)->bool{let u=sql.to_uppercase();primera_palabra_sql(sql)=="CREATE"&&(u.contains("NOTAS_TAREAS_CALIFICADOR")||u.contains("IX_NOTAS_TAREAS_")||u.contains("TRG_NOTAS_TAREAS_"))}

const TABLAS_PRIVADAS:&[&str]=&[
 "periodos","vigencias_periodo","personas","designaciones_calificacion","expedientes_calificacion","instrumentos_expediente","expediente_hojas_vida","hojas_vida","borradores_anotacion","anotaciones","evaluaciones_evint","respuestas_evint","resoluciones_anotacion","resoluciones_documentales","puntos_resolucion","hc2_calificaciones","hc1_documentos","ham_documentos","hapsem_documentos","notas_tareas_calificador"
];
const VISTAS_PRIVADAS:&[(&str,&str,&str)]=&[
 ("vw_expediente_detalle","expedientes_calificacion","expediente_id"),("vw_instrumentos_expediente_detalle","instrumentos_expediente","instrumento_id"),("vw_ultimas_anotaciones_expediente","anotaciones","anotacion_id"),("vw_hoja_vida_resumen","hojas_vida","hoja_vida_id"),("vw_borradores_hoja_vida","borradores_anotacion","borrador_id"),("vw_anotaciones_hoja_vida","anotaciones","anotacion_id"),("vw_resoluciones_anotacion_disponibles","resoluciones_anotacion","id"),("vw_resoluciones_documentales","resoluciones_documentales","resolucion_id"),("vw_resoluciones_emitidas_disponibles","resoluciones_documentales","resolucion_id"),("vw_evint_encabezado","evaluaciones_evint","evaluacion_evint_id"),("vw_designaciones_periodo_activo","designaciones_calificacion","designacion_id")
];

fn palabra_reservada_alias(v:&str)->bool{matches!(v.to_ascii_uppercase().as_str(),"WHERE"|"INNER"|"LEFT"|"RIGHT"|"FULL"|"CROSS"|"JOIN"|"ON"|"ORDER"|"GROUP"|"LIMIT"|"HAVING"|"UNION"|"OFFSET"|"SET"|"VALUES")}
fn scope_fuente(sql:&str,fuente:&str,subconsulta:&str)->String{
 let patron=format!(r"(?i)\b(FROM|JOIN)\s+{}\b(?:\s+(?:AS\s+)?([A-Za-z_][A-Za-z0-9_]*))?",regex::escape(fuente));
 let re=Regex::new(&patron).expect("regex de scope válida");
 re.replace_all(sql,|caps:&Captures|{let verbo=caps.get(1).map(|m|m.as_str()).unwrap_or("FROM");let capturado=caps.get(2).map(|m|m.as_str());let(alias,sufijo)=match capturado{Some(v)if !palabra_reservada_alias(v)=>(v,String::new()),Some(v)=>(fuente,format!(" {v}")),None=>(fuente,String::new())};format!("{verbo} ({subconsulta}) AS {alias}{sufijo}")}).to_string()
}

pub fn aplicar_scope_lectura(sql:&str,usuario_id:i64)->String{
 let mut out=sql.to_string();
 for(vista,tabla,llave)in VISTAS_PRIVADAS{let sub=format!("SELECT v.* FROM {vista} v INNER JOIN {tabla} own ON own.id = v.{llave} WHERE own.propietario_usuario_id = {usuario_id}");out=scope_fuente(&out,vista,&sub);}
 for vista in ["vw_panel_periodo_activo","vw_resumen_expedientes_periodo_activo"]{let sub=format!("SELECT v.* FROM {vista} v INNER JOIN usuarios u ON u.id = {usuario_id} WHERE v.calificador_directo_id = u.calificador_directo_id");out=scope_fuente(&out,vista,&sub);}
 for tabla in TABLAS_PRIVADAS{let sub=format!("SELECT * FROM {tabla} WHERE propietario_usuario_id = {usuario_id}");out=scope_fuente(&out,tabla,&sub);}
 let sub=format!("SELECT cd.* FROM calificadores_directos cd INNER JOIN usuarios u ON u.calificador_directo_id = cd.id WHERE u.id = {usuario_id}");scope_fuente(&out,"calificadores_directos",&sub)
}

pub fn valor_para_log(valor:&Value)->String{match valor{Value::Null=>"NULL".into(),Value::Bool(v)=>v.to_string(),Value::Number(v)=>v.to_string(),Value::String(v)=>format!("string(len={})",v.len()),Value::Array(v)=>format!("array(len={})",v.len()),Value::Object(v)=>format!("object(len={})",v.len())}}

#[cfg(test)]mod tests{
 use super::{aplicar_scope_lectura,es_ddl_notas_legacy,normalizar_sql};
 #[test]fn convierte_on_conflict_multilinea(){let sql="INSERT INTO vigencias_periodo (periodo_id,codigo_regimen) VALUES ($1,$2) ON CONFLICT(periodo_id,codigo_regimen) DO UPDATE SET codigo_regimen=excluded.codigo_regimen";let c=normalizar_sql(sql);assert!(c.contains("ON DUPLICATE KEY UPDATE"));}
 #[test]fn detecta_ddl_legacy_notas(){assert!(es_ddl_notas_legacy("CREATE TABLE IF NOT EXISTS notas_tareas_calificador (id INTEGER)"));}
 #[test]fn scopea_tabla_con_alias(){let s=aplicar_scope_lectura("SELECT p.id FROM periodos p WHERE p.estado='abierto'",7);assert!(s.contains("propietario_usuario_id = 7"));assert!(s.contains("AS p WHERE"));}
 #[test]fn scopea_join_privado_y_deja_catalogo(){let s=aplicar_scope_lectura("SELECT h.id FROM hojas_vida h INNER JOIN personas p ON p.id=h.persona_id INNER JOIN grados g ON g.id=h.grado_id_inicio",3);assert!(s.matches("propietario_usuario_id = 3").count()>=2);assert!(s.contains("JOIN grados g"));}
}
