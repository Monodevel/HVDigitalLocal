import type {
  DesignacionPeriodoActivo,
  DesignarPersonaRequest,
  NuevaPersonaCalificadaRequest,
  PersonaDisponible,
  ResultadoDesignacion,
} from '../types/designaciones'

import { obtenerBaseDatos } from './database'

interface ResolucionPersona {
  persona_id: number
  grado_id: number | null
  calidad_personal_id: number | null
  categoria_id: number
  vigencia_periodo_id: number
  fecha_inicio: string
  fecha_termino: string
  periodo_id: number
  calificador_directo_id: number
}

function obligatorio(valor: string, etiqueta: string): string {
  const limpio = valor.trim()
  if (!limpio) throw new Error(`Debe completar ${etiqueta}.`)
  return limpio
}

function nombreCompleto(
  nombres: string,
  apellidoPaterno: string,
  apellidoMaterno: string | null,
): string {
  return [apellidoPaterno, apellidoMaterno, nombres]
    .filter(Boolean)
    .join(' ')
    .trim()
}

export async function listarPersonasDisponibles(): Promise<PersonaDisponible[]> {
  const db = await obtenerBaseDatos()

  const filas = await db.select<Array<{
    id: number
    run: string
    nombres: string
    apellido_paterno: string
    apellido_materno: string | null
    grado_id: number | null
    calidad_personal_id: number | null
  }>>(`
    SELECT
      p.id, p.run, p.nombres, p.apellido_paterno,
      p.apellido_materno, p.grado_id, p.calidad_personal_id
    FROM personas p
    WHERE p.activo = 1
      AND NOT EXISTS (
        SELECT 1
        FROM designaciones_calificacion d
        INNER JOIN configuracion_inicial ci
          ON ci.periodo_activo_id = d.periodo_id AND ci.id = 1
        WHERE d.persona_id = p.id AND d.estado <> 'ANULADA'
      )
    ORDER BY p.apellido_paterno, p.apellido_materno, p.nombres
  `)

  return filas.map(fila => {
    const completo = nombreCompleto(
      fila.nombres,
      fila.apellido_paterno,
      fila.apellido_materno,
    )

    return {
      ...fila,
      nombre_completo: completo,
      etiqueta: `${completo} · ${fila.run}`,
    }
  })
}

export async function crearPersonaCalificada(
  solicitud: NuevaPersonaCalificadaRequest,
): Promise<number> {
  const run = obligatorio(solicitud.run, 'el RUN')
  const nombres = obligatorio(solicitud.nombres, 'los nombres')
  const apellidoPaterno = obligatorio(
    solicitud.apellidoPaterno,
    'el apellido paterno',
  )

  if (solicitud.tipoVinculo === 'GRADO' && !solicitud.gradoId) {
    throw new Error('Debe seleccionar el grado.')
  }

  if (
    solicitud.tipoVinculo === 'CALIDAD' &&
    !solicitud.calidadPersonalId
  ) {
    throw new Error('Debe seleccionar la calidad de personal.')
  }

  const db = await obtenerBaseDatos()

  const existente = await db.select<Array<{ id: number }>>(
    'SELECT id FROM personas WHERE run = $1 LIMIT 1',
    [run],
  )

  if (existente.length > 0) {
    throw new Error('Ya existe una persona registrada con ese RUN.')
  }

  const resultado = await db.execute(`
    INSERT INTO personas (
      run, nombres, apellido_paterno, apellido_materno,
      grado_id, calidad_personal_id, activo
    ) VALUES ($1, $2, $3, $4, $5, $6, 1)
  `, [
    run,
    nombres,
    apellidoPaterno,
    solicitud.apellidoMaterno?.trim() || null,
    solicitud.tipoVinculo === 'GRADO' ? solicitud.gradoId : null,
    solicitud.tipoVinculo === 'CALIDAD'
      ? solicitud.calidadPersonalId
      : null,
  ])

  if (resultado.lastInsertId === undefined) {
    throw new Error('No fue posible obtener la persona creada.')
  }

  return Number(resultado.lastInsertId)
}

async function resolverPersona(personaId: number): Promise<ResolucionPersona> {
  const db = await obtenerBaseDatos()

  const filas = await db.select<Array<{
    persona_id: number
    grado_id: number | null
    calidad_personal_id: number | null
    categoria_id: number | null
    categoria_codigo: string | null
    periodo_id: number | null
    calificador_directo_id: number | null
  }>>(`
    SELECT
      p.id AS persona_id,
      p.grado_id,
      p.calidad_personal_id,
      COALESCE(g.categoria_id, cp.categoria_id) AS categoria_id,
      c.codigo AS categoria_codigo,
      ci.periodo_activo_id AS periodo_id,
      ci.calificador_directo_id
    FROM personas p
    LEFT JOIN grados g ON g.id = p.grado_id
    LEFT JOIN calidades_personal cp ON cp.id = p.calidad_personal_id
    LEFT JOIN categorias_personal c
      ON c.id = COALESCE(g.categoria_id, cp.categoria_id)
    CROSS JOIN configuracion_inicial ci
    WHERE p.id = $1 AND p.activo = 1 AND ci.id = 1
    LIMIT 1
  `, [personaId])

  const persona = filas[0]
  if (!persona) throw new Error('La persona seleccionada no existe.')
  if (!persona.periodo_id) throw new Error('No existe un período activo.')
  if (!persona.calificador_directo_id) {
    throw new Error('No existe un calificador directo configurado.')
  }
  if (!persona.categoria_id || !persona.categoria_codigo) {
    throw new Error('No fue posible determinar la categoría de la persona.')
  }

  const codigoCategoria = persona.categoria_codigo.toUpperCase()
  const codigoRegimen = persona.calidad_personal_id !== null
    ? 'PERSONAL_CIVIL'
    : codigoCategoria.includes('OFICIAL')
      ? 'OFICIALES'
      : 'CP_TROPA_JORNAL'

  const vigencias = await db.select<Array<{
    id: number
    fecha_inicio: string
    fecha_termino: string
  }>>(`
    SELECT id, fecha_inicio, fecha_termino
    FROM vigencias_periodo
    WHERE periodo_id = $1
      AND codigo_regimen = $2
      AND activo = 1
    LIMIT 1
  `, [persona.periodo_id, codigoRegimen])

  const vigencia = vigencias[0]
  if (!vigencia) {
    throw new Error(`No existe una vigencia para ${codigoRegimen}.`)
  }

  return {
    persona_id: persona.persona_id,
    grado_id: persona.grado_id,
    calidad_personal_id: persona.calidad_personal_id,
    categoria_id: persona.categoria_id,
    vigencia_periodo_id: vigencia.id,
    fecha_inicio: vigencia.fecha_inicio,
    fecha_termino: vigencia.fecha_termino,
    periodo_id: persona.periodo_id,
    calificador_directo_id: persona.calificador_directo_id,
  }
}

export async function designarPersona(
  solicitud: DesignarPersonaRequest,
): Promise<ResultadoDesignacion> {
  if (!Number.isInteger(solicitud.personaId) || solicitud.personaId <= 0) {
    throw new Error('Debe seleccionar una persona.')
  }

  const unidadNombre = obligatorio(
    solicitud.unidadNombre,
    'la unidad de la persona',
  )
  const puesto = obligatorio(solicitud.puesto, 'el puesto o función')
  const persona = await resolverPersona(solicitud.personaId)
  const db = await obtenerBaseDatos()

  await db.execute(`
    INSERT INTO designaciones_calificacion (
      persona_id, periodo_id, calificador_directo_id,
      vigencia_periodo_id, categoria_id, grado_id_inicio,
      calidad_personal_id_inicio, unidad_nombre, puesto,
      fecha_inicio, fecha_termino, estado
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'ACTIVA')
    ON CONFLICT(persona_id, periodo_id) DO UPDATE SET
      calificador_directo_id = excluded.calificador_directo_id,
      vigencia_periodo_id = excluded.vigencia_periodo_id,
      categoria_id = excluded.categoria_id,
      grado_id_inicio = excluded.grado_id_inicio,
      calidad_personal_id_inicio = excluded.calidad_personal_id_inicio,
      unidad_nombre = excluded.unidad_nombre,
      puesto = excluded.puesto,
      fecha_inicio = excluded.fecha_inicio,
      fecha_termino = excluded.fecha_termino,
      estado = 'ACTIVA',
      actualizada_en = CURRENT_TIMESTAMP
  `, [
    persona.persona_id,
    persona.periodo_id,
    persona.calificador_directo_id,
    persona.vigencia_periodo_id,
    persona.categoria_id,
    persona.grado_id,
    persona.calidad_personal_id,
    unidadNombre,
    puesto,
    persona.fecha_inicio,
    persona.fecha_termino,
  ])

  const designaciones = await db.select<Array<{ id: number }>>(`
    SELECT id FROM designaciones_calificacion
    WHERE persona_id = $1 AND periodo_id = $2 LIMIT 1
  `, [persona.persona_id, persona.periodo_id])
  const designacionId = designaciones[0]?.id
  if (!designacionId) throw new Error('No fue posible obtener la designación.')

  await db.execute(`
    INSERT INTO expedientes_calificacion (
      designacion_id, persona_id, periodo_id, categoria_id, estado
    ) VALUES ($1,$2,$3,$4,'ABIERTO')
    ON CONFLICT(designacion_id) DO UPDATE SET
      persona_id = excluded.persona_id,
      periodo_id = excluded.periodo_id,
      categoria_id = excluded.categoria_id,
      actualizado_en = CURRENT_TIMESTAMP
  `, [
    designacionId,
    persona.persona_id,
    persona.periodo_id,
    persona.categoria_id,
  ])

  const expedientes = await db.select<Array<{ id: number }>>(
    'SELECT id FROM expedientes_calificacion WHERE designacion_id = $1 LIMIT 1',
    [designacionId],
  )
  const expedienteId = expedientes[0]?.id
  if (!expedienteId) throw new Error('No fue posible obtener el expediente.')

  const instrumentos = [
    ['HOJA_VIDA', 1],
    ['HC1', 1],
    ['HC2', 1],
    ['EVINT', 1],
    ['EVINT', 2],
    ['HAM', 1],
    ['HAPSEM', 1],
  ] as const

  for (const [tipo, numero] of instrumentos) {
    await db.execute(`
      INSERT INTO instrumentos_expediente (
        expediente_id, tipo_instrumento, numero,
        aplica, estado, version_formato
      ) VALUES ($1,$2,$3,1,'NO_INICIADO','1.0')
      ON CONFLICT(expediente_id, tipo_instrumento, numero) DO NOTHING
    `, [expedienteId, tipo, numero])
  }

  await db.execute(`
    INSERT INTO hojas_vida (
      persona_id, periodo_id, categoria_id,
      grado_id_inicio, calidad_personal_id_inicio,
      fecha_inicio, fecha_termino, estado
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'abierta')
    ON CONFLICT(persona_id, periodo_id) DO UPDATE SET
      categoria_id = excluded.categoria_id,
      grado_id_inicio = excluded.grado_id_inicio,
      calidad_personal_id_inicio = excluded.calidad_personal_id_inicio,
      fecha_inicio = excluded.fecha_inicio,
      fecha_termino = excluded.fecha_termino,
      estado = 'abierta'
  `, [
    persona.persona_id,
    persona.periodo_id,
    persona.categoria_id,
    persona.grado_id,
    persona.calidad_personal_id,
    persona.fecha_inicio,
    persona.fecha_termino,
  ])

  const hojas = await db.select<Array<{ id: number }>>(`
    SELECT id FROM hojas_vida
    WHERE persona_id = $1 AND periodo_id = $2 LIMIT 1
  `, [persona.persona_id, persona.periodo_id])
  const hojaVidaId = hojas[0]?.id
  if (!hojaVidaId) throw new Error('No fue posible obtener la Hoja de Vida.')

  const instHv = await db.select<Array<{ id: number }>>(`
    SELECT id FROM instrumentos_expediente
    WHERE expediente_id = $1
      AND tipo_instrumento = 'HOJA_VIDA'
      AND numero = 1
    LIMIT 1
  `, [expedienteId])
  const instrumentoHojaVidaId = instHv[0]?.id
  if (!instrumentoHojaVidaId) {
    throw new Error('No fue posible obtener el instrumento Hoja de Vida.')
  }

  await db.execute(`
    INSERT INTO expediente_hojas_vida (
      expediente_id, hoja_vida_id, instrumento_id
    ) VALUES ($1,$2,$3)
    ON CONFLICT(expediente_id) DO UPDATE SET
      hoja_vida_id = excluded.hoja_vida_id,
      instrumento_id = excluded.instrumento_id
  `, [expedienteId, hojaVidaId, instrumentoHojaVidaId])

  await db.execute(`
    UPDATE instrumentos_expediente
    SET estado = 'EN_ELABORACION',
        fecha_apertura = COALESCE(fecha_apertura, CURRENT_DATE),
        actualizado_en = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [instrumentoHojaVidaId])

  await db.execute(`
    UPDATE configuracion_inicial
    SET estado = 'OPERATIVA',
        paso_actual = 5,
        completada_en = COALESCE(completada_en, CURRENT_TIMESTAMP),
        actualizado_en = CURRENT_TIMESTAMP
    WHERE id = 1
  `)

  const total = await db.select<Array<{ total: number }>>(
    'SELECT COUNT(*) AS total FROM instrumentos_expediente WHERE expediente_id = $1',
    [expedienteId],
  )

  return {
    designacionId,
    expedienteId,
    hojaVidaId,
    instrumentoHojaVidaId,
    instrumentosCreados: total[0]?.total ?? 0,
  }
}

export async function listarDesignacionesPeriodoActivo(): Promise<DesignacionPeriodoActivo[]> {
  const db = await obtenerBaseDatos()
  const filas = await db.select<DesignacionPeriodoActivo[]>(`
    SELECT * FROM vw_designaciones_periodo_activo
    ORDER BY apellido_paterno, apellido_materno, nombres
  `)

  return filas.map(fila => ({
    ...fila,
    nombre_completo: nombreCompleto(
      fila.nombres,
      fila.apellido_paterno,
      fila.apellido_materno,
    ),
  }))
}
