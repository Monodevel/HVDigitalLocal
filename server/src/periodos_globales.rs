use super::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AdminPeriodoRequest {
    anio_inicio: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AdminPeriodoEstadoRequest {
    estado: String,
}

pub(crate) async fn listar_periodos(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Value>, (StatusCode, Json<ApiError>)> {
    let sesion = autorizar(&state, &headers).await?;
    asegurar_espejos_usuario(&state, sesion.usuario_id).await?;

    let rows = sqlx::query(
        "SELECT p.id, pg.id AS periodo_global_id, pg.nombre, pg.anio, pg.fecha_inicio, pg.fecha_termino, pg.estado \
         FROM periodos_globales pg \
         INNER JOIN periodos p ON p.periodo_global_id = pg.id AND p.propietario_usuario_id = ? \
         ORDER BY pg.fecha_inicio DESC, pg.id DESC"
    )
    .bind(sesion.usuario_id)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    Ok(Json(Value::Array(
        rows.iter()
            .map(row_to_json)
            .collect::<Result<Vec<_>, _>>()
            .map_err(internal)?,
    )))
}

pub(crate) async fn seleccionar_periodo(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<Json<Value>, (StatusCode, Json<ApiError>)> {
    let sesion = autorizar(&state, &headers).await?;
    asegurar_espejos_usuario(&state, sesion.usuario_id).await?;

    let row = sqlx::query(
        "SELECT p.id, p.periodo_global_id, pg.estado \
         FROM periodos p \
         INNER JOIN periodos_globales pg ON pg.id = p.periodo_global_id \
         WHERE p.id = ? AND p.propietario_usuario_id = ? LIMIT 1"
    )
    .bind(id)
    .bind(sesion.usuario_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?
    .ok_or_else(|| not_found("El período no está disponible para el usuario autenticado."))?;

    let periodo_global_id: i64 = row.try_get("periodo_global_id").map_err(internal)?;
    sqlx::query(
        "UPDATE configuracion_usuario \
         SET periodo_activo_id = ?, periodo_global_activo_id = ?, \
             estado = CASE WHEN estado IN ('NO_CONFIGURADA','EN_PROGRESO') THEN 'CONFIGURADA_SIN_PERSONAL' ELSE estado END, \
             paso_actual = GREATEST(paso_actual, 3) \
         WHERE usuario_id = ?"
    )
    .bind(id)
    .bind(periodo_global_id)
    .bind(sesion.usuario_id)
    .execute(&state.pool)
    .await
    .map_err(internal)?;

    auditoria(
        &state.pool,
        sesion.usuario_id,
        "SELECCIONAR_PERIODO_GLOBAL",
        "periodo_global",
        Some(periodo_global_id),
        Some(serde_json::json!({"periodoTrabajoId": id})),
    )
    .await;

    Ok(Json(serde_json::json!({
        "ok": true,
        "periodoId": id,
        "periodoGlobalId": periodo_global_id,
        "estado": row.try_get::<String, _>("estado").unwrap_or_else(|_| "cerrado".into())
    })))
}

pub(crate) async fn admin_listar_periodos(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Value>, (StatusCode, Json<ApiError>)> {
    let _ = autorizar_admin(&state, &headers).await?;
    let rows = sqlx::query(
        "SELECT pg.id, pg.nombre, pg.anio, pg.fecha_inicio, pg.fecha_termino, pg.estado, pg.creado_en, pg.actualizado_en, \
                (SELECT COUNT(*) FROM configuracion_usuario cu WHERE cu.periodo_global_activo_id = pg.id) AS usuarios_seleccionado \
         FROM periodos_globales pg ORDER BY pg.fecha_inicio DESC, pg.id DESC"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    Ok(Json(Value::Array(
        rows.iter()
            .map(row_to_json)
            .collect::<Result<Vec<_>, _>>()
            .map_err(internal)?,
    )))
}

pub(crate) async fn admin_crear_periodo(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<AdminPeriodoRequest>,
) -> Result<Json<Value>, (StatusCode, Json<ApiError>)> {
    let admin = autorizar_admin(&state, &headers).await?;
    let actual = chrono::Local::now()
        .format("%Y")
        .to_string()
        .parse::<i32>()
        .unwrap_or(2026);
    if req.anio_inicio < actual - 10 || req.anio_inicio > actual + 10 {
        return Err(bad("El año seleccionado no es válido."));
    }

    let anio_fin = req.anio_inicio + 1;
    let nombre = format!("{}-{}", req.anio_inicio, anio_fin);
    let fecha_inicio = format!("{}-06-01", req.anio_inicio);
    let fecha_termino = format!("{}-07-31", anio_fin);

    let existente: Option<i64> = sqlx::query_scalar(
        "SELECT id FROM periodos_globales WHERE anio = ? LIMIT 1"
    )
    .bind(req.anio_inicio)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?;
    if existente.is_some() {
        return Err(bad("Ya existe un período global para ese año."));
    }

    let mut tx = state.pool.begin().await.map_err(internal)?;
    let result = sqlx::query(
        "INSERT INTO periodos_globales(nombre, anio, fecha_inicio, fecha_termino, estado, creado_por_usuario_id) \
         VALUES(?,?,?,?, 'cerrado', ?)"
    )
    .bind(&nombre)
    .bind(req.anio_inicio)
    .bind(&fecha_inicio)
    .bind(&fecha_termino)
    .bind(admin.usuario_id)
    .execute(&mut *tx)
    .await
    .map_err(internal)?;
    let periodo_global_id = result.last_insert_id() as i64;

    let vigencias = [
        ("OFICIALES", "Oficiales", format!("{}-07-01", req.anio_inicio), format!("{}-06-30", anio_fin), 1),
        ("CP_TROPA_JORNAL", "Cuadro Permanente, Tropa Profesional y Personal a Jornal", format!("{}-06-01", req.anio_inicio), format!("{}-05-31", anio_fin), 2),
        ("PERSONAL_CIVIL", "Personal civil", format!("{}-08-01", req.anio_inicio), format!("{}-07-31", anio_fin), 3),
    ];

    for (codigo, nombre_regimen, inicio, termino, orden) in vigencias {
        sqlx::query(
            "INSERT INTO vigencias_periodo_global(periodo_global_id,codigo_regimen,nombre_regimen,fecha_inicio,fecha_termino,orden,activo) \
             VALUES(?,?,?,?,?,?,1)"
        )
        .bind(periodo_global_id)
        .bind(codigo)
        .bind(nombre_regimen)
        .bind(inicio)
        .bind(termino)
        .bind(orden)
        .execute(&mut *tx)
        .await
        .map_err(internal)?;
    }

    tx.commit().await.map_err(internal)?;
    auditoria(&state.pool, admin.usuario_id, "CREAR_PERIODO_GLOBAL", "periodo_global", Some(periodo_global_id), None).await;

    Ok(Json(serde_json::json!({
        "id": periodo_global_id,
        "nombre": nombre,
        "anio": req.anio_inicio,
        "fechaInicio": fecha_inicio,
        "fechaTermino": fecha_termino,
        "estado": "CERRADO"
    })))
}

pub(crate) async fn admin_cambiar_estado_periodo(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
    Json(req): Json<AdminPeriodoEstadoRequest>,
) -> Result<Json<Value>, (StatusCode, Json<ApiError>)> {
    let admin = autorizar_admin(&state, &headers).await?;
    let estado = req.estado.trim().to_ascii_lowercase();
    if estado != "abierto" && estado != "cerrado" {
        return Err(bad("El estado debe ser ABIERTO o CERRADO."));
    }

    let actualizado = sqlx::query("UPDATE periodos_globales SET estado = ? WHERE id = ?")
        .bind(&estado)
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(internal)?;
    if actualizado.rows_affected() == 0 {
        return Err(not_found("El período global no existe."));
    }

    sincronizar_estado_espejos(&state, id, &estado).await?;
    auditoria(
        &state.pool,
        admin.usuario_id,
        if estado == "abierto" { "ABRIR_PERIODO_GLOBAL" } else { "CERRAR_PERIODO_GLOBAL" },
        "periodo_global",
        Some(id),
        None,
    )
    .await;

    Ok(Json(serde_json::json!({"ok": true, "id": id, "estado": estado.to_ascii_uppercase()})))
}

async fn asegurar_espejos_usuario(
    state: &AppState,
    usuario_id: i64,
) -> Result<(), (StatusCode, Json<ApiError>)> {
    let globales = sqlx::query(
        "SELECT id,nombre,anio,DATE_FORMAT(fecha_inicio,'%Y-%m-%d') AS fecha_inicio,DATE_FORMAT(fecha_termino,'%Y-%m-%d') AS fecha_termino,estado \
         FROM periodos_globales ORDER BY id"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    let mut conn = state.pool.acquire().await.map_err(internal)?;
    set_usuario(&mut conn, usuario_id).await?;

    for global in globales {
        let gid: i64 = global.try_get("id").map_err(internal)?;
        let nombre: String = global.try_get("nombre").map_err(internal)?;
        let anio: i32 = global.try_get("anio").map_err(internal)?;
        let fecha_inicio: String = global.try_get("fecha_inicio").map_err(internal)?;
        let fecha_termino: String = global.try_get("fecha_termino").map_err(internal)?;
        let estado: String = global.try_get("estado").map_err(internal)?;

        let existente: Option<i64> = sqlx::query_scalar(
            "SELECT id FROM periodos WHERE propietario_usuario_id = ? AND periodo_global_id = ? LIMIT 1"
        )
        .bind(usuario_id)
        .bind(gid)
        .fetch_optional(&mut *conn)
        .await
        .map_err(internal)?;

        let periodo_id = if let Some(pid) = existente {
            sqlx::query(
                "UPDATE periodos SET nombre=?,anio=?,fecha_inicio=?,fecha_termino=?,estado=? WHERE id=?"
            )
            .bind(&nombre)
            .bind(anio)
            .bind(&fecha_inicio)
            .bind(&fecha_termino)
            .bind(&estado)
            .bind(pid)
            .execute(&mut *conn)
            .await
            .map_err(internal)?;
            pid
        } else {
            let por_anio: Option<i64> = sqlx::query_scalar(
                "SELECT id FROM periodos WHERE propietario_usuario_id = ? AND anio = ? LIMIT 1"
            )
            .bind(usuario_id)
            .bind(anio)
            .fetch_optional(&mut *conn)
            .await
            .map_err(internal)?;

            if let Some(pid) = por_anio {
                sqlx::query(
                    "UPDATE periodos SET periodo_global_id=?,nombre=?,fecha_inicio=?,fecha_termino=?,estado=? WHERE id=?"
                )
                .bind(gid)
                .bind(&nombre)
                .bind(&fecha_inicio)
                .bind(&fecha_termino)
                .bind(&estado)
                .bind(pid)
                .execute(&mut *conn)
                .await
                .map_err(internal)?;
                pid
            } else {
                sqlx::query(
                    "INSERT INTO periodos(nombre,anio,fecha_inicio,fecha_termino,estado,periodo_global_id) VALUES(?,?,?,?,?,?)"
                )
                .bind(&nombre)
                .bind(anio)
                .bind(&fecha_inicio)
                .bind(&fecha_termino)
                .bind(&estado)
                .bind(gid)
                .execute(&mut *conn)
                .await
                .map_err(internal)?
                .last_insert_id() as i64
            }
        };

        let vigencias = sqlx::query(
            "SELECT codigo_regimen,nombre_regimen,DATE_FORMAT(fecha_inicio,'%Y-%m-%d') AS fecha_inicio,DATE_FORMAT(fecha_termino,'%Y-%m-%d') AS fecha_termino,orden,activo \
             FROM vigencias_periodo_global WHERE periodo_global_id=? ORDER BY orden"
        )
        .bind(gid)
        .fetch_all(&mut *conn)
        .await
        .map_err(internal)?;

        for vigencia in vigencias {
            sqlx::query(
                "INSERT INTO vigencias_periodo(periodo_id,codigo_regimen,nombre_regimen,fecha_inicio,fecha_termino,orden,activo) \
                 VALUES(?,?,?,?,?,?,?) \
                 ON DUPLICATE KEY UPDATE nombre_regimen=VALUES(nombre_regimen),fecha_inicio=VALUES(fecha_inicio),fecha_termino=VALUES(fecha_termino),orden=VALUES(orden),activo=VALUES(activo)"
            )
            .bind(periodo_id)
            .bind(vigencia.try_get::<String,_>("codigo_regimen").map_err(internal)?)
            .bind(vigencia.try_get::<String,_>("nombre_regimen").map_err(internal)?)
            .bind(vigencia.try_get::<String,_>("fecha_inicio").map_err(internal)?)
            .bind(vigencia.try_get::<String,_>("fecha_termino").map_err(internal)?)
            .bind(vigencia.try_get::<i64,_>("orden").map_err(internal)?)
            .bind(vigencia.try_get::<i64,_>("activo").map_err(internal)?)
            .execute(&mut *conn)
            .await
            .map_err(internal)?;
        }
    }

    Ok(())
}

async fn sincronizar_estado_espejos(
    state: &AppState,
    periodo_global_id: i64,
    estado: &str,
) -> Result<(), (StatusCode, Json<ApiError>)> {
    let rows = sqlx::query(
        "SELECT id, propietario_usuario_id FROM periodos WHERE periodo_global_id = ?"
    )
    .bind(periodo_global_id)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    for row in rows {
        let periodo_id: i64 = row.try_get("id").map_err(internal)?;
        let usuario_id: i64 = row.try_get("propietario_usuario_id").map_err(internal)?;
        let mut conn = state.pool.acquire().await.map_err(internal)?;
        set_usuario(&mut conn, usuario_id).await?;
        sqlx::query("UPDATE periodos SET estado=? WHERE id=?")
            .bind(estado)
            .bind(periodo_id)
            .execute(&mut *conn)
            .await
            .map_err(internal)?;
    }

    Ok(())
}
