<script setup lang="ts">
import {
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import {
  listen,
  type UnlistenFn,
} from '@tauri-apps/api/event'

import {
  getCurrentWindow,
} from '@tauri-apps/api/window'

import ConfiguracionInicialView
  from './views/Configuracion/ConfiguracionInicialView.vue'

import ConfiguracionSistemaView
  from './views/Configuracion/ConfiguracionSistemaView.vue'

import DesignacionCalificadosView
  from './views/Personal/DesignacionCalificadosView.vue'

import DashboardPeriodoView
  from './views/Panel/DashboardPeriodoView.vue'

import ExpedienteDetalleView
  from './views/Expedientes/ExpedienteDetalleView.vue'

import FormularioAnotacionView
  from './views/Anotaciones/FormularioAnotacionView.vue'

import HojaVidaView
  from './views/HojaVida/HojaVidaView.vue'

import EvintView
  from './views/Evint/EvintView.vue'

import Hc1View
  from './views/Hc1/Hc1View.vue'

import Hc2View
  from './views/hc2/Hc2View.vue'

import HamView
  from './views/Ham/HamView.vue'

import HapsemView
  from './views/Hapsem/HapsemView.vue'

import {
  obtenerEstadoConfiguracionInicial,
} from './services/configuracionInicial'

import {
  obtenerExpedienteDetalle,
  obtenerInstrumentoExpediente,
} from './services/expedienteDetalle'

import type {
  InstrumentoExpedienteDetalle,
} from './types/expedienteDetalle'

import ResolucionesView from './views/Resoluciones/ResolucionesView.vue'
import ResolucionFormularioView from './views/Resoluciones/ResolucionFormularioView.vue'

type Pantalla =
  | 'CARGANDO'
  | 'CONFIGURACION_INICIAL'
  | 'CONFIGURACION_SISTEMA'
  | 'DESIGNACION'
  | 'DASHBOARD'
  | 'EXPEDIENTE'
  | 'HOJA_VIDA'
  | 'ANOTACION'
  | 'EVINT'
  | 'HC1'
  | 'HC2'
  | 'HAM'
  | 'HAPSEM'
  | 'RESOLUCIONES'
  | 'RESOLUCION_FORMULARIO'

const pantalla =
  ref<Pantalla>('CARGANDO')

const expedienteSeleccionadoId =
  ref<number | null>(null)

const hojaVidaSeleccionadaId =
  ref<number | null>(null)

const instrumentoEvintSeleccionadoId =
  ref<number | null>(null)

const resolucionSeleccionadaId =
  ref<number | null>(null)

let dejarDeEscucharMenu:
  UnlistenFn | null = null

let escucharMenuLateral:
  ((evento: Event) => void) | null = null

async function resolverPantallaInicial():
Promise<void> {
  pantalla.value = 'CARGANDO'

  try {
    const estado =
      await obtenerEstadoConfiguracionInicial()

    if (
      estado.estado === 'NO_CONFIGURADA' ||
      estado.estado === 'EN_PROGRESO'
    ) {
      pantalla.value = 'CONFIGURACION_INICIAL'
      return
    }

    if (
      estado.estado ===
      'CONFIGURADA_SIN_PERSONAL'
    ) {
      pantalla.value = 'DESIGNACION'
      return
    }

    pantalla.value = 'DASHBOARD'
  } catch (excepcion) {
    console.error(
      'No fue posible obtener la configuración inicial:',
      excepcion,
    )

    pantalla.value = 'CONFIGURACION_INICIAL'
  }
}

function abrirDesignacion(): void {
  pantalla.value = 'DESIGNACION'
}

function abrirDashboard(): void {
  expedienteSeleccionadoId.value = null
  hojaVidaSeleccionadaId.value = null
  instrumentoEvintSeleccionadoId.value = null

  pantalla.value = 'DASHBOARD'
}

function abrirExpediente(
  expedienteId: number,
): void {
  expedienteSeleccionadoId.value =
    expedienteId

  /*
   * Al seleccionar otro expediente se eliminan
   * referencias contextuales anteriores.
   */
  hojaVidaSeleccionadaId.value = null
  instrumentoEvintSeleccionadoId.value = null

  pantalla.value = 'EXPEDIENTE'
}

function abrirEvint(
  instrumentoId: number,
): void {
  instrumentoEvintSeleccionadoId.value =
    instrumentoId

  pantalla.value = 'EVINT'
}

function abrirHojaVida(
  hojaVidaId: number,
): void {
  hojaVidaSeleccionadaId.value =
    hojaVidaId

  pantalla.value = 'HOJA_VIDA'
}

function abrirNuevaAnotacion(
  hojaVidaId: number,
): void {
  hojaVidaSeleccionadaId.value =
    hojaVidaId

  pantalla.value = 'ANOTACION'
}

async function resolverHojaVidaActual():
Promise<number | null> {
  if (hojaVidaSeleccionadaId.value) {
    return hojaVidaSeleccionadaId.value
  }

  const expedienteId =
    expedienteSeleccionadoId.value

  if (!expedienteId) {
    window.alert(
      'Primero debe abrir el expediente de un calificado.',
    )
    return null
  }

  try {
    const expediente =
      await obtenerExpedienteDetalle(
        expedienteId,
      )

    if (!expediente?.hoja_vida_id) {
      throw new Error(
        'El expediente no tiene una Hoja de Vida asociada.',
      )
    }

    hojaVidaSeleccionadaId.value =
      expediente.hoja_vida_id

    return expediente.hoja_vida_id
  } catch (excepcion) {
    const mensaje =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)

    window.alert(mensaje)
    return null
  }
}

async function abrirDocumentoCalificacion(
  destino: 'HC1' | 'HC2' | 'HAM' | 'HAPSEM',
): Promise<void> {
  const hojaVidaId =
    await resolverHojaVidaActual()

  if (!hojaVidaId) {
    return
  }

  pantalla.value = destino
}

async function abrirInstrumento(
  instrumento: InstrumentoExpedienteDetalle,
): Promise<void> {
  const tipo =
    instrumento.tipo_instrumento
      .trim()
      .toUpperCase()

  if (
    tipo === 'HOJA_VIDA' ||
    tipo === 'HOJA DE VIDA' ||
    tipo === 'HV'
  ) {
    const hojaVidaId =
      await resolverHojaVidaActual()

    if (!hojaVidaId) {
      return
    }

    pantalla.value = 'HOJA_VIDA'
    return
  }

  if (tipo === 'EVINT') {
    abrirEvint(
      instrumento.instrumento_id,
    )
    return
  }

  if (tipo === 'HC1') {
    await abrirDocumentoCalificacion('HC1')
    return
  }

  if (tipo === 'HC2') {
    await abrirDocumentoCalificacion('HC2')
    return
  }

  if (tipo === 'HAM') {
    await abrirDocumentoCalificacion('HAM')
    return
  }

  if (tipo === 'HAPSEM') {
    await abrirDocumentoCalificacion('HAPSEM')
    return
  }

  mostrarModuloPendiente(
    instrumento.nombre_instrumento ||
      instrumento.tipo_instrumento,
  )
}

function volverDesdeAnotacion(): void {
  if (hojaVidaSeleccionadaId.value) {
    pantalla.value = 'HOJA_VIDA'
    return
  }

  if (expedienteSeleccionadoId.value) {
    pantalla.value = 'EXPEDIENTE'
    return
  }

  pantalla.value = 'DASHBOARD'
}

function abrirExpedienteActual(): void {
  if (!expedienteSeleccionadoId.value) {
    window.alert(
      'Primero debe abrir un expediente desde el panel principal.',
    )
    return
  }

  pantalla.value = 'EXPEDIENTE'
}

async function abrirHojaVidaActual(): Promise<void> {
  const hojaVidaId =
    await resolverHojaVidaActual()

  if (!hojaVidaId) {
    return
  }

  pantalla.value = 'HOJA_VIDA'
}

function abrirAnotacionDesdeMenu(): void {
  if (!hojaVidaSeleccionadaId.value) {
    window.alert(
      'Primero debe seleccionar una Hoja de Vida.',
    )
    return
  }

  abrirNuevaAnotacion(
    hojaVidaSeleccionadaId.value,
  )
}

async function abrirEvintDesdeMenu(
  numero: 1 | 2,
): Promise<void> {
  const expedienteId =
    expedienteSeleccionadoId.value

  if (!expedienteId) {
    window.alert(
      'Primero debe abrir el expediente de un calificado.',
    )
    return
  }

  try {
    const instrumento =
      await obtenerInstrumentoExpediente(
        expedienteId,
        'EVINT',
        numero,
      )

    if (!instrumento) {
      throw new Error(
        `El expediente no contiene EVINT ${numero}.`,
      )
    }

    abrirEvint(
      instrumento.instrumento_id,
    )
  } catch (excepcion) {
    const mensaje =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)

    window.alert(mensaje)
  }
}

function mostrarModuloPendiente(
  modulo: string,
): void {
  window.alert(
    `${modulo} todavía no se encuentra implementado.`,
  )
}

function salirAplicacion(): void {
  void getCurrentWindow().close()
}

function mostrarAcercaDe(): void {
  window.alert(
    [
      'HVDigital',
      '',
      'Sistema local de gestión',
      'de procesos de calificación.',
      '',
      'Desarrollo personal.',
    ].join('\n'),
  )
}

function manejarEventoMenu(
  menuId: string,
): void {
  switch (menuId) {
    case 'menu_panel':
      abrirDashboard()
      break

    case 'menu_agregar_calificado':
      abrirDesignacion()
      break

    case 'menu_expediente_actual':
      abrirExpedienteActual()
      break

    case 'menu_hoja_vida':
    case 'menu_ver_hoja_vida':
      void abrirHojaVidaActual()
      break

    case 'menu_nueva_anotacion':
      abrirAnotacionDesdeMenu()
      break

    case 'menu_evint_1':
      void abrirEvintDesdeMenu(1)
      break

    case 'menu_evint_2':
      void abrirEvintDesdeMenu(2)
      break

    case 'menu_hc1':
      void abrirDocumentoCalificacion('HC1')
      break

    case 'menu_hc2':
      void abrirDocumentoCalificacion('HC2')
      break

    case 'menu_ham':
      void abrirDocumentoCalificacion('HAM')
      break

    case 'menu_hapsem':
      void abrirDocumentoCalificacion('HAPSEM')
      break

    case 'menu_configuracion':
      pantalla.value = 'CONFIGURACION_SISTEMA'
      break

    case 'menu_catalogos':
      window.alert(
        'La administración de catálogos todavía no está implementada.',
      )
      break

    case 'menu_respaldo':
      window.alert(
        'La creación de respaldos todavía no está implementada.',
      )
      break

    case 'menu_restaurar':
      window.alert(
        'La restauración de respaldos todavía no está implementada.',
      )
      break

    case 'menu_manual':
      window.alert(
        'El manual de usuario todavía no está incorporado.',
      )
      break

    case 'menu_licencia':
      window.alert(
        'El acuerdo de licencia todavía no está incorporado.',
      )
      break
    case 'menu_resoluciones':
      abrirResoluciones()
      break

    case 'menu_nueva_resolucion':
      abrirNuevaResolucion()
      break

    case 'menu_resoluciones_borrador':
      abrirResoluciones()
      break

    case 'menu_resoluciones_emitidas':
      abrirResoluciones()
      break

    case 'menu_acerca':
    case 'menu_acerca_ayuda':
      mostrarAcercaDe()
      break

    case 'menu_salir_frontend':
    case 'menu_salir':
    case 'menu_salir_archivo':
      salirAplicacion()
      break

    default:
      console.warn(
        'Opción de menú no reconocida:',
        menuId,
      )
  }
}

async function registrarEventosMenu():
Promise<void> {
  /*
   * Evita registrar el evento dos veces si
   * App.vue se vuelve a montar durante desarrollo.
   */
  if (dejarDeEscucharMenu) {
    dejarDeEscucharMenu()
    dejarDeEscucharMenu = null
  }

  dejarDeEscucharMenu =
    await listen<string>(
      'hvdigital-menu',
      evento => {
        manejarEventoMenu(
          evento.payload,
        )
      },
    )
}
function abrirResoluciones(): void {
  resolucionSeleccionadaId.value = null
  pantalla.value = 'RESOLUCIONES'
}

function abrirNuevaResolucion(): void {
  resolucionSeleccionadaId.value = null
  pantalla.value = 'RESOLUCION_FORMULARIO'
}

function abrirResolucion(
  resolucionId: number,
): void {
  resolucionSeleccionadaId.value =
    resolucionId

  pantalla.value = 'RESOLUCION_FORMULARIO'
}

function editarResolucion(
  resolucionId: number,
): void {
  resolucionSeleccionadaId.value =
    resolucionId

  pantalla.value = 'RESOLUCION_FORMULARIO'
}

function imprimirResolucion(
  resolucionId: number,
): void {
  resolucionSeleccionadaId.value =
    resolucionId

  pantalla.value = 'RESOLUCION_FORMULARIO'
}

function volverDesdeResolucion(): void {
  resolucionSeleccionadaId.value = null
  pantalla.value = 'RESOLUCIONES'
}

function registrarEventosMenuLateral(): void {
  if (escucharMenuLateral) {
    window.removeEventListener(
      'hvdigital-sidebar-menu',
      escucharMenuLateral,
    )
  }

  escucharMenuLateral = evento => {
    const detalle =
      (evento as CustomEvent<string>).detail

    if (detalle) {
      manejarEventoMenu(detalle)
    }
  }

  window.addEventListener(
    'hvdigital-sidebar-menu',
    escucharMenuLateral,
  )
}

onMounted(async () => {
  await resolverPantallaInicial()

  registrarEventosMenuLateral()

  try {
    await registrarEventosMenu()
  } catch (excepcion) {
    console.error(
      'No fue posible registrar el menubar:',
      excepcion,
    )
  }
})

onBeforeUnmount(() => {
  if (dejarDeEscucharMenu) {
    dejarDeEscucharMenu()
    dejarDeEscucharMenu = null
  }

  if (escucharMenuLateral) {
    window.removeEventListener(
      'hvdigital-sidebar-menu',
      escucharMenuLateral,
    )
    escucharMenuLateral = null
  }
})
</script>

<template>
  <div
    v-if="pantalla === 'CARGANDO'"
    class="app-loading"
  >
    Iniciando HVDigital…
  </div>

  <ConfiguracionInicialView
    v-else-if="
      pantalla === 'CONFIGURACION_INICIAL'
    "
  />

  <ConfiguracionSistemaView
    v-else-if="
      pantalla === 'CONFIGURACION_SISTEMA'
    "
    @volver="abrirDashboard"
  />

  <DesignacionCalificadosView
    v-else-if="
      pantalla === 'DESIGNACION'
    "
  />

  <DashboardPeriodoView
    v-else-if="
      pantalla === 'DASHBOARD'
    "
    @agregar-calificados="
      abrirDesignacion
    "
    @abrir-expediente="
      abrirExpediente
    "
    @nueva-anotacion="
      abrirNuevaAnotacion
    "
  />

  <ExpedienteDetalleView
    v-else-if="
      pantalla === 'EXPEDIENTE' &&
      expedienteSeleccionadoId
    "
    :expediente-id="
      expedienteSeleccionadoId
    "
    @volver="abrirDashboard"
    @abrir-instrumento="
      abrirInstrumento
    "
    @abrir-evint="
      abrirEvint
    "
    @abrir-hoja-vida="
      abrirHojaVida
    "
    @nueva-anotacion="
      abrirNuevaAnotacion
    "
  />

  <HojaVidaView
    v-else-if="
      pantalla === 'HOJA_VIDA' &&
      hojaVidaSeleccionadaId
    "
    :hoja-vida-id="
      hojaVidaSeleccionadaId
    "
    @volver="
      pantalla = 'EXPEDIENTE'
    "
    @nueva-anotacion="
      abrirNuevaAnotacion
    "
  />

  <EvintView
    v-else-if="
      pantalla === 'EVINT' &&
      instrumentoEvintSeleccionadoId
    "
    :instrumento-id="
      instrumentoEvintSeleccionadoId
    "
    @volver="
      pantalla = 'EXPEDIENTE'
    "
  />

  <Hc1View
    v-else-if="
      pantalla === 'HC1' &&
      hojaVidaSeleccionadaId
    "
    :hoja-vida-id="
      hojaVidaSeleccionadaId
    "
    @volver="
      pantalla = 'EXPEDIENTE'
    "
  />

  <Hc2View
    v-else-if="
      pantalla === 'HC2' &&
      hojaVidaSeleccionadaId
    "
    :hoja-vida-id="
      hojaVidaSeleccionadaId
    "
    @volver="
      pantalla = 'EXPEDIENTE'
    "
  />

  <HamView
    v-else-if="
      pantalla === 'HAM' &&
      hojaVidaSeleccionadaId
    "
    :hoja-vida-id="
      hojaVidaSeleccionadaId
    "
    @volver="
      pantalla = 'EXPEDIENTE'
    "
  />

  <HapsemView
    v-else-if="
      pantalla === 'HAPSEM' &&
      hojaVidaSeleccionadaId
    "
    :hoja-vida-id="
      hojaVidaSeleccionadaId
    "
    @volver="
      pantalla = 'EXPEDIENTE'
    "
  />

  <ResolucionesView
    v-else-if="
      pantalla === 'RESOLUCIONES'
    "
    @nueva-resolucion="
      abrirNuevaResolucion
    "
    @abrir-resolucion="
      abrirResolucion
    "
    @editar-resolucion="
      editarResolucion
    "
    @imprimir-resolucion="
      imprimirResolucion
    "
    @crear-anotacion="
      abrirNuevaResolucion
    "
  />

  <ResolucionFormularioView
    v-else-if="
      pantalla === 'RESOLUCION_FORMULARIO'
    "
    :resolucion-id="
      resolucionSeleccionadaId
    "
    @volver="
      volverDesdeResolucion
    "
    @guardada="
      abrirResolucion
    "
    @emitida="
      abrirResolucion
    "
  />

  <div
    v-else-if="
      pantalla === 'ANOTACION' &&
      hojaVidaSeleccionadaId
    "
    class="annotation-screen"
  >
    <button
      class="back-button"
      type="button"
      @click="volverDesdeAnotacion"
    >
      ← Volver
    </button>

    <FormularioAnotacionView
      :hoja-vida-inicial-id="
        hojaVidaSeleccionadaId
      "
    />
  </div>

  <div
    v-else
    class="app-loading"
  >
    No fue posible abrir la pantalla solicitada.
  </div>
</template>

<style scoped>
.app-loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: var(--hv-muted, #687487);
  background: var(--hv-page, #f4f6f9);
  font-size: 14px;
}

.annotation-screen {
  position: relative;
  min-height: 100vh;
}

.back-button {
  position: fixed;
  top: 16px;
  right: 20px;
  z-index: 30;
  min-height: 38px;
  padding: 0 13px;
  color: var(--hv-primary, #174f87);
  background: var(--hv-surface, #fff);
  border: 1px solid
    var(--hv-border, #cbd4df);
  border-radius: var(--hv-radius-sm, 8px);
  box-shadow:
    0 4px 14px
    rgba(16, 32, 54, 0.08);
  font-weight: 750;
}

.back-button:hover {
  background:
    var(--hv-primary-soft, #edf4fa);
}
</style>