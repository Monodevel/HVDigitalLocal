PRAGMA foreign_keys = ON;

-- PROPUESTA PARA FASE POSTERIOR:
-- Fotos de personas y documentos anexos del expediente/anotaciones.
-- No aplicar hasta implementar comandos Tauri para copiar archivos.

CREATE TABLE IF NOT EXISTS archivos_expediente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    persona_id INTEGER,
    expediente_id INTEGER,
    hoja_vida_id INTEGER,
    borrador_anotacion_id INTEGER,
    anotacion_id INTEGER,

    tipo_archivo TEXT NOT NULL
        CHECK (
            tipo_archivo IN (
                'FOTO_PERSONA',
                'MEDIO_PRUEBA',
                'INFORME',
                'FOTOGRAFIA',
                'RESOLUCION',
                'CERTIFICADO',
                'OTRO'
            )
        ),

    estado TEXT NOT NULL DEFAULT 'BORRADOR'
        CHECK (
            estado IN (
                'BORRADOR',
                'VINCULADO',
                'ANULADO',
                'ELIMINADO_LOGICO'
            )
        ),

    nombre_original TEXT NOT NULL,
    nombre_guardado TEXT NOT NULL,
    extension TEXT,
    mime_type TEXT,
    tamanio_bytes INTEGER,
    hash_sha256 TEXT,
    ruta_relativa TEXT NOT NULL,
    descripcion TEXT,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (persona_id)
        REFERENCES personas(id)
        ON UPDATE RESTRICT
        ON DELETE SET NULL,

    FOREIGN KEY (expediente_id)
        REFERENCES expedientes_calificacion(id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,

    FOREIGN KEY (hoja_vida_id)
        REFERENCES hojas_vida(id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,

    FOREIGN KEY (borrador_anotacion_id)
        REFERENCES borradores_anotacion(id)
        ON UPDATE RESTRICT
        ON DELETE SET NULL,

    FOREIGN KEY (anotacion_id)
        REFERENCES anotaciones(id)
        ON UPDATE RESTRICT
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_archivos_expediente_persona
ON archivos_expediente(persona_id);

CREATE INDEX IF NOT EXISTS ix_archivos_expediente_expediente
ON archivos_expediente(expediente_id);

CREATE INDEX IF NOT EXISTS ix_archivos_expediente_anotacion
ON archivos_expediente(anotacion_id);

CREATE INDEX IF NOT EXISTS ix_archivos_expediente_borrador
ON archivos_expediente(borrador_anotacion_id);
