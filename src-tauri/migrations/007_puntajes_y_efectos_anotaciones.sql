PRAGMA foreign_keys = ON;

-- ============================================================
-- CAP-01001 - ESCALAS DE PUNTAJE PARA ANOTACIONES
-- Mérito: +0,50 y +1,00
-- Demérito: -0,50 a -5,00 en intervalos de 0,50
-- ============================================================

CREATE TABLE IF NOT EXISTS tipos_efecto_anotacion (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    signo INTEGER NOT NULL CHECK (signo IN (-1, 0, 1)),
    afecta_calificacion INTEGER NOT NULL DEFAULT 0
        CHECK (afecta_calificacion IN (0, 1)),
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS puntajes_anotacion (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    tipo_efecto_id INTEGER NOT NULL,
    valor_centecimas INTEGER NOT NULL,
    valor_decimal REAL NOT NULL,
    texto_visual TEXT NOT NULL,
    texto_literal TEXT NOT NULL,
    orden INTEGER NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),

    FOREIGN KEY (tipo_efecto_id)
        REFERENCES tipos_efecto_anotacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    UNIQUE (tipo_efecto_id, valor_centecimas)
);

CREATE INDEX IF NOT EXISTS ix_puntajes_anotacion_tipo
ON puntajes_anotacion(tipo_efecto_id, orden);

CREATE TABLE IF NOT EXISTS plantilla_efectos_anotacion (
    plantilla_id INTEGER PRIMARY KEY,
    tipo_efecto_id INTEGER NOT NULL,
    permite_seleccionar_concepto INTEGER NOT NULL DEFAULT 0
        CHECK (permite_seleccionar_concepto IN (0, 1)),
    permite_seleccionar_puntaje INTEGER NOT NULL DEFAULT 0
        CHECK (permite_seleccionar_puntaje IN (0, 1)),
    concepto_obligatorio INTEGER NOT NULL DEFAULT 0
        CHECK (concepto_obligatorio IN (0, 1)),
    puntaje_obligatorio INTEGER NOT NULL DEFAULT 0
        CHECK (puntaje_obligatorio IN (0, 1)),
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),

    FOREIGN KEY (plantilla_id)
        REFERENCES plantillas_anotacion(id)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,

    FOREIGN KEY (tipo_efecto_id)
        REFERENCES tipos_efecto_anotacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);

INSERT INTO tipos_efecto_anotacion (
    id, codigo, nombre, signo, afecta_calificacion
)
VALUES
    (1, 'NEUTRA', 'Sin efecto en la calificación', 0, 0),
    (2, 'MERITO', 'Anotación de mérito', 1, 1),
    (3, 'DEMERITO', 'Anotación de demérito', -1, 1)
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    nombre = excluded.nombre,
    signo = excluded.signo,
    afecta_calificacion = excluded.afecta_calificacion,
    activo = 1;

INSERT INTO puntajes_anotacion (
    id, codigo, tipo_efecto_id, valor_centecimas,
    valor_decimal, texto_visual, texto_literal, orden
)
VALUES
    (1, 'MERITO_050', 2,  50,  0.50, '+0,50', 'más cero coma cincuenta puntos', 1),
    (2, 'MERITO_100', 2, 100,  1.00, '+1,00', 'más un punto', 2),

    (3,  'DEMERITO_050', 3,  -50, -0.50, '-0,50', 'menos cero coma cincuenta puntos', 1),
    (4,  'DEMERITO_100', 3, -100, -1.00, '-1,00', 'menos un punto', 2),
    (5,  'DEMERITO_150', 3, -150, -1.50, '-1,50', 'menos uno coma cincuenta puntos', 3),
    (6,  'DEMERITO_200', 3, -200, -2.00, '-2,00', 'menos dos puntos', 4),
    (7,  'DEMERITO_250', 3, -250, -2.50, '-2,50', 'menos dos coma cincuenta puntos', 5),
    (8,  'DEMERITO_300', 3, -300, -3.00, '-3,00', 'menos tres puntos', 6),
    (9,  'DEMERITO_350', 3, -350, -3.50, '-3,50', 'menos tres coma cincuenta puntos', 7),
    (10, 'DEMERITO_400', 3, -400, -4.00, '-4,00', 'menos cuatro puntos', 8),
    (11, 'DEMERITO_450', 3, -450, -4.50, '-4,50', 'menos cuatro coma cincuenta puntos', 9),
    (12, 'DEMERITO_500', 3, -500, -5.00, '-5,00', 'menos cinco puntos', 10)
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    tipo_efecto_id = excluded.tipo_efecto_id,
    valor_centecimas = excluded.valor_centecimas,
    valor_decimal = excluded.valor_decimal,
    texto_visual = excluded.texto_visual,
    texto_literal = excluded.texto_literal,
    orden = excluded.orden,
    activo = 1;

-- Por defecto todas las plantillas son neutras.
INSERT INTO plantilla_efectos_anotacion (
    plantilla_id,
    tipo_efecto_id,
    permite_seleccionar_concepto,
    permite_seleccionar_puntaje,
    concepto_obligatorio,
    puntaje_obligatorio
)
SELECT
    id,
    1,
    0,
    0,
    0,
    0
FROM plantillas_anotacion
WHERE activo = 1
ON CONFLICT(plantilla_id) DO NOTHING;

-- Mérito.
UPDATE plantilla_efectos_anotacion
SET
    tipo_efecto_id = 2,
    permite_seleccionar_concepto = 1,
    permite_seleccionar_puntaje = 1,
    concepto_obligatorio = 1,
    puntaje_obligatorio = 1
WHERE plantilla_id IN (
    SELECT id
    FROM plantillas_anotacion
    WHERE codigo = 'FELICITACION'
);

-- Demérito.
UPDATE plantilla_efectos_anotacion
SET
    tipo_efecto_id = 3,
    permite_seleccionar_concepto = 1,
    permite_seleccionar_puntaje = 1,
    concepto_obligatorio = 1,
    puntaje_obligatorio = 1
WHERE plantilla_id IN (
    SELECT id
    FROM plantillas_anotacion
    WHERE codigo IN (
        'SANCION_ARRESTO',
        'SANCION_CARTA_CERTIFICADA',
        'SANCION_NEGACION_FIRMA',
        'RESULTADO_ISA_CON_SANCION'
    )
);

-- Amonestación: demérito sin puntaje explícito en el ejemplo del documento.
UPDATE plantilla_efectos_anotacion
SET
    tipo_efecto_id = 3,
    permite_seleccionar_concepto = 0,
    permite_seleccionar_puntaje = 0,
    concepto_obligatorio = 0,
    puntaje_obligatorio = 0
WHERE plantilla_id IN (
    SELECT id
    FROM plantillas_anotacion
    WHERE codigo = 'SANCION_AMONESTACION'
);

DROP VIEW IF EXISTS vw_plantillas_anotacion_operativas;

CREATE VIEW vw_plantillas_anotacion_operativas AS
SELECT
    p.*,
    e.tipo_efecto_id,
    te.codigo AS tipo_efecto_codigo,
    te.nombre AS tipo_efecto_nombre,
    te.signo AS tipo_efecto_signo,
    te.afecta_calificacion AS efecto_afecta_calificacion,
    e.permite_seleccionar_concepto,
    e.permite_seleccionar_puntaje,
    e.concepto_obligatorio,
    e.puntaje_obligatorio
FROM vw_catalogo_anotaciones p
INNER JOIN plantilla_efectos_anotacion e
    ON e.plantilla_id = p.id
INNER JOIN tipos_efecto_anotacion te
    ON te.id = e.tipo_efecto_id
WHERE e.activo = 1
  AND te.activo = 1;
