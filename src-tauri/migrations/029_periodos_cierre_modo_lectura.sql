/*
  029_periodos_cierre_modo_lectura.sql

  Objetivo:
  - Permitir cerrar períodos.
  - Permitir crear un nuevo período activo.
  - Permitir abrir períodos cerrados solo en modo lectura.
  - Mantener separado el período activo de trabajo y el período visualizado.

  Ejecutar una sola vez sobre la base operacional.
*/

ALTER TABLE periodos
  ADD COLUMN estado TEXT NOT NULL DEFAULT 'ABIERTO';

ALTER TABLE periodos
  ADD COLUMN cerrado_en TEXT NULL;

ALTER TABLE periodos
  ADD COLUMN observacion_cierre TEXT NULL;

ALTER TABLE periodos
  ADD COLUMN modo_lectura INTEGER NOT NULL DEFAULT 0;

ALTER TABLE configuracion
  ADD COLUMN periodo_visualizacion_id INTEGER NULL;

ALTER TABLE configuracion
  ADD COLUMN modo_lectura_periodo_visualizacion INTEGER NOT NULL DEFAULT 0;

/*
  Normaliza datos existentes.
*/
UPDATE periodos
SET estado = 'ABIERTO'
WHERE estado IS NULL
   OR TRIM(estado) = '';

UPDATE configuracion
SET periodo_visualizacion_id = periodo_activo_id
WHERE periodo_visualizacion_id IS NULL;

UPDATE configuracion
SET modo_lectura_periodo_visualizacion = 0
WHERE modo_lectura_periodo_visualizacion IS NULL;
