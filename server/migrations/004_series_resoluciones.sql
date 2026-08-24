CREATE TABLE IF NOT EXISTS configuracion_series_resolucion (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  prefijo VARCHAR(10) NOT NULL DEFAULT '1530',
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT ck_configuracion_series_resolucion_singleton CHECK (id = 1),
  CONSTRAINT ck_configuracion_series_resolucion_prefijo CHECK (prefijo IN ('1530','6060'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO configuracion_series_resolucion (id, prefijo)
VALUES (1, '1530');

INSERT IGNORE INTO contadores_resolucion (prefijo, ultimo_correlativo)
VALUES ('1530', 0), ('6060', 0);

UPDATE contadores_resolucion c
SET ultimo_correlativo = GREATEST(
  ultimo_correlativo,
  COALESCE((
    SELECT MAX(r.correlativo)
    FROM resoluciones_documentales r
    WHERE r.prefijo = c.prefijo
      AND r.estado = 'EMITIDA'
      AND r.correlativo IS NOT NULL
  ), 0)
)
WHERE c.prefijo IN ('1530','6060');

DROP TRIGGER IF EXISTS trg_resolucion_correlativo_por_serie;

CREATE TRIGGER trg_resolucion_correlativo_por_serie
BEFORE UPDATE ON resoluciones_documentales
FOR EACH ROW
BEGIN
  DECLARE siguiente BIGINT DEFAULT 0;

  IF OLD.estado = 'BORRADOR' AND NEW.estado = 'EMITIDA' THEN
    IF NEW.prefijo NOT IN ('1530','6060') THEN
      SET NEW.prefijo = '1530';
    END IF;

    INSERT IGNORE INTO contadores_resolucion (prefijo, ultimo_correlativo)
    VALUES (NEW.prefijo, 0);

    UPDATE contadores_resolucion
    SET ultimo_correlativo = ultimo_correlativo + 1,
        actualizado_en = CURRENT_TIMESTAMP
    WHERE prefijo = NEW.prefijo;

    SELECT ultimo_correlativo
      INTO siguiente
    FROM contadores_resolucion
    WHERE prefijo = NEW.prefijo
    LIMIT 1;

    SET NEW.correlativo = siguiente;
    SET NEW.numero_visible = CONCAT(NEW.prefijo, '/', siguiente);
  END IF;
END;
