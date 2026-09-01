<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

import ConfiguracionInicialView from './views/Configuracion/ConfiguracionInicialView.vue'
import ConfiguracionSistemaView from './views/Configuracion/ConfiguracionSistemaView.vue'
import DesignacionCalificadosView from './views/Personal/DesignacionCalificadosView.vue'
import ExpedienteDetalleView from './views/Expedientes/ExpedienteDetalleView.vue'
import FormularioAnotacionView from './views/Anotaciones/FormularioAnotacionView.vue'
import HojaVidaView from './views/HojaVida/HojaVidaView.vue'
import EvintView from './views/Evint/EvintView.vue'
import Hc1View from './views/Hc1/Hc1View.vue'
import Hc2View from './views/hc2/Hc2View.vue'
import HamView from './views/Ham/HamView.vue'
import HapsemView from './views/Hapsem/HapsemView.vue'
import ResolucionesView from './views/Resoluciones/ResolucionesView.vue'
import ResolucionFormularioView from './views/Resoluciones/ResolucionFormularioView.vue'
import UsuariosView from './views/Administracion/UsuariosView.vue'

import { obtenerEstadoConfiguracionInicial } from './services/configuracionInicial'
import { listarCalificadosUi, listarPeriodosUi, seleccionarPeriodoUi, type CalificadoUi, type PeriodoUi } from './services/nuevaInterfaz'
import { obtenerExpedienteDetalle, obtenerInstrumentoExpediente } from './services/expedienteDetalle'
import { cerrarSesionWeb } from './web/api'
import type { InstrumentoExpedienteDetalle } from './types/expedienteDetalle'

type RolUsuario = 'ADMIN' | 'CALIFICADOR'
type Pantalla =
  | 'CARGANDO' | 'LOGIN' | 'CONFIGURACION_INICIAL' | 'SELECCION_PERIODO'
  | 'CALIFICADOS' | 'DESIGNACION' | 'EXPEDIENTE' | 'HOJA_VIDA' | 'ANOTACION'
  | 'EVINT' | 'HC1' | 'HC2' | 'HAM' | 'HAPSEM' | 'RESOLUCIONES'
  | 'RESOLUCION_FORMULARIO' | 'CONFIGURACION' | 'ADMIN_USUARIOS'

interface ResultadoLoginLocal {
  autenticado: boolean
  usuario: string
  mensaje: string
  usuarioId?: number
  rol?: RolUsuario
  calificadorDirectoId?: number | null
  nombreMostrar?: string | null
}

const versionAplicacion = '0.2.0'
const pantalla = ref<Pantalla>('CARGANDO')
const usuario = ref('')
const nombreUsuario = ref('')
const rolUsuario = ref<RolUsuario>('CALIFICADOR')
const contrasena = ref('')
const recordarSesion = ref(false)
const autenticando = ref(false)
const errorLogin = ref('')
const errorCarga = ref('')
const baseDatosConectada = ref(false)
const periodos = ref<PeriodoUi[]>([])
const calificados = ref<CalificadoUi[]>([])
const periodoSeleccionado = ref<PeriodoUi | null>(null)
const calificadoSeleccionado = ref<CalificadoUi | null>(null)
const instrumentoEvintSeleccionadoId = ref<number | null>(null)
const resolucionSeleccionadaId = ref<number | null>(null)
const menuActivo = ref('hojas-vida')
const textoBusqueda = ref('')
const filtroGrado = ref<string | null>(null)
const filtroUnidad = ref<string | null>(null)
const cargandoDatos = ref(false)
const CLAVE_USUARIO_RECORDADO = 'hvdigital.usuario-recordado'

const modoSoloLectura = computed(() => periodoSeleccionado.value?.estado === 'CERRADO')
const expedienteSeleccionadoId = computed(() => calificadoSeleccionado.value?.expedienteId ?? null)
const hojaVidaSeleccionadaId = computed(() => calificadoSeleccionado.value?.hojaVidaId ?? null)
const opcionesGrado = computed(() => [...new Set(calificados.value.map(item => item.grado))].sort())
const opcionesUnidad = computed(() => [...new Set(calificados.value.map(item => item.unidad))].sort())
const esAdmin = computed(() => rolUsuario.value === 'ADMIN')
const calificadosFiltrados = computed(() => {
  const q = textoBusqueda.value.trim().toLocaleLowerCase('es')
  return calificados.value.filter(item => {
    const texto = !q || [item.nombre, item.run, item.grado, item.unidad].some(v => v.toLocaleLowerCase('es').includes(q))
    return texto && (!filtroGrado.value || item.grado === filtroGrado.value) && (!filtroUnidad.value || item.unidad === filtroUnidad.value)
  })
})

const dentroExpediente = computed(() => [
  'EXPEDIENTE','HOJA_VIDA','ANOTACION','EVINT','HC1','HC2','HAM','HAPSEM','RESOLUCIONES','RESOLUCION_FORMULARIO',
].includes(pantalla.value))

const menuItems = computed(() => {
  if (dentroExpediente.value) return [
    { id: 'volver', label: 'Volver a Hojas de Vida', icon: 'pi pi-arrow-left' },
    { id: 'resumen', label: 'Resumen', icon: 'pi pi-user' },
    { id: 'hoja-vida', label: 'Hoja de Vida', icon: 'pi pi-book' },
    { id: 'anotaciones', label: 'Anotaciones', icon: 'pi pi-file-edit' },
    { id: 'evint-1', label: 'EVINT 1', icon: 'pi pi-chart-bar' },
    { id: 'evint-2', label: 'EVINT 2', icon: 'pi pi-chart-line' },
    { id: 'hc1', label: 'HC1', icon: 'pi pi-clipboard' },
    { id: 'hc2', label: 'HC2', icon: 'pi pi-clipboard' },
    { id: 'ham', label: 'HAM', icon: 'pi pi-star' },
    { id: 'hapsem', label: 'HAPSEM', icon: 'pi pi-heart' },
    { id: 'resoluciones', label: 'Resoluciones', icon: 'pi pi-file' },
  ]

  const items = [
    { id: 'hojas-vida', label: 'Hojas de Vida', icon: 'pi pi-book' },
    { id: 'designacion', label: 'Agregar personal', icon: 'pi pi-user-plus' },
    { id: 'periodos', label: 'Períodos', icon: 'pi pi-calendar' },
    { id: 'configuracion', label: 'Configuración', icon: 'pi pi-cog' },
  ]
  if (esAdmin.value) items.push({ id: 'admin-usuarios', label: 'Usuarios', icon: 'pi pi-users' })
  return items
})

async function inicializarAplicacion(): Promise<void> {
  const recordado = localStorage.getItem(CLAVE_USUARIO_RECORDADO)
  if (recordado) { usuario.value = recordado; recordarSesion.value = true }
  try { const r = await fetch('/api/health'); baseDatosConectada.value = r.ok } catch { baseDatosConectada.value = false }
  pantalla.value = 'LOGIN'
}

async function iniciarSesion(): Promise<void> {
  errorLogin.value = ''
  if (!usuario.value.trim() || !contrasena.value) { errorLogin.value = 'Ingrese usuario y contraseña.'; return }
  autenticando.value = true
  try {
    const resultado = await invoke<ResultadoLoginLocal>('login_local', { usuario: usuario.value, password: contrasena.value })
    if (!resultado.autenticado) { errorLogin.value = resultado.mensaje || 'Acceso no autorizado.'; return }
    usuario.value = resultado.usuario
    rolUsuario.value = resultado.rol ?? 'CALIFICADOR'
    nombreUsuario.value = resultado.nombreMostrar?.trim() || resultado.usuario
    contrasena.value = ''
    if (recordarSesion.value) localStorage.setItem(CLAVE_USUARIO_RECORDADO, resultado.usuario)
    else localStorage.removeItem(CLAVE_USUARIO_RECORDADO)

    const estado = await obtenerEstadoConfiguracionInicial()
    baseDatosConectada.value = true
    if (estado.estado === 'NO_CONFIGURADA' || estado.estado === 'EN_PROGRESO') {
      pantalla.value = 'CONFIGURACION_INICIAL'
      return
    }
    periodos.value = await listarPeriodosUi()
    pantalla.value = 'SELECCION_PERIODO'
  } catch (e) {
    baseDatosConectada.value = false
    errorLogin.value = e instanceof Error ? e.message : String(e)
  } finally { autenticando.value = false }
}

async function seleccionarPeriodo(periodo: PeriodoUi): Promise<void> {
  cargandoDatos.value = true; errorCarga.value = ''
  try {
    await seleccionarPeriodoUi(periodo.id)
    periodoSeleccionado.value = periodo
    calificados.value = await listarCalificadosUi(periodo.id)
    calificadoSeleccionado.value = null
    menuActivo.value = 'hojas-vida'
    pantalla.value = 'CALIFICADOS'
  } catch (e) { errorCarga.value = e instanceof Error ? e.message : 'No fue posible abrir el período.' }
  finally { cargandoDatos.value = false }
}

async function recargarCalificados(): Promise<void> {
  if (!periodoSeleccionado.value) return
  cargandoDatos.value = true
  try { calificados.value = await listarCalificadosUi(periodoSeleccionado.value.id) }
  finally { cargandoDatos.value = false }
}

function abrirExpediente(item: CalificadoUi): void { calificadoSeleccionado.value = item; menuActivo.value = 'resumen'; pantalla.value = 'EXPEDIENTE' }

async function asegurarHojaVida(): Promise<number | null> {
  if (hojaVidaSeleccionadaId.value) return hojaVidaSeleccionadaId.value
  if (!expedienteSeleccionadoId.value) return null
  const expediente = await obtenerExpedienteDetalle(expedienteSeleccionadoId.value)
  const id = expediente?.hoja_vida_id ?? null
  if (id && calificadoSeleccionado.value) calificadoSeleccionado.value = { ...calificadoSeleccionado.value, hojaVidaId: id }
  return id
}

async function abrirHojaVida(): Promise<void> { if (await asegurarHojaVida()) { menuActivo.value = 'hoja-vida'; pantalla.value = 'HOJA_VIDA' } }
async function abrirAnotacion(): Promise<void> {
  if (modoSoloLectura.value) { window.alert('El período está cerrado y solo permite lectura.'); return }
  if (await asegurarHojaVida()) { menuActivo.value = 'anotaciones'; pantalla.value = 'ANOTACION' }
}
async function abrirEvint(numero: 1 | 2): Promise<void> {
  if (!expedienteSeleccionadoId.value) return
  const instrumento = await obtenerInstrumentoExpediente(expedienteSeleccionadoId.value, 'EVINT', numero)
  if (!instrumento) { window.alert(`El expediente no contiene EVINT ${numero}.`); return }
  instrumentoEvintSeleccionadoId.value = instrumento.instrumento_id; menuActivo.value = `evint-${numero}`; pantalla.value = 'EVINT'
}
async function abrirDocumento(tipo: 'HC1'|'HC2'|'HAM'|'HAPSEM'): Promise<void> { if (await asegurarHojaVida()) { menuActivo.value = tipo.toLowerCase(); pantalla.value = tipo } }
async function abrirInstrumento(i: InstrumentoExpedienteDetalle): Promise<void> {
  const tipo = i.tipo_instrumento.trim().toUpperCase()
  if (['HOJA_VIDA','HOJA DE VIDA','HV'].includes(tipo)) await abrirHojaVida()
  else if (tipo === 'EVINT') { instrumentoEvintSeleccionadoId.value = i.instrumento_id; pantalla.value = 'EVINT' }
  else if (['HC1','HC2','HAM','HAPSEM'].includes(tipo)) await abrirDocumento(tipo as 'HC1'|'HC2'|'HAM'|'HAPSEM')
}
function abrirResoluciones(): void { resolucionSeleccionadaId.value = null; menuActivo.value = 'resoluciones'; pantalla.value = 'RESOLUCIONES' }
function abrirNuevaResolucion(): void { if (modoSoloLectura.value) { window.alert('El período está cerrado y solo permite lectura.'); return }; resolucionSeleccionadaId.value = null; pantalla.value = 'RESOLUCION_FORMULARIO' }
function abrirResolucion(id: number): void { resolucionSeleccionadaId.value = id; pantalla.value = 'RESOLUCION_FORMULARIO' }

async function manejarMenu(id: string): Promise<void> {
  menuActivo.value = id
  if (id === 'volver' || id === 'hojas-vida') { pantalla.value = 'CALIFICADOS'; menuActivo.value = 'hojas-vida' }
  else if (id === 'periodos') { periodos.value = await listarPeriodosUi(); pantalla.value = 'SELECCION_PERIODO' }
  else if (id === 'configuracion') pantalla.value = 'CONFIGURACION'
  else if (id === 'admin-usuarios' && esAdmin.value) pantalla.value = 'ADMIN_USUARIOS'
  else if (id === 'designacion') { if (modoSoloLectura.value) return window.alert('No se puede agregar personal a un período cerrado.'); pantalla.value = 'DESIGNACION' }
  else if (id === 'resumen') pantalla.value = 'EXPEDIENTE'
  else if (id === 'hoja-vida') await abrirHojaVida()
  else if (id === 'anotaciones') await abrirAnotacion()
  else if (id === 'evint-1') await abrirEvint(1)
  else if (id === 'evint-2') await abrirEvint(2)
  else if (['hc1','hc2','ham','hapsem'].includes(id)) await abrirDocumento(id.toUpperCase() as 'HC1'|'HC2'|'HAM'|'HAPSEM')
  else if (id === 'resoluciones') abrirResoluciones()
}

async function cerrarSesion(): Promise<void> {
  await cerrarSesionWeb()
  contrasena.value = ''; periodoSeleccionado.value = null; calificadoSeleccionado.value = null
  calificados.value = []; periodos.value = []; menuActivo.value = 'hojas-vida'; errorLogin.value = ''; nombreUsuario.value = ''; rolUsuario.value = 'CALIFICADOR'
  if (!recordarSesion.value) { usuario.value = ''; localStorage.removeItem(CLAVE_USUARIO_RECORDADO) }
  pantalla.value = 'LOGIN'
}
function limpiarFiltros(): void { textoBusqueda.value = ''; filtroGrado.value = null; filtroUnidad.value = null }
onMounted(() => void inicializarAplicacion())
</script>

<template>
  <div v-if="pantalla === 'CARGANDO'" class="hv-centered-page"><i class="pi pi-spin pi-spinner hv-loading-icon" /><strong>Iniciando HVDigital</strong><span>Comprobando el servidor…</span></div>

  <main v-else-if="pantalla === 'LOGIN'" class="hv-login-page">
    <section class="hv-login-brand-panel"><div class="hv-login-emblem"><span>HV</span></div><h1>HVDigital</h1><p>Administración personal de Hojas de Vida.</p><small>Acceso individual · Información privada por calificador</small></section>
    <section class="hv-login-form-panel"><div class="hv-login-form-wrapper"><div class="hv-login-heading"><span class="hv-eyebrow">Acceso</span><h2>Iniciar sesión</h2><p>Ingrese sus credenciales personales.</p></div><div class="hv-form-stack">
      <label for="usuario">Usuario</label><InputText id="usuario" v-model="usuario" autocomplete="username" fluid :disabled="autenticando" />
      <label for="contrasena">Contraseña</label><Password input-id="contrasena" v-model="contrasena" :feedback="false" toggle-mask fluid :disabled="autenticando" @keyup.enter="iniciarSesion" />
      <label class="hv-checkbox-label"><input v-model="recordarSesion" type="checkbox" :disabled="autenticando"><span>Recordar usuario</span></label>
      <small v-if="errorLogin" class="hv-error">{{ errorLogin }}</small><Button label="Iniciar sesión" icon="pi pi-sign-in" fluid :loading="autenticando" @click="iniciarSesion" />
    </div></div></section>
    <footer class="hv-global-statusbar"><span><i :class="baseDatosConectada ? 'hv-status-online' : 'hv-status-offline'" /> {{ baseDatosConectada ? 'Servidor disponible' : 'Servidor sin conexión' }}</span><span>Sesión individual</span><span>Versión {{ versionAplicacion }}</span></footer>
  </main>

  <ConfiguracionInicialView v-else-if="pantalla === 'CONFIGURACION_INICIAL'" />

  <main v-else-if="pantalla === 'SELECCION_PERIODO'" class="hv-selection-page hv-page-with-status">
    <header class="hv-page-heading"><div><span class="hv-eyebrow">Mi espacio de trabajo</span><h1>Períodos</h1><p>Seleccione el período cuyas Hojas de Vida desea administrar.</p></div><Button label="Cerrar sesión" icon="pi pi-sign-out" severity="secondary" outlined @click="cerrarSesion" /></header>
    <small v-if="errorCarga" class="hv-error">{{ errorCarga }}</small>
    <section class="hv-period-list"><Card v-for="periodo in periodos" :key="periodo.id" :class="['hv-period-row', { 'hv-period-row-active': periodo.estado === 'ABIERTO' }]"><template #content><div class="hv-period-row-content"><div><div class="hv-period-title-line"><strong>{{ periodo.nombre }}</strong><Tag :value="periodo.estado === 'ABIERTO' ? 'Activo' : 'Cerrado'" :severity="periodo.estado === 'ABIERTO' ? 'success' : 'secondary'" /></div><small>{{ periodo.fechaInicio }} — {{ periodo.fechaTermino }}</small><p>{{ periodo.estado === 'ABIERTO' ? 'Disponible para administración.' : 'Histórico · Solo lectura.' }}</p></div><Button :label="periodo.estado === 'ABIERTO' ? 'Abrir' : 'Consultar'" :icon="periodo.estado === 'ABIERTO' ? 'pi pi-folder-open' : 'pi pi-eye'" :loading="cargandoDatos" @click="seleccionarPeriodo(periodo)" /></div></template></Card></section>
    <footer class="hv-global-statusbar"><span><i class="hv-status-online" /> MariaDB central</span><span>{{ nombreUsuario || usuario }}</span><span>Versión {{ versionAplicacion }}</span></footer>
  </main>

  <div v-else class="hv-app-shell hv-app-shell-with-status">
    <aside class="hv-sidebar">
      <div class="hv-sidebar-brand"><div class="hv-brand-mark hv-brand-mark-small">HV</div><div><strong>HVDigital</strong><small>{{ dentroExpediente ? 'Hoja de Vida' : 'Mi espacio' }}</small></div></div>
      <nav class="hv-sidebar-menu"><button v-for="item in menuItems" :key="item.id" type="button" :class="['hv-sidebar-item',{ 'hv-sidebar-item-active': menuActivo === item.id }]" @click="manejarMenu(item.id)"><i :class="item.icon" /><span>{{ item.label }}</span></button></nav>
      <div class="hv-sidebar-context"><small>{{ rolUsuario === 'ADMIN' ? 'Administrador' : 'Calificador' }}</small><strong>{{ nombreUsuario || usuario }}</strong><button type="button" class="hv-sidebar-logout" @click="cerrarSesion"><i class="pi pi-sign-out" /> Cerrar sesión</button></div>
    </aside>

    <section class="hv-workspace">
      <header class="hv-topbar"><div><strong>{{ dentroExpediente ? calificadoSeleccionado?.nombre : pantalla === 'ADMIN_USUARIOS' ? 'Usuarios' : pantalla === 'CONFIGURACION' ? 'Configuración' : 'Hojas de Vida' }}</strong><small>{{ periodoSeleccionado?.nombre ?? 'Sin período seleccionado' }}</small></div><div class="hv-topbar-actions"><Tag v-if="esAdmin" value="ADMIN" severity="info" /><Tag v-if="modoSoloLectura" value="Solo lectura" severity="warn" /></div></header>

      <div v-if="pantalla === 'CALIFICADOS'" class="hv-content">
        <header class="hv-page-heading hv-page-heading-compact"><div><span class="hv-eyebrow">{{ periodoSeleccionado?.nombre }}</span><h1>Hojas de Vida administradas</h1><p>Personal que mantiene bajo su control en este período.</p></div><Button label="Agregar personal" icon="pi pi-user-plus" :disabled="modoSoloLectura" @click="manejarMenu('designacion')" /></header>
        <section class="hv-filter-bar"><span class="hv-search-control"><i class="pi pi-search" /><InputText v-model="textoBusqueda" placeholder="Buscar por nombre o RUN…" fluid /></span><Select v-model="filtroGrado" :options="opcionesGrado" placeholder="Todos los grados" show-clear /><Select v-model="filtroUnidad" :options="opcionesUnidad" placeholder="Todas las unidades" show-clear /><Button label="Limpiar" icon="pi pi-filter-slash" severity="secondary" outlined @click="limpiarFiltros" /><Button icon="pi pi-refresh" severity="secondary" outlined :loading="cargandoDatos" aria-label="Actualizar" @click="recargarCalificados" /></section>
        <Card class="hv-table-card"><template #content><DataTable :value="calificadosFiltrados" paginator :rows="10" striped-rows responsive-layout="scroll" :loading="cargandoDatos" empty-message="No existen Hojas de Vida administradas en este período."><Column field="grado" header="Grado" sortable /><Column field="nombre" header="Nombre completo" sortable /><Column field="run" header="RUN" /><Column field="unidad" header="Unidad" sortable /><Column field="estado" header="Estado"><template #body="{ data }"><Tag :value="data.estado" :severity="data.estado === 'ACTIVO' ? 'success' : 'secondary'" /></template></Column><Column header=""><template #body="{ data }"><Button label="Abrir" icon="pi pi-folder-open" size="small" @click="abrirExpediente(data)" /></template></Column></DataTable></template></Card>
      </div>

      <div v-else-if="pantalla === 'DESIGNACION'" class="hv-module-host"><DesignacionCalificadosView /></div>
      <div v-else-if="pantalla === 'EXPEDIENTE' && expedienteSeleccionadoId" class="hv-module-host"><ExpedienteDetalleView :expediente-id="expedienteSeleccionadoId" @volver="pantalla='CALIFICADOS'" @abrir-instrumento="abrirInstrumento" @abrir-evint="id => { instrumentoEvintSeleccionadoId=id; pantalla='EVINT' }" @abrir-hoja-vida="abrirHojaVida" @nueva-anotacion="abrirAnotacion" /></div>
      <div v-else-if="pantalla === 'HOJA_VIDA' && hojaVidaSeleccionadaId" class="hv-module-host"><HojaVidaView :hoja-vida-id="hojaVidaSeleccionadaId" @volver="pantalla='EXPEDIENTE'" @nueva-anotacion="abrirAnotacion" /></div>
      <div v-else-if="pantalla === 'ANOTACION' && hojaVidaSeleccionadaId" class="hv-module-host"><FormularioAnotacionView :hoja-vida-inicial-id="hojaVidaSeleccionadaId" /></div>
      <div v-else-if="pantalla === 'EVINT' && instrumentoEvintSeleccionadoId" class="hv-module-host"><EvintView :instrumento-id="instrumentoEvintSeleccionadoId" @volver="pantalla='EXPEDIENTE'" /></div>
      <div v-else-if="pantalla === 'HC1' && hojaVidaSeleccionadaId" class="hv-module-host"><Hc1View :hoja-vida-id="hojaVidaSeleccionadaId" @volver="pantalla='EXPEDIENTE'" /></div>
      <div v-else-if="pantalla === 'HC2' && hojaVidaSeleccionadaId" class="hv-module-host"><Hc2View :hoja-vida-id="hojaVidaSeleccionadaId" @volver="pantalla='EXPEDIENTE'" /></div>
      <div v-else-if="pantalla === 'HAM' && hojaVidaSeleccionadaId" class="hv-module-host"><HamView :hoja-vida-id="hojaVidaSeleccionadaId" @volver="pantalla='EXPEDIENTE'" /></div>
      <div v-else-if="pantalla === 'HAPSEM' && hojaVidaSeleccionadaId" class="hv-module-host"><HapsemView :hoja-vida-id="hojaVidaSeleccionadaId" @volver="pantalla='EXPEDIENTE'" /></div>
      <div v-else-if="pantalla === 'RESOLUCIONES'" class="hv-module-host"><ResolucionesView @nueva-resolucion="abrirNuevaResolucion" @abrir-resolucion="abrirResolucion" @editar-resolucion="abrirResolucion" @imprimir-resolucion="abrirResolucion" @crear-anotacion="abrirNuevaResolucion" /></div>
      <div v-else-if="pantalla === 'RESOLUCION_FORMULARIO'" class="hv-module-host"><ResolucionFormularioView :resolucion-id="resolucionSeleccionadaId" @volver="abrirResoluciones" @guardada="abrirResolucion" @emitida="abrirResolucion" /></div>
      <div v-else-if="pantalla === 'CONFIGURACION'" class="hv-module-host"><ConfiguracionSistemaView @volver="pantalla='CALIFICADOS'" /></div>
      <div v-else-if="pantalla === 'ADMIN_USUARIOS' && esAdmin" class="hv-module-host"><UsuariosView /></div>
    </section>

    <footer class="hv-global-statusbar hv-statusbar-app"><span><i :class="baseDatosConectada ? 'hv-status-online' : 'hv-status-offline'" /> {{ baseDatosConectada ? 'Conectado a HVDigital Server' : 'Servidor sin conexión' }}</span><span>Período: {{ periodoSeleccionado?.nombre ?? 'Sin período' }} <strong v-if="periodoSeleccionado">({{ periodoSeleccionado.estado }})</strong></span><span>{{ usuario }} · v{{ versionAplicacion }}</span></footer>
  </div>
</template>
