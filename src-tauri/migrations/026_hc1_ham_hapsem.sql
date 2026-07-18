PRAGMA foreign_keys = ON;

-- ============================================================
-- HVDIGITAL - HC1 / HAM / HAPSEM
-- ============================================================
-- Se guardan datos documentales editables en JSON para respetar
-- el formato oficial y permitir extender campos sin migraciones
-- por cada casillero del formulario.

CREATE TABLE IF NOT EXISTS hc1_documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hoja_vida_id INTEGER NOT NULL UNIQUE,
    datos_json TEXT NOT NULL DEFAULT '{}',
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hoja_vida_id)
        REFERENCES hojas_vida(id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ham_documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hoja_vida_id INTEGER NOT NULL UNIQUE,
    datos_json TEXT NOT NULL DEFAULT '{}',
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hoja_vida_id)
        REFERENCES hojas_vida(id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hapsem_documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hoja_vida_id INTEGER NOT NULL UNIQUE,
    datos_json TEXT NOT NULL DEFAULT '{}',
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hoja_vida_id)
        REFERENCES hojas_vida(id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_hc1_documentos_hoja_vida
ON hc1_documentos(hoja_vida_id);

CREATE INDEX IF NOT EXISTS ix_ham_documentos_hoja_vida
ON ham_documentos(hoja_vida_id);

CREATE INDEX IF NOT EXISTS ix_hapsem_documentos_hoja_vida
ON hapsem_documentos(hoja_vida_id);
