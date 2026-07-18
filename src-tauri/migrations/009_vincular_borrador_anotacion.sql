PRAGMA foreign_keys = ON;

-- Evita que un mismo borrador pueda estamparse más de una vez.
ALTER TABLE anotaciones
ADD COLUMN borrador_id INTEGER
    REFERENCES borradores_anotacion(id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS
    ux_anotaciones_borrador
ON anotaciones(borrador_id)
WHERE borrador_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS
    ix_borradores_hoja_estado
ON borradores_anotacion(hoja_vida_id, estado);
