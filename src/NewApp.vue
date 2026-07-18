<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
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
  estado: string
}

const pantalla = ref<Pantalla>('CARGANDO')
const usuario = ref('')
const contrasena = ref('')
const errorLogin = ref('')
const baseDatosConectada = ref(false)
const periodoSeleccionado = ref<Periodo | null>(null)
const calificadoSeleccionado = ref<Calificado | null>(null)

const periodos = ref<Periodo[]>([
  {
    id: 1,
    nombre: 'Periodo de Calificaciones 2026–2027',
    estado: 'ABIERTO',
    fechaInicio: '01/05/2026',
    fechaTermino: '30/04/2027',
  },
  {
    id: 2,
    nombre: 'Periodo de Calificaciones 2025–2026',
    estado: 'CERRADO',
    fechaInicio: '01/05/2025',
    fechaTermino: '30/04/2026',
  },
])

const calificados = ref<Calificado[]>([
  {
    id: 1,
    grado: 'Sargento 1°',
    nombre: 'Juan Pérez Soto',
    run: '16.123.456-7',
    unidad: 'U.A. Logística',
    estado: 'ACTIVO',
  },
  {
    id: 2,
    grado: 'Cabo 1°',
    nombre: 'María González Ríos',
    run: '17.654.321-0',
    unidad: 'U.A. Operaciones',
    estado: 'ACTIVO',
  },
])

const modoSoloLectura = computed(
  () => periodoSeleccionado.value?.estado === 'CERRADO',
)

const menuItems = computed(() => {
  if (pantalla.value === 'EXPEDIENTE') {
    return [
      { id: 'volver', label: 'Volver a calificados', icon: 'pi pi-arrow-left' },
      { id: 'resumen', label: 'Resumen', icon: 'pi pi-user' },
      { id: 'hoja-vida', label: 'Hoja de Vida', icon: 'pi pi-book' },
      { id: 'anotaciones', label: 'Anotaciones', icon: 'pi pi-file-edit' },
      { id: 'resoluciones', label: 'Resoluciones', icon: 'pi pi-file' },
      { id: 'evint', label: 'EVINT', icon: 'pi pi-chart-bar' },
      { id: 'hc1', label: 'HC1', icon: 'pi pi-clipboard' },
      { id: 'hc2', label: 'HC2', icon: 'pi pi-clipboard' },
      { id: 'ham', label: 'HAM', icon: 'pi pi-star' },
      { id: 'hapsem', label: 'HAPSEM', icon: 'pi pi-users' },
      { id: 'documentos', label: 'Documentos', icon: 'pi pi-folder' },
    ]
  }

  return [
    { id: 'periodos', label: 'Cambiar período', icon: 'pi pi-calendar' },
    { id: 'calificados', label: 'Calificados', icon: 'pi pi-users' },
    { id: 'configuracion', label: 'Configuración', icon: 'pi pi-cog' },
    { id: 'cerrar-sesion', label: 'Cerrar sesión', icon: 'pi pi-sign-out' },
  ]
})

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

  /*
   * Adaptador provisional de UI. La autenticación persistente debe
   * implementarse posteriormente mediante un servicio local con hash seguro.
   */
  try {
    const estado = await obtenerEstadoConfiguracionInicial()
    baseDatosConectada.value = true

    if (
      estado.estado === 'NO_CONFIGURADA' ||
      estado.estado === 'EN_PROGRESO'
    ) {
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
  pantalla.value = 'CALIFICADOS'
}

function abrirExpediente(calificado: Calificado): void {
  calificadoSeleccionado.value = calificado
  pantalla.value = 'EXPEDIENTE'
}

function manejarMenu(id: string): void {
  switch (id) {
    case 'volver':
    case 'calificados':
      pantalla.value = 'CALIFICADOS'
      break
    case 'periodos':
      pantalla.value = 'SELECCION_PERIODO'
      break
    case 'cerrar-sesion':
      usuario.value = ''
      contrasena.value = ''
      periodoSeleccionado.value = null
      calificadoSeleccionado.value = null
      pantalla.value = 'LOGIN'
      break
    default:
      break
  }
}

onMounted(() => {
  void inicializarAplicacion()
})
</script>

<template>
  <div v-if="pantalla === 'CARGANDO'" class="hv-centered-page">
    <i class="pi pi-spin pi-spinner text-3xl text-primary"></i>
    <p>Iniciando HVDigital…</p>
  </div>

  <main v-else-if="pantalla === 'LOGIN'" class="hv-login-page">
    <section class="hv-login-brand">
      <div class="hv-brand-mark">HV</div>
      <div>
        <h1>HVDigital</h1>
        <p>Gestión local de procesos de calificación</p>
      </div>
    </section>

    <Card class="hv-login-card">
      <template #title>Iniciar sesión</template>
      <template #subtitle>Ingrese sus credenciales locales para continuar.</template>
      <template #content>
        <div class="hv-form-stack">
          <label for="usuario">Usuario</label>
          <InputText id="usuario" v-model="usuario" autocomplete="username" fluid />

          <label for="contrasena">Contraseña</label>
          <Password
            input-id="contrasena"
            v-model="contrasena"
            :feedback="false"
            toggle-mask
            fluid
            @keyup.enter="iniciarSesion"
          />

          <small v-if="errorLogin" class="hv-error">{{ errorLogin }}</small>

          <Button label="Iniciar sesión" icon="pi pi-sign-in" fluid @click="iniciarSesion" />
        </div>
      </template>
    </Card>

    <footer class="hv-login-footer">
      <span :class="baseDatosConectada ? 'hv-status-online' : 'hv-status-offline'"></span>
      Base de datos {{ baseDatosConectada ? 'conectada' : 'sin conexión' }}
      <span>•</span>
      Versión 0.1.0
    </footer>
  </main>

  <ConfiguracionInicialView
    v-else-if="pantalla === 'CONFIGURACION_INICIAL'"
  />

  <main v-else-if="pantalla === 'SELECCION_PERIODO'" class="hv-selection-page">
    <header class="hv-page-heading">
      <div>
        <span class="hv-eyebrow">HVDigital</span>
        <h1>Seleccione un período</h1>
        <p>Los períodos cerrados se abrirán automáticamente en modo solo lectura.</p>
      </div>
      <Button label="Cerrar sesión" icon="pi pi-sign-out" severity="secondary" outlined @click="manejarMenu('cerrar-sesion')" />
    </header>

    <section class="hv-period-grid">
      <Card v-for="periodo in periodos" :key="periodo.id" class="hv-period-card">
        <template #title>{{ periodo.nombre }}</template>
        <template #subtitle>{{ periodo.fechaInicio }} — {{ periodo.fechaTermino }}</template>
        <template #content>
          <Tag
            :value="periodo.estado === 'ABIERTO' ? 'Activo' : 'Cerrado · Solo lectura'"
            :severity="periodo.estado === 'ABIERTO' ? 'success' : 'secondary'"
          />
        </template>
        <template #footer>
          <Button
            :label="periodo.estado === 'ABIERTO' ? 'Ingresar' : 'Abrir en solo lectura'"
            icon="pi pi-arrow-right"
            icon-pos="right"
            fluid
            @click="seleccionarPeriodo(periodo)"
          />
        </template>
      </Card>
    </section>
  </main>

  <div v-else class="hv-app-shell">
    <aside class="hv-sidebar">
      <div class="hv-sidebar-brand">
        <div class="hv-brand-mark hv-brand-mark-small">HV</div>
        <div>
          <strong>HVDigital</strong>
          <small>{{ pantalla === 'EXPEDIENTE' ? 'Expediente' : 'Gestión de calificados' }}</small>
        </div>
      </div>

      <nav class="hv-sidebar-menu">
        <button
          v-for="item in menuItems"
          :key="item.id"
          type="button"
          class="hv-sidebar-item"
          @click="manejarMenu(item.id)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="hv-sidebar-context">
        <small>Período seleccionado</small>
        <strong>{{ periodoSeleccionado?.nombre ?? 'Sin período' }}</strong>
        <Tag
          v-if="periodoSeleccionado"
          :value="modoSoloLectura ? 'Solo lectura' : 'Activo'"
          :severity="modoSoloLectura ? 'secondary' : 'success'"
        />
      </div>
    </aside>

    <section class="hv-workspace">
      <header class="hv-topbar">
        <div>
          <strong>{{ pantalla === 'EXPEDIENTE' ? calificadoSeleccionado?.nombre : 'Calificados' }}</strong>
          <small v-if="pantalla === 'EXPEDIENTE'">
            {{ calificadoSeleccionado?.grado }} · {{ calificadoSeleccionado?.unidad }}
          </small>
        </div>
        <div class="hv-topbar-status">
          <span :class="baseDatosConectada ? 'hv-status-online' : 'hv-status-offline'"></span>
          SQLite
          <span>•</span>
          v0.1.0
        </div>
      </header>

      <div v-if="pantalla === 'CALIFICADOS'" class="hv-content">
        <header class="hv-page-heading hv-page-heading-compact">
          <div>
            <span class="hv-eyebrow">{{ periodoSeleccionado?.nombre }}</span>
            <h1>Calificados</h1>
            <p>Seleccione una persona para revisar su expediente e instrumentos.</p>
          </div>
          <Tag v-if="modoSoloLectura" value="Período cerrado · Solo lectura" severity="warn" />
        </header>

        <Card>
          <template #content>
            <DataTable :value="calificados" paginator :rows="10" striped-rows responsive-layout="scroll">
              <Column field="grado" header="Grado" />
              <Column field="nombre" header="Nombre completo" />
              <Column field="run" header="RUN" />
              <Column field="unidad" header="Unidad" />
              <Column field="estado" header="Estado">
                <template #body="slotProps">
                  <Tag :value="slotProps.data.estado" severity="success" />
                </template>
              </Column>
              <Column header="Acción" style="width: 8rem">
                <template #body="slotProps">
                  <Button label="Ver" icon="pi pi-eye" size="small" @click="abrirExpediente(slotProps.data)" />
                </template>
              </Column>
            </DataTable>
          </template>
        </Card>
      </div>

      <div v-else-if="pantalla === 'EXPEDIENTE'" class="hv-content">
        <header class="hv-page-heading hv-page-heading-compact">
          <div>
            <span class="hv-eyebrow">Expediente individual</span>
            <h1>{{ calificadoSeleccionado?.grado }} {{ calificadoSeleccionado?.nombre }}</h1>
            <p>Acceda a la Hoja de Vida y a los instrumentos del período seleccionado.</p>
          </div>
          <Tag :value="modoSoloLectura ? 'Solo lectura' : 'Edición habilitada'" :severity="modoSoloLectura ? 'secondary' : 'success'" />
        </header>

        <section class="hv-instrument-grid">
          <Card v-for="instrumento in ['Hoja de Vida', 'Anotaciones', 'Resoluciones', 'EVINT 1', 'EVINT 2', 'HC1', 'HC2', 'HAM', 'HAPSEM', 'Documentos']" :key="instrumento">
            <template #title>{{ instrumento }}</template>
            <template #subtitle>Instrumento asociado al expediente.</template>
            <template #footer>
              <Button label="Abrir" icon="pi pi-arrow-right" icon-pos="right" outlined fluid />
            </template>
          </Card>
        </section>
      </div>
    </section>
  </div>
</template>
