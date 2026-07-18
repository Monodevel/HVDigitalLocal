PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS resultados_concepto_evint (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    evaluacion_evint_id INTEGER NOT NULL,
    concepto_id INTEGER NOT NULL,

    suma_valores REAL NOT NULL DEFAULT 0,
    descriptores_aplicables INTEGER NOT NULL DEFAULT 0,
    descriptores_evaluados INTEGER NOT NULL DEFAULT 0,
    descriptores_no_observados INTEGER NOT NULL DEFAULT 0,

    nota_promedio REAL,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (evaluacion_evint_id)
        REFERENCES evaluaciones_evint(id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,

    FOREIGN KEY (concepto_id)
        REFERENCES conceptos_calificacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    UNIQUE (
        evaluacion_evint_id,
        concepto_id
    )
);

CREATE INDEX IF NOT EXISTS
    ix_resultados_concepto_evint_evaluacion
ON resultados_concepto_evint(
    evaluacion_evint_id
);

DROP VIEW IF EXISTS vw_resultados_concepto_evint;

CREATE VIEW vw_resultados_concepto_evint AS
SELECT
    r.id AS resultado_id,
    r.evaluacion_evint_id,
    r.concepto_id,

    c.numero AS concepto_numero,
    c.codigo AS concepto_codigo,
    c.nombre AS concepto_nombre,

    r.suma_valores,
    r.descriptores_aplicables,
    r.descriptores_evaluados,
    r.descriptores_no_observados,
    r.nota_promedio,

    r.creado_en,
    r.actualizado_en

FROM resultados_concepto_evint r

INNER JOIN conceptos_calificacion c
    ON c.id = r.concepto_id;