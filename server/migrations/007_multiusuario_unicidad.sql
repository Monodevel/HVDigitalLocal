-- Las instancias lógicas deben poder reutilizar RUN y años en cuentas distintas.

ALTER TABLE periodos DROP INDEX ux_periodos_anio;
ALTER TABLE periodos ADD UNIQUE KEY ux_periodos_propietario_anio (propietario_usuario_id, anio);

-- El bootstrap histórico crea personas.run como UNIQUE. Su nombre de índice
-- puede variar según conversión; la migración local original lo declara en columna.
-- En MariaDB normalmente queda como `run`.
SET @idx_personas_run := (
  SELECT INDEX_NAME
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'personas'
    AND column_name = 'run'
    AND non_unique = 0
    AND index_name <> 'PRIMARY'
  LIMIT 1
);
SET @sql_drop_personas_run := IF(
  @idx_personas_run IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE personas DROP INDEX `', REPLACE(@idx_personas_run, '`', '``'), '`')
);
PREPARE stmt_drop_personas_run FROM @sql_drop_personas_run;
EXECUTE stmt_drop_personas_run;
DEALLOCATE PREPARE stmt_drop_personas_run;
ALTER TABLE personas ADD UNIQUE KEY ux_personas_propietario_run (propietario_usuario_id, run);

-- Cada calificador puede registrar su propio correlativo de resoluciones por serie.
SET @idx_res_correlativo := (
  SELECT INDEX_NAME
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'resoluciones_documentales'
    AND non_unique = 0
    AND index_name <> 'PRIMARY'
  GROUP BY INDEX_NAME
  HAVING SUM(column_name = 'prefijo') > 0 AND SUM(column_name = 'correlativo') > 0
  LIMIT 1
);
SET @sql_drop_res_correlativo := IF(
  @idx_res_correlativo IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE resoluciones_documentales DROP INDEX `', REPLACE(@idx_res_correlativo, '`', '``'), '`')
);
PREPARE stmt_drop_res_correlativo FROM @sql_drop_res_correlativo;
EXECUTE stmt_drop_res_correlativo;
DEALLOCATE PREPARE stmt_drop_res_correlativo;
ALTER TABLE resoluciones_documentales
  ADD UNIQUE KEY ux_resoluciones_propietario_serie_correlativo (propietario_usuario_id, prefijo, correlativo);
