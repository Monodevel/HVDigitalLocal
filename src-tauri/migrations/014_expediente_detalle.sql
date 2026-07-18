PRAGMA foreign_keys = ON;

-- ============================================================
-- FASE 5 - VISTA CONSOLIDADA DEL EXPEDIENTE
-- ============================================================

DROP VIEW IF EXISTS vw_expediente_detalle;

CREATE VIEW vw_expediente_detalle AS
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

    per.nombre AS periodo_nombre,
    per.anio AS periodo_anio,

    cd.id AS calificador_directo_id,
    gc.abreviatura AS calificador_grado,
    cd.nombres AS calificador_nombres,
    cd.apellido_paterno AS calificador_apellido_paterno,
    cd.apellido_materno AS calificador_apellido_materno,
    cd.unidad_nombre AS calificador_unidad,
    cd.unidad_sigla AS calificador_unidad_sigla,
    cd.puesto AS calificador_puesto,

    hv.id AS hoja_vida_id,
    hv.estado AS hoja_vida_estado,

    COALESCE((
      SELECT COUNT(*)
      FROM anotaciones a
      WHERE
        a.hoja_vida_id = hv.id
        AND a.estado = 'estampada'
    ), 0) AS total_anotaciones,

    COALESCE((
      SELECT COUNT(*)
      FROM borradores_anotacion b
      WHERE
        b.hoja_vida_id = hv.id
        AND b.estado IN ('borrador', 'validado')
    ), 0) AS total_borradores

FROM expedientes_calificacion e

INNER JOIN designaciones_calificacion d
    ON d.id = e.designacion_id

INNER JOIN personas p
    ON p.id = e.persona_id

LEFT JOIN grados g
    ON g.id = d.grado_id_inicio

LEFT JOIN calidades_personal cp
    ON cp.id = d.calidad_personal_id_inicio

INNER JOIN categorias_personal c
    ON c.id = e.categoria_id

INNER JOIN periodos per
    ON per.id = e.periodo_id

INNER JOIN calificadores_directos cd
    ON cd.id = d.calificador_directo_id

INNER JOIN grados gc
    ON gc.id = cd.grado_id

LEFT JOIN expediente_hojas_vida ehv
    ON ehv.expediente_id = e.id

LEFT JOIN hojas_vida hv
    ON hv.id = ehv.hoja_vida_id

WHERE
    e.estado <> 'ANULADO'
    AND d.estado <> 'ANULADA';


DROP VIEW IF EXISTS vw_instrumentos_expediente_detalle;

CREATE VIEW vw_instrumentos_expediente_detalle AS
SELECT
    i.id AS instrumento_id,
    i.expediente_id,
    i.tipo_instrumento,
    i.numero,
    i.aplica,
    i.estado,
    i.version_formato,
    i.fecha_apertura,
    i.fecha_cierre,
    i.creado_en,
    i.actualizado_en,

    CASE
      WHEN i.tipo_instrumento = 'HOJA_VIDA'
        THEN 'Hoja de Vida'
      WHEN i.tipo_instrumento = 'HC1'
        THEN 'HC1'
      WHEN i.tipo_instrumento = 'HC2'
        THEN 'HC2'
      WHEN i.tipo_instrumento = 'EVINT'
        THEN 'EVINT ' || i.numero
      WHEN i.tipo_instrumento = 'HAM'
        THEN 'HAM'
      WHEN i.tipo_instrumento = 'HAPSEM'
        THEN 'HAPSEM'
      ELSE i.tipo_instrumento
    END AS nombre_instrumento,

    CASE
      WHEN i.estado = 'NO_INICIADO' THEN 0
      WHEN i.estado = 'EN_ELABORACION' THEN 35
      WHEN i.estado = 'PENDIENTE_FIRMA' THEN 80
      WHEN i.estado = 'COMPLETADO' THEN 100
      WHEN i.estado = 'CERRADO' THEN 100
      WHEN i.estado = 'NO_APLICA' THEN 100
      ELSE 0
    END AS porcentaje_avance

FROM instrumentos_expediente i;


DROP VIEW IF EXISTS vw_ultimas_anotaciones_expediente;

CREATE VIEW vw_ultimas_anotaciones_expediente AS
SELECT
    e.id AS expediente_id,
    a.id AS anotacion_id,
    a.fecha_anotacion,
    a.titulo_final,
    a.cuerpo_final,
    a.color_semantico,
    a.color_hex,
    a.origen,
    a.computa_calificacion,
    a.estado,

    c.numero AS concepto_numero,
    c.nombre AS concepto_nombre,

    p.texto_visual AS puntaje_visual,
    p.texto_literal AS puntaje_literal

FROM expedientes_calificacion e

INNER JOIN expediente_hojas_vida ehv
    ON ehv.expediente_id = e.id

INNER JOIN anotaciones a
    ON a.hoja_vida_id = ehv.hoja_vida_id

LEFT JOIN conceptos_calificacion c
    ON c.id = a.concepto_id

LEFT JOIN puntajes_anotacion p
    ON p.id = a.puntaje_id

WHERE a.estado = 'estampada';
