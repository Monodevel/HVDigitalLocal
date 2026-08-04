import { obtenerBaseDatos } from './database'

export type TipoNotaTarea = 'NOTA' | 'TAREA'
export type PrioridadNotaTarea = 'BAJA' | 'MEDIA' | 'ALTA'
export type EstadoNotaTarea = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'ARCHIVADA'

export interface ContextoNotasTareas {
  periodoId: number
  periodoNombre: string
  periodoEstado: 'ABIERTO' | 'CERRADO'
}

export interface CalificadoNotaTarea {
  personaId: number
  nombre: string
  grado: string
  run: string
}

export interface NotaTarea {
  id: number
  periodo_id: number
  persona_id: number | null
  tipo: TipoNotaTarea
  titulo: string
  detalle: string | null
  prioridad: PrioridadNotaTarea
  estado: EstadoNotaTarea
  fecha_limite: string | null
  completada_en: string | null
  creada_en: string
  actualizada_en: string
  persona_nombre: string | null
  persona_grado: string | null
  persona_run: string | null
}

export interface GuardarNotaTarea {
  id?: number
  periodoId: number
  personaId?: number | null
  tipo: TipoNotaTarea
  titulo: string
  detalle?: string
  prioridad: PrioridadNotaTarea
  estado: EstadoNotaTarea
  fechaLimite?: string | null
}

function validarTexto(valor: string, etiqueta: string): string {
  const limpio = valor.trim()
  if (!limpio) throw new Error(`Debe ingresar ${etiqueta}.`)
  return limpio
}

export async function asegurarEsquemaNotasTareas(): Promise<void> {
  const db = await obtenerBaseDatos()

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notas_tareas_calificador (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      periodo_id INTEGER NOT NULL,
      persona_id INTEGER,
      tipo TEXT NOT NULL CHECK (tipo IN ('NOTA', 'TAREA')),
      titulo TEXT NOT NULL,
      detalle TEXT,
      prioridad TEXT NOT NULL DEFAULT 'MEDIA'
        CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA')),
      estado TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'ARCHIVADA')),
      fecha_limite TEXT,
      completada_en TEXT,
      creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (periodo_id) REFERENCES periodos(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      FOREIGN KEY (persona_id) REFERENCES personas(id) ON UPDATE RESTRICT ON DELETE SET NULL
    )
  `)

  await db.execute(`
    CREATE INDEX IF NOT EXISTS ix_notas_tareas_periodo
    ON notas_tareas_calificador(periodo_id, estado, fecha_limite)
  `)

  await db.execute(`
    CREATE INDEX IF NOT EXISTS ix_notas_tareas_persona
    ON notas_tareas_calificador(persona_id, periodo_id)
  `)

  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS trg_notas_tareas_periodo_cerrado_insert
    BEFORE INSERT ON notas_tareas_calificador
    WHEN EXISTS (
      SELECT 1 FROM periodos p
      WHERE p.id = NEW.periodo_id AND LOWER(p.estado) = 'cerrado'
    )
    BEGIN
      SELECT RAISE(ABORT, 'El período está cerrado y solo permite lectura.');
    END
  `)

  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS trg_notas_tareas_periodo_cerrado_update
    BEFORE UPDATE ON notas_tareas_calificador
    WHEN EXISTS (
      SELECT 1 FROM periodos p
      WHERE p.id = OLD.periodo_id AND LOWER(p.estado) = 'cerrado'
    )
    BEGIN
      SELECT RAISE(ABORT, 'El período está cerrado y solo permite lectura.');
    END
  `)

  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS trg_notas_tareas_periodo_cerrado_delete
    BEFORE DELETE ON notas_tareas_calificador
    WHEN EXISTS (
      SELECT 1 FROM periodos p
      WHERE p.id = OLD.periodo_id AND LOWER(p.estado) = 'cerrado'
    )
    BEGIN
      SELECT RAISE(ABORT, 'El período está cerrado y solo permite lectura.');
    END
  `)
}

export async function obtenerContextoNotasTareas(): Promise<ContextoNotasTareas> {
  await asegurarEsquemaNotasTareas()
  const db = await obtenerBaseDatos()
  const filas = await db.select<Array<{
    id: number
    nombre: string
    estado: string
  }>>(`
    SELECT p.id, p.nombre, p.estado
    FROM configuracion_inicial c
    INNER JOIN periodos p ON p.id = c.periodo_activo_id
    WHERE c.id = 1
    LIMIT 1
  `)

  const periodo = filas[0]
  if (!periodo) throw new Error('No existe un período seleccionado.')

  return {
    periodoId: Number(periodo.id),
    periodoNombre: periodo.nombre,
    periodoEstado: String(periodo.estado).toUpperCase() === 'CERRADO' ? 'CERRADO' : 'ABIERTO',
  }
}

export async function listarCalificadosParaNotas(periodoId: number): Promise<CalificadoNotaTarea[]> {
  const db = await obtenerBaseDatos()
  return db.select<CalificadoNotaTarea[]>(`
    SELECT DISTINCT
      p.id AS personaId,
      TRIM(p.nombres || ' ' || p.apellido_paterno || ' ' || COALESCE(p.apellido_materno, '')) AS nombre,
      COALESCE(g.abreviatura, cp.abreviatura, '') AS grado,
      p.run
    FROM designaciones_calificacion d
    INNER JOIN personas p ON p.id = d.persona_id
    LEFT JOIN grados g ON g.id = d.grado_id_inicio
    LEFT JOIN calidades_personal cp ON cp.id = d.calidad_personal_id_inicio
    WHERE d.periodo_id = $1
      AND UPPER(COALESCE(d.estado, 'ACTIVA')) <> 'ANULADA'
    ORDER BY p.apellido_paterno, p.apellido_materno, p.nombres
  `, [periodoId])
}

export async function listarNotasTareas(periodoId: number): Promise<NotaTarea[]> {
  await asegurarEsquemaNotasTareas()
  const db = await obtenerBaseDatos()
  return db.select<NotaTarea[]>(`
    SELECT
      n.*,
      CASE WHEN p.id IS NULL THEN NULL
        ELSE TRIM(p.nombres || ' ' || p.apellido_paterno || ' ' || COALESCE(p.apellido_materno, ''))
      END AS persona_nombre,
      COALESCE(g.abreviatura, cp.abreviatura) AS persona_grado,
      p.run AS persona_run
    FROM notas_tareas_calificador n
    LEFT JOIN personas p ON p.id = n.persona_id
    LEFT JOIN grados g ON g.id = p.grado_id
    LEFT JOIN calidades_personal cp ON cp.id = p.calidad_personal_id
    WHERE n.periodo_id = $1
    ORDER BY
      CASE n.estado WHEN 'PENDIENTE' THEN 1 WHEN 'EN_PROGRESO' THEN 2 WHEN 'COMPLETADA' THEN 3 ELSE 4 END,
      CASE n.prioridad WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END,
      COALESCE(n.fecha_limite, '9999-12-31'),
      n.id DESC
  `, [periodoId])
}

export async function guardarNotaTarea(datos: GuardarNotaTarea): Promise<number> {
  await asegurarEsquemaNotasTareas()
  const db = await obtenerBaseDatos()
  const titulo = validarTexto(datos.titulo, 'un título')
  const detalle = datos.detalle?.trim() || null
  const personaId = datos.personaId || null
  const fechaLimite = datos.tipo === 'TAREA' ? (datos.fechaLimite || null) : null
  const completada = datos.estado === 'COMPLETADA' ? 'CURRENT_TIMESTAMP' : 'NULL'

  if (datos.id) {
    await db.execute(`
      UPDATE notas_tareas_calificador
      SET persona_id = $1, tipo = $2, titulo = $3, detalle = $4,
          prioridad = $5, estado = $6, fecha_limite = $7,
          completada_en = ${completada}, actualizada_en = CURRENT_TIMESTAMP
      WHERE id = $8 AND periodo_id = $9
    `, [personaId, datos.tipo, titulo, detalle, datos.prioridad, datos.estado, fechaLimite, datos.id, datos.periodoId])
    return datos.id
  }

  const resultado = await db.execute(`
    INSERT INTO notas_tareas_calificador (
      periodo_id, persona_id, tipo, titulo, detalle, prioridad, estado, fecha_limite, completada_en
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${completada})
  `, [datos.periodoId, personaId, datos.tipo, titulo, detalle, datos.prioridad, datos.estado, fechaLimite])

  if (resultado.lastInsertId === undefined) throw new Error('No fue posible guardar el registro.')
  return Number(resultado.lastInsertId)
}

export async function cambiarEstadoNotaTarea(
  id: number,
  periodoId: number,
  estado: EstadoNotaTarea,
): Promise<void> {
  const db = await obtenerBaseDatos()
  await db.execute(`
    UPDATE notas_tareas_calificador
    SET estado = $1,
        completada_en = CASE WHEN $1 = 'COMPLETADA' THEN CURRENT_TIMESTAMP ELSE NULL END,
        actualizada_en = CURRENT_TIMESTAMP
    WHERE id = $2 AND periodo_id = $3
  `, [estado, id, periodoId])
}

export async function eliminarNotaTarea(id: number, periodoId: number): Promise<void> {
  const db = await obtenerBaseDatos()
  await db.execute(
    'DELETE FROM notas_tareas_calificador WHERE id = $1 AND periodo_id = $2',
    [id, periodoId],
  )
}
