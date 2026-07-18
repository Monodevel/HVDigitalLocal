PRAGMA foreign_keys = ON;

-- ============================================================
-- CORREGIR ESCALA REAL DE LA EVINT
-- ============================================================

UPDATE escalas_evint
SET
    valor = CASE codigo
        WHEN 'SIEMPRE' THEN 7
        WHEN 'CASI_SIEMPRE' THEN 6
        WHEN 'REGULARMENTE' THEN 5
        WHEN 'OCASIONALMENTE' THEN 4
        WHEN 'CASI_NUNCA' THEN 3
        WHEN 'NO_OBSERVADO' THEN 0
        ELSE valor
    END;

-- ============================================================
-- RESULTADOS DE LA EVINT POR CONCEPTO
-- ============================================================

CREATE TABLE IF NOT EXISTS resultados_concepto_evint (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    evaluacion_evint_id INTEGER NOT NULL,
    concepto_id INTEGER NOT NULL,

    suma_valores REAL NOT NULL DEFAULT 0,

    total_descriptores INTEGER NOT NULL DEFAULT 0,
    total_evaluados INTEGER NOT NULL DEFAULT 0,
    total_no_observados INTEGER NOT NULL DEFAULT 0,

    nota_evint REAL NULL,

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
    c.orden AS concepto_orden,

    r.suma_valores,
    r.total_descriptores,
    r.total_evaluados,
    r.total_no_observados,
    r.nota_evint,

    r.creado_en,
    r.actualizado_en

FROM resultados_concepto_evint r

INNER JOIN conceptos_calificacion c
    ON c.id = r.concepto_id;