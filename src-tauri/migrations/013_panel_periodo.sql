PRAGMA foreign_keys = ON;

-- ============================================================
-- FASE 4 - PANEL PRINCIPAL DEL PERÍODO Y RESUMEN DE EXPEDIENTES
-- ============================================================

DROP VIEW IF EXISTS vw_panel_periodo_activo;

CREATE VIEW vw_panel_periodo_activo AS
SELECT
    per.id AS periodo_id,
    per.nombre AS periodo_nombre,
    per.anio AS periodo_anio,
    per.fecha_inicio,
    per.fecha_termino,
    per.estado AS periodo_estado,

    cd.id AS calificador_directo_id,
    g.abreviatura AS calificador_grado,
    cd.nombres AS calificador_nombres,
    cd.apellido_paterno AS calificador_apellido_paterno,
    cd.apellido_materno AS calificador_apellido_materno,
    cd.unidad_nombre,
    cd.unidad_sigla,
    cd.puesto,

    (
      SELECT COUNT(*)
      FROM designaciones_calificacion d
      WHERE
        d.periodo_id = per.id
        AND d.estado <> 'ANULADA'
    ) AS total_calificados,

    (
      SELECT COUNT(*)
      FROM expedientes_calificacion e
      WHERE
        e.periodo_id = per.id
        AND e.estado IN (
          'CONFIGURADO',
          'ABIERTO',
          'EN_PROCESO',
          'PENDIENTE_CIERRE'
        )
    ) AS expedientes_abiertos,

    (
      SELECT COUNT(*)
      FROM expedientes_calificacion e
      WHERE
        e.periodo_id = per.id
        AND e.estado = 'CERRADO'
    ) AS expedientes_cerrados,

    (
      SELECT COUNT(*)
      FROM instrumentos_expediente i
      INNER JOIN expedientes_calificacion e
        ON e.id = i.expediente_id
      WHERE
        e.periodo_id = per.id
        AND i.tipo_instrumento = 'EVINT'
        AND i.aplica = 1
        AND i.estado NOT IN ('COMPLETADO', 'CERRADO')
    ) AS evint_pendientes,

    (
      SELECT COUNT(*)
      FROM instrumentos_expediente i
      INNER JOIN expedientes_calificacion e
        ON e.id = i.expediente_id
      WHERE
        e.periodo_id = per.id
        AND i.tipo_instrumento = 'HC1'
        AND i.aplica = 1
        AND i.estado NOT IN ('COMPLETADO', 'CERRADO')
    ) AS hc1_pendientes,

    (
      SELECT COUNT(*)
      FROM instrumentos_expediente i
      INNER JOIN expedientes_calificacion e
        ON e.id = i.expediente_id
      WHERE
        e.periodo_id = per.id
        AND i.tipo_instrumento = 'HC2'
        AND i.aplica = 1
        AND i.estado NOT IN ('COMPLETADO', 'CERRADO')
    ) AS hc2_pendientes,

    (
      SELECT COUNT(*)
      FROM instrumentos_expediente i
      INNER JOIN expedientes_calificacion e
        ON e.id = i.expediente_id
      WHERE
        e.periodo_id = per.id
        AND i.estado = 'PENDIENTE_FIRMA'
    ) AS documentos_pendientes_firma

FROM configuracion_inicial ci

INNER JOIN periodos per
    ON per.id = ci.periodo_activo_id

INNER JOIN calificadores_directos cd
    ON cd.id = ci.calificador_directo_id

INNER JOIN grados g
    ON g.id = cd.grado_id

WHERE ci.id = 1;


DROP VIEW IF EXISTS vw_resumen_expedientes_periodo_activo;

CREATE VIEW vw_resumen_expedientes_periodo_activo AS
SELECT
    e.id AS expediente_id,
    e.estado AS expediente_estado,
    e.fecha_apertura,
    e.fecha_cierre,

    d.id AS designacion_id,
    d.persona_id,
    d.periodo_id,
    d.categoria_id,
    d.fecha_inicio,
    d.fecha_termino,
    d.unidad_nombre,
    d.puesto,

    p.run,
    p.nombres,
    p.apellido_paterno,
    p.apellido_materno,

    COALESCE(g.abreviatura, cp.abreviatura) AS grado_calidad_abreviatura,
    COALESCE(g.nombre, cp.nombre) AS grado_calidad_nombre,

    c.codigo AS categoria_codigo,
    c.nombre AS categoria_nombre,

    hv.id AS hoja_vida_id,

    COALESCE((
      SELECT COUNT(*)
      FROM anotaciones a
      WHERE
        a.hoja_vida_id = hv.id
        AND a.estado = 'estampada'
    ), 0) AS total_anotaciones,

    COALESCE((
      SELECT estado
      FROM instrumentos_expediente i
      WHERE
        i.expediente_id = e.id
        AND i.tipo_instrumento = 'HOJA_VIDA'
        AND i.numero = 1
      LIMIT 1
    ), 'NO_INICIADO') AS hoja_vida_estado,

    COALESCE((
      SELECT estado
      FROM instrumentos_expediente i
      WHERE
        i.expediente_id = e.id
        AND i.tipo_instrumento = 'HC1'
        AND i.numero = 1
      LIMIT 1
    ), 'NO_INICIADO') AS hc1_estado,

    COALESCE((
      SELECT estado
      FROM instrumentos_expediente i
      WHERE
        i.expediente_id = e.id
        AND i.tipo_instrumento = 'HC2'
        AND i.numero = 1
      LIMIT 1
    ), 'NO_INICIADO') AS hc2_estado,

    COALESCE((
      SELECT estado
      FROM instrumentos_expediente i
      WHERE
        i.expediente_id = e.id
        AND i.tipo_instrumento = 'EVINT'
        AND i.numero = 1
      LIMIT 1
    ), 'NO_INICIADO') AS evint_1_estado,

    COALESCE((
      SELECT estado
      FROM instrumentos_expediente i
      WHERE
        i.expediente_id = e.id
        AND i.tipo_instrumento = 'EVINT'
        AND i.numero = 2
      LIMIT 1
    ), 'NO_INICIADO') AS evint_2_estado,

    COALESCE((
      SELECT estado
      FROM instrumentos_expediente i
      WHERE
        i.expediente_id = e.id
        AND i.tipo_instrumento = 'HAM'
        AND i.numero = 1
      LIMIT 1
    ), 'NO_INICIADO') AS ham_estado,

    COALESCE((
      SELECT estado
      FROM instrumentos_expediente i
      WHERE
        i.expediente_id = e.id
        AND i.tipo_instrumento = 'HAPSEM'
        AND i.numero = 1
      LIMIT 1
    ), 'NO_INICIADO') AS hapsem_estado

FROM expedientes_calificacion e

INNER JOIN designaciones_calificacion d
    ON d.id = e.designacion_id

INNER JOIN configuracion_inicial ci
    ON ci.periodo_activo_id = e.periodo_id
   AND ci.id = 1

INNER JOIN personas p
    ON p.id = e.persona_id

LEFT JOIN grados g
    ON g.id = d.grado_id_inicio

LEFT JOIN calidades_personal cp
    ON cp.id = d.calidad_personal_id_inicio

INNER JOIN categorias_personal c
    ON c.id = e.categoria_id

LEFT JOIN expediente_hojas_vida ehv
    ON ehv.expediente_id = e.id

LEFT JOIN hojas_vida hv
    ON hv.id = ehv.hoja_vida_id

WHERE
    d.estado <> 'ANULADA'
    AND e.estado <> 'ANULADO';
