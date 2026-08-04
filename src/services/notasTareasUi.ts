import { createApp, h, type App as VueApp } from 'vue'
import NotasTareasPanel from '../components/notas/NotasTareasPanel.vue'

let aplicacionPanel: VueApp<Element> | null = null
let contenedorPanel: HTMLElement | null = null
let observador: MutationObserver | null = null
let sincronizando = false

function cerrarPanel(): void {
  aplicacionPanel?.unmount()
  aplicacionPanel = null
  contenedorPanel?.remove()
  contenedorPanel = null
}

function abrirPanel(): void {
  if (contenedorPanel?.isConnected) return

  const host = document.createElement('div')
  host.id = 'hvdigital-notas-tareas-host'
  document.body.appendChild(host)

  aplicacionPanel = createApp({
    render: () => h(NotasTareasPanel, { onCerrar: cerrarPanel }),
  })
  aplicacionPanel.mount(host)
  contenedorPanel = host
}

function crearBoton(): HTMLButtonElement {
  const boton = document.createElement('button')
  boton.type = 'button'
  boton.className = 'hv-sidebar-item hv-sidebar-notas-tareas'
  boton.dataset.notasTareas = 'true'
  boton.innerHTML = '<i class="pi pi-list-check"></i><span>Notas y tareas</span>'
  boton.addEventListener('click', abrirPanel)
  return boton
}

function sincronizarBoton(): void {
  if (sincronizando) return
  sincronizando = true

  try {
    const lateral = document.querySelector<HTMLElement>('.hv-sidebar')
    const existente = document.querySelector<HTMLButtonElement>('[data-notas-tareas="true"]')

    if (!lateral) {
      existente?.remove()
      return
    }

    if (existente?.isConnected && lateral.contains(existente)) return
    existente?.remove()

    const navegacion = lateral.querySelector('nav') ?? lateral
    const boton = crearBoton()
    const configuracion = Array.from(navegacion.querySelectorAll<HTMLButtonElement>('.hv-sidebar-item'))
      .find(item => item.textContent?.trim() === 'Configuración')

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
