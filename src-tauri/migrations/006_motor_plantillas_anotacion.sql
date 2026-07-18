PRAGMA foreign_keys = ON;

-- ============================================================
-- MOTOR DE PLANTILLAS DE ANOTACIONES
-- ============================================================

ALTER TABLE plantillas_anotacion
ADD COLUMN cuerpo_renderizable TEXT;

ALTER TABLE plantillas_anotacion
ADD COLUMN version_plantilla INTEGER NOT NULL DEFAULT 1;

ALTER TABLE plantillas_anotacion
ADD COLUMN permite_edicion_libre INTEGER NOT NULL DEFAULT 0
    CHECK (permite_edicion_libre IN (0, 1));

ALTER TABLE plantillas_anotacion
ADD COLUMN texto_normalizado TEXT;

-- Inicialmente, el texto normalizado y renderizable conserva
-- íntegramente la fuente. Las plantillas específicas se reemplazan
-- posteriormente por versiones con variables.
UPDATE plantillas_anotacion
SET
    cuerpo_renderizable = cuerpo_fuente,
    texto_normalizado = cuerpo_fuente
WHERE cuerpo_renderizable IS NULL;

-- ============================================================
-- VALORES COMPLETADOS PARA UNA ANOTACIÓN EN CONSTRUCCIÓN
-- ============================================================

CREATE TABLE IF NOT EXISTS borradores_anotacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    plantilla_id INTEGER NOT NULL,
    hoja_vida_id INTEGER,

    fecha_anotacion TEXT NOT NULL,

    titulo_final TEXT,
    cuerpo_final TEXT,
    color_semantico TEXT NOT NULL
        CHECK (color_semantico IN ('NEGRO', 'ROJO')),
    color_hex TEXT NOT NULL,

    valores_json TEXT NOT NULL DEFAULT '{}',

    estado TEXT NOT NULL DEFAULT 'borrador'
        CHECK (
            estado IN (
                'borrador',
                'validado',
                'estampado',
                'anulado'
            )
        ),

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (plantilla_id)
        REFERENCES plantillas_anotacion(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS
    ix_borradores_anotacion_plantilla
ON borradores_anotacion(plantilla_id);

CREATE INDEX IF NOT EXISTS
    ix_borradores_anotacion_estado
ON borradores_anotacion(estado);

-- ============================================================
-- PLANTILLAS OPERATIVAS
-- ============================================================

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Se deja constancia que es nombrado(a) {{tipo_personal}} de
Ejército, a contar del {{fecha_nombramiento}}.

Nota Egreso: {{nota_egreso}}
Puesto: {{puesto}}
Total Alumnos: {{total_alumnos}}
({{tipo_documento}} N°{{numero_documento}} de {{fecha_documento}})'
WHERE codigo = 'CONSTANCIA_NOMBRAMIENTO';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Se deja constancia de su contratación en el Ejército como
Personal a Contrata a contar del {{fecha_contratacion}}.'
WHERE codigo = 'CONSTANCIA_CONTRATACION';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'{{concepto}}
Es felicitado con {{puntaje_numerico}} ptos. ({{puntaje_texto}})
({{tipo_documento}} N° {{numero_documento}} de {{fecha_documento}})'
WHERE codigo = 'FELICITACION';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'{{tipo_sancion}}
Es amonestado conforme lo establecido en el artículo 49 del DNL –
911 “Reglamento de Disciplina para las FAs”.
({{tipo_documento}} N° {{numero_documento}} del {{fecha_documento}})
Fue entregada copia fiel integra de la resolución al calificado.'
WHERE codigo = 'SANCION_AMONESTACION';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'{{concepto}}
Es sancionado con {{cantidad_dias_numero}} ({{cantidad_dias_texto}})
día(s) de {{tipo_arresto}}.
{{puntaje_numerico}} ({{puntaje_texto}})
({{tipo_documento}} N° {{numero_documento}} de {{fecha_documento}})
Fue entregada copia fiel integra de la resolución al calificado.'
WHERE codigo = 'SANCION_ARRESTO';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Con fecha {{fecha_presentacion}}, presentó Recurso de
Reconsideración.'
WHERE codigo = 'RECURSO_RECONSIDERACION';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Con fecha {{fecha_presentacion}}, presentó Recurso de
Reclamación.'
WHERE codigo = 'RECURSO_RECLAMACION';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Con fecha {{fecha_presentacion}}, presentó Recurso de
Apelación.'
WHERE codigo = 'RECURSO_APELACION';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Estudiados y analizados los argumentos expuestos por el afectado,
se ha resuelto {{resultado_recurso}} el Recurso de Reconsideración presentado,
{{fundamento_resultado}}
sanción anotada con fecha {{fecha_sancion}}
({{tipo_documento}} N° {{numero_documento}} de {{fecha_documento}})'
WHERE codigo = 'RESULTADO_RECONSIDERACION';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Estudiados y analizados los argumentos expuestos por el afectado,
se ha resuelto {{resultado_recurso}} el Recurso de Reclamación presentado,
{{fundamento_resultado}}
sanción anotada con fecha {{fecha_sancion}}
({{tipo_documento}} N° {{numero_documento}} de {{fecha_documento}})'
WHERE codigo = 'RESULTADO_RECLAMACION';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Estudiados y analizados los argumentos expuestos por el afectado,
se ha resuelto {{resultado_recurso}} el Recurso de Apelación presentado,
{{fundamento_resultado}}
sanción anotada con fecha {{fecha_sancion}}
({{tipo_documento}} N° {{numero_documento}} de {{fecha_documento}})'
WHERE codigo = 'RESULTADO_APELACION';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Se deja constancia que se le concede licencia médica por {{dias_licencia}} días,
desde el {{fecha_inicio}} al {{fecha_termino}}, siendo licencia {{tipo_licencia}}.
({{tipo_documento}} N° {{numero_documento}} de {{fecha_documento}})'
WHERE codigo = 'LICENCIA_MEDICA';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'{{dias_pendientes}} días pendientes
({{tipo_documento}} N° {{numero_documento}} de {{fecha_documento}})'
WHERE codigo = 'FERIADO_LEGAL';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Se deja constancia que mediante la {{tipo_documento}} N° {{numero_documento}}
de {{fecha_documento}}, se le concede permiso sin goce de
remuneraciones, desde el {{fecha_inicio}} al {{fecha_termino}}.'
WHERE codigo = 'PERMISO_SIN_GOCE';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Se deja constancia que se encuentra con permiso paternal desde
el {{fecha_inicio}}, hasta el {{fecha_termino}}.
({{tipo_documento}} N° {{numero_documento}} de {{fecha_documento}})'
WHERE codigo = 'PERMISO_PATERNAL';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Se deja constancia que tomó conocimiento de su evaluación integral
con fecha {{fecha_notificacion}}, declarándose conforme'
WHERE codigo = 'EVINT_CONFORME';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Se deja constancia que tomó conocimiento de su evaluación integral
con fecha {{fecha_notificacion}}, declarando el uso del
{{tipo_recurso}}.'
WHERE codigo = 'EVINT_USO_RECURSO';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Se deja constancia que con fecha {{fecha_presentacion}},
{{accion_recurso}} {{tipo_recurso}}.'
WHERE codigo = 'EVINT_PRESENTO_NO_PRESENTO_RECURSO';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'No se realiza la {{numero_evint}} Evaluación Integral, por haberse
desempeñado por menos de 60 días de trabajo efectivos.'
WHERE codigo = 'EVINT_NO_REALIZADA';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Se aplica artículo 77, por haberse desempeñado efectivamente
por un tiempo inferior a 6 meses dentro del período {{periodo}},
por motivo de {{motivo}}.'
WHERE codigo = 'ARTICULO_77';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Se deja constancia que fue desplegado como {{cargo_despliegue}}
a la {{jefatura_destino}}, por {{cantidad_dias}} días,
desde el {{fecha_inicio}} al {{fecha_termino}}.'
WHERE codigo = 'CONSTANCIA_DESPLIEGUE';

UPDATE plantillas_anotacion
SET cuerpo_renderizable =
'Es designado en comisión de servicio como {{cargo}},
en {{lugar}}, desde el {{fecha_inicio}} al {{fecha_termino}}.'
WHERE codigo = 'COMISION_SERVICIO';

-- ============================================================
-- VARIABLES
-- ============================================================

DELETE FROM variables_plantilla_anotacion;

INSERT INTO variables_plantilla_anotacion (
    plantilla_id,
    codigo,
    etiqueta,
    tipo_dato,
    requerido,
    orden,
    opciones_json,
    ayuda
)
SELECT
    id,
    'tipo_personal',
    'Tipo de personal',
    'SELECCION',
    1,
    1,
    '["Oficial","Suboficial"]',
    NULL
FROM plantillas_anotacion
WHERE codigo = 'CONSTANCIA_NOMBRAMIENTO';

INSERT INTO variables_plantilla_anotacion
    (plantilla_id, codigo, etiqueta, tipo_dato, requerido, orden)
SELECT id, 'fecha_nombramiento', 'Fecha de nombramiento', 'FECHA', 1, 2
FROM plantillas_anotacion
WHERE codigo = 'CONSTANCIA_NOMBRAMIENTO';

INSERT INTO variables_plantilla_anotacion
    (plantilla_id, codigo, etiqueta, tipo_dato, requerido, orden)
SELECT id, 'nota_egreso', 'Nota de egreso', 'DECIMAL', 0, 3
FROM plantillas_anotacion
WHERE codigo = 'CONSTANCIA_NOMBRAMIENTO';

INSERT INTO variables_plantilla_anotacion
    (plantilla_id, codigo, etiqueta, tipo_dato, requerido, orden)
SELECT id, 'puesto', 'Puesto de egreso', 'ENTERO', 0, 4
FROM plantillas_anotacion
WHERE codigo = 'CONSTANCIA_NOMBRAMIENTO';

INSERT INTO variables_plantilla_anotacion
    (plantilla_id, codigo, etiqueta, tipo_dato, requerido, orden)
SELECT id, 'total_alumnos', 'Total de alumnos', 'ENTERO', 0, 5
FROM plantillas_anotacion
WHERE codigo = 'CONSTANCIA_NOMBRAMIENTO';

-- Variables comunes para documentos administrativos.

INSERT INTO variables_plantilla_anotacion (
    plantilla_id,
    codigo,
    etiqueta,
    tipo_dato,
    requerido,
    orden
)
SELECT
    id,
    'tipo_documento',
    'Tipo de documento',
    'TEXTO',
    1,
    90
FROM plantillas_anotacion
WHERE cuerpo_renderizable LIKE '%{{tipo_documento}}%';

INSERT INTO variables_plantilla_anotacion (
    plantilla_id,
    codigo,
    etiqueta,
    tipo_dato,
    requerido,
    orden
)
SELECT
    id,
    'numero_documento',
    'Número de documento',
    'TEXTO',
    1,
    91
FROM plantillas_anotacion
WHERE cuerpo_renderizable LIKE '%{{numero_documento}}%';

INSERT INTO variables_plantilla_anotacion (
    plantilla_id,
    codigo,
    etiqueta,
    tipo_dato,
    requerido,
    orden
)
SELECT
    id,
    'fecha_documento',
    'Fecha del documento',
    'FECHA',
    1,
    92
FROM plantillas_anotacion
WHERE cuerpo_renderizable LIKE '%{{fecha_documento}}%';

-- Vista completa.

DROP VIEW IF EXISTS vw_variables_plantilla_anotacion;

CREATE VIEW vw_variables_plantilla_anotacion AS
SELECT
    v.id,
    v.plantilla_id,
    p.codigo AS plantilla_codigo,
    p.nombre AS plantilla_nombre,
    v.codigo,
    v.etiqueta,
    v.tipo_dato,
    v.requerido,
    v.orden,
    v.opciones_json,
    v.ayuda
FROM variables_plantilla_anotacion v
INNER JOIN plantillas_anotacion p
    ON p.id = v.plantilla_id
WHERE p.activo = 1;