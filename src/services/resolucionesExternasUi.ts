import { createApp, h, type App as VueApp } from 'vue'
import ResolucionExternaModal from '../components/resoluciones/ResolucionExternaModal.vue'

let appModal: VueApp<Element> | null = null
let host: HTMLElement | null = null
let observador: MutationObserver | null = null

function cerrar(): void {
  appModal?.unmount()
  appModal = null
  host?.remove()
  host = null
}

function refrescarListado(): void {
  const botones = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
  const actualizar = botones.find(b => b.textContent?.trim() === 'Actualizar')
  actualizar?.click()
}

function abrir(): void {
  if (host?.isConnected) return
  host = document.createElement('div')
  host.id = 'hvdigital-resolucion-externa-host'
  document.body.appendChild(host)
  appModal = createApp({
    render: () => h(ResolucionExternaModal, {
      onCerrar: cerrar,
      onRegistrada: () => {
        cerrar()
        setTimeout(refrescarListado, 50)
      },
    }),
  })
  appModal.mount(host)
}

function sincronizarBoton(): void {
  const botones = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
  const nueva = botones.find(b => b.textContent?.trim() === 'Nueva resolución')
  const existente = document.querySelector<HTMLButtonElement>('[data-resolucion-externa="true"]')

  if (!nueva || !nueva.isConnected) {
    existente?.remove()
    return
  }
  if (existente?.isConnected) return

  const boton = document.createElement('button')
  boton.type = 'button'
  boton.dataset.resolucionExterna = 'true'
  boton.className = 'hv-button hv-button-secondary rex-trigger'
  boton.innerHTML = '<i class="pi pi-external-link"></i><span>Agregar resolución externa</span>'
  boton.addEventListener('click', abrir)

  nueva.parentElement?.insertBefore(boton, nueva.nextSibling)
}

export function habilitarResolucionesExternas(): void {
  if (observador) return
  sincronizarBoton()
  observador = new MutationObserver(sincronizarBoton)
  observador.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && host?.isConnected) cerrar()
  })
}
