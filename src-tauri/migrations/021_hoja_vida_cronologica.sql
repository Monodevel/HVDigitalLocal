PRAGMA foreign_keys = ON;

-- ============================================================
-- HOJA DE VIDA CRONOLÓGICA
-- Resumen por tipo de anotación y correlativo de estampado.
-- ============================================================

DROP VIEW IF EXISTS vw_anotaciones_hoja_vida;
DROP VIEW IF EXISTS vw_hoja_vida_resumen;

CREATE VIEW vw_hoja_vida_resumen AS
SELECT
    hv.id AS hoja_vida_id,
    hv.persona_id,
    hv.periodo_id,
    hv.categoria_id,
    hv.fecha_inicio,
    hv.fecha_termino,
    hv.estado AS hoja_vida_estado,

    p.run,
    p.nombres,
    p.apellido_paterno,
    p.apellido_materno,

    COALESCE(g.abreviatura, cp.abreviatura) AS grado_calidad_abreviatura,
    COALESCE(g.nombre, cp.nombre) AS grado_calidad_nombre,

    c.codigo AS categoria_codigo,
    c.nombre AS categoria_nombre,
    per.nombre AS periodo_nombre,

    COALESCE((
        SELECT COUNT(*)
        FROM anotaciones a
        WHERE
            a.hoja_vida_id = hv.id
            AND a.estado = 'estampada'
    ), 0) AS total_anotaciones,

    COALESCE((
        SELECT COUNT(*)
        FROM anotaciones a
        LEFT JOIN puntajes_anotacion pa
            ON pa.id = a.puntaje_id
        LEFT JOIN tipos_efecto_anotacion te
            ON te.id = pa.tipo_efecto_id
        WHERE
            a.hoja_vida_id = hv.id
            AND a.estado = 'estampada'
            AND te.codigo = 'MERITO'
    ), 0) AS total_meritos,

    COALESCE((
        SELECT COUNT(*)
        FROM anotaciones a
        LEFT JOIN puntajes_anotacion pa
            ON pa.id = a.puntaje_id
        LEFT JOIN tipos_efecto_anotacion te
            ON te.id = pa.tipo_efecto_id
        WHERE
            a.hoja_vida_id = hv.id
            AND a.estado = 'estampada'
            AND te.codigo = 'DEMERITO'
    ), 0) AS total_demeritos,

    COALESCE((
        SELECT COUNT(*)
        FROM anotaciones a
        LEFT JOIN puntajes_anotacion pa
            ON pa.id = a.puntaje_id
        LEFT JOIN tipos_efecto_anotacion te
            ON te.id = pa.tipo_efecto_id
        WHERE
            a.hoja_vida_id = hv.id
            AND a.estado = 'estampada'
            AND (
                te.codigo IS NULL
                OR te.codigo = 'NEUTRA'
            )
    ), 0) AS total_neutras,

    COALESCE((
        SELECT COUNT(*)
        FROM borradores_anotacion b
        WHERE
            b.hoja_vida_id = hv.id
            AND b.estado IN ('borrador', 'validado')
    ), 0) AS total_borradores,

    COALESCE((
        SELECT SUM(pa.valor_centecimas)
        FROM anotaciones a
        INNER JOIN puntajes_anotacion pa
            ON pa.id = a.puntaje_id
        WHERE
            a.hoja_vida_id = hv.id
            AND a.estado = 'estampada'
            AND a.computa_calificacion = 1
    ), 0) AS puntaje_acumulado_centecimas

FROM hojas_vida hv
INNER JOIN personas p
    ON p.id = hv.persona_id
LEFT JOIN grados g
    ON g.id = hv.grado_id_inicio
LEFT JOIN calidades_personal cp
    ON cp.id = hv.calidad_personal_id_inicio
INNER JOIN categorias_personal c
    ON c.id = hv.categoria_id
INNER JOIN periodos per
    ON per.id = hv.periodo_id;


CREATE VIEW vw_anotaciones_hoja_vida AS
SELECT
    ROW_NUMBER() OVER (
        PARTITION BY a.hoja_vida_id
        ORDER BY
            a.fecha_anotacion ASC,
            a.id ASC
    ) AS correlativo,

    a.id AS anotacion_id,
    a.borrador_id,
    a.hoja_vida_id,
    a.plantilla_id,
    a.concepto_id,
    a.puntaje_id,
    a.fecha_anotacion,
    a.titulo_final,
    a.cuerpo_final,
    a.color_semantico,
    a.color_hex,
    a.valores_json,
    a.origen,
    a.computa_calificacion,
    a.requiere_resolucion,
    a.numero_resolucion,
    a.fecha_resolucion,
    a.estado,
    a.creada_en,

    p.codigo AS plantilla_codigo,
    p.nombre AS plantilla_nombre,

    c.numero AS concepto_numero,
    c.nombre AS concepto_nombre,

    pa.valor_centecimas AS puntaje_centecimas,
    pa.texto_visual AS puntaje_visual,
    pa.texto_literal AS puntaje_literal,

    COALESCE(te.codigo, 'NEUTRA') AS tipo_efecto_codigo

FROM anotaciones a
INNER JOIN plantillas_anotacion p
    ON p.id = a.plantilla_id
LEFT JOIN conceptos_calificacion c
    ON c.id = a.concepto_id
LEFT JOIN puntajes_anotacion pa
    ON pa.id = a.puntaje_id
LEFT JOIN tipos_efecto_anotacion te
    ON te.id = pa.tipo_efecto_id;
