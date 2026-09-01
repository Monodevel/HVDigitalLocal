ALTER TABLE resoluciones_documentales
  ADD COLUMN IF NOT EXISTS origen_documento VARCHAR(16) NOT NULL DEFAULT 'INTERNA',
  ADD COLUMN IF NOT EXISTS organismo_emisor VARCHAR(255) NULL;

DROP VIEW IF EXISTS vw_resoluciones_emitidas_disponibles;
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
    r.origen_documento,
    r.organismo_emisor,
    r.propietario_usuario_id,
    p.run,
    p.nombres,
    p.apellido_paterno,
    p.apellido_materno,
    TRIM(CONCAT_WS(' ', COALESCE(g.abreviatura, cp.abreviatura, ''), p.nombres, p.apellido_paterno, p.apellido_materno)) AS persona_nombre_completo,
    COALESCE(g.abreviatura, cp.abreviatura) AS grado_calidad_abreviatura,
    c.numero AS concepto_numero_actual,
    c.nombre AS concepto_nombre_actual,
    pa.texto_visual AS puntaje_visual_actual,
    pa.texto_literal AS puntaje_literal_actual
FROM resoluciones_documentales r
INNER JOIN personas p ON p.id = r.persona_id
INNER JOIN hojas_vida hv ON hv.id = r.hoja_vida_id
LEFT JOIN grados g ON g.id = hv.grado_id_inicio
LEFT JOIN calidades_personal cp ON cp.id = hv.calidad_personal_id_inicio
INNER JOIN conceptos_calificacion c ON c.id = r.concepto_id
INNER JOIN puntajes_anotacion pa ON pa.id = r.puntaje_id;

CREATE VIEW vw_resoluciones_emitidas_disponibles AS
SELECT *
FROM vw_resoluciones_documentales
WHERE estado = 'EMITIDA' AND anotacion_id IS NULL;
