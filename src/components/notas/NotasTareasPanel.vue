<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  eliminarNotaTarea,
  guardarNotaTarea,
  listarCalificadosParaNotas,
  listarNotasTareas,
  obtenerContextoNotasTareas,
  type CalificadoNotaTarea,
  type ContextoNotasTareas,
  type NotaTarea,
  type PrioridadNotaTarea,
} from '../../services/notasTareas'

const props = withDefaults(defineProps<{ modoPagina?: boolean }>(), { modoPagina: false })
const emit = defineEmits<{ cerrar: [] }>()

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')
const contexto = ref<ContextoNotasTareas | null>(null)
const calificados = ref<CalificadoNotaTarea[]>([])
const registros = ref<NotaTarea[]>([])
const busqueda = ref('')
const filtroPrioridad = ref<'TODAS' | PrioridadNotaTarea>('TODAS')
const filtroAlcance = ref<'TODAS' | 'GENERAL' | 'CALIFICADO'>('TODAS')
const mostrandoFormulario = ref(false)

const formulario = reactive({ id: null as number | null, titulo: '', detalle: '', personaId: null as number | null, prioridad: 'MEDIA' as PrioridadNotaTarea })
const soloLectura = computed(() => contexto.value?.periodoEstado === 'CERRADO')
const notasGenerales = computed(() => registros.value.filter(item => !item.persona_id).length)
const notasCalificados = computed(() => registros.value.filter(item => !!item.persona_id).length)
const notasAltaPrioridad = computed(() => registros.value.filter(item => item.prioridad === 'ALTA').length)
const filtrados = computed(() => {
  const texto = busqueda.value.trim().toLocaleLowerCase('es')
  return registros.value.filter(item => {
    const coincideTexto = !texto || [item.titulo,item.detalle ?? '',item.persona_nombre ?? '',item.persona_grado ?? '',item.persona_run ?? ''].some(valor => valor.toLocaleLowerCase('es').includes(texto))
    const coincidePrioridad = filtroPrioridad.value === 'TODAS' || item.prioridad === filtroPrioridad.value
    const coincideAlcance = filtroAlcance.value === 'TODAS' || (filtroAlcance.value === 'GENERAL' && !item.persona_id) || (filtroAlcance.value === 'CALIFICADO' && !!item.persona_id)
    return coincideTexto && coincidePrioridad && coincideAlcance
  })
})
function textoError(valor: unknown): string { return valor instanceof Error ? valor.message : String(valor) }
function limpiarFormulario(): void { formulario.id=null;formulario.titulo='';formulario.detalle='';formulario.personaId=null;formulario.prioridad='MEDIA' }
function nuevaNota(): void { if(soloLectura.value)return;limpiarFormulario();mostrandoFormulario.value=true }
function editar(item: NotaTarea): void { if(soloLectura.value)return;formulario.id=item.id;formulario.titulo=item.titulo;formulario.detalle=item.detalle??'';formulario.personaId=item.persona_id;formulario.prioridad=item.prioridad;mostrandoFormulario.value=true }
async function cargar(): Promise<void> { cargando.value=true;error.value='';try{const actual=await obtenerContextoNotasTareas();contexto.value=actual;const [personas,items]=await Promise.all([listarCalificadosParaNotas(actual.periodoId),listarNotasTareas(actual.periodoId)]);calificados.value=personas;registros.value=items}catch(excepcion){error.value=textoError(excepcion)}finally{cargando.value=false} }
async function guardar(): Promise<void> { if(!contexto.value||soloLectura.value)return;guardando.value=true;error.value='';mensaje.value='';try{await guardarNotaTarea({id:formulario.id??undefined,periodoId:contexto.value.periodoId,personaId:formulario.personaId,tipo:'NOTA',titulo:formulario.titulo,detalle:formulario.detalle,prioridad:formulario.prioridad,estado:'PENDIENTE',fechaLimite:null});mensaje.value=formulario.id?'Nota actualizada correctamente.':'Nota guardada correctamente.';mostrandoFormulario.value=false;limpiarFormulario();await cargar()}catch(excepcion){error.value=textoError(excepcion)}finally{guardando.value=false} }
async function eliminar(item: NotaTarea): Promise<void> { if(!contexto.value||soloLectura.value)return;if(!window.confirm(`¿Eliminar la nota “${item.titulo}”?`))return;try{await eliminarNotaTarea(item.id,contexto.value.periodoId);mensaje.value='Nota eliminada correctamente.';await cargar()}catch(excepcion){error.value=textoError(excepcion)} }
function etiquetaPrioridad(prioridad: PrioridadNotaTarea): string { return {BAJA:'Baja',MEDIA:'Media',ALTA:'Alta'}[prioridad] }
function formatearFecha(fecha:string):string{const valor=fecha.slice(0,10);const [anio,mes,dia]=valor.split('-');return anio&&mes&&dia?`${dia}/${mes}/${anio}`:valor}
onMounted(() => void cargar())
</script>

<template>
  <section :class="['nt-overlay',{ 'nt-page': props.modoPagina }]" :role="props.modoPagina ? undefined : 'dialog'" :aria-modal="props.modoPagina ? undefined : 'true'" aria-label="Notas del calificador">
    <div class="nt-shell">
      <header class="nt-header">
        <div><span class="nt-eyebrow">Mi espacio</span><h1>Notas del calificador</h1><p v-if="contexto">Recordatorios y antecedentes del período {{ contexto.periodoNombre }} <span v-if="soloLectura" class="nt-readonly">Histórico · solo lectura</span></p></div>
        <div class="nt-header-actions">
          <button class="nt-button nt-button-secondary" type="button" :disabled="cargando" @click="cargar"><i class="pi pi-refresh" />Actualizar</button>
          <button class="nt-button nt-button-primary" type="button" :disabled="soloLectura" @click="nuevaNota"><i class="pi pi-plus" />Nueva nota</button>
          <button v-if="!props.modoPagina" class="nt-icon-button" type="button" title="Cerrar" @click="emit('cerrar')"><i class="pi pi-times" /></button>
        </div>
      </header>
      <div v-if="error" class="nt-message nt-message-error">{{ error }}</div><div v-if="mensaje" class="nt-message nt-message-success">{{ mensaje }}</div>
      <div v-if="cargando" class="nt-loading"><i class="pi pi-spin pi-spinner" /><strong>Cargando notas…</strong></div>
      <template v-else-if="contexto">
        <section class="nt-summary"><article><i class="pi pi-sticky-note"/><div><span>Total</span><strong>{{registros.length}}</strong></div></article><article><i class="pi pi-users"/><div><span>Generales</span><strong>{{notasGenerales}}</strong></div></article><article><i class="pi pi-user-edit"/><div><span>Con persona</span><strong>{{notasCalificados}}</strong></div></article><article><i class="pi pi-exclamation-circle"/><div><span>Prioridad alta</span><strong>{{notasAltaPrioridad}}</strong></div></article></section>
        <section class="nt-toolbar"><div class="nt-search"><i class="pi pi-search"/><input v-model="busqueda" type="search" placeholder="Buscar notas…"></div><select v-model="filtroAlcance" aria-label="Filtrar por alcance"><option value="TODAS">Todas</option><option value="GENERAL">Generales</option><option value="CALIFICADO">Con persona</option></select><select v-model="filtroPrioridad" aria-label="Filtrar por prioridad"><option value="TODAS">Toda prioridad</option><option value="ALTA">Alta</option><option value="MEDIA">Media</option><option value="BAJA">Baja</option></select></section>
        <div v-if="soloLectura" class="nt-message nt-message-info">Este período está cerrado. Las notas pueden consultarse, pero no modificarse.</div>
        <section v-if="filtrados.length" class="nt-list"><article v-for="item in filtrados" :key="item.id" class="nt-card" :class="`nt-priority-${item.prioridad.toLowerCase()}`"><div class="nt-card-main"><div class="nt-card-labels"><span class="nt-scope"><i :class="item.persona_id?'pi pi-user':'pi pi-users'"/>{{item.persona_id?'Calificado':'General'}}</span><span class="nt-priority" :class="`nt-priority-tag-${item.prioridad.toLowerCase()}`">{{etiquetaPrioridad(item.prioridad)}}</span></div><h2>{{item.titulo}}</h2><p v-if="item.detalle">{{item.detalle}}</p><div class="nt-meta"><span v-if="item.persona_nombre"><i class="pi pi-id-card"/>{{item.persona_grado}} {{item.persona_nombre}} · {{item.persona_run}}</span><span v-else><i class="pi pi-calendar"/>Nota general del período</span><span><i class="pi pi-clock"/>{{formatearFecha(item.actualizada_en)}}</span></div></div><div v-if="!soloLectura" class="nt-card-actions"><button type="button" title="Editar nota" @click="editar(item)"><i class="pi pi-pencil"/></button><button type="button" title="Eliminar nota" class="danger" @click="eliminar(item)"><i class="pi pi-trash"/></button></div></article></section>
        <section v-else class="nt-empty"><i class="pi pi-sticky-note"/><strong>No hay notas para mostrar</strong><span>Registre recordatorios o antecedentes relevantes del período.</span><button v-if="!soloLectura" class="nt-button nt-button-primary" type="button" @click="nuevaNota"><i class="pi pi-plus"/>Crear primera nota</button></section>
      </template>
    </div>
    <div v-if="mostrandoFormulario" class="nt-modal-backdrop" @click.self="mostrandoFormulario=false"><form class="nt-form" @submit.prevent="guardar"><header><div><span>{{formulario.id?'Editar nota':'Nueva nota'}}</span><h2>Nota del calificador</h2></div><button type="button" title="Cerrar" @click="mostrandoFormulario=false"><i class="pi pi-times"/></button></header><div class="nt-form-grid"><label class="wide"><span>Título *</span><input v-model="formulario.titulo" maxlength="180" required placeholder="Ej.: Revisar antecedentes antes de completar la HC2"></label><label class="wide"><span>Contenido</span><textarea v-model="formulario.detalle" rows="6" placeholder="Antecedentes, observaciones o recordatorios…"/></label><label class="wide"><span>Calificado asociado</span><select v-model="formulario.personaId"><option :value="null">Nota general del período</option><option v-for="persona in calificados" :key="persona.personaId" :value="persona.personaId">{{persona.grado}} {{persona.nombre}} · {{persona.run}}</option></select></label><label><span>Prioridad</span><select v-model="formulario.prioridad"><option value="BAJA">Baja</option><option value="MEDIA">Media</option><option value="ALTA">Alta</option></select></label></div><footer><button class="nt-button nt-button-secondary" type="button" @click="mostrandoFormulario=false">Cancelar</button><button class="nt-button nt-button-primary" type="submit" :disabled="guardando"><i class="pi" :class="guardando?'pi-spin pi-spinner':'pi-save'"/>{{guardando?'Guardando…':'Guardar nota'}}</button></footer></form></div>
  </section>
</template>
