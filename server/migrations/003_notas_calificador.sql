CREATE TABLE IF NOT EXISTS notas_tareas_calificador (
    id BIGINT NOT NULL AUTO_INCREMENT,
    periodo_id BIGINT NOT NULL,
    persona_id BIGINT NULL,
    tipo VARCHAR(16) NOT NULL DEFAULT 'NOTA',
    titulo VARCHAR(255) NOT NULL,
    detalle LONGTEXT NULL,
    prioridad VARCHAR(16) NOT NULL DEFAULT 'MEDIA',
    estado VARCHAR(24) NOT NULL DEFAULT 'PENDIENTE',
    fecha_limite VARCHAR(32) NULL,
    completada_en DATETIME NULL,
    creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_notas_tareas_periodo (periodo_id, estado, fecha_limite),
    KEY ix_notas_tareas_persona (persona_id, periodo_id),
    CONSTRAINT fk_notas_periodo
        FOREIGN KEY (periodo_id) REFERENCES periodos(id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_notas_persona
        FOREIGN KEY (persona_id) REFERENCES personas(id)
        ON UPDATE RESTRICT ON DELETE SET NULL,
    CONSTRAINT ck_notas_tipo CHECK (tipo IN ('NOTA', 'TAREA')),
    CONSTRAINT ck_notas_prioridad CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA')),
    CONSTRAINT ck_notas_estado CHECK (estado IN ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'ARCHIVADA'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS trg_notas_tareas_periodo_cerrado_insert;
DROP TRIGGER IF EXISTS trg_notas_tareas_periodo_cerrado_update;
DROP TRIGGER IF EXISTS trg_notas_tareas_periodo_cerrado_delete;

CREATE TRIGGER trg_notas_tareas_periodo_cerrado_insert
BEFORE INSERT ON notas_tareas_calificador
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM periodos p
        WHERE p.id = NEW.periodo_id AND LOWER(p.estado) = 'cerrado'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El período está cerrado y solo permite lectura.';
    END IF;
END;

CREATE TRIGGER trg_notas_tareas_periodo_cerrado_update
BEFORE UPDATE ON notas_tareas_calificador
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM periodos p
        WHERE p.id = OLD.periodo_id AND LOWER(p.estado) = 'cerrado'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El período está cerrado y solo permite lectura.';
    END IF;
END;

CREATE TRIGGER trg_notas_tareas_periodo_cerrado_delete
BEFORE DELETE ON notas_tareas_calificador
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM periodos p
        WHERE p.id = OLD.periodo_id AND LOWER(p.estado) = 'cerrado'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El período está cerrado y solo permite lectura.';
    END IF;
END;
