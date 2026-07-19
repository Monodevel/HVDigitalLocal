PRAGMA foreign_keys = ON;

-- Normaliza instalaciones antiguas: conserva abierto solo el período más reciente.
UPDATE periodos
SET estado = 'cerrado'
WHERE LOWER(estado) = 'abierto'
  AND id <> (
    SELECT id
    FROM periodos
    WHERE LOWER(estado) = 'abierto'
    ORDER BY fecha_inicio DESC, id DESC
    LIMIT 1
  );

-- SQLite permite varios NULL, pero esta expresión indexada solo deja una fila abierta.
CREATE UNIQUE INDEX IF NOT EXISTS ux_periodos_unico_abierto
ON periodos ((CASE WHEN LOWER(estado) = 'abierto' THEN 1 END));

-- No se puede reabrir un período desde una actualización directa.
-- La apertura de uno nuevo debe realizarse cerrando previamente el vigente.
CREATE TRIGGER IF NOT EXISTS trg_periodos_no_reabrir
BEFORE UPDATE OF estado ON periodos
WHEN LOWER(OLD.estado) = 'cerrado' AND LOWER(NEW.estado) = 'abierto'
BEGIN
  SELECT RAISE(ABORT, 'Un período cerrado es histórico y no puede volver a abrirse.');
END;

-- Protección de designaciones.
CREATE TRIGGER IF NOT EXISTS trg_designaciones_periodo_cerrado_insert
BEFORE INSERT ON designaciones_calificacion
WHEN EXISTS (SELECT 1 FROM periodos WHERE id = NEW.periodo_id AND LOWER(estado) = 'cerrado')
BEGIN
  SELECT RAISE(ABORT, 'El período seleccionado está cerrado y es de solo lectura.');
END;

CREATE TRIGGER IF NOT EXISTS trg_designaciones_periodo_cerrado_update
BEFORE UPDATE ON designaciones_calificacion
WHEN EXISTS (SELECT 1 FROM periodos WHERE id = OLD.periodo_id AND LOWER(estado) = 'cerrado')
BEGIN
  SELECT RAISE(ABORT, 'El período seleccionado está cerrado y es de solo lectura.');
END;

CREATE TRIGGER IF NOT EXISTS trg_designaciones_periodo_cerrado_delete
BEFORE DELETE ON designaciones_calificacion
WHEN EXISTS (SELECT 1 FROM periodos WHERE id = OLD.periodo_id AND LOWER(estado) = 'cerrado')
BEGIN
  SELECT RAISE(ABORT, 'El período seleccionado está cerrado y es de solo lectura.');
END;

-- Protección de expedientes.
CREATE TRIGGER IF NOT EXISTS trg_expedientes_periodo_cerrado_insert
BEFORE INSERT ON expedientes_calificacion
WHEN EXISTS (SELECT 1 FROM periodos WHERE id = NEW.periodo_id AND LOWER(estado) = 'cerrado')
BEGIN
  SELECT RAISE(ABORT, 'El período seleccionado está cerrado y es de solo lectura.');
END;

CREATE TRIGGER IF NOT EXISTS trg_expedientes_periodo_cerrado_update
BEFORE UPDATE ON expedientes_calificacion
WHEN EXISTS (SELECT 1 FROM periodos WHERE id = OLD.periodo_id AND LOWER(estado) = 'cerrado')
BEGIN
  SELECT RAISE(ABORT, 'El período seleccionado está cerrado y es de solo lectura.');
END;

CREATE TRIGGER IF NOT EXISTS trg_expedientes_periodo_cerrado_delete
BEFORE DELETE ON expedientes_calificacion
WHEN EXISTS (SELECT 1 FROM periodos WHERE id = OLD.periodo_id AND LOWER(estado) = 'cerrado')
BEGIN
  SELECT RAISE(ABORT, 'El período seleccionado está cerrado y es de solo lectura.');
END;

-- Protección de Hojas de Vida y sus registros dependientes.
CREATE TRIGGER IF NOT EXISTS trg_hojas_vida_periodo_cerrado_update
BEFORE UPDATE ON hojas_vida
WHEN EXISTS (SELECT 1 FROM periodos WHERE id = OLD.periodo_id AND LOWER(estado) = 'cerrado')
BEGIN
  SELECT RAISE(ABORT, 'El período seleccionado está cerrado y es de solo lectura.');
END;

CREATE TRIGGER IF NOT EXISTS trg_anotaciones_periodo_cerrado_insert
BEFORE INSERT ON anotaciones
WHEN EXISTS (
  SELECT 1 FROM hojas_vida hv INNER JOIN periodos p ON p.id = hv.periodo_id
  WHERE hv.id = NEW.hoja_vida_id AND LOWER(p.estado) = 'cerrado'
)
BEGIN
  SELECT RAISE(ABORT, 'El período seleccionado está cerrado y es de solo lectura.');
END;

CREATE TRIGGER IF NOT EXISTS trg_anotaciones_periodo_cerrado_update
BEFORE UPDATE ON anotaciones
WHEN EXISTS (
  SELECT 1 FROM hojas_vida hv INNER JOIN periodos p ON p.id = hv.periodo_id
  WHERE hv.id = OLD.hoja_vida_id AND LOWER(p.estado) = 'cerrado'
)
BEGIN
  SELECT RAISE(ABORT, 'El período seleccionado está cerrado y es de solo lectura.');
END;

CREATE TRIGGER IF NOT EXISTS trg_borradores_periodo_cerrado_insert
BEFORE INSERT ON borradores_anotacion
WHEN EXISTS (
  SELECT 1 FROM hojas_vida hv INNER JOIN periodos p ON p.id = hv.periodo_id
  WHERE hv.id = NEW.hoja_vida_id AND LOWER(p.estado) = 'cerrado'
)
BEGIN
  SELECT RAISE(ABORT, 'El período seleccionado está cerrado y es de solo lectura.');
END;

CREATE TRIGGER IF NOT EXISTS trg_borradores_periodo_cerrado_update
BEFORE UPDATE ON borradores_anotacion
WHEN EXISTS (
  SELECT 1 FROM hojas_vida hv INNER JOIN periodos p ON p.id = hv.periodo_id
  WHERE hv.id = OLD.hoja_vida_id AND LOWER(p.estado) = 'cerrado'
)
BEGIN
  SELECT RAISE(ABORT, 'El período seleccionado está cerrado y es de solo lectura.');
END;

CREATE TRIGGER IF NOT EXISTS trg_hc2_periodo_cerrado_update
BEFORE UPDATE ON hc2_calificaciones
WHEN EXISTS (
  SELECT 1 FROM hojas_vida hv INNER JOIN periodos p ON p.id = hv.periodo_id
  WHERE hv.id = OLD.hoja_vida_id AND LOWER(p.estado) = 'cerrado'
)
BEGIN
  SELECT RAISE(ABORT, 'El período seleccionado está cerrado y es de solo lectura.');
END;
