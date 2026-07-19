PRAGMA foreign_keys = ON;

-- Fotografía institucional opcional asociada a la persona.
-- Se almacena como Data URL optimizada para asegurar que viaje con
-- los respaldos de hvdigital.db y no dependa de archivos externos.
ALTER TABLE personas ADD COLUMN foto_data_url TEXT NULL;
ALTER TABLE personas ADD COLUMN foto_actualizada_en TEXT NULL;
