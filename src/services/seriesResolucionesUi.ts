import {
  SERIES_RESOLUCION,
  asegurarSeriesResoluciones,
  obtenerSerieBorrador,
  obtenerSerieResolucionActual,
  seleccionarSerieResolucion,
  type SerieResolucion,
} from './seriesResoluciones'

let observador: MutationObserver | null = null
let confirmOriginal: typeof window.confirm | null = null
let serieActiva: SerieResolucion = '1530'
let sincronizando = false

function buscarCampo(etiqueta: string): HTMLLabelElement | null {
  const campos = Array.from(
    document.querySelectorAll<HTMLLabelElement>('.resolution-form label.field'),
  )

  return campos.find(campo =>
    campo.querySelector(':scope > span')?.textContent?.trim() === etiqueta,
  ) ?? null
}

function obtenerContextoFormulario(): {
  personaId: number | null
  hojaVidaId: number | null
  fechaDocumento: string | null
} {
  const persona = buscarCampo('Persona')?.querySelector('select') as HTMLSelectElement | null
  const hojaVida = buscarCampo('Hoja de Vida abierta')?.querySelector('select') as HTMLSelectElement | null

  const fecha = Array.from(document.querySelectorAll<HTMLLabelElement>('.resolution-form label.field'))
    .find(campo => campo.querySelector(':scope > span')?.textContent?.trim() === 'Fecha')
    ?.querySelector('input[type="date"]') as HTMLInputElement | null

  return {
    personaId: persona?.value ? Number(persona.value) : null,
    hojaVidaId: hojaVida?.value ? Number(hojaVida.value) : null,
    fechaDocumento: fecha?.value || null,
  }
}

function actualizarTextosSerie(): void {
  const layout = document.querySelector('.resolution-layout')
  const root = layout?.closest('.app-layout, .hv-module-host, section, main') ?? document.body

  root.querySelectorAll<HTMLElement>('small, p, span').forEach(elemento => {
    if (elemento.children.length > 0) return
    const texto = elemento.textContent ?? ''
    if (!texto.includes('1530/N') && !texto.includes('6060/N')) return
    elemento.textContent = texto.replace(/(?:1530|6060)\/N/g, `${serieActiva}/N`)
  })
}

async function resolverSerieFormulario(): Promise<SerieResolucion> {
  const contexto = obtenerContextoFormulario()

  if (contexto.personaId && contexto.hojaVidaId) {
    const borrador = await obtenerSerieBorrador(
      contexto.personaId,
      contexto.hojaVidaId,
      contexto.fechaDocumento,
    )

    if (borrador) return borrador
  }

  return obtenerSerieResolucionActual()
}

function crearCampoSerie(): HTMLLabelElement {
  const label = document.createElement('label')
  label.className = 'field hv-resolution-series-field'
  label.dataset.resolutionSeries = 'true'

  const titulo = document.createElement('span')
  titulo.textContent = 'Serie / numeración'

  const select = document.createElement('select')
  select.setAttribute('aria-label', 'Serie de resolución')

  for (const serie of SERIES_RESOLUCION) {
    const option = document.createElement('option')
    option.value = serie.value
    option.textContent = serie.label
    select.appendChild(option)
  }

  select.value = serieActiva
  select.addEventListener('change', async () => {
    const valor = select.value as SerieResolucion
    if (valor !== '1530' && valor !== '6060') return

    serieActiva = valor

    try {
      await seleccionarSerieResolucion(valor, obtenerContextoFormulario())
      actualizarTextosSerie()
    } catch (error) {
      console.error('No fue posible cambiar la serie de resolución:', error)
      select.value = serieActiva
    }
  })

  const ayuda = document.createElement('small')
  ayuda.className = 'hv-resolution-series-help'
  ayuda.textContent = 'El correlativo se administra de forma independiente para cada serie.'

  label.append(titulo, select, ayuda)
  return label
}

async function sincronizarSelector(): Promise<void> {
  if (sincronizando) return
  sincronizando = true

  try {
    const formulario = document.querySelector<HTMLElement>('.resolution-form')
    const existente = document.querySelector<HTMLLabelElement>('[data-resolution-series="true"]')

    if (!formulario) {
      existente?.remove()
      return
    }

    await asegurarSeriesResoluciones()
    serieActiva = await resolverSerieFormulario()

    if (!existente?.isConnected) {
      const campoTipo = buscarCampo('Tipo')
      const campo = crearCampoSerie()

      if (campoTipo?.parentElement) {
        campoTipo.insertAdjacentElement('afterend', campo)
      } else {
        formulario.prepend(campo)
      }
    } else {
      const select = existente.querySelector('select')
      if (select) select.value = serieActiva
    }

    actualizarTextosSerie()
  } catch (error) {
    console.error('No fue posible inicializar las series de resolución:', error)
  } finally {
    sincronizando = false
  }
}

function habilitarConfirmacionPorSerie(): void {
  if (confirmOriginal) return
  confirmOriginal = window.confirm.bind(window)

  window.confirm = (mensaje?: string): boolean => {
    if (
      typeof mensaje === 'string'
      && document.querySelector('.resolution-form')
      && /(?:1530|6060)\/N/.test(mensaje)
    ) {
      return confirmOriginal!(
        mensaje.replace(/(?:1530|6060)\/N/g, `${serieActiva}/N`),
      )
    }

    return confirmOriginal!(mensaje)
  }
}

export async function habilitarSeriesResoluciones(): Promise<void> {
  if (observador) return

  await asegurarSeriesResoluciones()
  habilitarConfirmacionPorSerie()
  await sincronizarSelector()

  observador = new MutationObserver(() => {
    void sincronizarSelector()
  })

  observador.observe(document.body, {
    childList: true,
    subtree: true,
  })

  document.addEventListener('change', evento => {
    const objetivo = evento.target as HTMLElement | null
    if (!objetivo?.closest('.resolution-form')) return

    window.setTimeout(() => {
      void sincronizarSelector()
    }, 0)
  })
}
