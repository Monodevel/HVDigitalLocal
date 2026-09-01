CREATE TABLE IF NOT EXISTS periodos_globales (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(64) NOT NULL,
    anio INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_termino DATE NOT NULL,
    estado VARCHAR(16) NOT NULL DEFAULT 'cerrado',
    creado_por_usuario_id BIGINT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_periodos_globales_anio (anio),
    KEY ix_periodos_globales_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vigencias_periodo_global (
    id BIGINT NOT NULL AUTO_INCREMENT,
    periodo_global_id BIGINT NOT NULL,
    codigo_regimen VARCHAR(64) NOT NULL,
    nombre_regimen VARCHAR(180) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_termino DATE NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vigencia_global_regimen (periodo_global_id, codigo_regimen),
    CONSTRAINT fk_vigencia_global_periodo FOREIGN KEY (periodo_global_id)
        REFERENCES periodos_globales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE configuracion_usuario
    ADD COLUMN IF NOT EXISTS periodo_global_activo_id BIGINT NULL;

ALTER TABLE periodos
    ADD COLUMN IF NOT EXISTS periodo_global_id BIGINT NULL;

CREATE INDEX IF NOT EXISTS ix_periodos_periodo_global ON periodos(periodo_global_id);

INSERT INTO periodos_globales (nombre, anio, fecha_inicio, fecha_termino, estado, creado_por_usuario_id)
SELECT
    MIN(p.nombre),
    p.anio,
    MIN(p.fecha_inicio),
    MAX(p.fecha_termino),
    CASE WHEN SUM(LOWER(p.estado) = 'abierto') > 0 THEN 'abierto' ELSE 'cerrado' END,
    (SELECT id FROM usuarios WHERE rol = 'ADMIN' ORDER BY id LIMIT 1)
FROM periodos p
WHERE p.anio IS NOT NULL
GROUP BY p.anio
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    fecha_inicio = VALUES(fecha_inicio),
    fecha_termino = VALUES(fecha_termino),
    estado = VALUES(estado);

UPDATE periodos p
INNER JOIN periodos_globales pg ON pg.anio = p.anio
SET p.periodo_global_id = pg.id
WHERE p.periodo_global_id IS NULL;

INSERT INTO vigencias_periodo_global (
    periodo_global_id, codigo_regimen, nombre_regimen,
    fecha_inicio, fecha_termino, orden, activo
)
SELECT
    pg.id,
    vp.codigo_regimen,
    MIN(vp.nombre_regimen),
    MIN(vp.fecha_inicio),
    MAX(vp.fecha_termino),
    MIN(vp.orden),
    1
FROM vigencias_periodo vp
INNER JOIN periodos p ON p.id = vp.periodo_id
INNER JOIN periodos_globales pg ON pg.id = p.periodo_global_id
WHERE vp.activo = 1
GROUP BY pg.id, vp.codigo_regimen
ON DUPLICATE KEY UPDATE
    nombre_regimen = VALUES(nombre_regimen),
    fecha_inicio = VALUES(fecha_inicio),
    fecha_termino = VALUES(fecha_termino),
    orden = VALUES(orden),
    activo = 1;

UPDATE configuracion_usuario cu
INNER JOIN periodos p ON p.id = cu.periodo_activo_id
SET cu.periodo_global_activo_id = p.periodo_global_id
WHERE cu.periodo_activo_id IS NOT NULL
  AND p.periodo_global_id IS NOT NULL;
