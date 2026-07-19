import { listen, type UnlistenFn } from '@tauri-apps/api/event'

const etiquetaPorComando: Record<string, string> = {
  menu_panel: 'Calificados',
  menu_agregar_calificado: 'Agregar calificado',
  menu_expediente_actual: 'Resumen',
  menu_hoja_vida: 'Hoja de Vida',
  menu_ver_hoja_vida: 'Hoja de Vida',
  menu_nueva_anotacion: 'Anotaciones',
  menu_evint_1: 'EVINT 1',
  menu_evint_2: 'EVINT 2',
  menu_hc1: 'HC1',
  menu_hc2: 'HC2',
  menu_ham: 'HAM',
  menu_hapsem: 'HAPSEM',
  menu_resoluciones: 'Resoluciones',
  menu_resoluciones_borrador: 'Resoluciones',
  menu_resoluciones_emitidas: 'Resoluciones',
  menu_configuracion: 'Configuración',
  menu_catalogos: 'Configuración',
  menu_respaldo: 'Configuración',
  menu_restaurar: 'Configuración',
}

function normalizar(texto: string | null | undefined): string {
  return (texto ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('es')
}

function pulsarBotonPorEtiqueta(etiqueta: string): boolean {
  const objetivo = normalizar(etiqueta)
  const botones = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.hv-sidebar-item, button'),
  )

  const boton = botones.find(elemento => normalizar(elemento.textContent) === objetivo)
  if (!boton || boton.disabled) return false

  boton.click()
  return true
}

function mostrarAcerca(): void {
  window.alert(
    'HVDigital\nSistema local para la gestión de procesos de calificación.\nVersión 0.1.0',
  )
}

function mostrarPendiente(nombre: string): void {
  window.alert(`${nombre} estará disponible en una próxima actualización.`)
}

async function manejarComandoMenu(comando: string): Promise<void> {
  if (comando === 'menu_acerca' || comando === 'menu_acerca_ayuda') {
    mostrarAcerca()
    return
  }

  if (comando === 'menu_manual') {
    mostrarPendiente('El Manual de usuario')
    return
  }

  if (comando === 'menu_licencia') {
    mostrarPendiente('El Acuerdo de licencia')
    return
  }

  const etiqueta = etiquetaPorComando[comando]
  if (!etiqueta) return

  const ejecutado = pulsarBotonPorEtiqueta(etiqueta)
  if (!ejecutado) {
    window.alert(
      'La opción seleccionada no está disponible en la pantalla actual. Abra primero un período o expediente compatible.',
    )
    return
  }

  if (comando === 'menu_respaldo' || comando === 'menu_restaurar') {
    window.setTimeout(() => {
      const accion = comando === 'menu_respaldo' ? 'Crear respaldo' : 'Restaurar respaldo'
      pulsarBotonPorEtiqueta(accion)
    }, 150)
  }
}

let desregistrar: UnlistenFn | null = null

export async function habilitarMenuNativo(): Promise<void> {
  if (desregistrar) return

  try {
    desregistrar = await listen<string>('hvdigital-menu', evento => {
      void manejarComandoMenu(evento.payload)
    })
  } catch (error) {
    console.warn('No fue posible habilitar el menú nativo de Tauri.', error)
  }
}
