import { createApp, h, type App as VueApp } from 'vue'
import NotasTareasPanel from '../components/notas/NotasTareasPanel.vue'

let aplicacionPanel: VueApp<Element> | null = null
let contenedorPanel: HTMLElement | null = null
let observador: MutationObserver | null = null
let sincronizando = false
let tituloAnterior = ''
let subtituloAnterior = ''

function botonNotas(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('[data-notas-tareas="true"]')
}

function actualizarContextoVisual(abierto: boolean): void {
  botonNotas()?.classList.toggle('hv-sidebar-item-active', abierto)

  const topbar = document.querySelector<HTMLElement>('.hv-topbar > div:first-child')
  const titulo = topbar?.querySelector<HTMLElement>('strong')
  const subtitulo = topbar?.querySelector<HTMLElement>('small')

  if (abierto) {
    if (titulo) tituloAnterior = titulo.textContent ?? ''
    if (subtitulo) subtituloAnterior = subtitulo.textContent ?? ''
    if (titulo) titulo.textContent = 'Notas del calificador'
    if (subtitulo) subtitulo.textContent = 'Recordatorios y antecedentes del proceso'
    return
  }

  if (titulo && tituloAnterior) titulo.textContent = tituloAnterior
  if (subtitulo && subtituloAnterior) subtitulo.textContent = subtituloAnterior
}

function cerrarPanel(): void {
  aplicacionPanel?.unmount()
  aplicacionPanel = null
  contenedorPanel?.remove()
  contenedorPanel = null
  actualizarContextoVisual(false)
}

function abrirPanel(): void {
  if (contenedorPanel?.isConnected) return
  if (!document.querySelector('.hv-app-shell')) return

  const host = document.createElement('div')
  host.id = 'hvdigital-notas-calificador-host'
  document.body.appendChild(host)

  aplicacionPanel = createApp({
    render: () => h(NotasTareasPanel, { onCerrar: cerrarPanel }),
  })
  aplicacionPanel.mount(host)
  contenedorPanel = host
  actualizarContextoVisual(true)
}

function crearBoton(): HTMLButtonElement {
  const boton = document.createElement('button')
  boton.type = 'button'
  boton.className = 'hv-sidebar-item hv-sidebar-notas-tareas'
  boton.dataset.notasTareas = 'true'
  boton.innerHTML = '<i class="pi pi-sticky-note"></i><span>Notas del calificador</span>'
  boton.addEventListener('click', () => {
    if (contenedorPanel?.isConnected) cerrarPanel()
    else abrirPanel()
  })
  return boton
}

function sincronizarBoton(): void {
  if (sincronizando) return
  sincronizando = true

  try {
    const lateral = document.querySelector<HTMLElement>('.hv-sidebar')
    const existente = botonNotas()

    if (!lateral) {
      existente?.remove()
      cerrarPanel()
      return
    }

    if (existente?.isConnected && lateral.contains(existente)) return
    existente?.remove()

    const navegacion = lateral.querySelector('nav') ?? lateral
    const boton = crearBoton()
    const configuracion = Array.from(
      navegacion.querySelectorAll<HTMLButtonElement>('.hv-sidebar-item'),
    ).find(item => item.textContent?.trim() === 'Configuración')

    if (configuracion) navegacion.insertBefore(boton, configuracion)
    else navegacion.appendChild(boton)
  } finally {
    sincronizando = false
  }
}

export function habilitarNotasTareas(): void {
  if (observador) return

  sincronizarBoton()
  observador = new MutationObserver(sincronizarBoton)
  observador.observe(document.body, { childList: true, subtree: true })

  window.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && contenedorPanel?.isConnected) cerrarPanel()
  })
}
