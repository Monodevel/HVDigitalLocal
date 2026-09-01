-- HVDigital Web: identidad multiusuario y propiedad privada por calificador.
-- Los datos existentes se asignan al usuario inicial para preservar continuidad.

CREATE TABLE usuarios (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario VARCHAR(80) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(24) NOT NULL DEFAULT 'CALIFICADOR',
    calificador_directo_id BIGINT NULL,
    activo TINYINT NOT NULL DEFAULT 1,
    ultimo_acceso_en DATETIME NULL,
    password_actualizada_en DATETIME NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_usuarios_usuario (usuario),
    UNIQUE KEY ux_usuarios_calificador (calificador_directo_id),
    CONSTRAINT ck_usuarios_rol CHECK (rol IN ('ADMIN','CALIFICADOR')),
    CONSTRAINT ck_usuarios_activo CHECK (activo IN (0,1)),
    CONSTRAINT fk_usuarios_calificador
      FOREIGN KEY (calificador_directo_id) REFERENCES calificadores_directos(id)
      ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO usuarios (usuario, password_hash, rol, calificador_directo_id, activo)
SELECT
    a.usuario,
    a.password_hash,
    'ADMIN',
    ci.calificador_directo_id,
    1
FROM autenticacion_local a
LEFT JOIN configuracion_inicial ci ON ci.id = 1
WHERE a.id = 1
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    calificador_directo_id = COALESCE(usuarios.calificador_directo_id, VALUES(calificador_directo_id)),
    activo = 1;

CREATE TABLE configuracion_usuario (
    usuario_id BIGINT NOT NULL,
    estado VARCHAR(40) NOT NULL DEFAULT 'NO_CONFIGURADA',
    paso_actual INT NOT NULL DEFAULT 1,
    periodo_activo_id BIGINT NULL,
    serie_resolucion VARCHAR(4) NOT NULL DEFAULT '1530',
    completada_en DATETIME NULL,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id),
    KEY ix_config_usuario_periodo (periodo_activo_id),
    CONSTRAINT fk_config_usuario_usuario
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_config_usuario_periodo
      FOREIGN KEY (periodo_activo_id) REFERENCES periodos(id)
      ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_config_usuario_estado CHECK (
      estado IN ('NO_CONFIGURADA','EN_PROGRESO','CONFIGURADA_SIN_PERSONAL','OPERATIVA')
    ),
    CONSTRAINT ck_config_usuario_paso CHECK (paso_actual BETWEEN 1 AND 5),
    CONSTRAINT ck_config_usuario_serie CHECK (serie_resolucion IN ('1530','6060'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO configuracion_usuario (
    usuario_id, estado, paso_actual, periodo_activo_id, serie_resolucion, completada_en
)
SELECT
    u.id,
    COALESCE(ci.estado, 'NO_CONFIGURADA'),
    COALESCE(ci.paso_actual, 1),
    ci.periodo_activo_id,
    COALESCE(csr.prefijo, '1530'),
    ci.completada_en
FROM usuarios u
LEFT JOIN configuracion_inicial ci ON ci.id = 1
LEFT JOIN configuracion_series_resolucion csr ON csr.id = 1
WHERE u.usuario = (SELECT usuario FROM autenticacion_local WHERE id = 1 LIMIT 1)
ON DUPLICATE KEY UPDATE
    estado = VALUES(estado),
    paso_actual = VALUES(paso_actual),
    periodo_activo_id = VALUES(periodo_activo_id),
    serie_resolucion = VALUES(serie_resolucion),
    completada_en = VALUES(completada_en);

-- Propiedad explícita. Los catálogos normativos permanecen compartidos.
ALTER TABLE periodos ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE personas ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE designaciones_calificacion ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE expedientes_calificacion ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE instrumentos_expediente ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE hojas_vida ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE borradores_anotacion ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE anotaciones ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE evaluaciones_evint ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE respuestas_evint ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE resoluciones_anotacion ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE resoluciones_documentales ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE puntos_resolucion ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE hc2_calificaciones ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE hc1_documentos ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE ham_documentos ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE hapsem_documentos ADD COLUMN propietario_usuario_id BIGINT NULL;
ALTER TABLE notas_tareas_calificador ADD COLUMN propietario_usuario_id BIGINT NULL;

-- Backfill de la instalación existente al primer usuario.
UPDATE periodos SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE personas SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE designaciones_calificacion SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE expedientes_calificacion SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE instrumentos_expediente SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE hojas_vida SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE borradores_anotacion SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE anotaciones SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE evaluaciones_evint SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE respuestas_evint SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE resoluciones_anotacion SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE resoluciones_documentales SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE puntos_resolucion SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE hc2_calificaciones SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE hc1_documentos SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE ham_documentos SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE hapsem_documentos SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;
UPDATE notas_tareas_calificador SET propietario_usuario_id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)
WHERE propietario_usuario_id IS NULL;

ALTER TABLE periodos ADD KEY ix_periodos_propietario (propietario_usuario_id), ADD CONSTRAINT fk_periodos_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE personas ADD KEY ix_personas_propietario (propietario_usuario_id), ADD CONSTRAINT fk_personas_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE designaciones_calificacion ADD KEY ix_designaciones_propietario (propietario_usuario_id), ADD CONSTRAINT fk_designaciones_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE expedientes_calificacion ADD KEY ix_expedientes_propietario (propietario_usuario_id), ADD CONSTRAINT fk_expedientes_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE instrumentos_expediente ADD KEY ix_instrumentos_propietario (propietario_usuario_id), ADD CONSTRAINT fk_instrumentos_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE hojas_vida ADD KEY ix_hojas_vida_propietario (propietario_usuario_id), ADD CONSTRAINT fk_hojas_vida_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE borradores_anotacion ADD KEY ix_borradores_propietario (propietario_usuario_id), ADD CONSTRAINT fk_borradores_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE anotaciones ADD KEY ix_anotaciones_propietario (propietario_usuario_id), ADD CONSTRAINT fk_anotaciones_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE evaluaciones_evint ADD KEY ix_evint_propietario (propietario_usuario_id), ADD CONSTRAINT fk_evint_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE respuestas_evint ADD KEY ix_respuestas_evint_propietario (propietario_usuario_id), ADD CONSTRAINT fk_respuestas_evint_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE resoluciones_anotacion ADD KEY ix_res_anotacion_propietario (propietario_usuario_id), ADD CONSTRAINT fk_res_anotacion_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE resoluciones_documentales ADD KEY ix_res_documental_propietario (propietario_usuario_id), ADD CONSTRAINT fk_res_documental_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE puntos_resolucion ADD KEY ix_puntos_res_propietario (propietario_usuario_id), ADD CONSTRAINT fk_puntos_res_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE hc2_calificaciones ADD KEY ix_hc2_propietario (propietario_usuario_id), ADD CONSTRAINT fk_hc2_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE hc1_documentos ADD KEY ix_hc1_propietario (propietario_usuario_id), ADD CONSTRAINT fk_hc1_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE ham_documentos ADD KEY ix_ham_propietario (propietario_usuario_id), ADD CONSTRAINT fk_ham_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE hapsem_documentos ADD KEY ix_hapsem_propietario (propietario_usuario_id), ADD CONSTRAINT fk_hapsem_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);
ALTER TABLE notas_tareas_calificador ADD KEY ix_notas_propietario (propietario_usuario_id), ADD CONSTRAINT fk_notas_propietario FOREIGN KEY (propietario_usuario_id) REFERENCES usuarios(id);

CREATE TABLE auditoria_usuario (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    accion VARCHAR(40) NOT NULL,
    entidad VARCHAR(80) NOT NULL,
    entidad_id BIGINT NULL,
    detalle_json LONGTEXT NULL,
    creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_auditoria_usuario_fecha (usuario_id, creada_en),
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- La sesión SQL es establecida por el backend antes de cada operación.
-- Estos triggers asignan propietario automáticamente a INSERT heredados del frontend.
DROP TRIGGER IF EXISTS trg_periodos_propietario_insert;
CREATE TRIGGER trg_periodos_propietario_insert BEFORE INSERT ON periodos FOR EACH ROW
BEGIN
  IF @hvdigital_usuario_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Sesión de HVDigital requerida.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_personas_propietario_insert;
CREATE TRIGGER trg_personas_propietario_insert BEFORE INSERT ON personas FOR EACH ROW
BEGIN
  IF @hvdigital_usuario_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Sesión de HVDigital requerida.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_designaciones_propietario_insert;
CREATE TRIGGER trg_designaciones_propietario_insert BEFORE INSERT ON designaciones_calificacion FOR EACH ROW
BEGIN
  IF @hvdigital_usuario_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Sesión de HVDigital requerida.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM personas p WHERE p.id=NEW.persona_id AND p.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La persona no pertenece al usuario autenticado.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM periodos p WHERE p.id=NEW.periodo_id AND p.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El período no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_expedientes_propietario_insert;
CREATE TRIGGER trg_expedientes_propietario_insert BEFORE INSERT ON expedientes_calificacion FOR EACH ROW
BEGIN
  IF @hvdigital_usuario_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Sesión de HVDigital requerida.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM designaciones_calificacion d WHERE d.id=NEW.designacion_id AND d.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La designación no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_instrumentos_propietario_insert;
CREATE TRIGGER trg_instrumentos_propietario_insert BEFORE INSERT ON instrumentos_expediente FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM expedientes_calificacion e WHERE e.id=NEW.expediente_id AND e.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El expediente no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_hojas_vida_propietario_insert;
CREATE TRIGGER trg_hojas_vida_propietario_insert BEFORE INSERT ON hojas_vida FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM personas p WHERE p.id=NEW.persona_id AND p.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La persona no pertenece al usuario autenticado.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM periodos p WHERE p.id=NEW.periodo_id AND p.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El período no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_borradores_propietario_insert;
CREATE TRIGGER trg_borradores_propietario_insert BEFORE INSERT ON borradores_anotacion FOR EACH ROW
BEGIN
  IF NEW.hoja_vida_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hojas_vida h WHERE h.id=NEW.hoja_vida_id AND h.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La Hoja de Vida no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_anotaciones_propietario_insert;
CREATE TRIGGER trg_anotaciones_propietario_insert BEFORE INSERT ON anotaciones FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hojas_vida h WHERE h.id=NEW.hoja_vida_id AND h.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La Hoja de Vida no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_evint_propietario_insert;
CREATE TRIGGER trg_evint_propietario_insert BEFORE INSERT ON evaluaciones_evint FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM expedientes_calificacion e WHERE e.id=NEW.expediente_id AND e.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El expediente no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_respuestas_evint_propietario_insert;
CREATE TRIGGER trg_respuestas_evint_propietario_insert BEFORE INSERT ON respuestas_evint FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM evaluaciones_evint e WHERE e.id=NEW.evaluacion_evint_id AND e.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La EVINT no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_res_anotacion_propietario_insert;
CREATE TRIGGER trg_res_anotacion_propietario_insert BEFORE INSERT ON resoluciones_anotacion FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hojas_vida h WHERE h.id=NEW.hoja_vida_id AND h.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La Hoja de Vida no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_res_documental_propietario_insert;
CREATE TRIGGER trg_res_documental_propietario_insert BEFORE INSERT ON resoluciones_documentales FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hojas_vida h WHERE h.id=NEW.hoja_vida_id AND h.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La Hoja de Vida no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_puntos_res_propietario_insert;
CREATE TRIGGER trg_puntos_res_propietario_insert BEFORE INSERT ON puntos_resolucion FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM resoluciones_documentales r WHERE r.id=NEW.resolucion_id AND r.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La resolución no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_hc2_propietario_insert;
CREATE TRIGGER trg_hc2_propietario_insert BEFORE INSERT ON hc2_calificaciones FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hojas_vida h WHERE h.id=NEW.hoja_vida_id AND h.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La Hoja de Vida no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_hc1_propietario_insert;
CREATE TRIGGER trg_hc1_propietario_insert BEFORE INSERT ON hc1_documentos FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hojas_vida h WHERE h.id=NEW.hoja_vida_id AND h.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La Hoja de Vida no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_ham_propietario_insert;
CREATE TRIGGER trg_ham_propietario_insert BEFORE INSERT ON ham_documentos FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hojas_vida h WHERE h.id=NEW.hoja_vida_id AND h.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La Hoja de Vida no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_hapsem_propietario_insert;
CREATE TRIGGER trg_hapsem_propietario_insert BEFORE INSERT ON hapsem_documentos FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hojas_vida h WHERE h.id=NEW.hoja_vida_id AND h.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La Hoja de Vida no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

DROP TRIGGER IF EXISTS trg_notas_propietario_insert;
CREATE TRIGGER trg_notas_propietario_insert BEFORE INSERT ON notas_tareas_calificador FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM periodos p WHERE p.id=NEW.periodo_id AND p.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El período no pertenece al usuario autenticado.'; END IF;
  IF NEW.persona_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM personas p WHERE p.id=NEW.persona_id AND p.propietario_usuario_id=@hvdigital_usuario_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='La persona no pertenece al usuario autenticado.'; END IF;
  SET NEW.propietario_usuario_id = @hvdigital_usuario_id;
END;

-- Protección transversal de UPDATE/DELETE: el backend fija @hvdigital_usuario_id.
DROP TRIGGER IF EXISTS trg_periodos_propietario_update;
CREATE TRIGGER trg_periodos_propietario_update BEFORE UPDATE ON periodos FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado al período.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_personas_propietario_update;
CREATE TRIGGER trg_personas_propietario_update BEFORE UPDATE ON personas FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la persona.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_designaciones_propietario_update;
CREATE TRIGGER trg_designaciones_propietario_update BEFORE UPDATE ON designaciones_calificacion FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la designación.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_expedientes_propietario_update;
CREATE TRIGGER trg_expedientes_propietario_update BEFORE UPDATE ON expedientes_calificacion FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado al expediente.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_instrumentos_propietario_update;
CREATE TRIGGER trg_instrumentos_propietario_update BEFORE UPDATE ON instrumentos_expediente FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado al instrumento.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_hojas_vida_propietario_update;
CREATE TRIGGER trg_hojas_vida_propietario_update BEFORE UPDATE ON hojas_vida FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la Hoja de Vida.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_borradores_propietario_update;
CREATE TRIGGER trg_borradores_propietario_update BEFORE UPDATE ON borradores_anotacion FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado al borrador.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_anotaciones_propietario_update;
CREATE TRIGGER trg_anotaciones_propietario_update BEFORE UPDATE ON anotaciones FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la anotación.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_evint_propietario_update;
CREATE TRIGGER trg_evint_propietario_update BEFORE UPDATE ON evaluaciones_evint FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la EVINT.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_respuestas_evint_propietario_update;
CREATE TRIGGER trg_respuestas_evint_propietario_update BEFORE UPDATE ON respuestas_evint FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la respuesta EVINT.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_res_anotacion_propietario_update;
CREATE TRIGGER trg_res_anotacion_propietario_update BEFORE UPDATE ON resoluciones_anotacion FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la resolución.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_res_documental_propietario_update;
CREATE TRIGGER trg_res_documental_propietario_update BEFORE UPDATE ON resoluciones_documentales FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la resolución.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_puntos_res_propietario_update;
CREATE TRIGGER trg_puntos_res_propietario_update BEFORE UPDATE ON puntos_resolucion FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado al punto de resolución.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_hc2_propietario_update;
CREATE TRIGGER trg_hc2_propietario_update BEFORE UPDATE ON hc2_calificaciones FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a HC2.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_hc1_propietario_update;
CREATE TRIGGER trg_hc1_propietario_update BEFORE UPDATE ON hc1_documentos FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a HC1.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_ham_propietario_update;
CREATE TRIGGER trg_ham_propietario_update BEFORE UPDATE ON ham_documentos FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a HAM.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_hapsem_propietario_update;
CREATE TRIGGER trg_hapsem_propietario_update BEFORE UPDATE ON hapsem_documentos FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a HAPSEM.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
DROP TRIGGER IF EXISTS trg_notas_propietario_update;
CREATE TRIGGER trg_notas_propietario_update BEFORE UPDATE ON notas_tareas_calificador FOR EACH ROW BEGIN IF @hvdigital_usuario_id IS NULL OR OLD.propietario_usuario_id<>@hvdigital_usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceso denegado a la nota.'; END IF; SET NEW.propietario_usuario_id=OLD.propietario_usuario_id; END;
