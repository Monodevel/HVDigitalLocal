PRAGMA foreign_keys = ON;

-- ============================================================
-- CATÁLOGO DE ANOTACIONES HOJA DE VIDA 2024-2025
-- Fuente: "Listado de Anotaciones para Hoja de Vida",
-- actualizado al 04NOV2024.
--
-- El texto_fuente se conserva literalmente, incluyendo posibles
-- erratas, mayúsculas, puntuación y marcadores XX/XXXX del documento.
-- ============================================================

CREATE TABLE IF NOT EXISTS catalogos_anotacion (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    periodo_fuente TEXT NOT NULL,
    fecha_actualizacion_fuente TEXT NOT NULL,
    documento_fuente TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS categorias_anotacion (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    orden INTEGER NOT NULL UNIQUE,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS plantillas_anotacion (
    id INTEGER PRIMARY KEY,
    catalogo_id INTEGER NOT NULL,
    categoria_id INTEGER NOT NULL,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    titulo_fuente TEXT,
    cuerpo_fuente TEXT NOT NULL,

    color_semantico TEXT NOT NULL
        CHECK (color_semantico IN ('NEGRO', 'ROJO')),
    color_hex TEXT NOT NULL,

    pagina_fuente INTEGER NOT NULL,
    orden INTEGER NOT NULL,

    requiere_firma_calificador INTEGER NOT NULL DEFAULT 1
        CHECK (requiere_firma_calificador IN (0, 1)),
    requiere_firma_calificado INTEGER NOT NULL DEFAULT 1
        CHECK (requiere_firma_calificado IN (0, 1)),
    firma_oficial_personal INTEGER NOT NULL DEFAULT 0
        CHECK (firma_oficial_personal IN (0, 1)),

    abre_hoja_vida INTEGER NOT NULL DEFAULT 0
        CHECK (abre_hoja_vida IN (0, 1)),
    cierra_hoja_vida INTEGER NOT NULL DEFAULT 0
        CHECK (cierra_hoja_vida IN (0, 1)),
    afecta_calificacion INTEGER NOT NULL DEFAULT 0
        CHECK (afecta_calificacion IN (0, 1)),
    requiere_concepto INTEGER NOT NULL DEFAULT 0
        CHECK (requiere_concepto IN (0, 1)),
    requiere_puntaje INTEGER NOT NULL DEFAULT 0
        CHECK (requiere_puntaje IN (0, 1)),
    requiere_resolucion INTEGER NOT NULL DEFAULT 0
        CHECK (requiere_resolucion IN (0, 1)),
    permite_negacion_firma INTEGER NOT NULL DEFAULT 0
        CHECK (permite_negacion_firma IN (0, 1)),

    observacion_uso TEXT,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),

    FOREIGN KEY (catalogo_id)
        REFERENCES catalogos_anotacion(id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,

    FOREIGN KEY (categoria_id)
        REFERENCES categorias_anotacion(id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,

    UNIQUE (catalogo_id, categoria_id, orden)
);

CREATE INDEX IF NOT EXISTS ix_plantillas_anotacion_categoria
ON plantillas_anotacion(categoria_id, orden);

CREATE INDEX IF NOT EXISTS ix_plantillas_anotacion_color
ON plantillas_anotacion(color_semantico);

CREATE TABLE IF NOT EXISTS variables_plantilla_anotacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plantilla_id INTEGER NOT NULL,
    codigo TEXT NOT NULL,
    etiqueta TEXT NOT NULL,
    tipo_dato TEXT NOT NULL
        CHECK (tipo_dato IN (
            'TEXTO', 'TEXTO_LARGO', 'ENTERO', 'DECIMAL',
            'FECHA', 'SELECCION', 'DOCUMENTO', 'CONCEPTO',
            'PUNTAJE', 'PERSONA'
        )),
    requerido INTEGER NOT NULL DEFAULT 1 CHECK (requerido IN (0, 1)),
    orden INTEGER NOT NULL,
    opciones_json TEXT,
    ayuda TEXT,

    FOREIGN KEY (plantilla_id)
        REFERENCES plantillas_anotacion(id)
        ON UPDATE RESTRICT ON DELETE CASCADE,

    UNIQUE (plantilla_id, codigo),
    UNIQUE (plantilla_id, orden)
);

INSERT INTO catalogos_anotacion (
    id, codigo, nombre, periodo_fuente,
    fecha_actualizacion_fuente, documento_fuente
)
VALUES (
    1,
    'ANOTACIONES_HV_2024_2025',
    'Listado de Anotaciones para Hoja de Vida',
    '2024-2025',
    '04NOV2024',
    'ANOTACIONES HOJA DE VIDA 2024 2025.pdf'
)
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    nombre = excluded.nombre,
    periodo_fuente = excluded.periodo_fuente,
    fecha_actualizacion_fuente = excluded.fecha_actualizacion_fuente,
    documento_fuente = excluded.documento_fuente,
    activo = 1;

INSERT INTO categorias_anotacion (id, codigo, nombre, orden)
VALUES
    (1, 'NOMBRAMIENTO_CONTRATACION', 'NOMBRAMIENTO / CONTRATACIÓN', 1),
    (2, 'RESULTADOS_CALIFICACION', 'RESULTADO DE CALIFICACIONES (POR CARTA CERTIFICADA) Y RESULTADO JUNTAS DE SELECCIÓN', 2),
    (3, 'RESOLUCIONES_RECURSOS', 'RESOLUCIONES (ADM - ADDM) Y RECURSOS', 3),
    (4, 'RESOLUCIONES_RECURSOS_CARTA', 'RESOLUCIONES (ADM - ADDM) Y RECURSOS POR CARTA CERTIFICADA', 4),
    (5, 'NEGACION_FIRMA', 'ANOTACIONES EN DONDE EL CALIFICADO SE NIEGA A FIRMAR', 5),
    (6, 'ISA_PROCESOS', 'ISAs Y PROCESOS JUDICIALES', 6),
    (7, 'CIERRES_CAMBIOS_DESPACHOS', 'CIERRES, CAMBIO DE CALIFICADOR DIRECTO Y DESPACHOS', 7),
    (8, 'FERIADOS_PERMISOS', 'FERIADO LEGAL Y PERMISOS', 8),
    (9, 'SALUD_NUTRICION', 'LICENCIAS MÉDICAS, CITACIÓN A CSE CSS, SIN PORTE DE ARMAS Y CONDICIÓN NUTRICIONAL', 9),
    (10, 'EVINT', 'EVALUACIÓN INTERAL', 10),
    (11, 'OTROS', 'OTROS', 11)
ON CONFLICT(id) DO UPDATE SET
    codigo = excluded.codigo,
    nombre = excluded.nombre,
    orden = excluded.orden,
    activo = 1;

-- Ayudante de lectura:
-- NEGRO = #000000
-- ROJO  = #C00000

INSERT INTO plantillas_anotacion (
    id, catalogo_id, categoria_id, codigo, nombre,
    titulo_fuente, cuerpo_fuente, color_semantico, color_hex,
    pagina_fuente, orden,
    requiere_firma_calificador, requiere_firma_calificado,
    firma_oficial_personal, abre_hoja_vida, cierra_hoja_vida,
    afecta_calificacion, requiere_concepto, requiere_puntaje,
    requiere_resolucion, permite_negacion_firma, observacion_uso
)
VALUES
-- ============================================================
-- 1. NOMBRAMIENTO / CONTRATACIÓN
-- ============================================================
(1,1,1,'CONSTANCIA_NOMBRAMIENTO','CONSTANCIA DE NOMBRAMIENTO',
'CONSTANCIA DE NOMBRAMIENTO',
'Se deja constancia que es nombrado(a) Oficial o
Suboficial de
Ejército, a contar del 01ENE2024.

Nota Egreso: 6.135
Puesto: 12
Total Alumnos: 78
(Resol. NOMBRAMIENTO DE OFICIALES O SUBOFICIALES
N°3905/1258 de 28DIC2023)',
'NEGRO','#000000',3,1,1,1,0,1,0,0,0,0,1,0,
'Con esta anotación se abre la Hoja de Vida.'),

(2,1,1,'CONSTANCIA_CONTRATACION','CONSTANCIA DE CONTRATACIÓN',
'CONSTANCIA DE CONTRATACIÓN',
'Se deja constancia de su contratación en el Ejército como
Personal a Contrata a contar del XX de XX del XXXX.',
'NEGRO','#000000',3,2,1,1,0,1,0,0,0,0,0,0,NULL),

-- ============================================================
-- 2. RESULTADOS DE CALIFICACIÓN Y JUNTAS
-- ============================================================
(3,1,2,'NOTIFICACION_CALIFICACIONES_CARTA','CONSTANCIA DE NOTIFICACIÓN DE LAS CALIFICACIONES POR CARTA CERTIFICADA (ART 84, DFL N°1)',
'CONSTANCIA DE NOTIFICACIÓN DE LAS CALIFICACIONES
POR CARTA CERTIFICADA (ART 84, DFL N°1)',
'Con fecha XXJUN2023, se remitió copia autenticada de sus
calificaciones por carta certificada, por motivo de ___________.
Conforme a váucher XXX del XXJUN2023. Los antecedentes
deberán quedar archivados en su CAP.',
'NEGRO','#000000',4,1,1,0,0,0,0,0,0,0,0,0,
'Ingresar el motivo de ausencia, por ejemplo: Licencia Médica, Feriado Legal, Suspensión del empleo u otro motivo.'),

(4,1,2,'RECURSO_RECLAMACION_CALIFICACIONES_CARTA','CONSTANCIA DE RECURSO DE RECLAMACIÓN A SUS CALIFICACIONES POR CARTA CERTIFICADA (ART 84)',
'CONSTANCIA DE RECURSO DE RECLAMACIÓN A SUS
CALIFICACIONES POR CARTA CERTIFICADA (ART 84)',
'Con fecha XXJUN2023 se recibió el recurso de reclamación a
sus calificaciones mediante XXXX.',
'NEGRO','#000000',4,2,1,0,0,0,0,0,0,0,0,0,NULL),

(5,1,2,'NO_RECURSO_CALIFICACIONES','CONSTANCIA DE NO PRESENTACIÓN DE RECURSO DE RECLAMACIÓN A SUS CALIFICACIONES (ART 84)',
'CONSTANCIA DE NO PRESENTACIÓN DE RECURSO DE
RECLAMACIÓN A SUS CALIFICACIONES (ART 84)',
'Se deja constancia que pasado el tiempo reglamentario estipulado
En el art. 46 de la LEY 19.880 “Procedimientos que rigen los
Órganos del Estado”, no ha presentado recurso alguno, dándose
Por notificado.',
'NEGRO','#000000',4,3,1,0,0,0,0,0,0,0,0,0,NULL),

(6,1,2,'RESULTADO_JUNTA_SELECCION','RESULTADO DE JUNTA DE SELECCIÓN',
'RESULTADO DE JUNTA DE SELECCIÓN',
'La Junta de Selección de (Oficiales, CP, ECP, etc.) de la
XXX, reunida en el I periodo de sesiones,
correspondiente al proceso de calificaciones 2022 / 2023,
adoptó el siguiente acuerdo:
"Rebajar la nota final del concepto Nº 1 Cumplimiento del
Deber" de 6,00 a 3,00, en consecuencia, es Clasificado
en lista Nº 3 "Condicional".
(Oficio XXX (R) Nº 1530/XXXX de 31MAY2023)',
'NEGRO','#000000',4,4,1,1,0,0,0,1,1,0,0,0,NULL),

(7,1,2,'RECURSO_JUNTA_SELECCION','RECURSO DE (RECONSIDERACIÓN O APELACIÓN) JUNTA DE SELECCIÓN',
'RECURSO DE (RECONSIDERACIÓN O APELACIÓN) JUNTA DE
SELECCIÓN',
'Con esta fecha presentó Recurso de Reconsideración.',
'NEGRO','#000000',5,5,1,1,0,0,0,0,0,0,0,0,NULL),

-- ============================================================
-- 3. RESOLUCIONES (ADM - ADDM) Y RECURSOS
-- ============================================================
(8,1,3,'FELICITACION','FELICITACIÓN',
'FELICITACIÓN',
'Preparación Profesional
Es felicitado con 0,50 ptos. (más cero coma cincuenta puntos)
(Res. Exenta N° 1545/XX de 30AGO2023)',
'NEGRO','#000000',6,1,1,1,0,0,0,1,1,1,1,0,NULL),

(9,1,3,'SANCION_AMONESTACION','SANCIÓN - Amonestación',
'SANCIÓN',
'Amonestación
Es amonestado conforme lo establecido en el artículo 49 del DNL –
911 “Reglamento de Disciplina para las FAs”.
(Resol. Exenta N° 1530/715/10 del 19AGO2023)
Fue entregada copia fiel integra de la resolución al calificado.',
'ROJO','#C00000',6,2,1,1,0,0,0,1,0,0,1,1,NULL),

(10,1,3,'SANCION_ARRESTO','SANCIÓN - Arresto con servicio',
'SANCIÓN',
'Cumplimiento del Deber
Es sancionado con 01 (uno) día de arresto con servicio.
-0,50 (menos cero coma cincuenta ptos.)
(Resol N° 12 de 10NOV2023)
Fue entregada copia fiel integra de la resolución al calificado.',
'ROJO','#C00000',6,3,1,1,0,0,0,1,1,1,1,1,NULL),

(11,1,3,'RECURSO_RECONSIDERACION','RECURSO DE RECONSIDERACIÓN',
'RECURSO DE RECONSIDERACIÓN',
'Con fecha XX.XX.XXX, presentó Recurso de
Reconsideración.',
'NEGRO','#000000',6,4,1,1,0,0,0,0,0,0,0,0,NULL),

(12,1,3,'RESULTADO_RECONSIDERACION','RESULTADO DE RECURSO DE RECONSIDERACIÓN',
'RESULTADO DE RECURSO DE RECONSIDERACIÓN',
'Estudiados y analizados los argumentos expuestos por el afectado,
se ha resuelto rechazar el Recurso de Reconsideración presentado,
por no aportar antecedentes que ameriten dejar sin efecto la
sanción anotada con fecha 19.AGO.2023
(Resol. Exenta N° 1530/765/11/ de 24AGO2023)',
'ROJO','#C00000',7,5,1,1,0,0,0,0,0,0,1,1,NULL),

(13,1,3,'RECURSO_RECLAMACION','RECURSO DE RECLAMACIÓN',
'RECURSO DE RECLAMACIÓN',
'Con fecha XX.XX.XXX, presentó Recurso de
Reclamación.',
'NEGRO','#000000',7,6,1,1,0,0,0,0,0,0,0,0,NULL),

(14,1,3,'RESULTADO_RECLAMACION','RESULTADO DE RECURSO DE RECLAMACIÓN',
'RESULTADO DE RECURSO DE RECLAMACIÓN',
'Estudiados y analizados los argumentos expuestos por el afectado,
se ha resuelto rechazar el Recurso de Reclamación presentado,
por no aportar antecedentes que ameriten dejar sin efecto la
sanción anotada con fecha 19.AGO.2023
(Resol. Exenta N° 1530/765/11/ de 24AGO2023)',
'ROJO','#C00000',7,7,1,1,0,0,0,0,0,0,1,1,NULL),

(15,1,3,'RECURSO_APELACION','RECURSO DE APELACIÓN',
'RECURSO DE APELACIÓN',
'Con fecha XX.XX.XXX, presentó Recurso de
Apelación.',
'NEGRO','#000000',7,8,1,1,0,0,0,0,0,0,0,0,NULL),

(16,1,3,'RESULTADO_APELACION','RESULTADO DE RECURSO DE APELACIÓN',
'RESULTADO DE RECURSO DE APELACIÓN',
'Estudiados y analizados los argumentos expuestos por el afectado,
se ha resuelto rechazar el Recurso de Apelación presentado,
por no aportar antecedentes que ameriten dejar sin efecto la
sanción anotada con fecha 19.AGO.2023
(Resol. Exenta N° 1530/765/11/ de 24AGO2023)',
'ROJO','#C00000',7,9,1,1,0,0,0,0,0,0,1,1,NULL),

(17,1,3,'NO_PRESENTO_RECURSO','CONSTANCIA NO PRESENTÓ RECURSO DE XXXXXX',
'CONSTANCIA NO PRESENTÓ RECURSO DE XXXXXX',
'Se deja constancia que transcurrido el tiempo reglamentario
estipulado en el art. 46 de la LEY 19.880 “Procedimientos que rigen
los Órganos del Estado”, no ha presentado recurso alguno,
dándose por notificado, quedando la sanción firme.',
'NEGRO','#000000',7,10,1,1,0,0,0,0,0,0,0,0,NULL),

-- ============================================================
-- 4. RESOLUCIONES Y RECURSOS POR CARTA CERTIFICADA
-- ============================================================
(18,1,4,'SANCION_CARTA_CERTIFICADA','SANCIÓN',
'SANCIÓN',
'Cumplimiento del Deber
Es sancionado con 01 (uno) día de arresto con servicio.
-0,50 (menos cero coma cincuenta ptos.)
(Resol XXXX N° XXX de 24AGO2023)',
'ROJO','#C00000',8,1,1,0,0,0,0,1,1,1,1,0,NULL),

(19,1,4,'NOTIFICACION_SANCION_CARTA','CONSTANCIA DE NOTIFICACIÓN DE SANCIÓN POR CARTA CERTIFICADA',
'CONSTANCIA DE NOTIFICACIÓN DE SANCIÓN POR CARTA
CERTIFICADA',
'Con fecha XX.XX.XXXX, se remitió la resolución de sanción, por
carta certificada de vaucher XXXX con fecha XX.XX.XXXX.',
'ROJO','#C00000',8,2,1,0,0,0,0,0,0,0,1,0,NULL),

(20,1,4,'RECONSIDERACION_CARTA','RECURSO DE RECONSIDERACIÓN POR CARTA CERTIFICADA',
'RECURSO DE RECONSIDERACIÓN POR CARTA CERTIFICADA',
'Con fecha XX.XX.XXX, presentó Recurso de
Reconsideración.',
'NEGRO','#000000',8,3,1,0,0,0,0,0,0,0,0,0,NULL),

(21,1,4,'RESULTADO_RECONSIDERACION_CARTA','RESULTADO DE RECURSO DE RECONSIDERACIÓN POR CARTA CERTIFICADA',
'RESULTADO DE RECURSO DE RECONSIDERACIÓN POR
CARTA CERTIFICADA',
'Estudiados y analizados los argumentos expuestos por el afectado,
se ha resuelto rechazar el Recurso de Reconsideración presentado,
por no aportar antecedentes que ameriten dejar sin efecto la
sanción anotada con fecha XX XX XXXX (Resol. Exenta N° XXX
de 24AGO2023), la cual se fue remitida por carta
certificada de váucher N° XXXX con fecha XX.XX.XXXX.',
'ROJO','#C00000',8,4,1,0,0,0,0,0,0,0,1,0,NULL),

(22,1,4,'RECLAMACION_CARTA','RECURSO DE RECLAMACIÓN POR CARTA CERTIFICADA',
'RECURSO DE RECLAMACIÓN POR CARTA CERTIFICADA',
'Con fecha XX.XX.XXX, presentó Recurso de
Reclamación.',
'NEGRO','#000000',8,5,1,0,0,0,0,0,0,0,0,0,NULL),

(23,1,4,'RESULTADO_RECLAMACION_CARTA','RESULTADO DE RECURSO DE RECLAMACIÓN POR CARTA CERTIFICADA',
'RESULTADO DE RECURSO DE RECLAMACIÓN POR CARTA
CERTIFICADA',
'Estudiados y analizados los argumentos expuestos por el afectado,
se ha resuelto rechazar el Recurso de Reclamación presentado,
por no aportar antecedentes que ameriten dejar sin efecto la
sanción anotada con fecha XX XX XXXX (Resol. Exenta N° XXX
de 24AGO2023), la cual se fue remitida por carta
certificada de váucher N° XXXX con fecha XX.XX.XXXX.',
'ROJO','#C00000',9,6,1,0,0,0,0,0,0,0,1,0,NULL),

(24,1,4,'APELACION_CARTA','RECURSO DE APELACIÓN POR CARTA CERTIFICADA',
'RECURSO DE APELACIÓN POR CARTA CERTIFICADA',
'Con fecha XX.XX.XXX, presentó Recurso de
Apelación.',
'NEGRO','#000000',9,7,1,0,0,0,0,0,0,0,0,0,NULL),

(25,1,4,'RESULTADO_APELACION_CARTA','RESULTADO DE RECURSO DE APELACIÓN POR CARTA CERTIFICADA',
'RESULTADO DE RECURSO DE APELACIÓN POR CARTA
CERTIFICADA',
'Estudiados y analizados los argumentos expuestos por el afectado,
se ha resuelto rechazar el Recurso de Apelación presentado,
por no aportar antecedentes que ameriten dejar sin efecto la
sanción anotada con fecha XX XX XXXX (Resol. Exenta N° XXX
de 24AGO2023), la cual se fue remitida por carta
certificada de váucher N° XXXX con fecha XX.XX.XXXX.',
'ROJO','#C00000',9,8,1,0,0,0,0,0,0,0,1,0,NULL),

(26,1,4,'NO_RECURSO_CARTA','CONSTANCIA NO PRESENTACIÓN DE RECURSO DE XXXXXX POR CARTA CERTIFICADA',
'CONSTANCIA NO PRESENTACIÓN DE RECURSO DE XXXXXX
POR CARTA CERTIFICADA',
'Se deja constancia que pasado el tiempo reglamentario estipulado
en el art. 46 de la LEY 19.880 “Procedimientos que rigen los
Órganos del Estado”, no ha presentado recurso alguno, dándose
por notificado, quedando la sanción firme.',
'NEGRO','#000000',9,9,1,0,0,0,0,0,0,0,0,0,NULL),

(27,1,4,'OTROS_ANTECEDENTES_RECURSIVOS','CONSTANCIA DE OTROS ANTECEDENTES',
'CONSTANCIA DE OTROS ANTECEDENTES',
'Se deja constancia que mantiene un proceso recursivo por una
Sanción de Resol XXX N°12 de 10NOV2023, la cual se encuentra
en la espera del resultado del recurso de apelación en la CJE.',
'NEGRO','#000000',9,10,1,0,0,0,0,0,0,0,0,0,NULL),

-- ============================================================
-- 5. NEGACIÓN A FIRMAR
-- ============================================================
(28,1,5,'SANCION_NEGACION_FIRMA','SANCIÓN',
'SANCIÓN',
'Cumplimiento del Deber
Es sancionado con 01 (uno) día de arresto con servicio.
-0,50 (menos cero coma cincuenta ptos.)
(Resol N° XXXX de 10NOV2023)',
'ROJO','#C00000',10,1,1,0,0,0,0,1,1,1,1,1,NULL),

(29,1,5,'ACTA_NOTIFICACION_NEGACION','CONSTANCIA Y REGISTRO DE ACTA DE NOTIFICACIÓN',
'CONSTANCIA Y REGISTRO DE ACTA DE NOTIFICACIÓN',
'Se deja constancia que tomó conocimiento de la anotación con
fecha XXXX negándose a firmar, razón por la cual se adjunta
a esta Hoja de Vida, el Acta de Notificación conforme a lo siguiente:
En Santiago a XX días del mes de noviembre del dos mil veintitrés,
se procedió a notificar al XXX XXXXXXXXXXX XXXXXXX, de la
anotación de DEMÉRITO dispuesta mediante la RESOLUCIÓN DE
XXXXX, derivado de lo cual se negó a firmar la anotación señalada.
Se encontraban presentes en este procedimiento el TCL XXXXXX y
la CAP XXXXXXX.',
'NEGRO','#000000',10,2,1,0,0,0,0,0,0,0,0,0,NULL),

-- ============================================================
-- 6. ISAs Y PROCESOS JUDICIALES
-- ============================================================
(30,1,6,'ISA_PROCESO_JUDICIAL','CONSTANCIA DE ISA O PROCESO JUDICIAL',
'CONSTANCIA DE ISA O PROCESO JUDICIAL',
'Se deja constancia que se encuentra sometido a ISA en
averiguación de las causas y circunstancias en que se produjo la
enfermedad, la que se prolonga por más de 6 meses.',
'NEGRO','#000000',11,1,1,1,0,0,0,0,0,0,0,0,NULL),

(31,1,6,'RESULTADO_ISA_SIN_SANCION','CONSTANCIA DE RESULTADO DE ISA',
'CONSTANCIA DE RESULTADO DE ISA',
'Se deja constancia que mediante Resolución DIVPER AS.JUR
(R) Nº XX/XX de 27MAR2023, se pone término a la ISA ordenada
a instruir por Resol DIVPER FISC ADM (R) N°1585/XX
de 17JUN2023, en averiguación de las causas y circunstancias
en que se produjo la enfermedad que le afecta, determinando
lo siguiente:1. La enfermedad que padece no es enfermedad
profesional, ni fue contraída como consecuencia del servicio. 2.
No procede reconocerle inutilidad. 3. La Comisión de Sanidad
del Ejército determinó que se encuentra APTO sin limitación.
(Res. DIVPER AS.JUR/L "E" NºI 1345/XX de 27MAR2023)',
'NEGRO','#000000',11,2,1,1,0,0,0,0,0,0,1,0,NULL),

(32,1,6,'RESULTADO_ISA_CON_SANCION','CONSTANCIA DE RESULTADO DE ISA - SANCIÓN',
'CONSTANCIA DE RESULTADO DE ISA',
'Se deja constancia que mediante Resolución DIVPER AS.JUR (R)
N° 1345/XX de 27JUN2023, se pone término a la ISA ordenada
a instruir por Resol DIVPER FISC ADM (R) N°l585/XX
del 0 7JUN2019, en averiguación de las causas y circunstancias
a la XXXXXXX, resolviendo lo siguiente:
SANCIÓN
CUMPLIMIENTO DEL DEBER
Es sancionado con 2 (dos) días de arresto.
-0,50 ptos (menos cero comas cincuenta puntos)',
'ROJO','#C00000',11,3,1,1,0,0,0,1,1,1,1,1,
'Resolución que corresponde a la autoridad que resolvió el sumario. Anotación que se debe estampar una vez finaliza el proceso recursivo de la ISA.'),

-- ============================================================
-- 7. CIERRES, CAMBIOS Y DESPACHOS
-- ============================================================
(33,1,7,'CIERRE_TERMINO_PERIODO','Cierre por término del periodo de calificaciones',
'Cierre por término del periodo de calificaciones',
'',
'NEGRO','#000000',12,1,1,1,0,0,1,0,0,0,0,0,NULL),

(34,1,7,'CAMBIO_CALIFICADOR_DIRECTO','Cambio de Calificador Directo.',
'Cambio de Calificador Directo.',
'',
'NEGRO','#000000',12,2,1,1,0,0,0,0,0,0,0,0,NULL),

(35,1,7,'ASUME_CALIFICADOR_DIRECTO','Cambio de calificador directo - Asume como calificador directo',
'Cambio de calificador directo
Asume como calificador directo',
'El Oficial que suscribe, a partir de esta fecha asume como
Calificador directo (titular, subrogante o suplente), en
Atención a que el CAP XXX XXX XXX, se encuentra
Impedido de continuar desempeñado como tal.
(Resol N°12 del (Unidad) de XX XXXX 2024)',
'NEGRO','#000000',12,3,1,1,0,0,0,0,0,0,1,0,
'Esta anotación corresponde a una excepción, cuando el calificador que entrega no registra “cambio de calificador directo”.'),

(36,1,7,'CIERRE_CAUSAL','CIERRE POR XXXXXXXXXXXX',
'CIERRE POR XXXXXXXXXXXX',
'(fallecimiento, renuncia al empleo, retiro de la institución,
término de llamado al del servicio activo o término de
contrato)
Se deja constancia, que por Resolución DIVPER (R)
N°1000/19006 del XX XXX XXXX, se declara que el
XXXXXXXXXXXXXX RUN N° XXXXXXX-X ha dejado de
pertenecer a la institución por XXX, a contar del XX XX XX.',
'NEGRO','#000000',13,4,0,0,1,0,1,0,0,0,1,0,
'Anotación que firma el Oficial de Personal de la Unidad.'),

(37,1,7,'CIERRE_ASCENSO_OFICIAL_GENERAL','CIERRE POR ASCENSO A OFICIAL GENERAL',
'CIERRE POR ASCENSO A OFICIAL GENERAL',
'Cierre por ascenso a Oficial General, conforme a lo resuelto
Por Junta de Ascenso de Oficiales Superiores, mediante Of
DIVPER XXXX/XXXXX del XX XX XXXX.',
'NEGRO','#000000',13,5,0,0,1,0,1,0,0,0,0,0,
'Anotación que firma el Oficial de Personal de la Unidad.'),

(38,1,7,'DESPACHO_UNIDAD','Con esta fecha es despachado de la unidad.',
'Con esta fecha es despachado de la unidad.',
'',
'NEGRO','#000000',13,6,1,1,0,0,0,0,0,0,0,0,NULL),

-- ============================================================
-- 8. FERIADO LEGAL Y PERMISOS
-- ============================================================
(39,1,8,'FERIADO_LEGAL','FERIADO LEGAL',
'FERIADO LEGAL',
'XX días pendientes
(Resol. Exenta N° XX/XX de 27.DIC.2021)',
'NEGRO','#000000',14,1,1,1,0,0,0,0,0,0,1,0,NULL),

(40,1,8,'PERMISO_SIN_GOCE','PERMISO SIN GOCE DE REMUNERACIONES',
'PERMISO SIN GOCE DE REMUNERACIONES',
'Se deja constancia que mediante la Resolución XX (R) N° XX
de XX.XXX.XXXX, se le concede permiso sin goce de
remuneraciones, desde el XX de XX al XX de XXXX de XXXX.',
'NEGRO','#000000',14,2,1,1,0,0,0,0,0,0,1,0,NULL),

(41,1,8,'PERMISO_PATERNAL','PERMISO PATERNAL',
'PERMISO PATERNAL',
'Se deja constancia que se encuentra con permiso paternal desde
el XXJUN2023, hasta el XXJUL2023.
(Resol. Exenta N° XX/XX de 27.DIC.2023)',
'NEGRO','#000000',14,3,1,1,0,0,0,0,0,0,1,0,NULL),

-- ============================================================
-- 9. SALUD Y CONDICIÓN NUTRICIONAL
-- ============================================================
(42,1,9,'LICENCIA_MEDICA','LICENCIA MÉDICA',
'LICENCIA MÉDICA',
'Se deja constancia que se le concede licencia médica por XX días,
desde el 30 de MAYO al 01 de JUNIO de 2022, siendo licencia TOTAL.
(Res. XXXX N° XX/XX de 01JUN2022)',
'NEGRO','#000000',15,1,1,1,0,0,0,0,0,0,1,0,NULL),

(43,1,9,'CITACION_CSS_CSE','CONSTANCIA DE CITACIÓN A LA CSS O CSE',
'CONSTANCIA DE CITACIÓN A LA CSS O CSE',
'Se deja constancia que con fecha XXAGO2023, mediante Oficio
DSE XXXX/XXXX del XXABRIL023, fue citado a la comisión
de sanidad secundaria/ del Ejercito.',
'NEGRO','#000000',15,2,1,1,0,0,0,0,0,0,0,0,NULL),

(44,1,9,'NO_ASISTENCIA_CSS_CSE','CONSTANCIA DE NO ASISTENCIA A LA CSS O CSE',
'CONSTANCIA DE NO ASISTENCIA A LA CSS O CSE',
'Se deja constancia que con fecha XXAGO2023, no asistió a la
comisión de sanidad secundaria/ Ejército. Dispuesta mediante Of
DSE XXXX/XXXX del XXABRIL023',
'NEGRO','#000000',15,3,1,1,0,0,0,0,0,0,0,0,NULL),

(45,1,9,'PROHIBE_PORTE_ARMA','PROHÍBE USO Y PORTE DE ARMA DE FUEGO',
'PROHÍBE USO Y PORTE DE ARMA DE FUEGO',
'Se deja constancia que en conformidad con el oficio XX de
26AGO2023, a contar del 27 de AGOSTO de 2023 se le prohíbe
el uso y porte de arma de fuego.
(Oficio XX (R) Nº XX de 26AGO2023)',
'ROJO','#C00000',15,4,1,1,0,0,0,0,0,0,0,0,NULL),

(46,1,9,'AUTORIZA_PORTE_ARMA','SE AUTORIZA PORTE DE ARMA',
'SE AUTORIZA PORTE DE ARMA',
'Se deja constancia que a través del documento EMA.
Sección. San. (R) N° 1000/XX de fecha 28JUN2023, se
encuentra dado de alta y autorizado para el uso y porte de
armamento, desarrollando sus funciones en forma normal.
(Oficio XXX 11000 (R) N° XX de 28JUN2023)',
'NEGRO','#000000',15,5,1,1,0,0,0,0,0,0,0,0,NULL),

(47,1,9,'INFORME_CSS_CSE','INFORME DE LA CSS O CSE',
'INFORME DE LA CSS O CSE',
'En conformidad o por la CSE o CSS mediante informe XXXXX de
fecha XXXXX, conforme el siguiente detalle:
- Capacidad médica limitada temporal.
- Sin guardias, sin pruebas físicas, con servicio, sin formaciones.
- Será evaluado nuevamente en 6 meses.
- Deberá bajar 1 Kg al mes.',
'NEGRO','#000000',16,6,1,1,0,0,0,0,0,0,0,0,NULL),

(48,1,9,'DERIVACION_CSS_NUTRICIONAL','DERIVACIÓN A LA CSS POR CONDICIÓN NUTRICIONAL',
'DERIVACIÓN A LA CSS POR CONDICIÓN NUTRICIONAL',
'Se deja constancia que el médico regimentario, solicita que el CB1
XXX esa citado a la CSS.
(OF. EMA N.° XXXXX DEL XXOCT20XX)',
'NEGRO','#000000',16,7,1,1,0,0,0,0,0,0,0,0,NULL),

(49,1,9,'INFORME_CSS_NUTRICIONAL','INFORME CSS, POR CONDICIÓN NUTRICIONAL',
'INFORME CSS, POR CONDICIÓN NUTRICIONAL',
'Se deja constancia, que queda con limitación temporal a consecuencia
de su condición nutricional.
(INFORME CSS N.° XXXX DEL XXOCT20XX)',
'NEGRO','#000000',16,8,1,1,0,0,0,0,0,0,0,0,NULL),

(50,1,9,'DERIVACION_CSE_NUTRICIONAL_INCUMPLIMIENTO','DERIVACIÓN A CSE, POR CONDICIÓN NUTRICIONAL',
'DERIVACIÓN A CSE, POR CONDICIÓN NUTRICIONAL',
'Se deja constancia que el calificado no ha cumplido con las indicaciones
dada por la CSS respecto a su condición nutricional , en consecuencia, es
derivado a la CSE, para evaluación y determinación de aptitud para el
servicio.
(OF. XXXX DEL XXOCT20XX)',
'NEGRO','#000000',16,9,1,1,0,0,0,0,0,0,0,0,NULL),

(51,1,9,'DERIVACION_CSE_NUTRICIONAL_SIN_PROGRESO','DERIVACIÓN A CSE, POR CONDICIÓN NUTRICIONAL',
'DERIVACIÓN A CSE, POR CONDICIÓN NUTRICIONAL',
'Se deja constancia que es derivado a la CSE por no registrar progresos
en su evolución, respecto a su condición nutricional.
(OF. XXXX DEL XXOCT20XX)',
'NEGRO','#000000',17,10,1,1,0,0,0,0,0,0,0,0,NULL),

(52,1,9,'INFORME_CSE_NUTRICIONAL','INFORME CSE, POR CONDICIÓN NUTRICIONAL',
'INFORME CSE, POR CONDICIÓN NUTRICIONAL',
'Se deja constancia, que queda con limitación temporal a consecuencia de
su condición nutricional, que le impide mantener la condición de
"Excelencia" de su desempeño profesional.
(OF. XXXX DEL XXOCT20XX)',
'NEGRO','#000000',17,11,1,1,0,0,0,0,0,0,0,0,NULL),

(53,1,9,'SEGUIMIENTO_MEDICO_NUTRICIONAL','CONSTANCIA DE SEGUIMIENTO MÉDICO POR CONDICIÓN NUTRICIONAL',
'CONSTANCIA DE SEGUIMIENTO MÉDICO POR CONDICIÓN
NUTRICIONAL',
'se deja constancia, que con fecha XXXX se realiza el control médico
mensual, respecto a su condición nutricional, manteniendo las
siguientes restricciones: Sin PFS/ PSFs alternativas, Sin HBC/ HBC
sin marcha, Despliegue administrativo/ No desplegable, entre otras.',
'NEGRO','#000000',17,12,1,1,0,0,0,0,0,0,0,0,NULL),

(54,1,9,'ASISTENCIA_CSS_CSE_NUTRICIONAL','CONSTANCIA DE ASISTENCIA A CSS/CSE POR CONDICIÓN NUTRICIONAL',
'CONSTANCIA DE ASISTENCIA A CSS/CSE POR CONDICIÓN
NUTRICIONAL',
'Se deja constancia que el calificado con fecha XXXX asistió a la CSS/CSE,
para evaluación por condición nutricional.',
'NEGRO','#000000',17,13,1,1,0,0,0,0,0,0,0,0,NULL),

(55,1,9,'INASISTENCIA_CSS_CSE_NUTRICIONAL','CONSTANCIA DE INASISTENCIA A CSS/CSE POR CONDICIÓN NUTRICIONAL',
'CONSTANCIA DE INASISTENCIA A CSS/CSE POR CONDICIÓN
NUTRICIONAL',
'Se deja constancia que el calificado no asistio a la citación de fecha XXXX
de la CSS/CSE, para la evaluación por condición nutricional.',
'NEGRO','#000000',17,14,1,1,0,0,0,0,0,0,0,0,NULL),

(56,1,9,'RESULTADO_JUNTA_SALUD','RESULTADO JUNTA DE SELECCIÓN',
'RESULTADO JUNTA DE SELECCIÓN',
'Déjese constancia que el calificado deberá mejorar su condición de salud superando
su estado nutricional, debiendo adoptarlas medidas pertinentes a fin de cumplir en
forma satisfactoria con los estándares físicos dispuestos por la institución.
(OF. XXXX DEL XXOCT20XX)',
'NEGRO','#000000',17,15,1,1,0,0,0,0,0,0,0,0,NULL),

-- ============================================================
-- 10. EVALUACIÓN INTERAL (texto literal del documento)
-- ============================================================
(57,1,10,'EVINT_CONFORME','CONSTANCIA DE EVINT - Conforme',
'CONSTANCIA DE EVINT',
'Se deja constancia que tomó conocimiento de su evaluación integral
con fecha XX XXX XXXX, declarándose conforme',
'NEGRO','#000000',18,1,1,1,0,0,0,0,0,0,0,0,NULL),

(58,1,10,'EVINT_USO_RECURSO','CONSTANCIA DE EVINT - Uso de recurso',
'CONSTANCIA DE EVINT',
'Se deja constancia que tomó conocimiento de su evaluación integral
con fecha XX XXX XXXX, declarando el uso del (recurso jerárquico
o recurso de reposición y jerárquico en subsidio).',
'NEGRO','#000000',18,2,1,1,0,0,0,0,0,0,0,0,NULL),

(59,1,10,'EVINT_PRESENTO_NO_PRESENTO_RECURSO','PRESENTÓ / NO PRESENTÓ RECURSO DE EVINT',
'PRESENTÓ / NO PRESENTÓ RECURSO DE EVINT',
'Se deja constancia que con fecha XX XXX XXXX, (presentó
recurso jerarquico / recurso de reposición y jerárquico en
subsidio).',
'NEGRO','#000000',18,3,1,1,0,0,0,0,0,0,0,0,NULL),

(60,1,10,'EVINT_NO_REALIZADA','CONSTANCIA DE NO REALIZACIÓN DE 1RA/2DA EVINT',
'CONSTANCIA DE NO REALIZACIÓN DE 1RA/2DA EVINT',
'No se realiza la 1ra/2da Evaluación Integral, por haberse
desempeñado por menos menos de 60 días de trabajo efectivos.',
'NEGRO','#000000',18,4,1,1,0,0,0,0,0,0,0,0,NULL),

-- ============================================================
-- 11. OTROS
-- ============================================================
(61,1,11,'REPROBACION_CURSO','CONSTANCIA DE REPROBACIÓN DE CURSO',
'CONSTANCIA DE REPROBACIÓN DE CURSO',
'Se deja constancia que reprobó el curso XXX
(Resol. Exenta N° XX/XX de 27.DIC.2023)',
'NEGRO','#000000',19,1,1,1,0,0,0,0,0,0,1,0,NULL),

(62,1,11,'DISPENSA_REQUISITO','DISPENSA DE REQUISITO',
'DISPENSA DE REQUISITO',
'En conformidad a la RES CJE CGP DIVPER (R) N°
1625/XXX de fecha 14 de mayo 2023, se pospone hasta dos
años su curso de Secuencia de Formación del Cuadro
Permanente para ascenso al grado de SG2, por encontrarse con
licencia médica prolongada.
(Resolución Director de Escuela Nº XXXX de 14.MAY.2023)',
'NEGRO','#000000',19,2,1,1,0,0,0,0,0,0,1,0,NULL),

(63,1,11,'OTROS_ANTECEDENTES','CONSTANCIA OTROS ANTECEDENTES',
'CONSTANCIA OTROS ANTECEDENTES',
'Se deja constancia que XXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.',
'NEGRO','#000000',19,3,1,1,0,0,0,0,0,0,0,0,NULL),

(64,1,11,'ARTICULO_77','ARTÍCULO 77',
'ARTÍCULO 77',
'Se aplica artículo 77, por haberse desempeñado efectivamente
por un tiempo inferior a 6 meses dentro del período 202X -
202X, por motivo de XXXX.',
'NEGRO','#000000',19,4,1,1,0,0,0,0,0,0,0,0,NULL),

(65,1,11,'CONSTANCIA_DESPLIEGUE','CONSTANCIA DE DESPLIEGUE',
'CONSTANCIA DE DESPLIEGUE',
'se deja constancia que fue desplegado como XX a la JDN del
“BÍO BÍO”, por XXX días, desde el XX de XX al XX de XX del XXX.',
'NEGRO','#000000',19,5,1,1,0,0,0,0,0,0,0,0,NULL),

(66,1,11,'DECLARA_FALLECIMIENTO','DECLARA FALLECIMIENTO',
'DECLARA FALLECIMIENTO',
'Se deja constancia, que por Resolución DIVPER (R) Nº 1000/
19006 del 12JUL2023, se declara que el XXXXXXXXXXXXX RUN
Nº XXXXXXX-X ha dejado de pertenecer a la institución por
Fallecimiento, a contar del 13ABR2023.',
'NEGRO','#000000',20,6,1,0,0,0,1,0,0,0,1,0,NULL),

(67,1,11,'COMISION_SERVICIO_EXTRANJERO','CONSTANCIA COMISIÓN DE SERVICIO EXTRANJERO',
'CONSTANCIA COMISIÓN DE SERVICIO EXTRANJERO',
'Es designado en comisión de servicio como (Cargo y lugar a
de desempeño) desde el 01 de ENERO de 2022 al 31 de
DICIEMBRE de 2023, a partir de esta fecha se estamparán las
anotaciones reglamentarias que correspondan, sin la firma del
calificado, situación que se normalizará una vez que retorne a las
actividades diarias del servicio en la Unidad.',
'NEGRO','#000000',20,7,1,1,0,0,0,0,0,0,0,0,NULL),

(68,1,11,'ANOTACIONES_SIN_FIRMA_CALIFICADO','CONSTANCIA DE ANOTACIONES SIN LA FIRMA DEL CALIFICADO',
'CONSTANCIA DE ANOTACIONES SIN LA FIRMA DEL
CALIFICADO',
'En consideración a que el calificado se encuentra ausente del
servicio, como consecuencia de XXXXXXXXXXXX, a partir de
esta fecha se estamparán las anotaciones reglamentarias que
correspondan, sin la firma del calificado.',
'NEGRO','#000000',20,8,1,0,0,0,0,0,0,0,0,0,NULL),

(69,1,11,'VALIDACION_ANOTACIONES','CONSTANCIA DE VALIDACIÓN DE ANOTACIONES',
'CONSTANCIA DE VALIDACIÓN DE ANOTACIONES',
'En conformidad a lo establecido en la Ley 19.880 “Bases de los
procedimientos administrativos que rigen los actos de los órganos
de la administración del Estado”, capítulo III, párrafo 1° Notificación,
artículo 47, se procede a la notificación tácita de las anotaciones
registradas anteriormente en la Hoja de Vida Digital, que se
encuentran sin la firma del calificado.',
'NEGRO','#000000',20,9,1,1,0,0,0,0,0,0,0,0,
'Esta anotación se debe ocupar solo en caso de anotaciones de constancias de Feriado Legal y Licencias Médicas.'),

(70,1,11,'COMISION_SERVICIO','CONSTANCIA COMISIÓN DE SERVICIO',
'CONSTANCIA COMISIÓN DE SERVICIO',
'Es designado en comisión de servicio como Oficial de Personal,
Logístico u otro, al CDO de la III DIVMÑA desde el XX de XXXX
al XX de XXXX',
'NEGRO','#000000',20,10,1,1,0,0,0,0,0,0,0,0,NULL),

(71,1,11,'CONSTANCIA_CORRECCION','CONSTANCIA DE CORRECCIÓN',
'CONSTANCIA DE CORRECCIÓN',
'Se deja constancia que por error u omisión del calificador directo,
la anotación “CONSTANCIA DE DESPLIEGUE” estampada el XX
de XX del XXXX quedará nula, la cual será sustituida por la
anotación que a continuación se estampa:
CONSTANCIA DE DESPLIEGUE
se deja constancia que fue desplegado como (cargo a desempeñar)
“a la JDN de la Araucanía” Por X días, desde el XX de XX al XX de
XX del XXXX.',
'NEGRO','#000000',21,11,1,1,0,0,0,0,0,0,0,0,NULL),

(72,1,11,'ALTERACION_CONDICION_NUTRICIONAL','CONSTANCIA DE ESTADO DE ALTERACIÓN EN CONDICIÓN NUTRICIONAL',
'CONSTANCIA DE ESTADO DE ALTERACIÓN EN CONDICIÓN
NUTRICIONAL',
'Déjese constancia que el calificado deberá mejorar su condición de
Salud, superando su estado nutricional, debiendo adoptar las
Medidas pertinentes a fin de cumplir en forma satisfactoria con los
Estándares físicos dispuestos por la Institución.',
'NEGRO','#000000',21,12,1,1,0,0,0,0,0,0,0,0,NULL)

ON CONFLICT(id) DO UPDATE SET
    catalogo_id = excluded.catalogo_id,
    categoria_id = excluded.categoria_id,
    codigo = excluded.codigo,
    nombre = excluded.nombre,
    titulo_fuente = excluded.titulo_fuente,
    cuerpo_fuente = excluded.cuerpo_fuente,
    color_semantico = excluded.color_semantico,
    color_hex = excluded.color_hex,
    pagina_fuente = excluded.pagina_fuente,
    orden = excluded.orden,
    requiere_firma_calificador = excluded.requiere_firma_calificador,
    requiere_firma_calificado = excluded.requiere_firma_calificado,
    firma_oficial_personal = excluded.firma_oficial_personal,
    abre_hoja_vida = excluded.abre_hoja_vida,
    cierra_hoja_vida = excluded.cierra_hoja_vida,
    afecta_calificacion = excluded.afecta_calificacion,
    requiere_concepto = excluded.requiere_concepto,
    requiere_puntaje = excluded.requiere_puntaje,
    requiere_resolucion = excluded.requiere_resolucion,
    permite_negacion_firma = excluded.permite_negacion_firma,
    observacion_uso = excluded.observacion_uso,
    activo = 1;

DROP VIEW IF EXISTS vw_catalogo_anotaciones;

CREATE VIEW vw_catalogo_anotaciones AS
SELECT
    p.id,
    p.codigo,
    p.nombre,
    p.titulo_fuente,
    p.cuerpo_fuente,
    p.color_semantico,
    p.color_hex,
    p.pagina_fuente,
    p.orden,
    p.requiere_firma_calificador,
    p.requiere_firma_calificado,
    p.firma_oficial_personal,
    p.abre_hoja_vida,
    p.cierra_hoja_vida,
    p.afecta_calificacion,
    p.requiere_concepto,
    p.requiere_puntaje,
    p.requiere_resolucion,
    p.permite_negacion_firma,
    p.observacion_uso,
    c.id AS categoria_id,
    c.codigo AS categoria_codigo,
    c.nombre AS categoria_nombre,
    c.orden AS categoria_orden,
    ca.codigo AS catalogo_codigo,
    ca.periodo_fuente,
    ca.fecha_actualizacion_fuente
FROM plantillas_anotacion p
INNER JOIN categorias_anotacion c ON c.id = p.categoria_id
INNER JOIN catalogos_anotacion ca ON ca.id = p.catalogo_id
WHERE p.activo = 1 AND c.activo = 1 AND ca.activo = 1;
