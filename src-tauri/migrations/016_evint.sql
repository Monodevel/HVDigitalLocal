PRAGMA foreign_keys = ON;

-- ============================================================
-- FASE 7 - EVINT
-- ============================================================

CREATE TABLE IF NOT EXISTS escalas_evint (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    valor INTEGER,
    orden INTEGER NOT NULL UNIQUE,
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1))
);

INSERT INTO escalas_evint (
    id,
    codigo,
    nombre,
    valor,
    orden
)
VALUES
    (1, 'NO_OBSERVADO', 'No observado', NULL, 1),
    (2, 'CASI_NUNCA', 'Casi nunca', 1, 2),
    (3, 'OCASIONALMENTE', 'Ocasionalmente', 2, 3),
    (4, 'REGULARMENTE', 'Regularmente', 3, 4),
    (5, 'CASI_SIEMPRE', 'Casi siempre', 4, 5),
    (6, 'SIEMPRE', 'Siempre', 5, 6)
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    nombre = excluded.nombre,
    valor = excluded.valor,
    orden = excluded.orden,
    activo = 1;


CREATE TABLE IF NOT EXISTS evaluaciones_evint (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    instrumento_id INTEGER NOT NULL UNIQUE,
    expediente_id INTEGER NOT NULL,
    numero INTEGER NOT NULL CHECK (numero IN (1, 2)),

    estado TEXT NOT NULL DEFAULT 'BORRADOR'
        CHECK (
            estado IN (
                'BORRADOR',
                'COMPLETADA',
                'CERRADA',
                'ANULADA'
            )
        ),

    fecha_evaluacion TEXT NOT NULL DEFAULT CURRENT_DATE,
    observacion_general TEXT,

    promedio REAL,
    total_factores INTEGER NOT NULL DEFAULT 0,
    total_evaluados INTEGER NOT NULL DEFAULT 0,
    total_no_observados INTEGER NOT NULL DEFAULT 0,

    creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completada_en TEXT,

    FOREIGN KEY (instrumento_id)
        REFERENCES instrumentos_expediente(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (expediente_id)
        REFERENCES expedientes_calificacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    UNIQUE (expediente_id, numero)
);


CREATE TABLE IF NOT EXISTS respuestas_evint (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    evaluacion_evint_id INTEGER NOT NULL,
    factor_id INTEGER NOT NULL,
    escala_id INTEGER,
    observacion TEXT,

    creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (evaluacion_evint_id)
        REFERENCES evaluaciones_evint(id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,

    FOREIGN KEY (factor_id)
        REFERENCES factores_calificacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (escala_id)
        REFERENCES escalas_evint(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    UNIQUE (evaluacion_evint_id, factor_id)
);

CREATE INDEX IF NOT EXISTS
    ix_respuestas_evint_evaluacion
ON respuestas_evint(evaluacion_evint_id);

CREATE INDEX IF NOT EXISTS
    ix_respuestas_evint_factor
ON respuestas_evint(factor_id);


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


DROP VIEW IF EXISTS vw_evint_factores;

CREATE VIEW vw_evint_factores AS
SELECT
    a.id AS area_id,
    a.codigo AS area_codigo,
    a.nombre AS area_nombre,
    a.orden AS area_orden,

    c.id AS concepto_id,
    c.codigo AS concepto_codigo,
    c.numero AS concepto_numero,
    c.nombre AS concepto_nombre,
    c.descripcion_normativa AS concepto_descripcion,
    c.orden AS concepto_orden,

    f.id AS factor_id,
    f.codigo AS factor_codigo,
    f.nombre AS factor_nombre,
    f.descripcion AS factor_descripcion,
    f.orden AS factor_orden

FROM factores_calificacion f

INNER JOIN conceptos_calificacion c
    ON c.id = f.concepto_id

INNER JOIN areas_evaluacion a
    ON a.id = c.area_evaluacion_id

WHERE
    f.activo = 1
    AND c.activo = 1
    AND a.activo = 1;


DROP VIEW IF EXISTS vw_evint_respuestas;

CREATE VIEW vw_evint_respuestas AS
SELECT
    r.id AS respuesta_id,
    r.evaluacion_evint_id,
    r.factor_id,
    r.escala_id,
    r.observacion,

    e.codigo AS escala_codigo,
    e.nombre AS escala_nombre,
    e.valor AS escala_valor,

    f.factor_codigo,
    f.factor_nombre,
    f.factor_descripcion,

    f.concepto_id,
    f.concepto_codigo,
    f.concepto_numero,
    f.concepto_nombre,
    f.concepto_descripcion,
    f.concepto_orden,

    f.area_id,
    f.area_codigo,
    f.area_nombre,
    f.area_orden

FROM respuestas_evint r

INNER JOIN vw_evint_factores f
    ON f.factor_id = r.factor_id

LEFT JOIN escalas_evint e
    ON e.id = r.escala_id;
