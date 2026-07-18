PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS designaciones_calificacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona_id INTEGER NOT NULL,
    periodo_id INTEGER NOT NULL,
    calificador_directo_id INTEGER NOT NULL,
    vigencia_periodo_id INTEGER NOT NULL,
    categoria_id INTEGER NOT NULL,
    grado_id_inicio INTEGER,
    calidad_personal_id_inicio INTEGER,
    unidad_nombre TEXT NOT NULL,
    puesto TEXT NOT NULL,
    fecha_inicio TEXT NOT NULL,
    fecha_termino TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ACTIVA'
        CHECK (estado IN ('ACTIVA','SUSPENDIDA','FINALIZADA','ANULADA')),
    creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (persona_id) REFERENCES personas(id),
    FOREIGN KEY (periodo_id) REFERENCES periodos(id),
    FOREIGN KEY (calificador_directo_id) REFERENCES calificadores_directos(id),
    FOREIGN KEY (vigencia_periodo_id) REFERENCES vigencias_periodo(id),
    FOREIGN KEY (categoria_id) REFERENCES categorias_personal(id),
    FOREIGN KEY (grado_id_inicio) REFERENCES grados(id),
    FOREIGN KEY (calidad_personal_id_inicio) REFERENCES calidades_personal(id),
    CHECK (
        (grado_id_inicio IS NOT NULL AND calidad_personal_id_inicio IS NULL)
        OR
        (grado_id_inicio IS NULL AND calidad_personal_id_inicio IS NOT NULL)
    ),
    UNIQUE (persona_id, periodo_id)
);

CREATE TABLE IF NOT EXISTS expedientes_calificacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    designacion_id INTEGER NOT NULL UNIQUE,
    persona_id INTEGER NOT NULL,
    periodo_id INTEGER NOT NULL,
    categoria_id INTEGER NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ABIERTO'
        CHECK (estado IN ('CONFIGURADO','ABIERTO','EN_PROCESO','PENDIENTE_CIERRE','CERRADO','ANULADO')),
    fecha_apertura TEXT NOT NULL DEFAULT CURRENT_DATE,
    fecha_cierre TEXT,
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (designacion_id) REFERENCES designaciones_calificacion(id),
    FOREIGN KEY (persona_id) REFERENCES personas(id),
    FOREIGN KEY (periodo_id) REFERENCES periodos(id),
    FOREIGN KEY (categoria_id) REFERENCES categorias_personal(id)
);

CREATE TABLE IF NOT EXISTS instrumentos_expediente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expediente_id INTEGER NOT NULL,
    tipo_instrumento TEXT NOT NULL
        CHECK (tipo_instrumento IN ('HOJA_VIDA','HC1','HC2','EVINT','HAM','HAPSEM')),
    numero INTEGER NOT NULL DEFAULT 1,
    aplica INTEGER NOT NULL DEFAULT 1 CHECK (aplica IN (0,1)),
    estado TEXT NOT NULL DEFAULT 'NO_INICIADO'
        CHECK (estado IN ('NO_INICIADO','EN_ELABORACION','PENDIENTE_FIRMA','COMPLETADO','CERRADO','NO_APLICA')),
    version_formato TEXT NOT NULL DEFAULT '1.0',
    fecha_apertura TEXT,
    fecha_cierre TEXT,
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expediente_id) REFERENCES expedientes_calificacion(id) ON DELETE CASCADE,
    UNIQUE (expediente_id, tipo_instrumento, numero)
);

CREATE TABLE IF NOT EXISTS expediente_hojas_vida (
    expediente_id INTEGER PRIMARY KEY,
    hoja_vida_id INTEGER NOT NULL UNIQUE,
    instrumento_id INTEGER NOT NULL UNIQUE,
    FOREIGN KEY (expediente_id) REFERENCES expedientes_calificacion(id) ON DELETE CASCADE,
    FOREIGN KEY (hoja_vida_id) REFERENCES hojas_vida(id),
    FOREIGN KEY (instrumento_id) REFERENCES instrumentos_expediente(id)
);

DROP VIEW IF EXISTS vw_designaciones_periodo_activo;

CREATE VIEW vw_designaciones_periodo_activo AS
SELECT
    d.id AS designacion_id,
    d.persona_id,
    d.periodo_id,
    d.vigencia_periodo_id,
    d.categoria_id,
    d.grado_id_inicio,
    d.calidad_personal_id_inicio,
    d.unidad_nombre,
    d.puesto,
    d.fecha_inicio,
    d.fecha_termino,
    d.estado AS designacion_estado,
    p.run,
    p.nombres,
    p.apellido_paterno,
    p.apellido_materno,
    COALESCE(g.abreviatura, cp.abreviatura) AS grado_calidad_abreviatura,
    COALESCE(g.nombre, cp.nombre) AS grado_calidad_nombre,
    c.codigo AS categoria_codigo,
    c.nombre AS categoria_nombre,
    per.nombre AS periodo_nombre,
    e.id AS expediente_id,
    e.estado AS expediente_estado,
    hv.id AS hoja_vida_id
FROM designaciones_calificacion d
INNER JOIN configuracion_inicial ci
    ON ci.periodo_activo_id = d.periodo_id AND ci.id = 1
INNER JOIN personas p ON p.id = d.persona_id
LEFT JOIN grados g ON g.id = d.grado_id_inicio
LEFT JOIN calidades_personal cp ON cp.id = d.calidad_personal_id_inicio
INNER JOIN categorias_personal c ON c.id = d.categoria_id
INNER JOIN periodos per ON per.id = d.periodo_id
INNER JOIN expedientes_calificacion e ON e.designacion_id = d.id
LEFT JOIN expediente_hojas_vida ehv ON ehv.expediente_id = e.id
LEFT JOIN hojas_vida hv ON hv.id = ehv.hoja_vida_id
WHERE d.estado <> 'ANULADA';
