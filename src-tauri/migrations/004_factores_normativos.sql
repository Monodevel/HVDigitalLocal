PRAGMA foreign_keys = ON;

-- ============================================================
-- CAP-01001 - ANEXO 5
-- FACTORES DEL SISTEMA DE CALIFICACIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS factores_calificacion (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    concepto_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    orden INTEGER NOT NULL,
    es_normativo INTEGER NOT NULL DEFAULT 1
        CHECK (es_normativo IN (0, 1)),
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),

    FOREIGN KEY (concepto_id)
        REFERENCES conceptos_calificacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    UNIQUE (concepto_id, orden)
);

CREATE INDEX IF NOT EXISTS
    ix_factores_concepto
ON factores_calificacion(concepto_id);

CREATE INDEX IF NOT EXISTS
    ix_factores_orden
ON factores_calificacion(concepto_id, orden);

-- ============================================================
-- DESCRIPCIONES NORMATIVAS DE LOS CONCEPTOS
--
-- Se agrega la columna solamente en esta migración.
-- ============================================================

ALTER TABLE conceptos_calificacion
ADD COLUMN descripcion_normativa TEXT;

UPDATE conceptos_calificacion
SET descripcion_normativa =
    CASE numero
        WHEN 1 THEN
            'Cumple sus obligaciones conforme a las leyes y reglamentos vigentes.'

        WHEN 2 THEN
            'Discierne con acierto, tacto y reserva.'

        WHEN 3 THEN
            'Genera un ambiente de unión y camaradería, en el ámbito institucional y extrainstitucional, en el cumplimiento de las tareas, a pesar de las dificultades.'

        WHEN 4 THEN
            'Demuestra interés y dedicación hacia las labores profesionales y objetivos institucionales.'

        WHEN 5 THEN
            'Adopta decisiones e imparte órdenes para un adecuado funcionamiento de la unidad puesta bajo su responsabilidad, obteniendo el máximo rendimiento de los medios.'

        WHEN 6 THEN
            'Facilita la toma de decisiones del mando, con base en análisis, conocimientos y experiencia profesional.'

        WHEN 7 THEN
            'Ejerce una eficiente formación profesional y valórica de sus subalternos, subordinados o instruidos.'

        WHEN 8 THEN
            'Organiza, gestiona y controla las funciones administrativas a su cargo.'

        WHEN 9 THEN
            'Evidencia conocimientos profesionales, generales y específicos, en la ejecución de las tareas correspondientes a su grado y cargo.'
    END
WHERE numero BETWEEN 1 AND 9;

-- ============================================================
-- CONCEPTO N.º 1
-- CUMPLIMIENTO DEL DEBER
-- ============================================================

INSERT INTO factores_calificacion (
    id,
    codigo,
    concepto_id,
    nombre,
    descripcion,
    orden
)
VALUES
    (
        1,
        'C01-F01',
        1,
        'Carácter',
        'Actuar con voluntad, firmeza y determinación para cumplir y hacer cumplir el deber.',
        1
    ),
    (
        2,
        'C01-F02',
        1,
        'Obediencia',
        'Cumplir las órdenes impartidas, conforme a las leyes y reglamentos vigentes.',
        2
    ),
    (
        3,
        'C01-F03',
        1,
        'Disciplina',
        'Dominio de sí mismo que mueve a la persona al cumplimiento del deber, supeditando su propia voluntad al bien colectivo.',
        3
    )
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    concepto_id = excluded.concepto_id,
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    orden = excluded.orden,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- CONCEPTO N.º 2
-- CRITERIO Y DISCRECIÓN
-- ============================================================

INSERT INTO factores_calificacion (
    id,
    codigo,
    concepto_id,
    nombre,
    descripcion,
    orden
)
VALUES
    (
        4,
        'C02-F01',
        2,
        'Prudencia',
        'Actuar con moderación, en relación a todos sus actos, como también en la aplicación de normas, políticas y funciones inherentes a su cargo, velando por el bien superior de la organización.',
        1
    ),
    (
        5,
        'C02-F02',
        2,
        'Confidencialidad',
        'Garantizar la reserva de la información, tanto en el ámbito interpersonal como organizacional, sustentada en la normativa legal vigente.',
        2
    ),
    (
        6,
        'C02-F03',
        2,
        'Tacto',
        'Decir lo acertado en el momento preciso para lograr mantener el respeto hacia las personas.',
        3
    ),
    (
        7,
        'C02-F04',
        2,
        'Acierto',
        'Discernir en forma correcta la solución de una situación.',
        4
    )
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    concepto_id = excluded.concepto_id,
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    orden = excluded.orden,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- CONCEPTO N.º 3
-- SOCIABILIDAD Y COHESIÓN
-- ============================================================

INSERT INTO factores_calificacion (
    id,
    codigo,
    concepto_id,
    nombre,
    descripcion,
    orden
)
VALUES
    (
        8,
        'C03-F01',
        3,
        'Espíritu de servicio',
        'Disposición a ofrecer voluntaria y activamente su trabajo en beneficio de la unidad y la cohesión.',
        1
    ),
    (
        9,
        'C03-F02',
        3,
        'Desarrollo de relaciones',
        'Ser capaz para establecer vínculos y comunicación con las personas u organismos, en beneficio del interés institucional.',
        2
    ),
    (
        10,
        'C03-F03',
        3,
        'Espíritu de cuerpo',
        'Trabajar en armonía y en comunidad de propósitos y fines dentro de la unidad, a pesar de las dificultades.',
        3
    ),
    (
        11,
        'C03-F04',
        3,
        'Abnegación',
        'Subordinar los propios intereses al cumplimiento del deber.',
        4
    )
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    concepto_id = excluded.concepto_id,
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    orden = excluded.orden,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- CONCEPTO N.º 4
-- COMPROMISO INSTITUCIONAL
-- ============================================================

INSERT INTO factores_calificacion (
    id,
    codigo,
    concepto_id,
    nombre,
    descripcion,
    orden
)
VALUES
    (
        12,
        'C04-F01',
        4,
        'Responsabilidad',
        'Cumplir las obligaciones y responder por ellas en un ámbito de buenas prácticas, métodos adecuados y honestidad.',
        1
    ),
    (
        13,
        'C04-F02',
        4,
        'Perseverancia',
        'Mantenerse firme y constante en el cumplimiento de las tareas y obligaciones militares.',
        2
    ),
    (
        14,
        'C04-F03',
        4,
        'Iniciativa',
        'Actuar de manera proactiva, oportuna y práctica, teniendo en cuenta la intención del escalón superior y la doctrina institucional.',
        3
    ),
    (
        15,
        'C04-F04',
        4,
        'Toma de decisiones',
        'Resolver oportunamente el mejor curso de acción.',
        4
    )
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    concepto_id = excluded.concepto_id,
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    orden = excluded.orden,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- CONCEPTO N.º 5
-- MANDO
-- ============================================================

INSERT INTO factores_calificacion (
    id,
    codigo,
    concepto_id,
    nombre,
    descripcion,
    orden
)
VALUES
    (
        16,
        'C05-F01',
        5,
        'Liderazgo',
        'Lograr la adhesión y motivación de los subalternos y/o subordinados en el cumplimiento de tareas o misiones en situaciones de apremio.',
        1
    ),
    (
        17,
        'C05-F02',
        5,
        'Ejemplo personal',
        'Constituir a través de su comportamiento, un modelo a seguir para sus subordinados en el desempeño del mando.',
        2
    ),
    (
        18,
        'C05-F03',
        5,
        'Promoción del mando',
        'Permitir la autonomía de los mandos subordinados para que puedan tomar decisiones, resolver problemas o ejecutar tareas dentro de su esfera de responsabilidad.',
        3
    ),
    (
        19,
        'C05-F04',
        5,
        'Rol de calificador',
        'Evaluar a sus subordinados con un criterio de justicia, teniendo en cuenta la normativa institucional y la legalidad vigente.',
        4
    ),
    (
        20,
        'C05-F05',
        5,
        'Toma de decisiones',
        'Resolver oportunamente el mejor curso de acción.',
        5
    )
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    concepto_id = excluded.concepto_id,
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    orden = excluded.orden,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- CONCEPTO N.º 6
-- ASESORÍA
-- ============================================================

INSERT INTO factores_calificacion (
    id,
    codigo,
    concepto_id,
    nombre,
    descripcion,
    orden
)
VALUES
    (
        21,
        'C06-F01',
        6,
        'Manejo de información',
        'Utilizar conocimientos relevantes y experiencia específica para brindar asesoría al mando.',
        1
    ),
    (
        22,
        'C06-F02',
        6,
        'Análisis y evaluación de problemas',
        'Descomponer un problema e identificar los elementos relevantes.',
        2
    ),
    (
        23,
        'C06-F03',
        6,
        'Orientación de experto',
        'Manifestar su opinión de experto para facilitar el proceso de toma de decisiones.',
        3
    )
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    concepto_id = excluded.concepto_id,
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    orden = excluded.orden,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- CONCEPTO N.º 7
-- EDUCACIÓN E INSTRUCCIÓN
-- ============================================================

INSERT INTO factores_calificacion (
    id,
    codigo,
    concepto_id,
    nombre,
    descripcion,
    orden
)
VALUES
    (
        24,
        'C07-F01',
        7,
        'Motivación individual y grupal',
        'Incentivar la superación personal y profesional de los instruidos o subalternos.',
        1
    ),
    (
        25,
        'C07-F02',
        7,
        'Eficacia formativa',
        'Influir en la conducta de los instruidos para conseguir la modificación de comportamientos y/o adquirir hábitos.',
        2
    ),
    (
        26,
        'C07-F03',
        7,
        'Exigencia y rigurosidad',
        'Emplear la autoridad delegada para el logro de las tareas y objetivos en los estándares exigidos.',
        3
    )
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    concepto_id = excluded.concepto_id,
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    orden = excluded.orden,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- CONCEPTO N.º 8
-- ADMINISTRACIÓN
-- ============================================================

INSERT INTO factores_calificacion (
    id,
    codigo,
    concepto_id,
    nombre,
    descripcion,
    orden
)
VALUES
    (
        27,
        'C08-F01',
        8,
        'Eficiencia',
        'Utilizar correcta y adecuadamente los medios puestos a su disposición, logrando el máximo rendimiento.',
        1
    ),
    (
        28,
        'C08-F02',
        8,
        'Control',
        'Implementar los mecanismos de verificación que permitan asegurar la efectividad de la tarea.',
        2
    ),
    (
        29,
        'C08-F03',
        8,
        'Diligencia y acuciosidad',
        'Cumplir las tareas administrativas con prontitud y acuciosidad.',
        3
    )
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    concepto_id = excluded.concepto_id,
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    orden = excluded.orden,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- CONCEPTO N.º 9
-- PREPARACIÓN PROFESIONAL
-- ============================================================

INSERT INTO factores_calificacion (
    id,
    codigo,
    concepto_id,
    nombre,
    descripcion,
    orden
)
VALUES
    (
        30,
        'C09-F01',
        9,
        'Conocimientos profesionales',
        'Demostrar conocimientos específicos necesarios para el cumplimiento de las tareas asignadas a su cargo y área de desempeño.',
        1
    ),
    (
        31,
        'C09-F02',
        9,
        'Habilidades y destrezas',
        'Conjunto de capacidades adquiridas que se relacionan al puesto que desempeña.',
        2
    ),
    (
        32,
        'C09-F03',
        9,
        'Autopreparación',
        'Demostrar motivación y esfuerzo personal por acrecentar las capacidades, conocimientos y destrezas para un mejor desempeño.',
        3
    ),
    (
        33,
        'C09-F04',
        9,
        'Comunicación efectiva',
        'Transmitir, expresar y escuchar positivamente el mensaje en beneficio del cumplimiento de las tareas profesionales.',
        4
    )
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    concepto_id = excluded.concepto_id,
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    orden = excluded.orden,
    es_normativo = 1,
    activo = 1;

-- ============================================================
-- VISTA COMPLETA CONCEPTO-FACTOR
-- ============================================================

DROP VIEW IF EXISTS vw_conceptos_factores;

CREATE VIEW vw_conceptos_factores AS
SELECT
    a.id AS area_id,
    a.codigo AS area_codigo,
    a.nombre AS area_nombre,

    c.id AS concepto_id,
    c.codigo AS concepto_codigo,
    c.numero AS concepto_numero,
    c.nombre AS concepto_nombre,
    c.descripcion_normativa AS concepto_descripcion,
    c.orden AS concepto_orden,

    f.id AS factor_id,
    f.codigo AS factor_codigo,
    f.nombre AS factor_nombre,
    f.descripcion AS factor_descripcion,
    f.orden AS factor_orden

FROM factores_calificacion f

INNER JOIN conceptos_calificacion c
    ON c.id = f.concepto_id

INNER JOIN areas_evaluacion a
    ON a.id = c.area_evaluacion_id

WHERE
    a.activo = 1
    AND c.activo = 1
    AND f.activo = 1;