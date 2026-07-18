/*
 * PROPUESTA OBSOLETA — NO REGISTRAR NI EJECUTAR.
 *
 * Este archivo fue preparado como borrador para implementar cierre de
 * períodos y modo lectura, pero no es compatible con el esquema inicial
 * vigente: la tabla periodos ya contiene la columna estado desde la
 * migración 1 y utiliza los valores 'abierto' y 'cerrado'.
 *
 * Ejecutar este SQL produciría un error por columna duplicada y además
 * introduciría valores de estado con otra convención ('ABIERTO').
 *
 * La funcionalidad deberá implementarse mediante una migración nueva,
 * incremental e idempotente, basada en el esquema realmente instalado.
 */

/* SQL histórico conservado solamente como referencia:

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

*/
