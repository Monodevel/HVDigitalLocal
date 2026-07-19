import { createApp, type App as VueApp } from 'vue'

import FotografiaCalificado from '../components/expedientes/FotografiaCalificado.vue'

let aplicacion: VueApp<Element> | null = null
let hostActual: HTMLElement | null = null
let observador: MutationObserver | null = null
let expedienteActual: number | null = null

function obtenerExpedienteId(): number | null {
  const texto = Array.from(document.querySelectorAll<HTMLElement>('.hv-expediente-profile-title span'))
    .map(elemento => elemento.textContent ?? '')
    .find(valor => valor.includes('Expediente N.º'))

  const coincidencia = texto?.match(/Expediente\s+N\.º\s*(\d+)/i)
  return coincidencia ? Number(coincidencia[1]) : null
}

function desmontar(): void {
  aplicacion?.unmount()
  aplicacion = null
  hostActual = null
  expedienteActual = null
}

function montar(): void {
  const avatar = document.querySelector<HTMLElement>('.hv-expediente-avatar')
  const expedienteId = obtenerExpedienteId()

  if (!avatar || !expedienteId) {
    if (hostActual && !hostActual.isConnected) desmontar()
    return
  }

  if (hostActual === avatar && expedienteActual === expedienteId) return

  const iniciales = avatar.textContent?.trim() || 'HV'
  desmontar()
  avatar.replaceChildren()
  avatar.classList.add('hv-expediente-avatar-photo-enabled')

  aplicacion = createApp(FotografiaCalificado, {
    expedienteId,
    iniciales,
  })
  aplicacion.mount(avatar)
  hostActual = avatar
  expedienteActual = expedienteId
}

export function habilitarFotografiasEnExpediente(): void {
  if (observador) return

  montar()
  observador = new MutationObserver(() => montar())
  observador.observe(document.body, {
    childList: true,
    subtree: true,
  })
}
