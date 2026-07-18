PRAGMA foreign_keys = ON;
-- ====================
-- AREAS DE EVALUACION
-- ====================

CREATE TABLE IF NOT EXISTS areas_evaluacion(
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    orden INTEGER NOT NULL,
    es_normativo INTEGER NOT NULL DEFAULT 1
        CHECK (es_normativo IN (0,1)),
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0,1))
);

CREATE TABLE IF NOT EXISTS conceptos_calificacion (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    numero INTEGER NOT NULL UNIQUE
        CHECK (numero BETWEEN 1 AND 9),
    nombre TEXT NOT NULL,
    area_evaluacion_id INTEGER NOT NULL,
    orden INTEGER NOT NULL,
    es_normativo INTEGER NOT NULL DEFAULT 1
        CHECK (es_normativo IN (0, 1)),
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),

    FOREIGN KEY (area_evaluacion_id)
        REFERENCES areas_evaluacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);

-- ============================================================
-- CATEGORÍAS DEL PERSONAL
-- CAP-01001, Tabla 2-3
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias_personal (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    cantidad_conceptos INTEGER NOT NULL
        CHECK (cantidad_conceptos BETWEEN 1 AND 9),
    orden INTEGER NOT NULL,
    es_militar INTEGER NOT NULL
        CHECK (es_militar IN (0, 1)),
    es_normativo INTEGER NOT NULL DEFAULT 1
        CHECK (es_normativo IN (0, 1)),
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1))
);

-- ============================================================
-- RELACIÓN CATEGORÍA-CONCEPTO
-- Define los conceptos obligatorios para cada categoría.
-- ============================================================

CREATE TABLE IF NOT EXISTS categoria_conceptos (
    categoria_id INTEGER NOT NULL,
    concepto_id INTEGER NOT NULL,
    orden INTEGER NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),

    PRIMARY KEY (categoria_id, concepto_id),

    FOREIGN KEY (categoria_id)
        REFERENCES categorias_personal(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (concepto_id)
        REFERENCES conceptos_calificacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS
    ix_conceptos_area
ON conceptos_calificacion(area_evaluacion_id);

CREATE INDEX IF NOT EXISTS
    ix_categoria_conceptos_categoria
ON categoria_conceptos(categoria_id);

CREATE INDEX IF NOT EXISTS
    ix_categoria_conceptos_concepto
ON categoria_conceptos(concepto_id);

-- ============================================================
-- DATOS NORMATIVOS: ÁREAS
-- ============================================================

INSERT INTO areas_evaluacion (
    id,
    codigo,
    nombre,
    descripcion,
    orden
)
VALUES
    (
        1,
        'CONDUCTA',
        'Conducta militar o funcionaria',
        'Conducta militar para personal militar y conducta funcionaria para personal civil.',
        1
    ),
    (
        2,
        'DESEMPENO',
        'Desempeño profesional',
        'Evaluación del desempeño profesional conforme a la categoría y función.',
        2
    )
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    orden = excluded.orden,
    es_normativo = 1,
    activo = 1;


-- ============================================================
-- DATOS NORMATIVOS: CONCEPTOS
-- ============================================================

INSERT INTO conceptos_calificacion (
    id,
    codigo,
    numero,
    nombre,
    area_evaluacion_id,
    orden
)
VALUES
    (1, 'C01', 1, 'Cumplimiento del deber',       1, 1),
    (2, 'C02', 2, 'Criterio y discreción',        1, 2),
    (3, 'C03', 3, 'Sociabilidad y cohesión',      1, 3),
    (4, 'C04', 4, 'Compromiso institucional',     1, 4),
    (5, 'C05', 5, 'Mando',                        2, 5),
    (6, 'C06', 6, 'Asesoría',                     2, 6),
    (7, 'C07', 7, 'Educación e instrucción',      2, 7),
    (8, 'C08', 8, 'Administración',               2, 8),
    (9, 'C09', 9, 'Preparación profesional',      2, 9)
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    numero = excluded.numero,
    nombre = excluded.nombre,
    area_evaluacion_id = excluded.area_evaluacion_id,
    orden = excluded.orden,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- DATOS NORMATIVOS: CATEGORÍAS
-- ============================================================

INSERT INTO categorias_personal (
    id,
    codigo,
    nombre,
    cantidad_conceptos,
    orden,
    es_militar
)
VALUES
    (1, 'OFICIAL_SUPERIOR',    'Oficial superior',              7, 1, 1),
    (2, 'OFICIAL_JEFE',        'Oficial jefe',                  9, 2, 1),
    (3, 'OFICIAL_SUBALTERNO',  'Oficial subalterno',            9, 3, 1),
    (4, 'SUBOFICIAL_MAYOR',    'Suboficial mayor',              4, 4, 1),
    (5, 'SUBOFICIAL',          'Suboficial',                    9, 5, 1),
    (6, 'CLASE',               'Clase',                         8, 6, 1),
    (7, 'TROPA_PROFESIONAL',   'Soldado de tropa profesional',  4, 7, 1),
    (8, 'PERSONAL_CIVIL',      'Personal civil',                6, 8, 0)
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    nombre = excluded.nombre,
    cantidad_conceptos = excluded.cantidad_conceptos,
    orden = excluded.orden,
    es_militar = excluded.es_militar,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- OFICIAL SUPERIOR
-- Conceptos: 1, 2, 3, 5, 6, 8 y 9
-- ============================================================

INSERT OR IGNORE INTO categoria_conceptos
    (categoria_id, concepto_id, orden)
VALUES
    (1, 1, 1),
    (1, 2, 2),
    (1, 3, 3),
    (1, 5, 4),
    (1, 6, 5),
    (1, 8, 6),
    (1, 9, 7);

-- ============================================================
-- OFICIAL JEFE
-- Conceptos: 1 al 9
-- ============================================================

INSERT OR IGNORE INTO categoria_conceptos
    (categoria_id, concepto_id, orden)
VALUES
    (2, 1, 1),
    (2, 2, 2),
    (2, 3, 3),
    (2, 4, 4),
    (2, 5, 5),
    (2, 6, 6),
    (2, 7, 7),
    (2, 8, 8),
    (2, 9, 9);

-- ============================================================
-- OFICIAL JEFE
-- Conceptos: 1 al 9
-- ============================================================

INSERT OR IGNORE INTO categoria_conceptos
    (categoria_id, concepto_id, orden)
VALUES
    (2, 1, 1),
    (2, 2, 2),
    (2, 3, 3),
    (2, 4, 4),
    (2, 5, 5),
    (2, 6, 6),
    (2, 7, 7),
    (2, 8, 8),
    (2, 9, 9);

-- ============================================================
-- SUBOFICIAL MAYOR
-- Conceptos: 1, 2, 3 y 6
-- ============================================================

INSERT OR IGNORE INTO categoria_conceptos
    (categoria_id, concepto_id, orden)
VALUES
    (4, 1, 1),
    (4, 2, 2),
    (4, 3, 3),
    (4, 6, 4);

-- ============================================================
-- SUBOFICIAL
-- Conceptos: 1 al 9
-- ============================================================

INSERT OR IGNORE INTO categoria_conceptos
    (categoria_id, concepto_id, orden)
VALUES
    (5, 1, 1),
    (5, 2, 2),
    (5, 3, 3),
    (5, 4, 4),
    (5, 5, 5),
    (5, 6, 6),
    (5, 7, 7),
    (5, 8, 8),
    (5, 9, 9);

-- ============================================================
-- CLASE
-- Conceptos: 1, 2, 3, 4, 5, 7, 8 y 9
-- ============================================================

INSERT OR IGNORE INTO categoria_conceptos
    (categoria_id, concepto_id, orden)
VALUES
    (6, 1, 1),
    (6, 2, 2),
    (6, 3, 3),
    (6, 4, 4),
    (6, 5, 5),
    (6, 7, 6),
    (6, 8, 7),
    (6, 9, 8);

-- ============================================================
-- SOLDADO DE TROPA PROFESIONAL
-- Conceptos: 1, 3, 4 y 9
-- ============================================================

INSERT OR IGNORE INTO categoria_conceptos
    (categoria_id, concepto_id, orden)
VALUES
    (7, 1, 1),
    (7, 3, 2),
    (7, 4, 3),
    (7, 9, 4);

-- ============================================================
-- PERSONAL CIVIL
-- Conceptos: 1, 2, 3, 4, 6 y 9
-- ============================================================

INSERT OR IGNORE INTO categoria_conceptos
    (categoria_id, concepto_id, orden)
VALUES
    (8, 1, 1),
    (8, 2, 2),
    (8, 3, 3),
    (8, 4, 4),
    (8, 6, 5),
    (8, 9, 6);

    