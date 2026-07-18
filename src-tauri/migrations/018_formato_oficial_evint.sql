PRAGMA foreign_keys = ON;

-- ============================================================
-- EVINT - DATOS COMPLEMENTARIOS DEL FORMATO OFICIAL
-- ============================================================

ALTER TABLE evaluaciones_evint
ADD COLUMN realiza_evint INTEGER NOT NULL DEFAULT 1
CHECK (realiza_evint IN (0, 1));

ALTER TABLE evaluaciones_evint
ADD COLUMN justificacion_siempre TEXT;

ALTER TABLE evaluaciones_evint
ADD COLUMN justificacion_casi_nunca TEXT;

ALTER TABLE evaluaciones_evint
ADD COLUMN justificacion_no_observado TEXT;

ALTER TABLE evaluaciones_evint
ADD COLUMN justificacion_isa TEXT;

ALTER TABLE evaluaciones_evint
ADD COLUMN recursos TEXT;

ALTER TABLE evaluaciones_evint
ADD COLUMN fecha_toma_conocimiento TEXT;

ALTER TABLE evaluaciones_evint
ADD COLUMN firma_calificado TEXT;

ALTER TABLE evaluaciones_evint
ADD COLUMN firma_calificador TEXT;

ALTER TABLE evaluaciones_evint
ADD COLUMN tipo_recurso TEXT
CHECK (
    tipo_recurso IS NULL
    OR tipo_recurso IN (
        'REPOSICION_JERARQUICO_SUBSIDIO',
        'JERARQUICO'
    )
);

ALTER TABLE evaluaciones_evint
ADD COLUMN fecha_presentacion_recurso TEXT;

ALTER TABLE evaluaciones_evint
ADD COLUMN decision_calificador_directo TEXT
CHECK (
    decision_calificador_directo IS NULL
    OR decision_calificador_directo IN (
        'ACEPTA',
        'RECHAZA',
        'ACEPTA_PARCIALMENTE'
    )
);

ALTER TABLE evaluaciones_evint
ADD COLUMN fecha_decision_calificador_directo TEXT;

ALTER TABLE evaluaciones_evint
ADD COLUMN decision_calificador_superior TEXT
CHECK (
    decision_calificador_superior IS NULL
    OR decision_calificador_superior IN (
        'ACEPTA',
        'RECHAZA',
        'ACEPTA_PARCIALMENTE'
    )
);

ALTER TABLE evaluaciones_evint
ADD COLUMN fecha_decision_calificador_superior TEXT;

DROP VIEW IF EXISTS vw_evint_encabezado;

CREATE VIEW vw_evint_encabezado AS
SELECT
    ee.id AS evaluacion_evint_id,
    ee.instrumento_id,
    ee.expediente_id,
    ee.numero,
    ee.estado,
    ee.fecha_evaluacion,
    ee.observacion_general,
    ee.promedio,
    ee.total_factores,
    ee.total_evaluados,
    ee.total_no_observados,
    ee.creada_en,
    ee.actualizada_en,
    ee.completada_en,

    ee.realiza_evint,
    ee.justificacion_siempre,
    ee.justificacion_casi_nunca,
    ee.justificacion_no_observado,
    ee.justificacion_isa,
    ee.recursos,
    ee.fecha_toma_conocimiento,
    ee.firma_calificado,
    ee.firma_calificador,
    ee.tipo_recurso,
    ee.fecha_presentacion_recurso,
    ee.decision_calificador_directo,
    ee.fecha_decision_calificador_directo,
    ee.decision_calificador_superior,
    ee.fecha_decision_calificador_superior,

    e.persona_id,
    e.periodo_id,
    e.categoria_id,

    p.run,
    p.nombres,
    p.apellido_paterno,
    p.apellido_materno,

    COALESCE(g.abreviatura, cp.abreviatura) AS grado_calidad_abreviatura,
    COALESCE(g.nombre, cp.nombre) AS grado_calidad_nombre,

    c.codigo AS categoria_codigo,
    c.nombre AS categoria_nombre,

    per.nombre AS periodo_nombre,

    d.unidad_nombre,
    d.puesto,
    d.fecha_inicio,
    d.fecha_termino

FROM evaluaciones_evint ee
INNER JOIN expedientes_calificacion e
    ON e.id = ee.expediente_id
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
    ON per.id = e.periodo_id;
