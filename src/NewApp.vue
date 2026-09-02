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
import PerfilUsuarioView from './views/Perfil/PerfilUsuarioView.vue'
import NotasTareasPanel from './components/notas/NotasTareasPanel.vue'

import { obtenerEstadoConfiguracionInicial } from './services/configuracionInicial'
import { listarCalificadosUi, listarPeriodosUi, seleccionarPeriodoUi, type CalificadoUi, type PeriodoUi } from './services/nuevaInterfaz'
import { cambiarEstadoPeriodoAdmin, crearPeriodoAdmin } from './services/periodosAdmin'
import { obtenerExpedienteDetalle, obtenerInstrumentoExpediente } from './services/expedienteDetalle'
import { cerrarSesionWeb, restaurarSesionWeb } from './web/api'
import type { InstrumentoExpedienteDetalle } from './types/expedienteDetalle'

type RolUsuario = 'ADMIN' | 'CALIFICADOR'
type Pantalla =
  | 'CARGANDO' | 'LOGIN' | 'CONFIGURACION_INICIAL' | 'PERIODOS'
  | 'CALIFICADOS' | 'DESIGNACION' | 'NOTAS' | 'EXPEDIENTE' | 'HOJA_VIDA' | 'ANOTACION'
  | 'EVINT' | 'HC1' | 'HC2' | 'HAM' | 'HAPSEM' | 'RESOLUCIONES'
  | 'RESOLUCION_FORMULARIO' | 'CONFIGURACION' | 'ADMIN_USUARIOS' | 'PERFIL'

interface ResultadoLoginLocal {
  autenticado: boolean; usuario: string; mensaje: string; usuarioId?: number; rol?: RolUsuario
  calificadorDirectoId?: number | null; nombreMostrar?: string | null
}

const versionAplicacion = '0.4.2'
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
const filtrosMovilesAbiertos = ref(false)
const menuUsuarioMovilAbierto = ref(false)
const menuMasMovilAbierto = ref(false)
const cargandoDatos = ref(false)
const administrandoPeriodo = ref(false)
const CLAVE_USUARIO_RECORDADO = 'hvdigital.usuario-recordado'

const modoSoloLectura = computed(() => periodoSeleccionado.value?.estado === 'CERRADO')
const expedienteSeleccionadoId = computed(() => calificadoSeleccionado.value?.expedienteId ?? null)
const hojaVidaSeleccionadaId = computed(() => calificadoSeleccionado.value?.hojaVidaId ?? null)
const opcionesGrado = computed(() => [...new Set(calificados.value.map(item => item.grado))].sort())
const opcionesUnidad = computed(() => [...new Set(calificados.value.map(item => item.unidad))].sort())
const esAdmin = computed(() => rolUsuario.value === 'ADMIN')
const inicialesUsuario = computed(() => {
  const base = (nombreUsuario.value || usuario.value).trim().split(/\s+/).filter(Boolean)
  return (base.length > 1 ? `${base[0][0]}${base[base.length - 1][0]}` : base[0]?.slice(0, 2) || 'HV').toUpperCase()
})
const calificadosFiltrados = computed(() => {
  const q = textoBusqueda.value.trim().toLocaleLowerCase('es')
  return calificados.value.filter(item => {
    const texto = !q || [item.nombre, item.run, item.grado, item.unidad].some(v => v.toLocaleLowerCase('es').includes(q))
    return texto && (!filtroGrado.value || item.grado === filtroGrado.value) && (!filtroUnidad.value || item.unidad === filtroUnidad.value)
  })
})
const dentroExpediente = computed(() => ['EXPEDIENTE','HOJA_VIDA','ANOTACION','EVINT','HC1','HC2','HAM','HAPSEM','RESOLUCIONES','RESOLUCION_FORMULARIO'].includes(pantalla.value))
const menuSecundarioActivo = computed(() => ['evint-1','evint-2','hc1','hc2','ham','hapsem','resoluciones'].includes(menuActivo.value))

const menuItems = computed(() => {
  if (dentroExpediente.value) return [
    { id: 'volver', label: 'Volver', icon: 'pi pi-arrow-left' },
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
  return [
    { id: 'hojas-vida', label: 'Hojas de Vida', icon: 'pi pi-book' },
    { id: 'designacion', label: 'Agregar personal', icon: 'pi pi-user-plus' },
    { id: 'notas', label: 'Notas', icon: 'pi pi-sticky-note' },
    { id: 'periodos', label: 'Períodos', icon: 'pi pi-calendar' },
  ]
})
const menuMovilPrincipal = computed(() => dentroExpediente.value
  ? [
      { id: 'resumen', label: 'Resumen', icon: 'pi pi-user' },
      { id: 'hoja-vida', label: 'Hoja de Vida', icon: 'pi pi-book' },
      { id: 'anotaciones', label: 'Anotar', icon: 'pi pi-file-edit' },
      { id: 'mas', label: 'Más', icon: 'pi pi-ellipsis-h' },
    ]
  : [
      { id: 'hojas-vida', label: 'Hojas', icon: 'pi pi-book' },
      { id: 'notas', label: 'Notas', icon: 'pi pi-sticky-note' },
      { id: 'periodos', label: 'Períodos', icon: 'pi pi-calendar' },
      { id: 'designacion', label: 'Agregar', icon: 'pi pi-user-plus' },
    ])
const menuMovilMas = [
  { id: 'evint-1', label: 'EVINT 1', icon: 'pi pi-chart-bar' },
  { id: 'evint-2', label: 'EVINT 2', icon: 'pi pi-chart-line' },
  { id: 'hc1', label: 'HC1', icon: 'pi pi-clipboard' },
  { id: 'hc2', label: 'HC2', icon: 'pi pi-clipboard' },
  { id: 'ham', label: 'HAM', icon: 'pi pi-star' },
  { id: 'hapsem', label: 'HAPSEM', icon: 'pi pi-heart' },
  { id: 'resoluciones', label: 'Resoluciones', icon: 'pi pi-file' },
]

function cerrarMenusMoviles(): void { menuUsuarioMovilAbierto.value = false; menuMasMovilAbierto.value = false }
function alternarMenuUsuario(): void { menuMasMovilAbierto.value = false; menuUsuarioMovilAbierto.value = !menuUsuarioMovilAbierto.value }
function alternarMenuMas(): void { menuUsuarioMovilAbierto.value = false; menuMasMovilAbierto.value = !menuMasMovilAbierto.value }

async function cargarContextoAutenticado(periodoActivoId?: number | null): Promise<void> {
  const estado = await obtenerEstadoConfiguracionInicial()
  const perfilExiste = Boolean(estado.calificador_directo_id)
  if (estado.estado === 'NO_CONFIGURADA' || (estado.estado === 'EN_PROGRESO' && !perfilExiste)) { pantalla.value = 'CONFIGURACION_INICIAL'; return }
  periodos.value = await listarPeriodosUi()
  const idActivo = periodoActivoId ?? estado.periodo_activo_id ?? null
  const activo = idActivo ? periodos.value.find(p => p.id === Number(idActivo)) : null
  if (activo) await seleccionarPeriodo(activo)
  else { periodoSeleccionado.value = null; menuActivo.value = 'periodos'; pantalla.value = 'PERIODOS' }
}

async function inicializarAplicacion(): Promise<void> {
  const recordado = localStorage.getItem(CLAVE_USUARIO_RECORDADO)
  if (recordado) { usuario.value = recordado; recordarSesion.value = true }
  try { const r = await fetch('/api/health'); baseDatosConectada.value = r.ok } catch { baseDatosConectada.value = false }
  const sesion = await restaurarSesionWeb()
  if (!sesion) { pantalla.value = 'LOGIN'; return }
  usuario.value = sesion.usuario; rolUsuario.value = sesion.rol; nombreUsuario.value = sesion.nombreMostrar?.trim() || sesion.usuario
  document.documentElement.dataset.hvRole = sesion.rol
  try { await cargarContextoAutenticado() } catch (e) { errorCarga.value = e instanceof Error ? e.message : String(e); pantalla.value = 'PERIODOS' }
}

async function iniciarSesion(): Promise<void> {
  errorLogin.value = ''
  if (!usuario.value.trim() || !contrasena.value) { errorLogin.value = 'Ingrese usuario y contraseña.'; return }
  autenticando.value = true
  try {
    const resultado = await invoke<ResultadoLoginLocal>('login_local', { usuario: usuario.value, password: contrasena.value })
    if (!resultado.autenticado) { errorLogin.value = resultado.mensaje || 'Acceso no autorizado.'; return }
    usuario.value = resultado.usuario; rolUsuario.value = resultado.rol ?? 'CALIFICADOR'; nombreUsuario.value = resultado.nombreMostrar?.trim() || resultado.usuario; contrasena.value = ''
    document.documentElement.dataset.hvRole = rolUsuario.value
    if (recordarSesion.value) localStorage.setItem(CLAVE_USUARIO_RECORDADO, resultado.usuario); else localStorage.removeItem(CLAVE_USUARIO_RECORDADO)
    baseDatosConectada.value = true; await cargarContextoAutenticado()
  } catch (e) { errorLogin.value = e instanceof Error ? e.message : String(e) } finally { autenticando.value = false }
}

async function recargarPeriodos(): Promise<void> {
  cargandoDatos.value = true; errorCarga.value = ''
  try { const globalId = periodoSeleccionado.value?.globalId ?? null; periodos.value = await listarPeriodosUi(); if (globalId) periodoSeleccionado.value = periodos.value.find(p => p.globalId === globalId) ?? null }
  catch (e) { errorCarga.value = e instanceof Error ? e.message : String(e) } finally { cargandoDatos.value = false }
}
async function crearPeriodoGlobal(): Promise<void> {
  if (!esAdmin.value || administrandoPeriodo.value) return
  const entrada = window.prompt('Año de inicio del nuevo período global:', String(new Date().getFullYear()))
  if (entrada == null) return
  const anio = Number.parseInt(entrada.trim(), 10)
  if (!Number.isInteger(anio)) return window.alert('Ingrese un año válido.')
  administrandoPeriodo.value = true; errorCarga.value = ''
  try { await crearPeriodoAdmin(anio); await recargarPeriodos() } catch (e) { errorCarga.value = e instanceof Error ? e.message : String(e) } finally { administrandoPeriodo.value = false }
}
async function cambiarEstadoGlobal(periodo: PeriodoUi): Promise<void> {
  if (!esAdmin.value || administrandoPeriodo.value) return
  const nuevoEstado = periodo.estado === 'ABIERTO' ? 'CERRADO' : 'ABIERTO'
  if (!window.confirm(`¿Confirma ${nuevoEstado === 'ABIERTO' ? 'abrir' : 'cerrar'} el período ${periodo.nombre} para todos los calificadores?`)) return
  administrandoPeriodo.value = true; errorCarga.value = ''
  try { await cambiarEstadoPeriodoAdmin(periodo.globalId, nuevoEstado); await recargarPeriodos() } catch (e) { errorCarga.value = e instanceof Error ? e.message : String(e) } finally { administrandoPeriodo.value = false }
}
async function seleccionarPeriodo(periodo: PeriodoUi): Promise<void> {
  cargandoDatos.value = true; errorCarga.value = ''
  try { await seleccionarPeriodoUi(periodo.id); periodoSeleccionado.value = periodo; calificados.value = await listarCalificadosUi(periodo.id); calificadoSeleccionado.value = null; menuActivo.value = 'hojas-vida'; pantalla.value = 'CALIFICADOS' }
  catch (e) { errorCarga.value = e instanceof Error ? e.message : 'No fue posible abrir el período.' } finally { cargandoDatos.value = false }
}
async function recargarCalificados(): Promise<void> { if (!periodoSeleccionado.value) return; cargandoDatos.value = true; try { calificados.value = await listarCalificadosUi(periodoSeleccionado.value.id) } finally { cargandoDatos.value = false } }
function abrirExpediente(item: CalificadoUi): void { cerrarMenusMoviles(); calificadoSeleccionado.value = item; menuActivo.value = 'resumen'; pantalla.value = 'EXPEDIENTE' }
async function asegurarHojaVida(): Promise<number | null> { if (hojaVidaSeleccionadaId.value) return hojaVidaSeleccionadaId.value; if (!expedienteSeleccionadoId.value) return null; const expediente = await obtenerExpedienteDetalle(expedienteSeleccionadoId.value); const id = expediente?.hoja_vida_id ?? null; if (id && calificadoSeleccionado.value) calificadoSeleccionado.value = { ...calificadoSeleccionado.value, hojaVidaId: id }; return id }
async function abrirHojaVida(): Promise<void> { if (await asegurarHojaVida()) { menuActivo.value = 'hoja-vida'; pantalla.value = 'HOJA_VIDA' } }
async function abrirAnotacion(): Promise<void> { if (modoSoloLectura.value) return window.alert('El período está cerrado y solo permite lectura.'); if (await asegurarHojaVida()) { menuActivo.value = 'anotaciones'; pantalla.value = 'ANOTACION' } }
async function abrirEvint(numero: 1 | 2): Promise<void> { if (!expedienteSeleccionadoId.value) return; const instrumento = await obtenerInstrumentoExpediente(expedienteSeleccionadoId.value, 'EVINT', numero); if (!instrumento) return window.alert(`El expediente no contiene EVINT ${numero}.`); instrumentoEvintSeleccionadoId.value = instrumento.instrumento_id; menuActivo.value = `evint-${numero}`; pantalla.value = 'EVINT' }
async function abrirDocumento(tipo: 'HC1'|'HC2'|'HAM'|'HAPSEM'): Promise<void> { if (await asegurarHojaVida()) { menuActivo.value = tipo.toLowerCase(); pantalla.value = tipo } }
async function abrirInstrumento(i: InstrumentoExpedienteDetalle): Promise<void> { const tipo = i.tipo_instrumento.trim().toUpperCase(); if (['HOJA_VIDA','HOJA DE VIDA','HV'].includes(tipo)) await abrirHojaVida(); else if (tipo === 'EVINT') { instrumentoEvintSeleccionadoId.value = i.instrumento_id; pantalla.value = 'EVINT' } else if (['HC1','HC2','HAM','HAPSEM'].includes(tipo)) await abrirDocumento(tipo as 'HC1'|'HC2'|'HAM'|'HAPSEM') }
function abrirResoluciones(): void { resolucionSeleccionadaId.value = null; menuActivo.value = 'resoluciones'; pantalla.value = 'RESOLUCIONES' }
function abrirNuevaResolucion(): void { if (modoSoloLectura.value) return window.alert('El período está cerrado y solo permite lectura.'); resolucionSeleccionadaId.value = null; pantalla.value = 'RESOLUCION_FORMULARIO' }
function abrirResolucion(id: number): void { resolucionSeleccionadaId.value = id; pantalla.value = 'RESOLUCION_FORMULARIO' }

async function manejarMenu(id: string): Promise<void> {
  if (id === 'mas') { alternarMenuMas(); return }
  cerrarMenusMoviles()
  menuActivo.value = id
  if (id === 'volver' || id === 'hojas-vida') { pantalla.value = periodoSeleccionado.value ? 'CALIFICADOS' : 'PERIODOS'; menuActivo.value = periodoSeleccionado.value ? 'hojas-vida' : 'periodos' }
  else if (id === 'periodos') { await recargarPeriodos(); pantalla.value = 'PERIODOS' }
  else if (id === 'notas') { if (!periodoSeleccionado.value) return window.alert('Seleccione primero un período.'); pantalla.value = 'NOTAS' }
  else if (id === 'configuracion') pantalla.value = 'CONFIGURACION'
  else if (id === 'perfil') { menuActivo.value = 'perfil'; pantalla.value = 'PERFIL' }
  else if (id === 'admin-usuarios' && esAdmin.value) { menuActivo.value = 'admin-usuarios'; pantalla.value = 'ADMIN_USUARIOS' }
  else if (id === 'designacion') { if (!periodoSeleccionado.value) return window.alert('Seleccione primero un período.'); if (modoSoloLectura.value) return window.alert('No se puede agregar personal a un período cerrado.'); pantalla.value = 'DESIGNACION' }
  else if (id === 'resumen') pantalla.value = 'EXPEDIENTE'
  else if (id === 'hoja-vida') await abrirHojaVida(); else if (id === 'anotaciones') await abrirAnotacion(); else if (id === 'evint-1') await abrirEvint(1); else if (id === 'evint-2') await abrirEvint(2)
  else if (['hc1','hc2','ham','hapsem'].includes(id)) await abrirDocumento(id.toUpperCase() as 'HC1'|'HC2'|'HAM'|'HAPSEM'); else if (id === 'resoluciones') abrirResoluciones()
}
async function cerrarSesion(): Promise<void> { cerrarMenusMoviles(); await cerrarSesionWeb(); delete document.documentElement.dataset.hvRole; contrasena.value='';periodoSeleccionado.value=null;calificadoSeleccionado.value=null;calificados.value=[];periodos.value=[];menuActivo.value='hojas-vida';errorLogin.value='';nombreUsuario.value='';rolUsuario.value='CALIFICADOR';if(!recordarSesion.value){usuario.value='';localStorage.removeItem(CLAVE_USUARIO_RECORDADO)};pantalla.value='LOGIN' }
function limpiarFiltros(): void { textoBusqueda.value='';filtroGrado.value=null;filtroUnidad.value=null;filtrosMovilesAbiertos.value=false }
onMounted(() => void inicializarAplicacion())
</script>

<template>
  <div v-if="pantalla === 'CARGANDO'" class="hv-centered-page"><i class="pi pi-spin pi-spinner hv-loading-icon" /><strong>Iniciando HVDigital</strong><span>Restaurando su espacio de trabajo…</span></div>
  <main v-else-if="pantalla === 'LOGIN'" class="hv-login-page">
    <section class="hv-login-brand-panel"><div class="hv-login-brand-content"><div class="hv-login-brand-top"><div class="hv-login-emblem"><span>HV</span></div><div class="hv-login-product"><strong>HVDigital</strong><small>Gestión personal de Hojas de Vida</small></div></div><h1>Su espacio de trabajo, ordenado y seguro.</h1><p>Administre Hojas de Vida, instrumentos y períodos desde una interfaz diseñada para trabajo diario.</p><div class="hv-login-feature-list"><div class="hv-login-feature"><i class="pi pi-lock" /><span>Acceso individual y datos aislados por usuario</span></div><div class="hv-login-feature"><i class="pi pi-book" /><span>Hojas de Vida e instrumentos en un solo lugar</span></div><div class="hv-login-feature"><i class="pi pi-history" /><span>Trazabilidad y respaldo de la información</span></div></div></div></section>
    <section class="hv-login-form-panel"><div class="hv-login-form-wrapper"><div class="hv-login-heading"><span class="hv-eyebrow">Acceso seguro</span><h2>Bienvenido</h2><p>Ingrese con la cuenta asignada para continuar a su espacio de trabajo.</p></div><div class="hv-form-stack"><div class="hv-login-field"><label for="usuario">Usuario</label><div class="hv-login-input-wrap"><i class="pi pi-user" /><InputText id="usuario" v-model="usuario" autocomplete="username" fluid :disabled="autenticando" placeholder="Ingrese su usuario" /></div></div><div class="hv-login-field"><label for="contrasena">Contraseña</label><div class="hv-login-input-wrap"><i class="pi pi-key" /><Password input-id="contrasena" v-model="contrasena" :feedback="false" toggle-mask fluid :disabled="autenticando" placeholder="Ingrese su contraseña" @keyup.enter="iniciarSesion" /></div></div><div class="hv-login-options"><label class="hv-checkbox-label"><input v-model="recordarSesion" type="checkbox" :disabled="autenticando"><span>Recordar usuario</span></label><span class="hv-status-group"><i :class="baseDatosConectada ? 'hv-status-online' : 'hv-status-offline'" /> {{ baseDatosConectada ? 'Servidor disponible' : 'Sin conexión' }}</span></div><div v-if="errorLogin" class="hv-profile-feedback is-error"><i class="pi pi-exclamation-circle" /><span>{{ errorLogin }}</span></div><Button class="hv-login-submit" label="Ingresar a HVDigital" icon="pi pi-arrow-right" icon-pos="right" fluid :loading="autenticando" @click="iniciarSesion" /><div class="hv-login-security-note"><i class="pi pi-shield" /><span>La sesión se mantiene únicamente en este navegador y se invalida al cerrar sesión.</span></div></div></div></section>
    <footer class="hv-global-statusbar"><span>HVDigital Server</span><span>Acceso privado por calificador</span><span>Versión {{ versionAplicacion }}</span></footer>
  </main>
  <ConfiguracionInicialView v-else-if="pantalla === 'CONFIGURACION_INICIAL'" />
  <div v-else class="hv-app-shell hv-app-shell-with-status">
    <aside class="hv-sidebar">
      <div class="hv-sidebar-brand"><div class="hv-brand-mark hv-brand-mark-small">HV</div><div><strong>HVDigital</strong><small>{{ dentroExpediente ? 'Expediente' : 'Mi espacio' }}</small></div></div>
      <nav class="hv-sidebar-menu"><div class="hv-sidebar-menu-section">{{ dentroExpediente ? 'Expediente' : 'Mi espacio' }}</div><button v-for="item in menuItems" :key="item.id" type="button" :class="['hv-sidebar-item',{ 'hv-sidebar-item-active': menuActivo === item.id }]" @click="manejarMenu(item.id)"><i :class="item.icon" /><span>{{ item.label }}</span></button><template v-if="!dentroExpediente && esAdmin"><div class="hv-sidebar-menu-section">Administración</div><button type="button" :class="['hv-sidebar-item',{ 'hv-sidebar-item-active': menuActivo === 'admin-usuarios' }]" @click="manejarMenu('admin-usuarios')"><i class="pi pi-users" /><span>Usuarios y accesos</span></button></template><template v-if="!dentroExpediente"><div class="hv-sidebar-menu-section">Sistema</div><button type="button" :class="['hv-sidebar-item',{ 'hv-sidebar-item-active': menuActivo === 'configuracion' }]" @click="manejarMenu('configuracion')"><i class="pi pi-cog" /><span>Configuración</span></button></template></nav>
      <div class="hv-sidebar-context"><button type="button" class="hv-sidebar-profile-button" :class="{ 'hv-sidebar-item-active': menuActivo === 'perfil' }" @click="manejarMenu('perfil')"><span class="hv-user-avatar">{{ inicialesUsuario }}</span><span class="hv-sidebar-profile-copy"><strong>{{ nombreUsuario || usuario }}</strong><small>{{ rolUsuario === 'ADMIN' ? 'Administrador' : 'Calificador' }} · Mi perfil</small></span><i class="pi pi-chevron-right" /></button><button type="button" class="hv-sidebar-logout" @click="cerrarSesion"><i class="pi pi-sign-out" /> Cerrar sesión</button></div>
    </aside>

    <section class="hv-workspace">
      <header class="hv-topbar">
        <button v-if="dentroExpediente" type="button" class="hv-mobile-only hv-mobile-back" aria-label="Volver a Hojas de Vida" @click="manejarMenu('volver')"><i class="pi pi-chevron-left" /></button>
        <div class="hv-topbar-copy"><strong>{{ dentroExpediente ? calificadoSeleccionado?.nombre : pantalla === 'PERFIL' ? 'Mi perfil' : pantalla === 'NOTAS' ? 'Notas del calificador' : pantalla === 'ADMIN_USUARIOS' ? 'Usuarios y accesos' : pantalla === 'CONFIGURACION' ? 'Configuración' : pantalla === 'PERIODOS' ? 'Períodos' : 'Hojas de Vida' }}</strong><small>{{ pantalla === 'PERFIL' ? 'Cuenta y seguridad' : pantalla === 'NOTAS' ? periodoSeleccionado?.nombre : periodoSeleccionado?.nombre ?? 'Seleccione un período de trabajo' }}</small></div>
        <div class="hv-topbar-actions hv-desktop-only"><Tag v-if="esAdmin" value="ADMIN" severity="info" /><Tag v-if="modoSoloLectura && pantalla !== 'PERFIL'" value="Solo lectura" severity="warn" /></div>
        <button type="button" class="hv-mobile-only hv-mobile-user-trigger" aria-label="Menú de usuario" @click="alternarMenuUsuario"><span>{{ inicialesUsuario }}</span></button>
      </header>

      <div v-if="pantalla === 'PERIODOS'" class="hv-content hv-periods-workspace"><header class="hv-page-heading hv-page-heading-compact"><div><span class="hv-eyebrow">{{ esAdmin ? 'Administración global' : 'Mi espacio de trabajo' }}</span><h1>Períodos</h1><p>{{ esAdmin ? 'Cree, abra o cierre los períodos disponibles para todos los calificadores.' : 'Seleccione uno de los períodos publicados por el administrador.' }}</p></div><div class="hv-period-admin-actions"><Button v-if="esAdmin" label="Crear período" icon="pi pi-plus" :loading="administrandoPeriodo" @click="crearPeriodoGlobal" /><Button icon="pi pi-refresh" severity="secondary" outlined aria-label="Actualizar períodos" :loading="cargandoDatos" @click="recargarPeriodos" /></div></header><small v-if="errorCarga" class="hv-error">{{ errorCarga }}</small><section class="hv-period-list"><Card v-for="periodo in periodos" :key="periodo.id" :class="['hv-period-row',{ 'hv-period-row-active': periodoSeleccionado?.id === periodo.id }]"><template #content><div class="hv-period-row-content"><div><div class="hv-period-title-line"><strong>{{ periodo.nombre }}</strong><Tag v-if="periodoSeleccionado?.id === periodo.id" value="En uso" severity="info" /><Tag :value="periodo.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'" :severity="periodo.estado === 'ABIERTO' ? 'success' : 'secondary'" /></div><small>{{ periodo.fechaInicio }} — {{ periodo.fechaTermino }}</small><p>{{ periodo.estado === 'ABIERTO' ? 'Disponible para administrar Hojas de Vida.' : 'Disponible únicamente en modo de consulta.' }}</p></div><div class="hv-period-admin-actions"><Button v-if="esAdmin" :label="periodo.estado === 'ABIERTO' ? 'Cerrar' : 'Abrir'" :icon="periodo.estado === 'ABIERTO' ? 'pi pi-lock' : 'pi pi-lock-open'" :severity="periodo.estado === 'ABIERTO' ? 'secondary' : 'success'" outlined :loading="administrandoPeriodo" @click="cambiarEstadoGlobal(periodo)" /><Button :label="periodoSeleccionado?.id === periodo.id ? 'Continuar' : periodo.estado === 'ABIERTO' ? 'Seleccionar' : 'Consultar'" :icon="periodoSeleccionado?.id === periodo.id ? 'pi pi-arrow-right' : periodo.estado === 'ABIERTO' ? 'pi pi-check-circle' : 'pi pi-eye'" :loading="cargandoDatos" @click="seleccionarPeriodo(periodo)" /></div></div></template></Card></section></div>

      <div v-else-if="pantalla === 'CALIFICADOS'" class="hv-content"><header class="hv-page-heading hv-page-heading-compact"><div><span class="hv-eyebrow">{{ periodoSeleccionado?.nombre }}</span><h1>Hojas de Vida</h1><p>{{ calificadosFiltrados.length }} personas visibles en este período.</p></div><Button label="Agregar personal" icon="pi pi-user-plus" :disabled="modoSoloLectura" @click="manejarMenu('designacion')" /></header><section class="hv-filter-bar hv-desktop-only"><span class="hv-search-control"><i class="pi pi-search" /><InputText v-model="textoBusqueda" placeholder="Buscar por nombre o RUN…" fluid /></span><Select v-model="filtroGrado" :options="opcionesGrado" placeholder="Todos los grados" show-clear /><Select v-model="filtroUnidad" :options="opcionesUnidad" placeholder="Todas las unidades" show-clear /><Button label="Limpiar" icon="pi pi-filter-slash" severity="secondary" outlined @click="limpiarFiltros" /><Button icon="pi pi-refresh" severity="secondary" outlined :loading="cargandoDatos" aria-label="Actualizar" @click="recargarCalificados" /></section><section class="hv-mobile-only hv-mobile-search"><span class="hv-search-control"><i class="pi pi-search" /><InputText v-model="textoBusqueda" placeholder="Buscar personal…" fluid /></span><Button icon="pi pi-sliders-h" severity="secondary" outlined aria-label="Filtros" @click="filtrosMovilesAbiertos=!filtrosMovilesAbiertos" /></section><section v-if="filtrosMovilesAbiertos" class="hv-mobile-only hv-mobile-filters"><Select v-model="filtroGrado" :options="opcionesGrado" placeholder="Todos los grados" show-clear fluid /><Select v-model="filtroUnidad" :options="opcionesUnidad" placeholder="Todas las unidades" show-clear fluid /><Button label="Limpiar filtros" icon="pi pi-filter-slash" severity="secondary" outlined @click="limpiarFiltros" /></section><Card class="hv-table-card hv-desktop-only"><template #content><DataTable :value="calificadosFiltrados" paginator :rows="10" striped-rows responsive-layout="scroll" :loading="cargandoDatos" empty-message="No existen Hojas de Vida administradas en este período."><Column field="grado" header="Grado" sortable /><Column field="nombre" header="Nombre completo" sortable /><Column field="run" header="RUN" /><Column field="unidad" header="Unidad" sortable /><Column field="estado" header="Estado"><template #body="{ data }"><Tag :value="data.estado" :severity="data.estado === 'ACTIVO' ? 'success' : 'secondary'" /></template></Column><Column header=""><template #body="{ data }"><Button label="Abrir" icon="pi pi-folder-open" size="small" @click="abrirExpediente(data)" /></template></Column></DataTable></template></Card><section class="hv-mobile-only hv-person-list"><button v-for="item in calificadosFiltrados" :key="item.personaId" type="button" class="hv-person-card" @click="abrirExpediente(item)"><span class="hv-person-avatar">{{ item.nombre.trim().charAt(0) }}</span><span class="hv-person-main"><span class="hv-person-meta"><strong>{{ item.grado }}</strong><Tag :value="item.estado" :severity="item.estado === 'ACTIVO' ? 'success' : 'secondary'" /></span><b>{{ item.nombre }}</b><small>{{ item.run }} · {{ item.unidad }}</small></span><i class="pi pi-chevron-right" /></button><div v-if="!calificadosFiltrados.length" class="hv-empty-state"><i class="pi pi-users" /><strong>Sin resultados</strong><span>No hay personal que coincida con los filtros.</span></div></section></div>

      <div v-else-if="pantalla === 'NOTAS'" class="hv-module-host"><NotasTareasPanel modo-pagina /></div>
      <div v-else-if="pantalla === 'PERFIL'" class="hv-module-host"><PerfilUsuarioView /></div>
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
      <div v-else-if="pantalla === 'CONFIGURACION'" class="hv-module-host"><ConfiguracionSistemaView @volver="pantalla=periodoSeleccionado ? 'CALIFICADOS' : 'PERIODOS'" /></div>
      <div v-else-if="pantalla === 'ADMIN_USUARIOS' && esAdmin" class="hv-module-host"><UsuariosView /></div>
    </section>

    <nav class="hv-mobile-only hv-mobile-nav" aria-label="Navegación principal">
      <button v-for="item in menuMovilPrincipal" :key="item.id" type="button" :class="{ active: item.id === 'mas' ? menuMasMovilAbierto || menuSecundarioActivo : menuActivo === item.id }" @click="manejarMenu(item.id)"><i :class="item.icon" /><span>{{ item.label }}</span></button>
    </nav>

    <div v-if="menuUsuarioMovilAbierto" class="hv-mobile-only hv-mobile-popover-backdrop" @click="menuUsuarioMovilAbierto=false">
      <section class="hv-mobile-user-menu" @click.stop>
        <header><span class="hv-mobile-user-avatar">{{ inicialesUsuario }}</span><div><strong>{{ nombreUsuario || usuario }}</strong><small>{{ rolUsuario === 'ADMIN' ? 'Administrador' : 'Calificador' }}</small></div></header>
        <button type="button" @click="manejarMenu('perfil')"><i class="pi pi-user" /><span>Mi perfil</span><i class="pi pi-chevron-right" /></button>
        <button type="button" @click="manejarMenu('configuracion')"><i class="pi pi-cog" /><span>Configuración</span><i class="pi pi-chevron-right" /></button>
        <button v-if="esAdmin" type="button" @click="manejarMenu('admin-usuarios')"><i class="pi pi-users" /><span>Usuarios y accesos</span><i class="pi pi-chevron-right" /></button>
        <button type="button" class="danger" @click="cerrarSesion"><i class="pi pi-sign-out" /><span>Cerrar sesión</span></button>
      </section>
    </div>

    <div v-if="menuMasMovilAbierto && dentroExpediente" class="hv-mobile-only hv-mobile-sheet-backdrop" @click="menuMasMovilAbierto=false">
      <section class="hv-mobile-more-sheet" @click.stop>
        <header><div><strong>Instrumentos</strong><small>{{ calificadoSeleccionado?.grado }} {{ calificadoSeleccionado?.nombre }}</small></div><button type="button" aria-label="Cerrar" @click="menuMasMovilAbierto=false"><i class="pi pi-times" /></button></header>
        <div class="hv-mobile-more-grid"><button v-for="item in menuMovilMas" :key="item.id" type="button" :class="{ active: menuActivo === item.id }" @click="manejarMenu(item.id)"><i :class="item.icon" /><span>{{ item.label }}</span></button></div>
      </section>
    </div>

    <footer class="hv-global-statusbar hv-statusbar-app"><span><i :class="baseDatosConectada ? 'hv-status-online' : 'hv-status-offline'" /> {{ baseDatosConectada ? 'Conectado a HVDigital Server' : 'Servidor sin conexión' }}</span><span>Período: {{ periodoSeleccionado?.nombre ?? 'Sin seleccionar' }} <strong v-if="periodoSeleccionado">({{ periodoSeleccionado.estado }})</strong></span><span>{{ usuario }} · v{{ versionAplicacion }}</span></footer>
  </div>
</template>
