PRAGMA foreign_keys = ON;

-- ============================================================
-- GRADOS MILITARES
-- ============================================================

CREATE TABLE IF NOT EXISTS grados (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    abreviatura TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    categoria_id INTEGER,
    orden_jerarquico INTEGER NOT NULL UNIQUE,
    sujeto_calificacion INTEGER NOT NULL DEFAULT 1
        CHECK (sujeto_calificacion IN (0, 1)),
    es_oficial INTEGER NOT NULL DEFAULT 0
        CHECK (es_oficial IN (0, 1)),
    es_cuadro_permanente INTEGER NOT NULL DEFAULT 0
        CHECK (es_cuadro_permanente IN (0, 1)),
    es_tropa_profesional INTEGER NOT NULL DEFAULT 0
        CHECK (es_tropa_profesional IN (0, 1)),
    es_normativo INTEGER NOT NULL DEFAULT 1
        CHECK (es_normativo IN (0, 1)),
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),

    FOREIGN KEY (categoria_id)
        REFERENCES categorias_personal(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    CHECK (
        sujeto_calificacion = 1
        OR categoria_id IS NULL
    )
);

CREATE INDEX IF NOT EXISTS
    ix_grados_categoria
ON grados(categoria_id);

CREATE INDEX IF NOT EXISTS
    ix_grados_orden
ON grados(orden_jerarquico);

-- ============================================================
-- CALIDADES FUNCIONARIAS
--
-- No corresponden a grados militares, pero determinan la
-- categoría y el régimen calificatorio del personal civil.
-- ============================================================

CREATE TABLE IF NOT EXISTS calidades_personal (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    abreviatura TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    categoria_id INTEGER NOT NULL,
    sujeto_calificacion INTEGER NOT NULL DEFAULT 1
        CHECK (sujeto_calificacion IN (0, 1)),
    es_normativo INTEGER NOT NULL DEFAULT 1
        CHECK (es_normativo IN (0, 1)),
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),

    FOREIGN KEY (categoria_id)
        REFERENCES categorias_personal(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS
    ix_calidades_categoria
ON calidades_personal(categoria_id);

-- ============================================================
-- DATOS NORMATIVOS: GRADOS
--
-- orden_jerarquico:
-- menor número = mayor jerarquía.
-- ============================================================

INSERT INTO grados (
    id,
    codigo,
    abreviatura,
    nombre,
    categoria_id,
    orden_jerarquico,
    sujeto_calificacion,
    es_oficial,
    es_cuadro_permanente,
    es_tropa_profesional
)
VALUES
    -- Oficiales generales:
    -- registrados, pero exentos de calificación anual.
    (
        1,
        'GENERAL_DE_EJERCITO',
        'GDE',
        'General de Ejército',
        NULL,
        1,
        0,
        1,
        0,
        0
    ),
    (
        2,
        'GENERAL_DE_DIVISION',
        'GDD',
        'General de División',
        NULL,
        2,
        0,
        1,
        0,
        0
    ),
    (
        3,
        'GENERAL_DE_BRIGADA',
        'GDB',
        'General de Brigada',
        NULL,
        3,
        0,
        1,
        0,
        0
    ),

    -- Oficial superior.
    (
        4,
        'CORONEL',
        'CRL',
        'Coronel',
        1,
        4,
        1,
        1,
        0,
        0
    ),

    -- Oficiales jefes.
    (
        5,
        'TENIENTE_CORONEL',
        'TCL',
        'Teniente Coronel',
        2,
        5,
        1,
        1,
        0,
        0
    ),
    (
        6,
        'MAYOR',
        'MAY',
        'Mayor',
        2,
        6,
        1,
        1,
        0,
        0
    ),

    -- Oficiales subalternos.
    (
        7,
        'CAPITAN',
        'CAP',
        'Capitán',
        3,
        7,
        1,
        1,
        0,
        0
    ),
    (
        8,
        'TENIENTE',
        'TTE',
        'Teniente',
        3,
        8,
        1,
        1,
        0,
        0
    ),
    (
        9,
        'SUBTENIENTE',
        'STE',
        'Subteniente',
        3,
        9,
        1,
        1,
        0,
        0
    ),
    (
        10,
        'ALFEREZ',
        'ALF',
        'Alférez',
        3,
        10,
        1,
        1,
        0,
        0
    ),

    -- Suboficial mayor.
    (
        11,
        'SUBOFICIAL_MAYOR',
        'SOM',
        'Suboficial Mayor',
        4,
        11,
        1,
        0,
        1,
        0
    ),

    -- Suboficiales.
    (
        12,
        'SUBOFICIAL',
        'SOF',
        'Suboficial',
        5,
        12,
        1,
        0,
        1,
        0
    ),
    (
        13,
        'SARGENTO_PRIMERO',
        'SG1',
        'Sargento Primero',
        5,
        13,
        1,
        0,
        1,
        0
    ),
    (
        14,
        'SARGENTO_SEGUNDO',
        'SG2',
        'Sargento Segundo',
        5,
        14,
        1,
        0,
        1,
        0
    ),

    -- Clases.
    (
        15,
        'CABO_PRIMERO',
        'CB1',
        'Cabo Primero',
        6,
        15,
        1,
        0,
        1,
        0
    ),
    (
        16,
        'CABO_SEGUNDO',
        'CB2',
        'Cabo Segundo',
        6,
        16,
        1,
        0,
        1,
        0
    ),
    (
        17,
        'CABO',
        'CBO',
        'Cabo',
        6,
        17,
        1,
        0,
        1,
        0
    ),

    -- Tropa profesional.
    (
        18,
        'SOLDADO_TROPA_PROFESIONAL',
        'SLTP',
        'Soldado de Tropa Profesional',
        7,
        18,
        1,
        0,
        0,
        1
    )
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    abreviatura = excluded.abreviatura,
    nombre = excluded.nombre,
    categoria_id = excluded.categoria_id,
    orden_jerarquico = excluded.orden_jerarquico,
    sujeto_calificacion = excluded.sujeto_calificacion,
    es_oficial = excluded.es_oficial,
    es_cuadro_permanente = excluded.es_cuadro_permanente,
    es_tropa_profesional = excluded.es_tropa_profesional,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- DATOS NORMATIVOS: CALIDADES DEL PERSONAL CIVIL
--
-- La CAP-01001 señala que la categoría Personal Civil
-- considera ECP, PAC y PAJ.
-- ============================================================

INSERT INTO calidades_personal (
    id,
    codigo,
    abreviatura,
    nombre,
    categoria_id,
    sujeto_calificacion
)
VALUES
    (
        1,
        'EMPLEADO_CIVIL_PLANTA',
        'ECP',
        'Empleado Civil de Planta',
        8,
        1
    ),
    (
        2,
        'PERSONAL_A_CONTRATA',
        'PAC',
        'Personal a Contrata',
        8,
        1
    ),
    (
        3,
        'PERSONAL_A_JORNAL',
        'PAJ',
        'Personal a Jornal',
        8,
        1
    )
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    abreviatura = excluded.abreviatura,
    nombre = excluded.nombre,
    categoria_id = excluded.categoria_id,
    sujeto_calificacion = excluded.sujeto_calificacion,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- VISTA DE CONSULTA UNIFICADA
--
-- Facilita la presentación del catálogo sin confundir grados
-- militares con calidades funcionarias.
-- ============================================================

DROP VIEW IF EXISTS vw_grados_calidades;

CREATE VIEW vw_grados_calidades AS

SELECT
    'GRADO' AS tipo,
    g.id AS id,
    g.codigo AS codigo,
    g.abreviatura AS abreviatura,
    g.nombre AS nombre,
    g.categoria_id AS categoria_id,
    c.codigo AS categoria_codigo,
    c.nombre AS categoria_nombre,
    g.orden_jerarquico AS orden,
    g.sujeto_calificacion AS sujeto_calificacion,
    g.activo AS activo
FROM grados g
LEFT JOIN categorias_personal c
    ON c.id = g.categoria_id

UNION ALL

SELECT
    'CALIDAD' AS tipo,
    cp.id AS id,
    cp.codigo AS codigo,
    cp.abreviatura AS abreviatura,
    cp.nombre AS nombre,
    cp.categoria_id AS categoria_id,
    c.codigo AS categoria_codigo,
    c.nombre AS categoria_nombre,
    100 + cp.id AS orden,
    cp.sujeto_calificacion AS sujeto_calificacion,
    cp.activo AS activo
FROM calidades_personal cp
INNER JOIN categorias_personal c
    ON c.id = cp.categoria_id;