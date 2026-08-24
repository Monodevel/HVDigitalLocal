CREATE OR REPLACE VIEW vw_estado_configuracion_inicial AS
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
