PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS resoluciones_anotacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hoja_vida_id INTEGER NOT NULL,
    numero TEXT NOT NULL,
    fecha TEXT NOT NULL,
    tipo_efecto_codigo TEXT NOT NULL CHECK (tipo_efecto_codigo IN ('MERITO','DEMERITO')),
    concepto_id INTEGER NOT NULL,
    puntaje_id INTEGER NOT NULL,
    asunto TEXT,
    observacion TEXT,
    estado TEXT NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE','UTILIZADA','ANULADA')),
    creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hoja_vida_id) REFERENCES hojas_vida(id),
    FOREIGN KEY (concepto_id) REFERENCES conceptos_calificacion(id),
    FOREIGN KEY (puntaje_id) REFERENCES puntajes_anotacion(id),
    UNIQUE (hoja_vida_id, numero)
);

CREATE INDEX IF NOT EXISTS ix_resoluciones_anotacion_hoja
ON resoluciones_anotacion(hoja_vida_id);

ALTER TABLE borradores_anotacion ADD COLUMN resolucion_id INTEGER REFERENCES resoluciones_anotacion(id);
ALTER TABLE borradores_anotacion ADD COLUMN modo_redaccion TEXT NOT NULL DEFAULT 'PLANTILLA'
CHECK (modo_redaccion IN ('PLANTILLA','PLANTILLA_EDITABLE','LIBRE'));

ALTER TABLE anotaciones ADD COLUMN resolucion_id INTEGER REFERENCES resoluciones_anotacion(id);
ALTER TABLE anotaciones ADD COLUMN modo_redaccion TEXT NOT NULL DEFAULT 'PLANTILLA'
CHECK (modo_redaccion IN ('PLANTILLA','PLANTILLA_EDITABLE','LIBRE'));

DROP VIEW IF EXISTS vw_resoluciones_anotacion_disponibles;
CREATE VIEW vw_resoluciones_anotacion_disponibles AS
SELECT
    r.id,
    r.hoja_vida_id,
    r.numero,
    r.fecha,
    r.tipo_efecto_codigo,
    r.concepto_id,
    c.numero AS concepto_numero,
    c.nombre AS concepto_nombre,
    r.puntaje_id,
    p.valor_centecimas,
    p.texto_visual AS puntaje_visual,
    p.texto_literal AS puntaje_literal,
    r.asunto,
    r.observacion,
    r.estado,
    r.creada_en,
    r.actualizada_en
FROM resoluciones_anotacion r
INNER JOIN conceptos_calificacion c ON c.id = r.concepto_id
INNER JOIN puntajes_anotacion p ON p.id = r.puntaje_id;
