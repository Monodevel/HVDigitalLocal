PRAGMA foreign_keys = ON;

-- ============================================================
-- HVDIGITAL - VINCULACIÓN RESOLUCIÓN DOCUMENTAL / ANOTACIÓN
-- ============================================================
-- La resolución documental emitida respalda la anotación.
-- La resolución recién se marca como usada cuando la anotación
-- se estampa en la Hoja de Vida.

ALTER TABLE borradores_anotacion
ADD COLUMN resolucion_documental_id INTEGER;

ALTER TABLE anotaciones
ADD COLUMN resolucion_documental_id INTEGER;

CREATE INDEX IF NOT EXISTS
    ix_borradores_anotacion_resolucion_documental
ON borradores_anotacion(
    resolucion_documental_id
);

CREATE INDEX IF NOT EXISTS
    ix_anotaciones_resolucion_documental
ON anotaciones(
    resolucion_documental_id
);

-- ------------------------------------------------------------
-- Vista de borradores en Hoja de Vida
-- ------------------------------------------------------------

DROP VIEW IF EXISTS vw_borradores_hoja_vida;

CREATE VIEW vw_borradores_hoja_vida AS
SELECT
    b.id AS borrador_id,
    b.hoja_vida_id,
    b.plantilla_id,
    b.fecha_anotacion,
    b.titulo_final,
    b.cuerpo_final,
    b.color_semantico,
    b.color_hex,
    b.valores_json,
    b.estado,
    b.concepto_id,
    b.puntaje_id,
    b.origen,
    b.computa_calificacion,
    b.creado_en,
    b.actualizado_en,

    b.resolucion_documental_id,

    COALESCE(
        rd.numero_visible,
        json_extract(b.valores_json, '$.numero_resolucion')
    ) AS numero_resolucion,

    COALESCE(
        rd.fecha_documento,
        json_extract(b.valores_json, '$.fecha_resolucion')
    ) AS fecha_resolucion,

    p.codigo AS plantilla_codigo,
    p.nombre AS plantilla_nombre,
    p.requiere_resolucion,

    c.numero AS concepto_numero,
    c.nombre AS concepto_nombre,

    pa.texto_visual AS puntaje_visual,
    pa.texto_literal AS puntaje_literal,

    te.codigo AS tipo_efecto_codigo

FROM borradores_anotacion b

INNER JOIN plantillas_anotacion p
    ON p.id = b.plantilla_id

LEFT JOIN conceptos_calificacion c
    ON c.id = b.concepto_id

LEFT JOIN puntajes_anotacion pa
    ON pa.id = b.puntaje_id

LEFT JOIN tipos_efecto_anotacion te
    ON te.id = pa.tipo_efecto_id

LEFT JOIN resoluciones_documentales rd
    ON rd.id = b.resolucion_documental_id;


-- ------------------------------------------------------------
-- Vista de anotaciones estampadas en Hoja de Vida
-- ------------------------------------------------------------

DROP VIEW IF EXISTS vw_anotaciones_hoja_vida;

CREATE VIEW vw_anotaciones_hoja_vida AS
SELECT
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

    a.resolucion_documental_id,

    COALESCE(a.numero_resolucion, rd.numero_visible)
        AS numero_resolucion,

    COALESCE(a.fecha_resolucion, rd.fecha_documento)
        AS fecha_resolucion,

    a.estado,
    a.creada_en,

    p.codigo AS plantilla_codigo,
    p.nombre AS plantilla_nombre,

    c.numero AS concepto_numero,
    c.nombre AS concepto_nombre,

    pa.texto_visual AS puntaje_visual,
    pa.texto_literal AS puntaje_literal,

    te.codigo AS tipo_efecto_codigo

FROM anotaciones a

INNER JOIN plantillas_anotacion p
    ON p.id = a.plantilla_id

LEFT JOIN conceptos_calificacion c
    ON c.id = a.concepto_id

LEFT JOIN puntajes_anotacion pa
    ON pa.id = a.puntaje_id

LEFT JOIN tipos_efecto_anotacion te
    ON te.id = pa.tipo_efecto_id

LEFT JOIN resoluciones_documentales rd
    ON rd.id = a.resolucion_documental_id;
