import { obtenerBaseDatos } from './database'

export interface PeriodoGestion {
  id: number
  nombre: string
  anio: number
  fecha_inicio: string
  fecha_termino: string
  estado: 'abierto' | 'cerrado'
}

export async function asegurarReglasPeriodos(): Promise<void> {
  const db = await obtenerBaseDatos()

  await db.execute(`
    UPDATE periodos
    SET estado = 'cerrado'
    WHERE LOWER(estado) = 'abierto'
      AND id <> (
        SELECT id
        FROM periodos
        WHERE LOWER(estado) = 'abierto'
        ORDER BY fecha_inicio DESC, id DESC
        LIMIT 1
      )
  `)

  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_periodos_unico_abierto
    ON periodos ((CASE WHEN LOWER(estado) = 'abierto' THEN 1 END))
  `)

  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS trg_periodos_no_reabrir
    BEFORE UPDATE OF estado ON periodos
    WHEN LOWER(OLD.estado) = 'cerrado' AND LOWER(NEW.estado) = 'abierto'
    BEGIN
      SELECT RAISE(ABORT, 'Un período cerrado es histórico y no puede volver a abrirse.');
    END
  `)
}

export async function listarPeriodosGestion(): Promise<PeriodoGestion[]> {
  const db = await obtenerBaseDatos()
  return db.select<PeriodoGestion[]>(`
    SELECT id, nombre, anio, fecha_inicio, fecha_termino, LOWER(estado) AS estado
    FROM periodos
    ORDER BY fecha_inicio DESC, id DESC
  `)
}

export async function cerrarPeriodoVigente(): Promise<void> {
  const db = await obtenerBaseDatos()
  const abiertos = await db.select<Array<{ id: number; nombre: string }>>(`
    SELECT id, nombre
    FROM periodos
    WHERE LOWER(estado) = 'abierto'
    LIMIT 1
  `)

  const abierto = abiertos[0]
  if (!abierto) throw new Error('No existe un período abierto para cerrar.')

  await db.execute(`
    UPDATE periodos
    SET estado = 'cerrado'
    WHERE id = $1 AND LOWER(estado) = 'abierto'
  `, [abierto.id])
}

function fecha(anio: number, mesDia: string): string {
  return `${anio}-${mesDia}`
}

export async function crearNuevoPeriodo(anioInicio: number): Promise<number> {
  if (!Number.isInteger(anioInicio) || anioInicio < 2020 || anioInicio > 2100) {
    throw new Error('Ingrese un año válido entre 2020 y 2100.')
  }

  const db = await obtenerBaseDatos()
  const abiertos = await db.select<Array<{ id: number }>>(`
    SELECT id FROM periodos WHERE LOWER(estado) = 'abierto' LIMIT 1
  `)
  if (abiertos[0]) {
    throw new Error('Debe cerrar el período vigente antes de crear uno nuevo.')
  }

  const existentes = await db.select<Array<{ id: number }>>(`
    SELECT id FROM periodos WHERE anio = $1 LIMIT 1
  `, [anioInicio])
  if (existentes[0]) {
    throw new Error(`Ya existe el período ${anioInicio}-${anioInicio + 1}.`)
  }

  const nombre = `${anioInicio}-${anioInicio + 1}`
  const resultado = await db.execute(`
    INSERT INTO periodos (nombre, anio, fecha_inicio, fecha_termino, estado)
    VALUES ($1, $2, $3, $4, 'abierto')
  `, [
    nombre,
    anioInicio,
    fecha(anioInicio, '06-01'),
    fecha(anioInicio + 1, '07-31'),
  ])

  if (resultado.lastInsertId === undefined) {
    throw new Error('No fue posible crear el período.')
  }

  const periodoId = Number(resultado.lastInsertId)
  const vigencias = [
    ['OFICIALES', 'Oficiales', fecha(anioInicio, '07-01'), fecha(anioInicio + 1, '06-30'), 1],
    ['CP_TROPA_JORNAL', 'Cuadro Permanente, Tropa Profesional y Personal a Jornal', fecha(anioInicio, '06-01'), fecha(anioInicio + 1, '05-31'), 2],
    ['PERSONAL_CIVIL', 'Personal civil', fecha(anioInicio, '08-01'), fecha(anioInicio + 1, '07-31'), 3],
  ] as const

  for (const vigencia of vigencias) {
    await db.execute(`
      INSERT INTO vigencias_periodo (
        periodo_id, codigo_regimen, nombre_regimen,
        fecha_inicio, fecha_termino, orden, activo
      ) VALUES ($1, $2, $3, $4, $5, $6, 1)
    `, [periodoId, ...vigencia])
  }

  await db.execute(`
    UPDATE configuracion_inicial
    SET periodo_activo_id = $1, actualizado_en = CURRENT_TIMESTAMP
    WHERE id = 1
  `, [periodoId])

  return periodoId
}
