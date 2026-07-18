PRAGMA foreign_keys = ON;

-- ============================================================
-- FASE 10 - RESOLUCIONES DOCUMENTALES
--
-- Reglas principales:
-- 1. Los borradores no tienen correlativo.
-- 2. El correlativo 1530/N se asigna solo al emitir.
-- 3. Solo las resoluciones EMITIDAS pueden ser usadas
--    posteriormente para crear una anotación.
-- 4. Los textos reglamentarios se copian a cada resolución,
--    para que una modificación futura del catálogo no altere
--    documentos ya creados o emitidos.
-- ============================================================

-- ------------------------------------------------------------
-- CONTADOR DE RESOLUCIONES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contadores_resolucion (
    prefijo TEXT PRIMARY KEY,
    ultimo_correlativo INTEGER NOT NULL DEFAULT 0
        CHECK (ultimo_correlativo >= 0),
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO contadores_resolucion (
    prefijo,
    ultimo_correlativo
)
VALUES (
    '1530',
    0
)
ON CONFLICT(prefijo) DO NOTHING;


-- ------------------------------------------------------------
-- CATÁLOGO DE PUNTOS REGLAMENTARIOS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS puntos_reglamentarios_resolucion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    tipo_aplicacion TEXT NOT NULL DEFAULT 'TODAS'
        CHECK (
            tipo_aplicacion IN (
                'TODAS',
                'MERITO',
                'DEMERITO'
            )
        ),

    seccion TEXT NOT NULL
        CHECK (
            seccion IN (
                'VISTOS',
                'CONSIDERANDO',
                'RESUELVO',
                'DISTRIBUCION'
            )
        ),

    orden INTEGER NOT NULL,
    texto TEXT NOT NULL,

    obligatorio INTEGER NOT NULL DEFAULT 1
        CHECK (obligatorio IN (0, 1)),

    editable INTEGER NOT NULL DEFAULT 0
        CHECK (editable IN (0, 1)),

    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (
        tipo_aplicacion,
        seccion,
        orden
    )
);

CREATE INDEX IF NOT EXISTS
    ix_puntos_reglamentarios_tipo_seccion
ON puntos_reglamentarios_resolucion(
    tipo_aplicacion,
    seccion,
    activo,
    orden
);


-- ------------------------------------------------------------
-- DATOS REGLAMENTARIOS INICIALES
-- ------------------------------------------------------------

INSERT INTO puntos_reglamentarios_resolucion (
    tipo_aplicacion,
    seccion,
    orden,
    texto,
    obligatorio,
    editable,
    activo
)
VALUES
    (
        'TODAS',
        'VISTOS',
        1,
        'La Ley N.º 18.948, Orgánica Constitucional de las Fuerzas Armadas.',
        1,
        0,
        1
    ),
    (
        'TODAS',
        'VISTOS',
        2,
        'El Estatuto del Personal de las Fuerzas Armadas, DFL (G) N.º 1 de 1997.',
        1,
        0,
        1
    ),
    (
        'TODAS',
        'VISTOS',
        3,
        'Las atribuciones que confiere el DNL-911 “Reglamento de Disciplina para las Fuerzas Armadas”.',
        1,
        0,
        1
    ),
    (
        'TODAS',
        'DISTRIBUCION',
        1,
        'CALIFICADO.',
        1,
        0,
        1
    ),
    (
        'TODAS',
        'DISTRIBUCION',
        2,
        'S-1 (C/I).',
        1,
        0,
        1
    ),
    (
        'TODAS',
        'DISTRIBUCION',
        3,
        'S-2 (C/I).',
        1,
        0,
        1
    ),
    (
        'TODAS',
        'DISTRIBUCION',
        4,
        'Calificador Directo.',
        1,
        0,
        1
    ),
    (
        'TODAS',
        'DISTRIBUCION',
        5,
        'CAP (Archivo).',
        1,
        0,
        1
    )
ON CONFLICT(
    tipo_aplicacion,
    seccion,
    orden
) DO UPDATE SET
    texto = excluded.texto,
    obligatorio = excluded.obligatorio,
    editable = excluded.editable,
    activo = excluded.activo,
    actualizado_en = CURRENT_TIMESTAMP;


-- ------------------------------------------------------------
-- RESOLUCIONES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS resoluciones_documentales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    hoja_vida_id INTEGER NOT NULL,
    persona_id INTEGER NOT NULL,

    tipo_efecto_codigo TEXT NOT NULL
        CHECK (
            tipo_efecto_codigo IN (
                'MERITO',
                'DEMERITO'
            )
        ),

    prefijo TEXT NOT NULL DEFAULT '1530',
    correlativo INTEGER,
    numero_visible TEXT,

    fecha_documento TEXT NOT NULL DEFAULT CURRENT_DATE,

    concepto_id INTEGER NOT NULL,
    puntaje_id INTEGER NOT NULL,

    asunto TEXT,
    antecedente_principal TEXT,
    resuelvo_principal TEXT NOT NULL,
    resuelvo_anotacion TEXT NOT NULL,

    cierre TEXT NOT NULL DEFAULT
        'Anótese, notifíquese, regístrese y archívese.',

    firmante_nombre TEXT,
    firmante_grado TEXT,
    firmante_cargo TEXT,

    estado TEXT NOT NULL DEFAULT 'BORRADOR'
        CHECK (
            estado IN (
                'BORRADOR',
                'EMITIDA',
                'ANULADA'
            )
        ),

    -- Valores históricos fijados al momento de emitir.
    concepto_numero_snapshot INTEGER,
    concepto_nombre_snapshot TEXT,
    puntaje_visual_snapshot TEXT,
    puntaje_literal_snapshot TEXT,

    anotacion_id INTEGER,

    emitida_en TEXT,
    anulada_en TEXT,
    motivo_anulacion TEXT,

    creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (hoja_vida_id)
        REFERENCES hojas_vida(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (persona_id)
        REFERENCES personas(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (concepto_id)
        REFERENCES conceptos_calificacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (puntaje_id)
        REFERENCES puntajes_anotacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    FOREIGN KEY (anotacion_id)
        REFERENCES anotaciones(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    CHECK (
        (
            estado = 'BORRADOR'
            AND correlativo IS NULL
            AND numero_visible IS NULL
            AND emitida_en IS NULL
        )
        OR
        (
            estado = 'EMITIDA'
            AND correlativo IS NOT NULL
            AND numero_visible IS NOT NULL
            AND emitida_en IS NOT NULL
        )
        OR
        estado = 'ANULADA'
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS
    ux_resoluciones_documentales_correlativo
ON resoluciones_documentales(
    prefijo,
    correlativo
)
WHERE correlativo IS NOT NULL;

CREATE INDEX IF NOT EXISTS
    ix_resoluciones_documentales_hoja_vida
ON resoluciones_documentales(
    hoja_vida_id,
    estado,
    tipo_efecto_codigo
);

CREATE INDEX IF NOT EXISTS
    ix_resoluciones_documentales_persona
ON resoluciones_documentales(
    persona_id,
    estado
);

CREATE INDEX IF NOT EXISTS
    ix_resoluciones_documentales_anotacion
ON resoluciones_documentales(
    anotacion_id
);


-- ------------------------------------------------------------
-- PUNTOS DE CADA RESOLUCIÓN
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS puntos_resolucion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    resolucion_id INTEGER NOT NULL,

    seccion TEXT NOT NULL
        CHECK (
            seccion IN (
                'VISTOS',
                'CONSIDERANDO',
                'RESUELVO',
                'DISTRIBUCION'
            )
        ),

    orden INTEGER NOT NULL,
    texto TEXT NOT NULL,

    origen TEXT NOT NULL
        CHECK (
            origen IN (
                'REGLAMENTARIO',
                'USUARIO',
                'GENERADO'
            )
        ),

    obligatorio INTEGER NOT NULL DEFAULT 0
        CHECK (obligatorio IN (0, 1)),

    editable INTEGER NOT NULL DEFAULT 1
        CHECK (editable IN (0, 1)),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (resolucion_id)
        REFERENCES resoluciones_documentales(id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,

    UNIQUE (
        resolucion_id,
        seccion,
        orden
    )
);

CREATE INDEX IF NOT EXISTS
    ix_puntos_resolucion_documento
ON puntos_resolucion(
    resolucion_id,
    seccion,
    orden
);


-- ------------------------------------------------------------
-- VISTA PARA LISTADOS Y SELECTORES
-- ------------------------------------------------------------

DROP VIEW IF EXISTS vw_resoluciones_documentales;

CREATE VIEW vw_resoluciones_documentales AS
SELECT
    r.id AS resolucion_id,
    r.hoja_vida_id,
    r.persona_id,
    r.tipo_efecto_codigo,

    r.prefijo,
    r.correlativo,
    r.numero_visible,
    r.fecha_documento,

    r.concepto_id,
    r.puntaje_id,

    r.asunto,
    r.antecedente_principal,
    r.resuelvo_principal,
    r.resuelvo_anotacion,
    r.cierre,

    r.firmante_nombre,
    r.firmante_grado,
    r.firmante_cargo,

    r.estado,
    r.anotacion_id,
    r.emitida_en,
    r.anulada_en,
    r.motivo_anulacion,
    r.creada_en,
    r.actualizada_en,

    p.run,
    p.nombres,
    p.apellido_paterno,
    p.apellido_materno,

    TRIM(
        COALESCE(g.abreviatura, cp.abreviatura, '')
        || ' '
        || p.nombres
        || ' '
        || p.apellido_paterno
        || ' '
        || COALESCE(p.apellido_materno, '')
    ) AS persona_nombre_completo,

    COALESCE(g.abreviatura, cp.abreviatura)
        AS grado_calidad_abreviatura,

    c.numero AS concepto_numero_actual,
    c.nombre AS concepto_nombre_actual,

    pa.texto_visual AS puntaje_visual_actual,
    pa.texto_literal AS puntaje_literal_actual

FROM resoluciones_documentales r

INNER JOIN personas p
    ON p.id = r.persona_id

INNER JOIN hojas_vida hv
    ON hv.id = r.hoja_vida_id

LEFT JOIN grados g
    ON g.id = hv.grado_id_inicio

LEFT JOIN calidades_personal cp
    ON cp.id = hv.calidad_personal_id_inicio

INNER JOIN conceptos_calificacion c
    ON c.id = r.concepto_id

INNER JOIN puntajes_anotacion pa
    ON pa.id = r.puntaje_id;


-- ------------------------------------------------------------
-- VISTA: SOLO RESOLUCIONES EMITIDAS Y AÚN DISPONIBLES
-- ------------------------------------------------------------

DROP VIEW IF EXISTS
    vw_resoluciones_emitidas_disponibles;

CREATE VIEW
    vw_resoluciones_emitidas_disponibles
AS
SELECT
    *
FROM vw_resoluciones_documentales
WHERE
    estado = 'EMITIDA'
    AND anotacion_id IS NULL;
