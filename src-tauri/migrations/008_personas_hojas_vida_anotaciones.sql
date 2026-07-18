PRAGMA foreign_keys = ON;

-- ============================================================
-- PERSONAS
-- ============================================================

CREATE TABLE IF NOT EXISTS personas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    run TEXT NOT NULL UNIQUE,
    nombres TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT,

    grado_id INTEGER,
    calidad_personal_id INTEGER,

    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (grado_id)
        REFERENCES grados(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (calidad_personal_id)
        REFERENCES calidades_personal(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    CHECK (
        (grado_id IS NOT NULL AND calidad_personal_id IS NULL)
        OR
        (grado_id IS NULL AND calidad_personal_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS ix_personas_grado
ON personas(grado_id);

CREATE INDEX IF NOT EXISTS ix_personas_calidad
ON personas(calidad_personal_id);

-- ============================================================
-- HOJAS DE VIDA
--
-- La categoría se guarda como snapshot para impedir que un cambio
-- posterior de grado modifique retroactivamente los conceptos.
-- ============================================================

CREATE TABLE IF NOT EXISTS hojas_vida (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    persona_id INTEGER NOT NULL,
    periodo_id INTEGER NOT NULL,
    categoria_id INTEGER NOT NULL,

    grado_id_inicio INTEGER,
    calidad_personal_id_inicio INTEGER,

    fecha_inicio TEXT NOT NULL,
    fecha_termino TEXT NOT NULL,

    estado TEXT NOT NULL DEFAULT 'abierta'
        CHECK (
            estado IN (
                'abierta',
                'cerrada',
                'anulada'
            )
        ),

    creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cerrada_en TEXT,

    FOREIGN KEY (persona_id)
        REFERENCES personas(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (periodo_id)
        REFERENCES periodos(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (categoria_id)
        REFERENCES categorias_personal(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (grado_id_inicio)
        REFERENCES grados(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (calidad_personal_id_inicio)
        REFERENCES calidades_personal(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    UNIQUE (persona_id, periodo_id)
);

CREATE INDEX IF NOT EXISTS ix_hojas_vida_persona
ON hojas_vida(persona_id);

CREATE INDEX IF NOT EXISTS ix_hojas_vida_periodo
ON hojas_vida(periodo_id);

-- ============================================================
-- ANOTACIONES DEFINITIVAS
-- ============================================================

CREATE TABLE IF NOT EXISTS anotaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    hoja_vida_id INTEGER NOT NULL,
    plantilla_id INTEGER NOT NULL,

    concepto_id INTEGER,
    puntaje_id INTEGER,

    fecha_anotacion TEXT NOT NULL,

    titulo_final TEXT NOT NULL,
    cuerpo_final TEXT NOT NULL,

    color_semantico TEXT NOT NULL
        CHECK (color_semantico IN ('NEGRO', 'ROJO')),

    color_hex TEXT NOT NULL,

    valores_json TEXT NOT NULL DEFAULT '{}',

    origen TEXT NOT NULL DEFAULT 'CALIFICADOR_DIRECTO'
        CHECK (
            origen IN (
                'CALIFICADOR_DIRECTO',
                'AUTORIDAD_SUPERIOR',
                'OFICIAL_GENERAL',
                'OFICIAL_PERSONAL',
                'SISTEMA'
            )
        ),

    computa_calificacion INTEGER NOT NULL DEFAULT 0
        CHECK (computa_calificacion IN (0, 1)),

    requiere_resolucion INTEGER NOT NULL DEFAULT 0
        CHECK (requiere_resolucion IN (0, 1)),

    numero_resolucion TEXT,
    fecha_resolucion TEXT,

    estado TEXT NOT NULL DEFAULT 'estampada'
        CHECK (
            estado IN (
                'estampada',
                'anulada',
                'reemplazada'
            )
        ),

    creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (hoja_vida_id)
        REFERENCES hojas_vida(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (plantilla_id)
        REFERENCES plantillas_anotacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (concepto_id)
        REFERENCES conceptos_calificacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (puntaje_id)
        REFERENCES puntajes_anotacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_anotaciones_hoja_vida
ON anotaciones(hoja_vida_id, fecha_anotacion);

CREATE INDEX IF NOT EXISTS ix_anotaciones_concepto
ON anotaciones(hoja_vida_id, concepto_id);

CREATE INDEX IF NOT EXISTS ix_anotaciones_puntaje
ON anotaciones(puntaje_id);

-- ============================================================
-- AMPLIAR LOS BORRADORES
-- ============================================================

ALTER TABLE borradores_anotacion
ADD COLUMN concepto_id INTEGER;

ALTER TABLE borradores_anotacion
ADD COLUMN puntaje_id INTEGER;

ALTER TABLE borradores_anotacion
ADD COLUMN origen TEXT NOT NULL DEFAULT 'CALIFICADOR_DIRECTO';

ALTER TABLE borradores_anotacion
ADD COLUMN computa_calificacion INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- RESUMEN DE MÉRITOS POR HOJA DE VIDA
-- ============================================================

DROP VIEW IF EXISTS vw_resumen_meritos_hoja_vida;

CREATE VIEW vw_resumen_meritos_hoja_vida AS
SELECT
    a.hoja_vida_id,

    COUNT(*) AS total_meritos,

    SUM(
        CASE
            WHEN p.valor_centecimas = 50
            THEN 1
            ELSE 0
        END
    ) AS total_meritos_050,

    SUM(
        CASE
            WHEN p.valor_centecimas = 100
            THEN 1
            ELSE 0
        END
    ) AS total_meritos_100,

    SUM(
        CASE
            WHEN
                p.valor_centecimas = 50
                AND a.computa_calificacion = 1
            THEN 1
            ELSE 0
        END
    ) AS meritos_050_computables,

    SUM(
        CASE
            WHEN
                p.valor_centecimas = 100
                AND a.computa_calificacion = 1
            THEN 1
            ELSE 0
        END
    ) AS meritos_100_computables

FROM anotaciones a

INNER JOIN puntajes_anotacion p
    ON p.id = a.puntaje_id

INNER JOIN tipos_efecto_anotacion te
    ON te.id = p.tipo_efecto_id

WHERE
    a.estado = 'estampada'
    AND te.codigo = 'MERITO'

GROUP BY a.hoja_vida_id;