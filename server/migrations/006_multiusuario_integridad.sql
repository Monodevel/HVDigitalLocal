-- Completa la propiedad de entidades puente y protege eliminaciones.

ALTER TABLE vigencias_periodo ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE expediente_hojas_vida ADD COLUMN propietario_usuario_id BIGINT NULL;

UPDATE vigencias_periodo v
INNER JOIN periodos p ON p.id = v.periodo_id
SET v.propietario_usuario_id = p.propietario_usuario_id
WHERE v.propietario_usuario_id IS NULL;

UPDATE expediente_hojas_vida ehv
INNER JOIN expedientes_calificacion e ON e.id = ehv.expediente_id
SET ehv.propietario_usuario_id = e.propietario_usuario_id
WHERE ehv.propietario_usuario_id IS NULL;

ALTER TABLE vigencias_periodo
  ADD KEY ix_vigencias_propietario (propietario_usuario_id),
  ADD CONSTRAINT fk_vigencias_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE expediente_hojas_vida
  ADD KEY ix_expediente_hv_propietario (propietario_usuario_id),
  ADD CONSTRAINT fk_expediente_hv_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);

DROP TRIGGER IF EXISTS trg_vigencias_propietario_insert;
CREATE TRIGGER trg_vigencias_propietario_insert BEFORE INSERT ON vigencias_periodo FOR EACH ROW
BEGIN
  IF @hvdigital_usuario_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM periodos p WHERE p.id=NEW.periodo_id AND p.propietario_usuario_id=@hvdigital_usuario_id
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El período no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id=@hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_vigencias_propietario_update;
CREATE TRIGGER trg_vigencias_propietario_update BEFORE UPDATE ON vigencias_periodo FOR EACH ROW
BEGIN
  IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la vigencia.'; END IF;
  SET NEW.propietario_usuario_id=OLD.propietario_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_expediente_hv_propietario_insert;
CREATE TRIGGER trg_expediente_hv_propietario_insert BEFORE INSERT ON expediente_hojas_vida FOR EACH ROW
BEGIN
  IF @hvdigital_usuario_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM expedientes_calificacion e WHERE e.id=NEW.expediente_id AND e.propietario_usuario_id=@hvdigital_usuario_id
  ) OR NOT EXISTS (
    SELECT 1 FROM hojas_vida h WHERE h.id=NEW.hoja_vida_id AND h.propietario_usuario_id=@hvdigital_usuario_id
  ) OR NOT EXISTS (
    SELECT 1 FROM instrumentos_expediente i WHERE i.id=NEW.instrumento_id AND i.propietario_usuario_id=@hvdigital_usuario_id
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El vínculo de Hoja de Vida no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id=@hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_expediente_hv_propietario_update;
CREATE TRIGGER trg_expediente_hv_propietario_update BEFORE UPDATE ON expediente_hojas_vida FOR EACH ROW
BEGIN
  IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado al vínculo de Hoja de Vida.'; END IF;
  SET NEW.propietario_usuario_id=OLD.propietario_usuario_id;
END;

-- DELETE queda restringido al propietario en todas las entidades privadas.
DROP TRIGGER IF EXISTS trg_periodos_propietario_delete;
CREATE TRIGGER trg_periodos_propietario_delete BEFORE DELETE ON periodos FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado al período.'; END IF; END;
DROP TRIGGER IF EXISTS trg_vigencias_propietario_delete;
CREATE TRIGGER trg_vigencias_propietario_delete BEFORE DELETE ON vigencias_periodo FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la vigencia.'; END IF; END;
DROP TRIGGER IF EXISTS trg_personas_propietario_delete;
CREATE TRIGGER trg_personas_propietario_delete BEFORE DELETE ON personas FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la persona.'; END IF; END;
DROP TRIGGER IF EXISTS trg_designaciones_propietario_delete;
CREATE TRIGGER trg_designaciones_propietario_delete BEFORE DELETE ON designaciones_calificacion FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la designación.'; END IF; END;
DROP TRIGGER IF EXISTS trg_expedientes_propietario_delete;
CREATE TRIGGER trg_expedientes_propietario_delete BEFORE DELETE ON expedientes_calificacion FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado al expediente.'; END IF; END;
DROP TRIGGER IF EXISTS trg_instrumentos_propietario_delete;
CREATE TRIGGER trg_instrumentos_propietario_delete BEFORE DELETE ON instrumentos_expediente FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado al instrumento.'; END IF; END;
DROP TRIGGER IF EXISTS trg_expediente_hv_propietario_delete;
CREATE TRIGGER trg_expediente_hv_propietario_delete BEFORE DELETE ON expediente_hojas_vida FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado al vínculo de Hoja de Vida.'; END IF; END;
DROP TRIGGER IF EXISTS trg_hojas_vida_propietario_delete;
CREATE TRIGGER trg_hojas_vida_propietario_delete BEFORE DELETE ON hojas_vida FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la Hoja de Vida.'; END IF; END;
DROP TRIGGER IF EXISTS trg_borradores_propietario_delete;
CREATE TRIGGER trg_borradores_propietario_delete BEFORE DELETE ON borradores_anotacion FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado al borrador.'; END IF; END;
DROP TRIGGER IF EXISTS trg_anotaciones_propietario_delete;
CREATE TRIGGER trg_anotaciones_propietario_delete BEFORE DELETE ON anotaciones FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la anotación.'; END IF; END;
DROP TRIGGER IF EXISTS trg_evint_propietario_delete;
CREATE TRIGGER trg_evint_propietario_delete BEFORE DELETE ON evaluaciones_evint FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la EVINT.'; END IF; END;
DROP TRIGGER IF EXISTS trg_respuestas_evint_propietario_delete;
CREATE TRIGGER trg_respuestas_evint_propietario_delete BEFORE DELETE ON respuestas_evint FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la respuesta EVINT.'; END IF; END;
DROP TRIGGER IF EXISTS trg_res_anotacion_propietario_delete;
CREATE TRIGGER trg_res_anotacion_propietario_delete BEFORE DELETE ON resoluciones_anotacion FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la resolución.'; END IF; END;
DROP TRIGGER IF EXISTS trg_res_documental_propietario_delete;
CREATE TRIGGER trg_res_documental_propietario_delete BEFORE DELETE ON resoluciones_documentales FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la resolución.'; END IF; END;
DROP TRIGGER IF EXISTS trg_puntos_res_propietario_delete;
CREATE TRIGGER trg_puntos_res_propietario_delete BEFORE DELETE ON puntos_resolucion FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado al punto de resolución.'; END IF; END;
DROP TRIGGER IF EXISTS trg_hc2_propietario_delete;
CREATE TRIGGER trg_hc2_propietario_delete BEFORE DELETE ON hc2_calificaciones FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a HC2.'; END IF; END;
DROP TRIGGER IF EXISTS trg_hc1_propietario_delete;
CREATE TRIGGER trg_hc1_propietario_delete BEFORE DELETE ON hc1_documentos FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a HC1.'; END IF; END;
DROP TRIGGER IF EXISTS trg_ham_propietario_delete;
CREATE TRIGGER trg_ham_propietario_delete BEFORE DELETE ON ham_documentos FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a HAM.'; END IF; END;
DROP TRIGGER IF EXISTS trg_hapsem_propietario_delete;
CREATE TRIGGER trg_hapsem_propietario_delete BEFORE DELETE ON hapsem_documentos FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a HAPSEM.'; END IF; END;
DROP TRIGGER IF EXISTS trg_notas_propietario_delete;
CREATE TRIGGER trg_notas_propietario_delete BEFORE DELETE ON notas_tareas_calificador FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la nota.'; END IF; END;
