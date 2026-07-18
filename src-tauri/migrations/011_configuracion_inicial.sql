PRAGMA foreign_keys = ON;

-- ============================================================
-- FASE 2 - CONFIGURACIÓN INICIAL DE HVDIGITAL
-- ============================================================

CREATE TABLE IF NOT EXISTS calificadores_directos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grado_id INTEGER NOT NULL,
    run TEXT,
    nombres TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT,
    unidad_nombre TEXT NOT NULL,
    unidad_sigla TEXT NOT NULL,
    puesto TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (grado_id)
        REFERENCES grados(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS
    ux_calificadores_directos_run
ON calificadores_directos(run)
WHERE run IS NOT NULL AND TRIM(run) <> '';

CREATE TABLE IF NOT EXISTS configuracion_inicial (
    id INTEGER PRIMARY KEY CHECK (id = 1),

    estado TEXT NOT NULL DEFAULT 'NO_CONFIGURADA'
        CHECK (
            estado IN (
                'NO_CONFIGURADA',
                'EN_PROGRESO',
                'CONFIGURADA_SIN_PERSONAL',
                'OPERATIVA'
            )
        ),

    paso_actual INTEGER NOT NULL DEFAULT 1
        CHECK (paso_actual BETWEEN 1 AND 5),

    calificador_directo_id INTEGER,
    periodo_activo_id INTEGER,

    completada_en TEXT,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (calificador_directo_id)
        REFERENCES calificadores_directos(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (periodo_activo_id)
        REFERENCES periodos(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);

INSERT INTO configuracion_inicial (
    id,
    estado,
    paso_actual
)
VALUES (
    1,
    'NO_CONFIGURADA',
    1
)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS vigencias_periodo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    periodo_id INTEGER NOT NULL,

    codigo_regimen TEXT NOT NULL,
    nombre_regimen TEXT NOT NULL,

    fecha_inicio TEXT NOT NULL,
    fecha_termino TEXT NOT NULL,

    orden INTEGER NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),

    FOREIGN KEY (periodo_id)
        REFERENCES periodos(id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,

    UNIQUE (periodo_id, codigo_regimen)
);

CREATE INDEX IF NOT EXISTS
    ix_vigencias_periodo_periodo
ON vigencias_periodo(periodo_id, orden);

DROP VIEW IF EXISTS vw_estado_configuracion_inicial;

CREATE VIEW vw_estado_configuracion_inicial AS
SELECT
    ci.id,
    ci.estado,
    ci.paso_actual,
    ci.calificador_directo_id,
    ci.periodo_activo_id,
    ci.completada_en,
    ci.actualizado_en,

    cd.grado_id,
    g.abreviatura AS grado_abreviatura,
    g.nombre AS grado_nombre,

    cd.run,
    cd.nombres,
    cd.apellido_paterno,
    cd.apellido_materno,
    cd.unidad_nombre,
    cd.unidad_sigla,
    cd.puesto,

    p.nombre AS periodo_nombre,
    p.anio AS periodo_anio,
    p.fecha_inicio AS periodo_fecha_inicio,
    p.fecha_termino AS periodo_fecha_termino,
    p.estado AS periodo_estado

FROM configuracion_inicial ci

LEFT JOIN calificadores_directos cd
    ON cd.id = ci.calificador_directo_id

LEFT JOIN grados g
    ON g.id = cd.grado_id

LEFT JOIN periodos p
    ON p.id = ci.periodo_activo_id

WHERE ci.id = 1;
