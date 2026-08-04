<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  cambiarEstadoNotaTarea,
  eliminarNotaTarea,
  guardarNotaTarea,
  listarCalificadosParaNotas,
  listarNotasTareas,
  obtenerContextoNotasTareas,
  type CalificadoNotaTarea,
  type ContextoNotasTareas,
  type EstadoNotaTarea,
  type NotaTarea,
  type PrioridadNotaTarea,
  type TipoNotaTarea,
} from '../../services/notasTareas'

const emit = defineEmits<{ cerrar: [] }>()

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')
const contexto = ref<ContextoNotasTareas | null>(null)
const calificados = ref<CalificadoNotaTarea[]>([])
const registros = ref<NotaTarea[]>([])
const busqueda = ref('')
const filtroTipo = ref<'TODOS' | TipoNotaTarea>('TODOS')
const filtroEstado = ref<'TODOS' | EstadoNotaTarea>('TODOS')
const mostrandoFormulario = ref(false)

const formulario = reactive({
  id: null as number | null,
  tipo: 'TAREA' as TipoNotaTarea,
  titulo: '',
  detalle: '',
  personaId: null as number | null,
  prioridad: 'MEDIA' as PrioridadNotaTarea,
  estado: 'PENDIENTE' as EstadoNotaTarea,
  fechaLimite: '',
})

const soloLectura = computed(() => contexto.value?.periodoEstado === 'CERRADO')

const pendientes = computed(() => registros.value.filter(item =>
  item.tipo === 'TAREA' && !['COMPLETADA', 'ARCHIVADA'].includes(item.estado),
).length)

const vencidas = computed(() => {
  const hoy = new Date().toISOString().slice(0, 10)
  return registros.value.filter(item =>
    item.tipo === 'TAREA'
    && item.fecha_limite
    && item.fecha_limite < hoy
    && !['COMPLETADA', 'ARCHIVADA'].includes(item.estado),
  ).length
})

const filtrados = computed(() => {
  const texto = busqueda.value.trim().toLocaleLowerCase('es')
  return registros.value.filter(item => {
    const coincideTexto = !texto || [
      item.titulo,
      item.detalle ?? '',
      item.persona_nombre ?? '',
      item.persona_grado ?? '',
      item.persona_run ?? '',
    ].some(valor => valor.toLocaleLowerCase('es').includes(texto))

    return coincideTexto
      && (filtroTipo.value === 'TODOS' || item.tipo === filtroTipo.value)
      && (filtroEstado.value === 'TODOS' || item.estado === filtroEstado.value)
  })
})

function textoError(valor: unknown): string {
  return valor instanceof Error ? valor.message : String(valor)
}

function limpiarFormulario(): void {
  formulario.id = null
  formulario.tipo = 'TAREA'
  formulario.titulo = ''
  formulario.detalle = ''
  formulario.personaId = null
  formulario.prioridad = 'MEDIA'
  formulario.estado = 'PENDIENTE'
  formulario.fechaLimite = ''
}

function nuevo(tipo: TipoNotaTarea): void {
  if (soloLectura.value) return
  limpiarFormulario()
  formulario.tipo = tipo
  mostrandoFormulario.value = true
}

function editar(item: NotaTarea): void {
  if (soloLectura.value) return
  formulario.id = item.id
  formulario.tipo = item.tipo
  formulario.titulo = item.titulo
  formulario.detalle = item.detalle ?? ''
  formulario.personaId = item.persona_id
  formulario.prioridad = item.prioridad
  formulario.estado = item.estado
  formulario.fechaLimite = item.fecha_limite ?? ''
  mostrandoFormulario.value = true
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  try {
    const actual = await obtenerContextoNotasTareas()
    contexto.value = actual
    const [personas, items] = await Promise.all([
      listarCalificadosParaNotas(actual.periodoId),
      listarNotasTareas(actual.periodoId),
    ])
    calificados.value = personas
    registros.value = items
  } catch (excepcion) {
    error.value = textoError(excepcion)
  } finally {
    cargando.value = false
  }
}

async function guardar(): Promise<void> {
  if (!contexto.value || soloLectura.value) return
  guardando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    await guardarNotaTarea({
      id: formulario.id ?? undefined,
      periodoId: contexto.value.periodoId,
      personaId: formulario.personaId,
      tipo: formulario.tipo,
      titulo: formulario.titulo,
      detalle: formulario.detalle,
      prioridad: formulario.prioridad,
      estado: formulario.estado,
      fechaLimite: formulario.fechaLimite || null,
    })
    mensaje.value = formulario.id ? 'Registro actualizado correctamente.' : 'Registro creado correctamente.'
    mostrandoFormulario.value = false
    limpiarFormulario()
    await cargar()
  } catch (excepcion) {
    error.value = textoError(excepcion)
  } finally {
    guardando.value = false
  }
}

async function cambiarEstado(item: NotaTarea, estado: EstadoNotaTarea): Promise<void> {
  if (!contexto.value || soloLectura.value) return
  try {
    await cambiarEstadoNotaTarea(item.id, contexto.value.periodoId, estado)
    await cargar()
  } catch (excepcion) {
    error.value = textoError(excepcion)
  }
}

async function eliminar(item: NotaTarea): Promise<void> {
  if (!contexto.value || soloLectura.value) return
  if (!window.confirm(`¿Eliminar “${item.titulo}”?`)) return
  try {
    await eliminarNotaTarea(item.id, contexto.value.periodoId)
    await cargar()
  } catch (excepcion) {
    error.value = textoError(excepcion)
  }
}

function etiquetaEstado(estado: EstadoNotaTarea): string {
  return {
    PENDIENTE: 'Pendiente',
    EN_PROGRESO: 'En progreso',
    COMPLETADA: 'Completada',
    ARCHIVADA: 'Archivada',
  }[estado]
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Sin fecha límite'
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

onMounted(() => void cargar())
</script>

<template>
  <section class="nt-overlay" role="dialog" aria-modal="true" aria-label="Notas y tareas">
    <div class="nt-shell">
      <header class="nt-header">
        <div>
          <span class="nt-eyebrow">Organización del calificador</span>
          <h1>Notas y tareas</h1>
          <p v-if="contexto">
            Período {{ contexto.periodoNombre }}
            <span v-if="soloLectura" class="nt-readonly">Histórico · solo lectura</span>
          </p>
        </div>
        <div class="nt-header-actions">
          <button class="nt-button nt-button-secondary" type="button" :disabled="cargando" @click="cargar">
            <i class="pi pi-refresh" /> Actualizar
          </button>
          <button class="nt-icon-button" type="button" title="Cerrar" @click="emit('cerrar')">
            <i class="pi pi-times" />
          </button>
        </div>
      </header>

      <div v-if="error" class="nt-message nt-message-error">{{ error }}</div>
      <div v-if="mensaje" class="nt-message nt-message-success">{{ mensaje }}</div>

      <div v-if="cargando" class="nt-loading">
        <i class="pi pi-spin pi-spinner" />
        <strong>Cargando notas y tareas…</strong>
      </div>

      <template v-else-if="contexto">
        <section class="nt-summary">
          <article><i class="pi pi-list-check" /><div><span>Tareas pendientes</span><strong>{{ pendientes }}</strong></div></article>
          <article><i class="pi pi-exclamation-triangle" /><div><span>Tareas vencidas</span><strong>{{ vencidas }}</strong></div></article>
          <article><i class="pi pi-file-edit" /><div><span>Total de registros</span><strong>{{ registros.length }}</strong></div></article>
        </section>

        <section class="nt-toolbar">
          <div class="nt-search"><i class="pi pi-search" /><input v-model="busqueda" type="search" placeholder="Buscar por título, detalle o calificado…"></div>
          <select v-model="filtroTipo"><option value="TODOS">Todos los tipos</option><option value="NOTA">Notas</option><option value="TAREA">Tareas</option></select>
          <select v-model="filtroEstado"><option value="TODOS">Todos los estados</option><option value="PENDIENTE">Pendientes</option><option value="EN_PROGRESO">En progreso</option><option value="COMPLETADA">Completadas</option><option value="ARCHIVADA">Archivadas</option></select>
          <div class="nt-toolbar-actions">
            <button class="nt-button nt-button-secondary" type="button" :disabled="soloLectura" @click="nuevo('NOTA')"><i class="pi pi-file-edit" /> Nueva nota</button>
            <button class="nt-button nt-button-primary" type="button" :disabled="soloLectura" @click="nuevo('TAREA')"><i class="pi pi-plus" /> Nueva tarea</button>
          </div>
        </section>

        <div v-if="soloLectura" class="nt-message nt-message-info">
          Este período está cerrado. Las notas y tareas pueden consultarse, pero no modificarse.
        </div>

        <section v-if="filtrados.length" class="nt-list">
          <article v-for="item in filtrados" :key="item.id" class="nt-card" :class="[`nt-priority-${item.prioridad.toLowerCase()}`, { 'nt-card-complete': item.estado === 'COMPLETADA' }]">
            <div class="nt-card-main">
              <div class="nt-card-labels">
                <span class="nt-type" :class="`nt-type-${item.tipo.toLowerCase()}`">{{ item.tipo === 'TAREA' ? 'Tarea' : 'Nota' }}</span>
                <span class="nt-state" :class="`nt-state-${item.estado.toLowerCase()}`">{{ etiquetaEstado(item.estado) }}</span>
                <span class="nt-priority">Prioridad {{ item.prioridad.toLowerCase() }}</span>
              </div>
              <h2>{{ item.titulo }}</h2>
              <p v-if="item.detalle">{{ item.detalle }}</p>
              <div class="nt-meta">
                <span v-if="item.persona_nombre"><i class="pi pi-user" /> {{ item.persona_grado }} {{ item.persona_nombre }} · {{ item.persona_run }}</span>
                <span v-else><i class="pi pi-users" /> Registro general del período</span>
                <span v-if="item.tipo === 'TAREA'"><i class="pi pi-calendar" /> {{ formatearFecha(item.fecha_limite) }}</span>
              </div>
            </div>
            <div class="nt-card-actions" v-if="!soloLectura">
              <button v-if="item.tipo === 'TAREA' && item.estado !== 'COMPLETADA'" type="button" title="Marcar completada" @click="cambiarEstado(item, 'COMPLETADA')"><i class="pi pi-check" /></button>
              <button v-if="item.estado === 'COMPLETADA'" type="button" title="Reabrir" @click="cambiarEstado(item, 'PENDIENTE')"><i class="pi pi-replay" /></button>
              <button type="button" title="Editar" @click="editar(item)"><i class="pi pi-pencil" /></button>
              <button type="button" title="Eliminar" class="danger" @click="eliminar(item)"><i class="pi pi-trash" /></button>
            </div>
          </article>
        </section>

        <section v-else class="nt-empty">
          <i class="pi pi-clipboard" />
          <strong>No hay registros para mostrar</strong>
          <span>Cree una nota o tarea para organizar el trabajo pendiente.</span>
        </section>
      </template>
    </div>

    <div v-if="mostrandoFormulario" class="nt-modal-backdrop" @click.self="mostrandoFormulario = false">
      <form class="nt-form" @submit.prevent="guardar">
        <header><div><span>{{ formulario.id ? 'Editar registro' : 'Nuevo registro' }}</span><h2>{{ formulario.tipo === 'TAREA' ? 'Tarea del calificador' : 'Nota del calificador' }}</h2></div><button type="button" @click="mostrandoFormulario = false"><i class="pi pi-times" /></button></header>
        <div class="nt-form-grid">
          <label><span>Tipo</span><select v-model="formulario.tipo"><option value="NOTA">Nota</option><option value="TAREA">Tarea</option></select></label>
          <label><span>Prioridad</span><select v-model="formulario.prioridad"><option value="BAJA">Baja</option><option value="MEDIA">Media</option><option value="ALTA">Alta</option></select></label>
          <label class="wide"><span>Título *</span><input v-model="formulario.titulo" maxlength="180" required placeholder="Ej.: Revisar antecedentes para la HC2"></label>
          <label class="wide"><span>Detalle</span><textarea v-model="formulario.detalle" rows="5" placeholder="Antecedentes, recordatorios o instrucciones pendientes…" /></label>
          <label class="wide"><span>Calificado asociado</span><select v-model="formulario.personaId"><option :value="null">General del período</option><option v-for="persona in calificados" :key="persona.personaId" :value="persona.personaId">{{ persona.grado }} {{ persona.nombre }} · {{ persona.run }}</option></select></label>
          <label><span>Estado</span><select v-model="formulario.estado"><option value="PENDIENTE">Pendiente</option><option value="EN_PROGRESO">En progreso</option><option value="COMPLETADA">Completada</option><option value="ARCHIVADA">Archivada</option></select></label>
          <label v-if="formulario.tipo === 'TAREA'"><span>Fecha límite</span><input v-model="formulario.fechaLimite" type="date"></label>
        </div>
        <footer><button class="nt-button nt-button-secondary" type="button" @click="mostrandoFormulario = false">Cancelar</button><button class="nt-button nt-button-primary" type="submit" :disabled="guardando"><i class="pi" :class="guardando ? 'pi-spin pi-spinner' : 'pi-save'" /> {{ guardando ? 'Guardando…' : 'Guardar' }}</button></footer>
      </form>
    </div>
  </section>
</template>
