<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

import ConfiguracionInicialView from './views/Configuracion/ConfiguracionInicialView.vue'
import { obtenerEstadoConfiguracionInicial } from './services/configuracionInicial'

type Pantalla =
  | 'CARGANDO'
  | 'LOGIN'
  | 'CONFIGURACION_INICIAL'
  | 'SELECCION_PERIODO'
  | 'CALIFICADOS'
  | 'EXPEDIENTE'

type Periodo = {
  id: number
  nombre: string
  estado: 'ABIERTO' | 'CERRADO'
  fechaInicio: string
  fechaTermino: string
}

type Calificado = {
  id: number
  grado: string
  nombre: string
  run: string
  unidad: string
  estado: 'ACTIVO' | 'INACTIVO'
}

type Instrumento = {
  id: string
  nombre: string
  descripcion: string
  icono: string
  estado: 'COMPLETADO' | 'EN_PROCESO' | 'PENDIENTE' | 'DISPONIBLE'
}

const versionAplicacion = '0.1.0'
const pantalla = ref<Pantalla>('CARGANDO')
const usuario = ref('')
const contrasena = ref('')
const recordarSesion = ref(false)
const errorLogin = ref('')
const baseDatosConectada = ref(false)
const periodoSeleccionado = ref<Periodo | null>(null)
const calificadoSeleccionado = ref<Calificado | null>(null)
const seccionExpediente = ref('instrumentos')
const menuActivo = ref('calificados')
const textoBusqueda = ref('')
const filtroGrado = ref<string | null>(null)
const filtroUnidad = ref<string | null>(null)

const periodos = ref<Periodo[]>([
  {
    id: 1,
    nombre: 'Período de Calificaciones 2026–2027',
    estado: 'ABIERTO',
    fechaInicio: '01/05/2026',
    fechaTermino: '30/04/2027',
  },
  {
    id: 2,
    nombre: 'Período de Calificaciones 2025–2026',
    estado: 'CERRADO',
    fechaInicio: '01/05/2025',
    fechaTermino: '30/04/2026',
  },
  {
    id: 3,
    nombre: 'Período de Calificaciones 2024–2025',
    estado: 'CERRADO',
    fechaInicio: '01/05/2024',
    fechaTermino: '30/04/2025',
  },
])

const calificados = ref<Calificado[]>([
  { id: 1, grado: 'Sargento 1°', nombre: 'Juan Pérez Soto', run: '16.123.456-7', unidad: 'U.A. Logística', estado: 'ACTIVO' },
  { id: 2, grado: 'Cabo 1°', nombre: 'María González Ríos', run: '17.654.321-0', unidad: 'U.A. Operaciones', estado: 'ACTIVO' },
  { id: 3, grado: 'Cabo', nombre: 'Carlos Ramírez Díaz', run: '18.234.567-1', unidad: 'U.A. Comunicaciones', estado: 'ACTIVO' },
  { id: 4, grado: 'Soldado 1°', nombre: 'Ana Torres Muñoz', run: '19.345.678-2', unidad: 'U.A. Sanidad', estado: 'ACTIVO' },
  { id: 5, grado: 'Soldado', nombre: 'Luis Fernández Vega', run: '20.456.789-3', unidad: 'U.A. Apoyo', estado: 'ACTIVO' },
  { id: 6, grado: 'Cabo 2°', nombre: 'Pedro Morales Silva', run: '15.987.654-4', unidad: 'U.A. Personal', estado: 'ACTIVO' },
])

const instrumentos: Instrumento[] = [
  { id: 'hoja-vida', nombre: 'Hoja de Vida', descripcion: 'Registro cronológico de anotaciones.', icono: 'pi pi-book', estado: 'EN_PROCESO' },
  { id: 'evint-1', nombre: 'EVINT 1', descripcion: 'Evaluación integral N.° 1.', icono: 'pi pi-chart-bar', estado: 'COMPLETADO' },
  { id: 'evint-2', nombre: 'EVINT 2', descripcion: 'Evaluación integral N.° 2.', icono: 'pi pi-chart-line', estado: 'PENDIENTE' },
  { id: 'hc1', nombre: 'HC1', descripcion: 'Hoja de calificación N.° 1.', icono: 'pi pi-clipboard', estado: 'COMPLETADO' },
  { id: 'hc2', nombre: 'HC2', descripcion: 'Hoja de calificación N.° 2.', icono: 'pi pi-clipboard', estado: 'PENDIENTE' },
  { id: 'ham', nombre: 'HAM', descripcion: 'Hoja de aspectos militares.', icono: 'pi pi-star', estado: 'DISPONIBLE' },
  { id: 'hapsem', nombre: 'HAPSEM', descripcion: 'Hoja de aptitud psicofísica.', icono: 'pi pi-heart', estado: 'PENDIENTE' },
  { id: 'resoluciones', nombre: 'Resoluciones', descripcion: 'Resoluciones asociadas.', icono: 'pi pi-file', estado: 'DISPONIBLE' },
]

const seccionesExpediente = [
  { id: 'resumen', label: 'Resumen', icon: 'pi pi-user' },
  { id: 'instrumentos', label: 'Instrumentos', icon: 'pi pi-th-large' },
  { id: 'hoja-vida', label: 'Hoja de Vida', icon: 'pi pi-book' },
  { id: 'anotaciones', label: 'Anotaciones', icon: 'pi pi-file-edit' },
  { id: 'documentos', label: 'Documentos', icon: 'pi pi-folder' },
  { id: 'resoluciones', label: 'Resoluciones', icon: 'pi pi-file' },
]

const modoSoloLectura = computed(() => periodoSeleccionado.value?.estado === 'CERRADO')
const opcionesGrado = computed(() => [...new Set(calificados.value.map(item => item.grado))].sort())
const opcionesUnidad = computed(() => [...new Set(calificados.value.map(item => item.unidad))].sort())

const calificadosFiltrados = computed(() => {
  const consulta = textoBusqueda.value.trim().toLocaleLowerCase('es')

  return calificados.value.filter(item => {
    const coincideTexto = !consulta || [item.nombre, item.run, item.grado, item.unidad]
      .some(valor => valor.toLocaleLowerCase('es').includes(consulta))
    const coincideGrado = !filtroGrado.value || item.grado === filtroGrado.value
    const coincideUnidad = !filtroUnidad.value || item.unidad === filtroUnidad.value

    return coincideTexto && coincideGrado && coincideUnidad
  })
})

const menuItems = computed(() => {
  if (pantalla.value === 'EXPEDIENTE') {
    return [
      { id: 'volver', label: 'Volver a calificados', icon: 'pi pi-arrow-left' },
      ...seccionesExpediente,
    ]
  }

  return [
    { id: 'inicio', label: 'Inicio', icon: 'pi pi-home' },
    { id: 'calificados', label: 'Calificados', icon: 'pi pi-users' },
    { id: 'periodos', label: 'Períodos', icon: 'pi pi-calendar' },
    { id: 'configuracion', label: 'Configuración', icon: 'pi pi-cog' },
    { id: 'respaldo', label: 'Respaldo', icon: 'pi pi-cloud-upload' },
  ]
})

function severidadInstrumento(estado: Instrumento['estado']): 'success' | 'warn' | 'info' | 'secondary' {
  if (estado === 'COMPLETADO') return 'success'
  if (estado === 'PENDIENTE') return 'warn'
  if (estado === 'EN_PROCESO') return 'info'
  return 'secondary'
}

function textoEstadoInstrumento(estado: Instrumento['estado']): string {
  return estado.replace('_', ' ').toLocaleLowerCase('es').replace(/^./, letra => letra.toUpperCase())
}

async function inicializarAplicacion(): Promise<void> {
  pantalla.value = 'CARGANDO'

  try {
    await obtenerEstadoConfiguracionInicial()
    baseDatosConectada.value = true
  } catch (error) {
    console.error('No fue posible verificar la base de datos:', error)
    baseDatosConectada.value = false
  }

  pantalla.value = 'LOGIN'
}

async function iniciarSesion(): Promise<void> {
  errorLogin.value = ''

  if (!usuario.value.trim() || !contrasena.value.trim()) {
    errorLogin.value = 'Ingrese usuario y contraseña.'
    return
  }

  try {
    const estado = await obtenerEstadoConfiguracionInicial()
    baseDatosConectada.value = true

    if (estado.estado === 'NO_CONFIGURADA' || estado.estado === 'EN_PROGRESO') {
      pantalla.value = 'CONFIGURACION_INICIAL'
      return
    }

    pantalla.value = 'SELECCION_PERIODO'
  } catch (error) {
    console.error(error)
    baseDatosConectada.value = false
    errorLogin.value = 'No fue posible conectarse con la base de datos local.'
  }
}

function seleccionarPeriodo(periodo: Periodo): void {
  periodoSeleccionado.value = periodo
  calificadoSeleccionado.value = null
  menuActivo.value = 'calificados'
  pantalla.value = 'CALIFICADOS'
}

function abrirExpediente(calificado: Calificado): void {
  calificadoSeleccionado.value = calificado
  seccionExpediente.value = 'instrumentos'
  menuActivo.value = 'instrumentos'
  pantalla.value = 'EXPEDIENTE'
}

function cerrarSesion(): void {
  usuario.value = ''
  contrasena.value = ''
  periodoSeleccionado.value = null
  calificadoSeleccionado.value = null
  pantalla.value = 'LOGIN'
}

function manejarMenu(id: string): void {
  menuActivo.value = id

  if (id === 'volver' || id === 'calificados' || id === 'inicio') {
    pantalla.value = 'CALIFICADOS'
    menuActivo.value = 'calificados'
    return
  }

  if (id === 'periodos') {
    pantalla.value = 'SELECCION_PERIODO'
    return
  }

  if (pantalla.value === 'EXPEDIENTE') {
    seccionExpediente.value = id
  }
}

function limpiarFiltros(): void {
  textoBusqueda.value = ''
  filtroGrado.value = null
  filtroUnidad.value = null
}

onMounted(() => void inicializarAplicacion())
</script>

<template>
  <div v-if="pantalla === 'CARGANDO'" class="hv-centered-page">
    <i class="pi pi-spin pi-spinner hv-loading-icon" />
    <strong>Iniciando HVDigital</strong>
    <span>Comprobando la base de datos local…</span>
  </div>

  <main v-else-if="pantalla === 'LOGIN'" class="hv-login-page">
    <section class="hv-login-brand-panel">
      <div class="hv-login-emblem"><span>HV</span></div>
      <h1>HVDigital</h1>
      <p>Sistema local para la gestión de procesos de calificación.</p>
      <small>Desarrollo personal · Uso institucional local</small>
    </section>

    <section class="hv-login-form-panel">
      <div class="hv-login-form-wrapper">
        <div class="hv-login-heading">
          <span class="hv-eyebrow">Acceso seguro</span>
          <h2>Iniciar sesión</h2>
          <p>Ingrese sus credenciales para continuar.</p>
        </div>

        <div class="hv-form-stack">
          <label for="usuario">Usuario</label>
          <span class="hv-input-icon">
            <i class="pi pi-user" />
            <InputText id="usuario" v-model="usuario" autocomplete="username" placeholder="Ingrese su usuario" fluid />
          </span>

          <label for="contrasena">Contraseña</label>
          <Password input-id="contrasena" v-model="contrasena" :feedback="false" toggle-mask placeholder="Ingrese su contraseña" fluid @keyup.enter="iniciarSesion" />

          <div class="hv-login-options">
            <label class="hv-checkbox-label">
              <input v-model="recordarSesion" type="checkbox">
              <span>Recordarme</span>
            </label>
            <button type="button" class="hv-link-button">¿Olvidó su contraseña?</button>
          </div>

          <small v-if="errorLogin" class="hv-error">{{ errorLogin }}</small>
          <Button label="Iniciar sesión" icon="pi pi-sign-in" fluid @click="iniciarSesion" />
        </div>
      </div>
    </section>

    <footer class="hv-global-statusbar">
      <span class="hv-status-group"><i :class="baseDatosConectada ? 'hv-status-online' : 'hv-status-offline'" /> {{ baseDatosConectada ? 'Conectado a hvdigital.db' : 'Base de datos sin conexión' }}</span>
      <span>Período: Sin período seleccionado</span>
      <span>Versión {{ versionAplicacion }}</span>
    </footer>
  </main>

  <div v-else-if="pantalla === 'CONFIGURACION_INICIAL'" class="hv-config-wrapper">
    <div class="hv-simple-header"><strong>HVDigital</strong><span>Configuración inicial</span></div>
    <ConfiguracionInicialView />
    <footer class="hv-global-statusbar">
      <span class="hv-status-group"><i class="hv-status-online" /> Conectado a hvdigital.db</span>
      <span>Período: Sin período seleccionado</span>
      <span>Versión {{ versionAplicacion }}</span>
    </footer>
  </div>

  <main v-else-if="pantalla === 'SELECCION_PERIODO'" class="hv-selection-page">
    <header class="hv-simple-header">
      <strong>HVDigital</strong>
      <Button label="Cerrar sesión" icon="pi pi-sign-out" severity="secondary" text @click="cerrarSesion" />
    </header>

    <section class="hv-selection-content">
      <div class="hv-page-heading">
        <div>
          <span class="hv-eyebrow">Períodos de calificación</span>
          <h1>Seleccione el período</h1>
          <p>Los períodos cerrados estarán disponibles únicamente para consulta.</p>
        </div>
      </div>

      <div class="hv-period-list">
        <article v-for="periodo in periodos" :key="periodo.id" class="hv-period-row" :class="{ 'hv-period-row-active': periodo.estado === 'ABIERTO' }">
          <div class="hv-period-icon"><i class="pi pi-calendar" /></div>
          <div class="hv-period-info">
            <div class="hv-period-title-row">
              <h2>{{ periodo.nombre }}</h2>
              <Tag :value="periodo.estado === 'ABIERTO' ? 'Activo' : 'Cerrado'" :severity="periodo.estado === 'ABIERTO' ? 'success' : 'secondary'" />
            </div>
            <p>{{ periodo.fechaInicio }} — {{ periodo.fechaTermino }}</p>
            <small>{{ periodo.estado === 'ABIERTO' ? 'Período habilitado para trabajar y registrar información.' : 'Período cerrado disponible en modo solo lectura.' }}</small>
          </div>
          <Button :label="periodo.estado === 'ABIERTO' ? 'Ingresar' : 'Solo lectura'" :icon="periodo.estado === 'ABIERTO' ? 'pi pi-arrow-right' : 'pi pi-eye'" icon-pos="right" :outlined="periodo.estado === 'CERRADO'" @click="seleccionarPeriodo(periodo)" />
        </article>
      </div>
    </section>

    <footer class="hv-global-statusbar">
      <span class="hv-status-group"><i class="hv-status-online" /> Conectado a hvdigital.db</span>
      <span>Período: Sin período seleccionado</span>
      <span>Versión {{ versionAplicacion }}</span>
    </footer>
  </main>

  <div v-else class="hv-app-shell">
    <aside class="hv-sidebar">
      <div class="hv-sidebar-brand">
        <div class="hv-brand-mark hv-brand-mark-small">HV</div>
        <div><strong>HVDigital</strong><small>{{ pantalla === 'EXPEDIENTE' ? 'Expediente individual' : 'Gestión de calificados' }}</small></div>
      </div>

      <nav class="hv-sidebar-menu">
        <button v-for="item in menuItems" :key="item.id" type="button" class="hv-sidebar-item" :class="{ 'hv-sidebar-item-active': menuActivo === item.id }" @click="manejarMenu(item.id)">
          <i :class="item.icon" /><span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="hv-sidebar-user">
        <div class="hv-user-avatar">{{ usuario.slice(0, 2).toUpperCase() || 'AD' }}</div>
        <div><small>Usuario</small><strong>{{ usuario || 'Administrador' }}</strong></div>
      </div>
      <button type="button" class="hv-sidebar-logout" @click="cerrarSesion"><i class="pi pi-sign-out" /> Cerrar sesión</button>
    </aside>

    <section class="hv-workspace">
      <header class="hv-topbar">
        <div>
          <strong>{{ pantalla === 'EXPEDIENTE' ? `Expediente · ${calificadoSeleccionado?.nombre}` : 'Calificados' }}</strong>
          <small>{{ pantalla === 'EXPEDIENTE' ? `${calificadoSeleccionado?.grado} · ${calificadoSeleccionado?.run}` : periodoSeleccionado?.nombre }}</small>
        </div>
        <div class="hv-topbar-actions"><Tag v-if="modoSoloLectura" value="Solo lectura" severity="warn" /><i class="pi pi-bell" /></div>
      </header>

      <div v-if="pantalla === 'CALIFICADOS'" class="hv-content">
        <header class="hv-page-heading hv-page-heading-compact">
          <div><span class="hv-eyebrow">Personal del período</span><h1>Calificados</h1><p>Seleccione una persona para abrir su expediente e instrumentos.</p></div>
          <Button label="Nuevo calificado" icon="pi pi-plus" :disabled="modoSoloLectura" />
        </header>

        <section class="hv-filter-panel">
          <span class="hv-search-field"><i class="pi pi-search" /><InputText v-model="textoBusqueda" placeholder="Buscar por nombre, RUN, grado o unidad…" fluid /></span>
          <Select v-model="filtroGrado" :options="opcionesGrado" placeholder="Todos los grados" show-clear fluid />
          <Select v-model="filtroUnidad" :options="opcionesUnidad" placeholder="Todas las unidades" show-clear fluid />
          <Button label="Limpiar" icon="pi pi-filter-slash" severity="secondary" outlined @click="limpiarFiltros" />
        </section>

        <Card class="hv-table-card">
          <template #content>
            <DataTable :value="calificadosFiltrados" paginator :rows="10" striped-rows responsive-layout="scroll" data-key="id">
              <Column header="N.°"><template #body="slotProps">{{ slotProps.index + 1 }}</template></Column>
              <Column field="grado" header="Grado" sortable />
              <Column field="nombre" header="Nombre completo" sortable />
              <Column field="run" header="RUN" />
              <Column field="unidad" header="Unidad / Dependencia" sortable />
              <Column field="estado" header="Estado"><template #body="slotProps"><Tag :value="slotProps.data.estado" severity="success" /></template></Column>
              <Column header="Acciones" style="width: 8rem"><template #body="slotProps"><Button label="Ver" icon="pi pi-eye" size="small" @click="abrirExpediente(slotProps.data)" /></template></Column>
              <template #empty><div class="hv-empty-table"><i class="pi pi-users" /><strong>No se encontraron calificados</strong><span>Modifique los filtros o agregue un nuevo calificado.</span></div></template>
            </DataTable>
          </template>
        </Card>
      </div>

      <div v-else-if="pantalla === 'EXPEDIENTE'" class="hv-content">
        <div class="hv-breadcrumb"><button type="button" @click="manejarMenu('volver')">Calificados</button><i class="pi pi-angle-right" /><span>{{ calificadoSeleccionado?.nombre }}</span></div>

        <header class="hv-page-heading hv-page-heading-compact">
          <div><span class="hv-eyebrow">Expediente individual</span><h1>{{ calificadoSeleccionado?.nombre }}</h1><p>{{ calificadoSeleccionado?.grado }} · RUN {{ calificadoSeleccionado?.run }} · {{ calificadoSeleccionado?.unidad }}</p></div>
          <Button label="Volver a calificados" icon="pi pi-arrow-left" severity="secondary" outlined @click="manejarMenu('volver')" />
        </header>

        <nav class="hv-expediente-tabs">
          <button v-for="seccion in seccionesExpediente" :key="seccion.id" type="button" :class="{ active: seccionExpediente === seccion.id }" @click="seccionExpediente = seccion.id; menuActivo = seccion.id"><i :class="seccion.icon" />{{ seccion.label }}</button>
        </nav>

        <section v-if="seccionExpediente === 'instrumentos'" class="hv-expediente-section">
          <div class="hv-section-heading"><div><h2>Instrumentos de evaluación</h2><p>Documentos e instrumentos correspondientes al período seleccionado.</p></div><Tag :value="modoSoloLectura ? 'Consulta' : 'Edición habilitada'" :severity="modoSoloLectura ? 'secondary' : 'success'" /></div>
          <div class="hv-instrument-grid">
            <article v-for="instrumento in instrumentos" :key="instrumento.id" class="hv-instrument-card">
              <div class="hv-instrument-icon"><i :class="instrumento.icono" /></div>
              <div class="hv-instrument-copy"><h3>{{ instrumento.nombre }}</h3><p>{{ instrumento.descripcion }}</p><Tag :value="textoEstadoInstrumento(instrumento.estado)" :severity="severidadInstrumento(instrumento.estado)" /></div>
              <Button label="Ver" icon="pi pi-arrow-right" icon-pos="right" severity="secondary" outlined />
            </article>
          </div>
        </section>

        <section v-else class="hv-placeholder-panel">
          <div class="hv-placeholder-icon"><i :class="seccionesExpediente.find(item => item.id === seccionExpediente)?.icon" /></div>
          <h2>{{ seccionesExpediente.find(item => item.id === seccionExpediente)?.label }}</h2>
          <p>La vista funcional existente de este módulo será montada dentro de esta nueva estructura visual.</p>
          <Button label="Abrir módulo" icon="pi pi-arrow-right" icon-pos="right" />
        </section>
      </div>

      <footer class="hv-global-statusbar hv-statusbar-app">
        <span class="hv-status-group"><i :class="baseDatosConectada ? 'hv-status-online' : 'hv-status-offline'" /> {{ baseDatosConectada ? 'Conectado a hvdigital.db' : 'Sin conexión' }}</span>
        <span>Período: {{ periodoSeleccionado?.nombre }} <strong>{{ modoSoloLectura ? '(CERRADO)' : '(ACTIVO)' }}</strong></span>
        <span>Versión {{ versionAplicacion }}</span>
      </footer>
    </section>
  </div>
</template>
