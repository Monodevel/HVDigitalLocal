PRAGMA foreign_keys = ON;

-- ============================================================
-- FASE HC2 - HOJA CALIFICACIÓN N.º 2
-- ============================================================
-- Guarda los campos documentales de la HC2. El cálculo de notas
-- se obtiene dinámicamente desde Hoja de Vida + EVINT.

CREATE TABLE IF NOT EXISTS hc2_calificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    hoja_vida_id INTEGER NOT NULL UNIQUE,

    opinion_calificador_directo TEXT,
    firma_calificador_directo TEXT,

    opinion_calificador_superior TEXT,
    decision_calificador_superior TEXT
        CHECK (
            decision_calificador_superior IS NULL
            OR decision_calificador_superior IN ('APRUEBA', 'MODIFICA')
        ),

    firma_calificador_superior TEXT,

    fecha_toma_conocimiento TEXT,
    firma_calificado TEXT,

    lista_clasificacion_junta TEXT,
    nota_tm_anual_junta REAL,
    firma_presidente_junta TEXT,

    fecha_toma_conocimiento_final TEXT,
    firma_calificado_final TEXT,

    creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (hoja_vida_id)
        REFERENCES hojas_vida(id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_hc2_calificaciones_hoja_vida
ON hc2_calificaciones(hoja_vida_id);
