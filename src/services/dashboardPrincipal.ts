import {
  obtenerBaseDatos,
} from './database'

import type {
  DashboardAlerta,
  DashboardAnotacionesPeriodo,
  DashboardDistribucionCategoria,
  DashboardExpedienteReciente,
  DashboardHito,
  DashboardInstrumentoEstado,
  DashboardPendiente,
  DashboardPrincipal,
  DashboardResumenPeriodo,
} from '../types/dashboardPrincipal'

async function intentarSelect<T>(
  sql: string,
  parametros: unknown[] = [],
): Promise<T[]> {
  try {
    const db = await obtenerBaseDatos()

    return await db.select<T[]>(
      sql,
      parametros,
    )
  } catch (error) {
    console.warn(
      'Dashboard: consulta omitida',
      {
        sql,
        error,
      },
    )

    return []
  }
}

function normalizarNumero(
  valor: unknown,
): number {
  const numero =
    typeof valor === 'number'
      ? valor
      : Number(valor ?? 0)

  if (!Number.isFinite(numero)) {
    return 0
  }

  return numero
}

function porcentaje(
  completados: number,
  total: number,
): number {
  if (total <= 0) {
    return 0
  }

  return Math.round(
    Math.min(100, (completados / total) * 100),
  )
}

function estadoInstrumento(
  porcentajeAvance: number,
): 'Completo' | 'En proceso' | 'Pendiente' {
  if (porcentajeAvance >= 100) {
    return 'Completo'
  }

  if (porcentajeAvance >= 65) {
    return 'En proceso'
  }

  return 'Pendiente'
}

function textoPeriodo(
  periodo: {
    periodo_nombre: string | null
    periodo_anio: number | null
    fecha_inicio: string | null
    fecha_termino: string | null
  } | undefined,
): {
  nombre: string
  actual: string
} {
  if (!periodo) {
    return {
      nombre: 'período activo',
      actual: 'Sin período activo',
    }
  }

  if (periodo.periodo_nombre) {
    return {
      nombre: periodo.periodo_nombre,
      actual: periodo.periodo_nombre,
    }
  }

  if (periodo.periodo_anio) {
    return {
      nombre: `período de calificaciones ${periodo.periodo_anio}`,
      actual: `Período ${periodo.periodo_anio}`,
    }
  }

  if (
    periodo.fecha_inicio &&
    periodo.fecha_termino
  ) {
    return {
      nombre: `período de calificaciones ${periodo.fecha_inicio.slice(0, 4)}–${periodo.fecha_termino.slice(0, 4)}`,
      actual: `${periodo.fecha_inicio.slice(0, 4)}–${periodo.fecha_termino.slice(0, 4)}`,
    }
  }

  return {
    nombre: 'período activo',
    actual: 'Sin período activo',
  }
}

function fechaCorta(
  fecha: string | null | undefined,
): string {
  if (!fecha) {
    return 'Sin fecha'
  }

  const partes =
    fecha
      .slice(0, 10)
      .split('-')

  if (partes.length !== 3) {
    return fecha
  }

  const meses = [
    'ene.',
    'feb.',
    'mar.',
    'abr.',
    'may.',
    'jun.',
    'jul.',
    'ago.',
    'sept.',
    'oct.',
    'nov.',
    'dic.',
  ]

  const anio = partes[0]
  const mes = meses[Number(partes[1]) - 1] ?? partes[1]
  const dia = String(Number(partes[2]))

  return `${dia} ${mes} ${anio}`
}

function fechaMasDias(
  fechaBase: string | null | undefined,
  dias: number,
): string {
  if (!fechaBase) {
    return 'Sin fecha'
  }

  const fecha =
    new Date(`${fechaBase.slice(0, 10)}T00:00:00`)

  if (Number.isNaN(fecha.getTime())) {
    return fechaCorta(fechaBase)
  }

  fecha.setDate(fecha.getDate() + dias)

  return fechaCorta(fecha.toISOString())
}

function formatearNombrePersona(
  fila: {
    grado_calidad_abreviatura?: string | null
    grado?: string | null
    nombres?: string | null
    apellido_paterno?: string | null
    apellido_materno?: string | null
    nombre_completo?: string | null
  },
): {
  persona: string
  grado: string
} {
  const grado =
    fila.grado_calidad_abreviatura ??
    fila.grado ??
    ''

  const nombre =
    fila.nombre_completo ??
    [
      fila.apellido_paterno,
      fila.apellido_materno,
      fila.nombres,
    ]
      .filter(Boolean)
      .join(' ')

  return {
    persona:
      nombre || 'Calificado sin nombre',
    grado:
      grado || 'Sin grado',
  }
}

async function contar(
  sql: string,
  parametros: unknown[] = [],
): Promise<number> {
  return normalizarNumero(
    (
      await intentarSelect<{ total: number }>(
        sql,
        parametros,
      )
    )[0]?.total,
  )
}

async function obtenerPeriodoBase() {
  return (
    await intentarSelect<{
      periodo_nombre: string | null
      periodo_anio: number | null
      fecha_inicio: string | null
      fecha_termino: string | null
    }>(
      `
        SELECT
          p.nombre AS periodo_nombre,
          p.anio AS periodo_anio,
          p.fecha_inicio,
          p.fecha_termino
        FROM configuracion c
        LEFT JOIN periodos p
          ON p.id = c.periodo_activo_id
        WHERE c.id = 1
        LIMIT 1
      `,
    )
  )[0]
}

async function obtenerResumenPeriodo(
  instrumentos: DashboardInstrumentoEstado[],
): Promise<DashboardResumenPeriodo> {
  const periodo =
    await obtenerPeriodoBase()

  const periodoTexto =
    textoPeriodo(periodo)

  const calificados =
    await contar(
      `
        SELECT COUNT(*) AS total
        FROM vw_hoja_vida_resumen
      `,
    )

  const expedientesActivos =
    (
      await contar(
        `
          SELECT COUNT(*) AS total
          FROM expedientes_calificacion
          WHERE estado IS NULL
             OR estado NOT IN ('cerrado', 'CERRADO', 'anulado', 'ANULADO')
        `,
      )
    ) ||
    (
      await contar(
        `
          SELECT COUNT(*) AS total
          FROM expedientes_calificacion
        `,
      )
    ) ||
    calificados

  const anotacionesPeriodo =
    (
      await contar(
        `
          SELECT COUNT(*) AS total
          FROM anotaciones
          WHERE estado = 'estampada'
        `,
      )
    ) ||
    (
      await contar(
        `
          SELECT COUNT(*) AS total
          FROM vw_anotaciones_hoja_vida
        `,
      )
    )

  const anotacionesPendientesEstampar =
    await contar(
      `
        SELECT COUNT(*) AS total
        FROM borradores_anotacion
        WHERE estado IN ('borrador', 'validado')
      `,
    )

  const resolucionesEmitidasDisponibles =
    await contar(
      `
        SELECT COUNT(*) AS total
        FROM resoluciones_documentales
        WHERE estado = 'EMITIDA'
          AND anotacion_id IS NULL
      `,
    )

  const instrumentosPendientes =
    (
      await contar(
        `
          SELECT COUNT(*) AS total
          FROM instrumentos_expediente
          WHERE estado IS NULL
             OR estado NOT IN ('completado', 'COMPLETADO', 'cerrado', 'CERRADO')
        `,
      )
    ) ||
    instrumentos
      .reduce(
        (total, item) =>
          total + Math.max(0, item.total - item.completados),
        0,
      )

  const totalInstrumentos =
    instrumentos.reduce(
      (total, item) => total + item.total,
      0,
    )

  const instrumentosCompletados =
    instrumentos.reduce(
      (total, item) => total + item.completados,
      0,
    )

  const instrumentosCompletadosPorcentaje =
    porcentaje(
      instrumentosCompletados,
      totalInstrumentos,
    )

  const hc2 =
    instrumentos.find(
      item => item.instrumento === 'HC2',
    )

  const evint =
    instrumentos.find(
      item => item.instrumento === 'EVINT',
    )

  return {
    periodoNombre: periodoTexto.nombre,
    periodoActual: periodoTexto.actual,
    calificados,
    expedientesActivos,
    anotacionesPeriodo,
    instrumentosPendientes,
    anotacionesPendientesEstampar,
    resolucionesEmitidasDisponibles,
    instrumentosCompletadosPorcentaje,
    instrumentosCompletados,
    totalInstrumentos,
    hc2Pendientes:
      hc2
        ? Math.max(0, hc2.total - hc2.completados)
        : 0,
    evintPendientes:
      evint
        ? Math.max(0, evint.total - evint.completados)
        : 0,
  }
}

async function obtenerPerfilCalificador() {
  const filas =
    await intentarSelect<{
      grado_calificador_directo: string | null
      nombre_calificador_directo: string | null
      cargo_calificador_directo: string | null
    }>(
      `
        SELECT
          grado_calificador_directo,
          nombre_calificador_directo,
          cargo_calificador_directo
        FROM configuracion
        WHERE id = 1
        LIMIT 1
      `,
    )

  const fila = filas[0]

  if (
    fila?.nombre_calificador_directo ||
    fila?.grado_calificador_directo
  ) {
    return {
      nombre:
        [
          fila.grado_calificador_directo,
          fila.nombre_calificador_directo,
        ]
          .filter(Boolean)
          .join(' '),
      cargo:
        fila.cargo_calificador_directo ??
        'Calificador directo',
      estado: 'Activo',
    }
  }

  return {
    nombre: 'Calificador',
    cargo: 'Usuario activo',
    estado: 'Activo',
  }
}

function prioridadPorInstrumento(
  instrumento: string,
): 'Alta' | 'Media' | 'Baja' {
  const normalizado =
    instrumento
      .trim()
      .toUpperCase()

  if (
    normalizado.includes('HAPSEM') ||
    normalizado.includes('EVINT')
  ) {
    return 'Alta'
  }

  if (
    normalizado.includes('HAM') ||
    normalizado.includes('HC2')
  ) {
    return 'Media'
  }

  return 'Baja'
}

async function listarPendientes():
Promise<DashboardPendiente[]> {
  const filasInstrumentos =
    await intentarSelect<{
      expediente_id: number
      hoja_vida_id: number | null
      tipo_instrumento: string | null
      vence_el: string | null
      grado_calidad_abreviatura: string | null
      nombres: string | null
      apellido_paterno: string | null
      apellido_materno: string | null
      nombre_completo: string | null
    }>(
      `
        SELECT
          ie.expediente_id,
          hv.id AS hoja_vida_id,
          ie.tipo_instrumento,
          ie.fecha_vencimiento AS vence_el,
          r.grado_calidad_abreviatura,
          r.nombres,
          r.apellido_paterno,
          r.apellido_materno,
          r.nombre_completo
        FROM instrumentos_expediente ie
        INNER JOIN expedientes_calificacion ex
          ON ex.id = ie.expediente_id
        LEFT JOIN hojas_vida hv
          ON hv.persona_id = ex.persona_id
          AND hv.periodo_id = ex.periodo_id
          AND hv.categoria_id = ex.categoria_id
        LEFT JOIN vw_hoja_vida_resumen r
          ON r.hoja_vida_id = hv.id
        WHERE
          ie.estado IS NULL
          OR ie.estado NOT IN ('completado', 'COMPLETADO', 'cerrado', 'CERRADO')
        ORDER BY
          ie.fecha_vencimiento IS NULL,
          ie.fecha_vencimiento,
          ie.expediente_id
        LIMIT 6
      `,
    )

  if (filasInstrumentos.length > 0) {
    return filasInstrumentos.map(fila => {
      const persona =
        formatearNombrePersona(fila)

      const instrumento =
        fila.tipo_instrumento ?? 'Instrumento'

      return {
        expedienteId: fila.expediente_id,
        hojaVidaId: fila.hoja_vida_id,
        persona: persona.persona,
        grado: persona.grado,
        instrumento,
        prioridad:
          prioridadPorInstrumento(instrumento),
        venceEl: fila.vence_el,
      }
    })
  }

  const filasExpedientes =
    await intentarSelect<{
      expediente_id: number
      hoja_vida_id: number | null
      grado_calidad_abreviatura: string | null
      nombres: string | null
      apellido_paterno: string | null
      apellido_materno: string | null
      nombre_completo: string | null
    }>(
      `
        SELECT
          ex.id AS expediente_id,
          hv.id AS hoja_vida_id,
          r.grado_calidad_abreviatura,
          r.nombres,
          r.apellido_paterno,
          r.apellido_materno,
          r.nombre_completo
        FROM expedientes_calificacion ex
        LEFT JOIN hojas_vida hv
          ON hv.persona_id = ex.persona_id
          AND hv.periodo_id = ex.periodo_id
          AND hv.categoria_id = ex.categoria_id
        LEFT JOIN vw_hoja_vida_resumen r
          ON r.hoja_vida_id = hv.id
        ORDER BY ex.id DESC
        LIMIT 6
      `,
    )

  return filasExpedientes.map(fila => {
    const persona =
      formatearNombrePersona(fila)

    return {
      expedienteId: fila.expediente_id,
      hojaVidaId: fila.hoja_vida_id,
      persona: persona.persona,
      grado: persona.grado,
      instrumento: 'Hoja de Vida',
      prioridad: 'Baja',
      venceEl: null,
    }
  })
}

async function contarHojasVida(): Promise<number> {
  return await contar(
    `
      SELECT COUNT(*) AS total
      FROM vw_hoja_vida_resumen
    `,
  )
}

async function contarTablaPorHojaVida(
  tabla: string,
): Promise<number> {
  return await contar(
    `
      SELECT COUNT(*) AS total
      FROM ${tabla}
    `,
  )
}

async function contarEvintCompletadas(): Promise<number> {
  return (
    await contar(
      `
        SELECT COUNT(DISTINCT expediente_id) AS total
        FROM evaluaciones_evint
        WHERE estado IN ('COMPLETADA', 'CERRADA')
      `,
    )
  ) ||
  (
    await contar(
      `
        SELECT COUNT(*) AS total
        FROM evaluaciones_evint
      `,
    )
  )
}

async function contarInstrumentoPorTipo(
  tipo: string,
  completado: boolean,
): Promise<number> {
  const filtroEstado =
    completado
      ? `
          AND estado IN (
            'completado',
            'COMPLETADO',
            'cerrado',
            'CERRADO',
            'COMPLETADA',
            'CERRADA'
          )
        `
      : ''

  return await contar(
    `
      SELECT COUNT(*) AS total
      FROM instrumentos_expediente
      WHERE UPPER(tipo_instrumento) LIKE ?
      ${filtroEstado}
    `,
    [`%${tipo.toUpperCase()}%`],
  )
}

async function obtenerInstrumentos():
Promise<DashboardInstrumentoEstado[]> {
  const totalBase =
    await contarHojasVida()

  const totalInstrumentosExpediente =
    await contar(
      `
        SELECT COUNT(*) AS total
        FROM instrumentos_expediente
      `,
    )

  const hojaVidaCompletadas =
    totalBase

  const hc1Completadas =
    (
      await contarTablaPorHojaVida('hc1_documentos')
    ) ||
    (
      await contarInstrumentoPorTipo('HC1', true)
    )

  const evintCompletadas =
    await contarEvintCompletadas()

  const hc2Completadas =
    (
      await contarTablaPorHojaVida('hc2_calificaciones')
    ) ||
    (
      await contarInstrumentoPorTipo('HC2', true)
    )

  const hamCompletadas =
    (
      await contarTablaPorHojaVida('ham_documentos')
    ) ||
    (
      await contarInstrumentoPorTipo('HAM', true)
    )

  const hapsemCompletadas =
    (
      await contarTablaPorHojaVida('hapsem_documentos')
    ) ||
    (
      await contarInstrumentoPorTipo('HAPSEM', true)
    )

  const totalEvint =
    (
      await contarInstrumentoPorTipo('EVINT', false)
    ) ||
    totalBase

  const totalHc2 =
    (
      await contarInstrumentoPorTipo('HC2', false)
    ) ||
    totalBase

  const totalHam =
    (
      await contarInstrumentoPorTipo('HAM', false)
    ) ||
    totalBase

  const totalHapsem =
    (
      await contarInstrumentoPorTipo('HAPSEM', false)
    ) ||
    totalBase

  const instrumentos: Array<{
    instrumento: string
    completados: number
    total: number
  }> = [
    {
      instrumento: 'Hoja de Vida',
      completados: hojaVidaCompletadas,
      total: totalBase,
    },
    {
      instrumento: 'HC1',
      completados: hc1Completadas,
      total: totalBase,
    },
    {
      instrumento: 'EVINT',
      completados: evintCompletadas,
      total:
        totalInstrumentosExpediente > 0
          ? totalEvint
          : totalBase,
    },
    {
      instrumento: 'HC2',
      completados: hc2Completadas,
      total:
        totalInstrumentosExpediente > 0
          ? totalHc2
          : totalBase,
    },
    {
      instrumento: 'HAM',
      completados: hamCompletadas,
      total:
        totalInstrumentosExpediente > 0
          ? totalHam
          : totalBase,
    },
    {
      instrumento: 'HAPSEM',
      completados: hapsemCompletadas,
      total:
        totalInstrumentosExpediente > 0
          ? totalHapsem
          : totalBase,
    },
  ]

  return instrumentos.map(item => {
    const avance =
      porcentaje(
        item.completados,
        item.total,
      )

    return {
      ...item,
      porcentaje: avance,
      estado: estadoInstrumento(avance),
    }
  })
}

async function obtenerDistribucionCategorias(
  totalExpedientes: number,
): Promise<DashboardDistribucionCategoria[]> {
  const filas =
    await intentarSelect<{
      categoria: string | null
      total: number
    }>(
      `
        SELECT
          COALESCE(categoria_nombre, 'Sin categoría') AS categoria,
          COUNT(*) AS total
        FROM vw_hoja_vida_resumen
        GROUP BY categoria_nombre
        ORDER BY total DESC, categoria_nombre
      `,
    )

  return filas.map(fila => {
    const total =
      normalizarNumero(fila.total)

    return {
      categoria:
        fila.categoria ?? 'Sin categoría',
      total,
      porcentaje:
        porcentaje(total, totalExpedientes),
    }
  })
}

async function obtenerAnotacionesPeriodo():
Promise<DashboardAnotacionesPeriodo> {
  const filas =
    await intentarSelect<{
      tipo_efecto_codigo: string | null
      total: number
    }>(
      `
        SELECT
          tipo_efecto_codigo,
          COUNT(*) AS total
        FROM vw_anotaciones_hoja_vida
        GROUP BY tipo_efecto_codigo
      `,
    )

  let merito = 0
  let demerito = 0
  let otras = 0

  for (const fila of filas) {
    const total =
      normalizarNumero(fila.total)

    if (fila.tipo_efecto_codigo === 'MERITO') {
      merito += total
    } else if (fila.tipo_efecto_codigo === 'DEMERITO') {
      demerito += total
    } else {
      otras += total
    }
  }

  return {
    merito,
    demerito,
    otras,
    total: merito + demerito + otras,
  }
}

function estadoExpediente(
  fila: {
    total_borradores: number | null
    total_anotaciones: number | null
  },
): {
  texto: string
  tipo: 'success' | 'info' | 'warning' | 'danger' | 'neutral'
  accion: string
} {
  const borradores =
    normalizarNumero(fila.total_borradores)

  const anotaciones =
    normalizarNumero(fila.total_anotaciones)

  if (borradores > 0) {
    return {
      texto: 'Anotación pendiente',
      tipo: 'warning',
      accion: 'Revisar borrador',
    }
  }

  if (anotaciones > 0) {
    return {
      texto: 'En proceso',
      tipo: 'info',
      accion: 'Abrir expediente',
    }
  }

  return {
    texto: 'Sin movimientos',
    tipo: 'neutral',
    accion: 'Iniciar revisión',
  }
}

async function obtenerExpedientesRecientes():
Promise<DashboardExpedienteReciente[]> {
  const filas =
    await intentarSelect<{
      expediente_id: number | null
      hoja_vida_id: number | null
      grado_calidad_abreviatura: string | null
      nombres: string | null
      apellido_paterno: string | null
      apellido_materno: string | null
      categoria_nombre: string | null
      total_anotaciones: number | null
      total_borradores: number | null
    }>(
      `
        SELECT
          ex.id AS expediente_id,
          r.hoja_vida_id,
          r.grado_calidad_abreviatura,
          r.nombres,
          r.apellido_paterno,
          r.apellido_materno,
          r.categoria_nombre,
          r.total_anotaciones,
          r.total_borradores
        FROM vw_hoja_vida_resumen r
        LEFT JOIN expedientes_calificacion ex
          ON ex.persona_id = r.persona_id
          AND ex.periodo_id = r.periodo_id
          AND ex.categoria_id = r.categoria_id
        ORDER BY
          COALESCE(ex.id, r.hoja_vida_id) DESC
        LIMIT 5
      `,
    )

  return filas.map(fila => {
    const persona =
      formatearNombrePersona(fila)

    const estado =
      estadoExpediente(fila)

    return {
      expedienteId:
        fila.expediente_id ??
        fila.hoja_vida_id ??
        0,
      hojaVidaId:
        fila.hoja_vida_id,
      calificado:
        persona.persona,
      grado:
        persona.grado,
      categoria:
        fila.categoria_nombre ?? 'Sin categoría',
      estadoGeneral:
        estado.texto,
      estadoTipo:
        estado.tipo,
      proximaAccion:
        estado.accion,
    }
  })
}

function obtenerAlertas(
  resumen: DashboardResumenPeriodo,
): DashboardAlerta[] {
  const alertas: DashboardAlerta[] = []

  if (resumen.hc2Pendientes > 0) {
    alertas.push({
      id: 'hc2-pendientes',
      tipo: 'danger',
      titulo: `${resumen.hc2Pendientes} expediente(s) con HC2 pendiente`,
      total: resumen.hc2Pendientes,
      accion: 'Abrir',
    })
  }

  if (resumen.resolucionesEmitidasDisponibles > 0) {
    alertas.push({
      id: 'resoluciones-disponibles',
      tipo: 'warning',
      titulo: `${resumen.resolucionesEmitidasDisponibles} resolución(es) emitida(s) aún no vinculada(s) a anotaciones`,
      total: resumen.resolucionesEmitidasDisponibles,
      accion: 'Abrir',
    })
  }

  if (resumen.evintPendientes > 0) {
    alertas.push({
      id: 'evint-pendientes',
      tipo: 'warning',
      titulo: `${resumen.evintPendientes} EVINT con revisión pendiente`,
      total: resumen.evintPendientes,
      accion: 'Abrir',
    })
  }

  if (resumen.anotacionesPendientesEstampar > 0) {
    alertas.push({
      id: 'anotaciones-pendientes',
      tipo: 'info',
      titulo: `${resumen.anotacionesPendientesEstampar} anotación(es) pendiente(s) de estampar`,
      total: resumen.anotacionesPendientesEstampar,
      accion: 'Abrir',
    })
  }

  if (alertas.length === 0) {
    alertas.push({
      id: 'sin-alertas',
      tipo: 'info',
      titulo: 'No existen alertas críticas para el período activo',
      total: 0,
      accion: 'Ver',
    })
  }

  return alertas.slice(0, 4)
}

async function obtenerHitos():
Promise<DashboardHito[]> {
  const periodo =
    await obtenerPeriodoBase()

  return [
    {
      titulo: 'Cierre de ingreso de instrumentos',
      fecha:
        fechaMasDias(periodo?.fecha_termino, -60),
    },
    {
      titulo: 'Plazo límite estampar anotaciones',
      fecha:
        fechaMasDias(periodo?.fecha_termino, -30),
    },
    {
      titulo: 'Emisión de resoluciones',
      fecha:
        fechaMasDias(periodo?.fecha_termino, -15),
    },
    {
      titulo: 'Cierre del período de calificaciones',
      fecha:
        fechaCorta(periodo?.fecha_termino),
    },
  ]
}

export async function obtenerDashboardPrincipal():
Promise<DashboardPrincipal> {
  const [
    instrumentos,
    calificador,
    pendientes,
    expedientesRecientes,
    anotaciones,
    hitos,
  ] = await Promise.all([
    obtenerInstrumentos(),
    obtenerPerfilCalificador(),
    listarPendientes(),
    obtenerExpedientesRecientes(),
    obtenerAnotacionesPeriodo(),
    obtenerHitos(),
  ])

  const resumen =
    await obtenerResumenPeriodo(instrumentos)

  const distribucionCategorias =
    await obtenerDistribucionCategorias(
      resumen.expedientesActivos,
    )

  return {
    resumen,
    calificador,
    pendientes,
    instrumentos,
    alertas: obtenerAlertas(resumen),
    expedientesRecientes,
    distribucionCategorias,
    anotaciones,
    hitos,
  }
}
