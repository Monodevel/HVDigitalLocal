import { createApp, type App as VueApp } from 'vue'

import GestionPeriodos from '../components/periodos/GestionPeriodos.vue'
import { asegurarReglasPeriodos } from './periodosGestion'

let appPeriodos: VueApp<Element> | null = null
let hostPeriodos: HTMLElement | null = null
let observador: MutationObserver | null = null

function montarGestion(): void {
  const pagina = document.querySelector<HTMLElement>('.hv-selection-page')
  const lista = pagina?.querySelector<HTMLElement>('.hv-period-list')

  if (!pagina || !lista) {
    appPeriodos?.unmount()
    appPeriodos = null
    hostPeriodos = null
    return
  }

  if (hostPeriodos?.isConnected) return

  const host = document.createElement('div')
  host.className = 'hv-period-management-host'
  lista.before(host)
  appPeriodos = createApp(GestionPeriodos)
  appPeriodos.mount(host)
  hostPeriodos = host
}

function esAccionEscritura(elemento: HTMLElement): boolean {
  const texto = (elemento.textContent ?? '').trim().toLocaleLowerCase('es')
  const titulo = (elemento.getAttribute('title') ?? '').trim().toLocaleLowerCase('es')
  const contenido = `${texto} ${titulo}`
  return [
    'guardar', 'nuevo', 'nueva', 'agregar', 'editar', 'eliminar', 'borrar',
    'emitir', 'aprobar', 'modificar', 'crear resolución', 'estampar', 'cerrar hoja',
  ].some(palabra => contenido.includes(palabra))
}

function aplicarSoloLectura(): void {
  const etiqueta = Array.from(document.querySelectorAll<HTMLElement>('.p-tag, .hv-topbar'))
    .some(elemento => (elemento.textContent ?? '').toLocaleLowerCase('es').includes('solo lectura'))

  document.documentElement.classList.toggle('hv-readonly-period', etiqueta)
  if (!etiqueta) return

  document.querySelectorAll<HTMLElement>('button, input, textarea, select, [contenteditable="true"]').forEach(elemento => {
    if (elemento.closest('.hv-sidebar') || elemento.closest('.hv-topbar')) {
      if (!esAccionEscritura(elemento)) return
    }

    if (elemento.matches('input[type="search"]') || elemento.closest('.hv-search-control')) return
    if (elemento.tagName === 'BUTTON' && !esAccionEscritura(elemento)) return

    if (esAccionEscritura(elemento) || ['INPUT', 'TEXTAREA', 'SELECT'].includes(elemento.tagName)) {
      ;(elemento as HTMLButtonElement | HTMLInputElement).disabled = true
      elemento.setAttribute('aria-disabled', 'true')
    }
  })
}

function actualizar(): void {
  montarGestion()
  aplicarSoloLectura()
}

export async function habilitarGestionPeriodos(): Promise<void> {
  try {
    await asegurarReglasPeriodos()
  } catch (error) {
    console.error('No fue posible asegurar las reglas de períodos.', error)
  }

  if (observador) return
  actualizar()
  observador = new MutationObserver(actualizar)
  observador.observe(document.body, { childList: true, subtree: true, characterData: true })

  window.addEventListener('hvdigital-periodos-actualizados', () => {
    window.setTimeout(() => globalThis.location.reload(), 500)
  })
}
