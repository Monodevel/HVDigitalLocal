<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

import {
  anularBorradorHojaVida,
  listarAnotacionesHojaVida,
  listarBorradoresHojaVida,
  obtenerHojaVidaResumen,
} from '../../services/hojaVida'
import {
  estamparAnotacion,
  validarEstampadoAnotacion,
} from '../../services/estampadoAnotaciones'
import type {
  AnotacionHojaVida,
  BorradorHojaVida,
  HojaVidaResumen,
} from '../../types/hojaVida'
import type { OrigenAnotacion } from '../../types/estampadoAnotaciones'

const props = defineProps<{ hojaVidaId: number }>()

const emit = defineEmits<{
  volver: []
  nuevaAnotacion: [hojaVidaId: number]
}>()

const cargando = ref(true)
const procesando = ref(false)
const error = ref('')
const mensaje = ref('')
const resumen = ref<HojaVidaResumen | null>(null)
const borradores = ref<BorradorHojaVida[]>([])
const anotaciones = ref<AnotacionHojaVida[]>([])
const borradorSeleccionado = ref<BorradorHojaVida | null>(null)
const modalEstampado = ref(false)
const mostrarBorradores = ref(true)

const estampado = reactive({
  origen: 'CALIFICADOR_DIRECTO' as OrigenAnotacion,
})

const opcionesOrigen: Array<{ label: string; value: OrigenAnotacion }> = [
  { label: 'Calificador directo', value: 'CALIFICADOR_DIRECTO' },
  { label: 'Autoridad superior', value: 'AUTORIDAD_SUPERIOR' },
  { label: 'Oficial general', value: 'OFICIAL_GENERAL' },
  { label: 'Oficial de personal', value: 'OFICIAL_PERSONAL' },
  { label: 'Sistema', value: 'SISTEMA' },
]

const esSoloLectura = computed(() => resumen.value?.hoja_vida_estado !== 'abierta')
const nombreCalificado = computed(() => {
  if (!resumen.value) return 'Hoja de Vida'
  return [resumen.value.grado_calidad_abreviatura, resumen.value.nombre_completo]
    .filter(Boolean)
    .join(' ')
})

const estadoVisual = computed(() => {
  const estado = resumen.value?.hoja_vida_estado ?? 'abierta'
  if (estado === 'cerrada') return { texto: 'Cerrada', severidad: 'secondary' as const }
  if (estado === 'anulada') return { texto: 'Anulada', severidad: 'danger' as const }
  return { texto: 'Abierta', severidad: 'success' as const }
})

const puntajeAcumulado = computed(() => resumen.value?.puntaje_acumulado_visual ?? '0,00')

function obtenerMensajeError(excepcion: unknown): string {
  return excepcion instanceof Error ? excepcion.message : String(excepcion)
}

function formatoFecha(fecha: string | null | undefined): string {
  if (!fecha) return 'Sin fecha'
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha
}

function severidadEfecto(efecto: string | null): 'success' | 'danger' | 'secondary' {
  if (efecto === 'MERITO') return 'success'
  if (efecto === 'DEMERITO') return 'danger'
  return 'secondary'
}

function etiquetaEfecto(efecto: string | null): string {
  if (efecto === 'MERITO') return 'Mérito'
  if (efecto === 'DEMERITO') return 'Demérito'
  return 'Neutra'
}

function colorAnotacion(anotacion: AnotacionHojaVida | BorradorHojaVida): string {
  return anotacion.color_hex || (anotacion.color_semantico === 'ROJO' ? '#b4232d' : '#111827')
}

function lineaResolucion(anotacion: AnotacionHojaVida | BorradorHojaVida): string {
  if (!anotacion.numero_resolucion) return ''
  return `Res. Exenta N.º ${anotacion.numero_resolucion} de fecha ${formatoFecha(anotacion.fecha_resolucion)}`
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const [resumenResultado, borradoresResultado, anotacionesResultado] = await Promise.all([
      obtenerHojaVidaResumen(props.hojaVidaId),
      listarBorradoresHojaVida(props.hojaVidaId),
      listarAnotacionesHojaVida(props.hojaVidaId),
    ])

    if (!resumenResultado) throw new Error('No se encontró la Hoja de Vida solicitada.')

    resumen.value = resumenResultado
    borradores.value = borradoresResultado
    anotaciones.value = anotacionesResultado
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

function abrirEstampado(borrador: BorradorHojaVida): void {
  if (esSoloLectura.value) return
  borradorSeleccionado.value = borrador
  estampado.origen = 'CALIFICADOR_DIRECTO'
  modalEstampado.value = true
}

function cerrarEstampado(): void {
  if (procesando.value) return
  modalEstampado.value = false
  borradorSeleccionado.value = null
}

async function confirmarEstampado(): Promise<void> {
  if (!borradorSeleccionado.value) return

  procesando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const borrador = borradorSeleccionado.value
    const solicitud = {
      borradorId: borrador.borrador_id,
      origen: estampado.origen,
      resolucionDocumentalId:
        borrador.requiere_resolucion === 1 ? borrador.resolucion_documental_id : null,
    }

    const validacion = await validarEstampadoAnotacion(solicitud)
    if (!validacion.valido) throw new Error(validacion.errores.join(' '))

    const resultado = await estamparAnotacion(solicitud)
    mensaje.value = `Anotación N.º ${resultado.anotacionId} estampada correctamente.`
    cerrarEstampado()
    await cargar()
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    procesando.value = false
  }
}

async function anularBorrador(borrador: BorradorHojaVida): Promise<void> {
  if (esSoloLectura.value) return
  if (!window.confirm('¿Desea anular este borrador?')) return

  procesando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    await anularBorradorHojaVida(borrador.borrador_id)
    mensaje.value = 'Borrador anulado correctamente.'
    await cargar()
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    procesando.value = false
  }
}

function imprimir(): void {
  window.print()
}

watch(() => props.hojaVidaId, cargar)
onMounted(cargar)
</script>

<template>
  <main class="life-record-view">
    <section v-if="cargando" class="life-record-loading">
      <i class="pi pi-spin pi-spinner" />
      <strong>Cargando Hoja de Vida</strong>
      <span>Recuperando anotaciones y antecedentes…</span>
    </section>

    <template v-else-if="resumen">
      <header class="life-record-header no-print">
        <div>
          <span class="hv-eyebrow">Hoja de Vida</span>
          <h1>{{ nombreCalificado }}</h1>
          <p>{{ resumen.run }} · {{ resumen.categoria_nombre }} · {{ resumen.periodo_nombre }}</p>
        </div>

        <div class="life-record-actions">
          <Tag :value="estadoVisual.texto" :severity="estadoVisual.severidad" />
          <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" outlined :loading="cargando" @click="cargar" />
          <Button label="Imprimir" icon="pi pi-print" severity="secondary" outlined @click="imprimir" />
          <Button label="Nueva anotación" icon="pi pi-plus" :disabled="esSoloLectura" @click="emit('nuevaAnotacion', hojaVidaId)" />
        </div>
      </header>

      <Message v-if="error" severity="error" :closable="false" class="no-print">{{ error }}</Message>
      <Message v-if="mensaje" severity="success" :closable="false" class="no-print">{{ mensaje }}</Message>
      <Message v-if="esSoloLectura" severity="warn" :closable="false" class="no-print">
        Esta Hoja de Vida está {{ resumen.hoja_vida_estado }} y se encuentra en modo solo lectura.
      </Message>

      <section class="life-record-summary no-print">
        <Card>
          <template #content>
            <span>Anotaciones</span>
            <strong>{{ resumen.total_anotaciones }}</strong>
            <small>{{ resumen.total_borradores }} borrador(es)</small>
          </template>
        </Card>
        <Card>
          <template #content>
            <span>Méritos</span>
            <strong>{{ resumen.total_meritos }}</strong>
            <small>Anotaciones favorables</small>
          </template>
        </Card>
        <Card>
          <template #content>
            <span>Deméritos</span>
            <strong>{{ resumen.total_demeritos }}</strong>
            <small>Anotaciones desfavorables</small>
          </template>
        </Card>
        <Card>
          <template #content>
            <span>Puntaje acumulado</span>
            <strong>{{ puntajeAcumulado }}</strong>
            <small>Resultado del período</small>
          </template>
        </Card>
      </section>

      <Card v-if="borradores.length" class="drafts-panel no-print">
        <template #title>
          <button type="button" class="drafts-title" @click="mostrarBorradores = !mostrarBorradores">
            <span><i class="pi pi-file-edit" /> Borradores pendientes</span>
            <Tag :value="String(borradores.length)" severity="warn" />
            <i :class="mostrarBorradores ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" />
          </button>
        </template>
        <template v-if="mostrarBorradores" #content>
          <div class="draft-list">
            <article v-for="borrador in borradores" :key="borrador.borrador_id" class="draft-item">
              <div class="draft-copy">
                <div class="draft-heading">
                  <strong>{{ borrador.titulo_final || borrador.plantilla_nombre }}</strong>
                  <Tag :value="etiquetaEfecto(borrador.tipo_efecto_codigo)" :severity="severidadEfecto(borrador.tipo_efecto_codigo)" />
                </div>
                <p>{{ borrador.cuerpo_final }}</p>
                <small>{{ formatoFecha(borrador.fecha_anotacion) }} · {{ borrador.concepto_nombre || 'Sin concepto' }}</small>
              </div>
              <div class="draft-actions">
                <Button label="Estampar" icon="pi pi-check" size="small" :disabled="esSoloLectura || procesando" @click="abrirEstampado(borrador)" />
                <Button label="Anular" icon="pi pi-times" size="small" severity="danger" outlined :disabled="esSoloLectura || procesando" @click="anularBorrador(borrador)" />
              </div>
            </article>
          </div>
        </template>
      </Card>

      <section class="official-sheet">
        <header class="official-sheet-header">
          <div class="official-sheet-brand">
            <strong>HOJA DE VIDA</strong>
            <span>Proceso de calificación</span>
          </div>
          <div class="official-sheet-status">
            <span>Estado</span>
            <strong>{{ resumen.hoja_vida_estado.toUpperCase() }}</strong>
          </div>
        </header>

        <section class="official-person-grid">
          <div class="wide">
            <span>Grado, apellidos y nombres</span>
            <strong>{{ nombreCalificado.toUpperCase() }}</strong>
          </div>
          <div>
            <span>RUN</span>
            <strong>{{ resumen.run }}</strong>
          </div>
          <div>
            <span>Categoría</span>
            <strong>{{ resumen.categoria_nombre }}</strong>
          </div>
          <div>
            <span>Período</span>
            <strong>{{ resumen.periodo_nombre }}</strong>
          </div>
          <div>
            <span>Vigencia</span>
            <strong>{{ formatoFecha(resumen.fecha_inicio) }} al {{ formatoFecha(resumen.fecha_termino) }}</strong>
          </div>
        </section>

        <section class="annotation-register">
          <header class="annotation-register-header">
            <span>N.º</span>
            <span>Fecha</span>
            <span>Anotación</span>
            <span>Puntaje</span>
          </header>

          <article
            v-for="anotacion in anotaciones"
            :key="anotacion.anotacion_id"
            class="annotation-row"
          >
            <strong>{{ anotacion.correlativo }}</strong>
            <span>{{ formatoFecha(anotacion.fecha_anotacion) }}</span>
            <div class="annotation-copy" :style="{ color: colorAnotacion(anotacion) }">
              <div class="annotation-title-line">
                <strong>{{ anotacion.titulo_final }}</strong>
                <Tag :value="etiquetaEfecto(anotacion.tipo_efecto_codigo)" :severity="severidadEfecto(anotacion.tipo_efecto_codigo)" class="no-print" />
              </div>
              <p v-if="anotacion.concepto_nombre"><b>Concepto:</b> {{ anotacion.concepto_nombre }}</p>
              <p>{{ anotacion.cuerpo_final }}</p>
              <small v-if="lineaResolucion(anotacion)">{{ lineaResolucion(anotacion) }}</small>
            </div>
            <strong class="annotation-score">{{ anotacion.puntaje_visual || '—' }}</strong>
          </article>

          <div v-if="anotaciones.length === 0" class="annotation-empty">
            <i class="pi pi-book" />
            <strong>No existen anotaciones estampadas</strong>
            <span>Las anotaciones definitivas aparecerán aquí.</span>
          </div>
        </section>

        <footer class="official-sheet-footer">
          <div>
            <span>Total anotaciones</span>
            <strong>{{ resumen.total_anotaciones }}</strong>
          </div>
          <div>
            <span>Puntaje acumulado</span>
            <strong>{{ puntajeAcumulado }}</strong>
          </div>
          <div>
            <span>Hoja de Vida N.º</span>
            <strong>{{ resumen.hoja_vida_id }}</strong>
          </div>
        </footer>
      </section>
    </template>

    <section v-else class="life-record-loading">
      <i class="pi pi-exclamation-triangle" />
      <strong>No fue posible abrir la Hoja de Vida</strong>
      <Button label="Volver" icon="pi pi-arrow-left" severity="secondary" @click="emit('volver')" />
    </section>

    <Dialog
      v-model:visible="modalEstampado"
      modal
      header="Estampar anotación"
      :style="{ width: 'min(560px, 92vw)' }"
      :closable="!procesando"
      @hide="cerrarEstampado"
    >
      <div v-if="borradorSeleccionado" class="stamp-dialog">
        <Message severity="info" :closable="false">
          Revise el origen antes de convertir el borrador en una anotación definitiva.
        </Message>
        <div class="stamp-preview">
          <strong>{{ borradorSeleccionado.titulo_final || borradorSeleccionado.plantilla_nombre }}</strong>
          <p>{{ borradorSeleccionado.cuerpo_final }}</p>
          <small>{{ lineaResolucion(borradorSeleccionado) }}</small>
        </div>
        <label>
          <span>Origen de la anotación</span>
          <Select v-model="estampado.origen" :options="opcionesOrigen" option-label="label" option-value="value" fluid />
        </label>
      </div>

      <template #footer>
        <Button label="Cancelar" severity="secondary" outlined :disabled="procesando" @click="cerrarEstampado" />
        <Button label="Confirmar estampado" icon="pi pi-check" :loading="procesando" @click="confirmarEstampado" />
      </template>
    </Dialog>
  </main>
</template>

<style scoped>
.life-record-view { min-height: 100%; padding: 1.25rem; background: var(--hv-page); }
.life-record-loading { min-height: 420px; display: grid; place-content: center; justify-items: center; gap: .7rem; color: var(--hv-muted); text-align: center; }
.life-record-loading i { color: var(--hv-primary); font-size: 2rem; }
.life-record-loading strong { color: var(--hv-text); }
.life-record-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.life-record-header h1 { margin: .25rem 0 0; font-size: 1.65rem; letter-spacing: -.03em; }
.life-record-header p { margin: .45rem 0 0; color: var(--hv-muted); }
.life-record-actions { display: flex; align-items: center; justify-content: flex-end; gap: .55rem; flex-wrap: wrap; }
.life-record-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; margin: 1rem 0; }
.life-record-summary :deep(.p-card-content) { display: grid; gap: .28rem; padding: 1rem; }
.life-record-summary span { color: var(--hv-muted); font-size: .78rem; }
.life-record-summary strong { color: var(--hv-text); font-size: 1.35rem; }
.life-record-summary small { color: var(--hv-muted); }
.drafts-panel { margin-bottom: 1rem; }
.drafts-title { width: 100%; display: grid; grid-template-columns: minmax(0,1fr) auto auto; align-items: center; gap: .7rem; border: 0; padding: 0; color: var(--hv-text); background: transparent; text-align: left; }
.drafts-title span { display: inline-flex; align-items: center; gap: .55rem; }
.draft-list { display: grid; gap: .7rem; }
.draft-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: .9rem; border: 1px solid var(--hv-border); border-radius: 10px; background: var(--hv-surface-soft); }
.draft-copy { min-width: 0; }
.draft-heading { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
.draft-copy p { margin: .45rem 0; color: var(--hv-text); line-height: 1.5; }
.draft-copy small { color: var(--hv-muted); }
.draft-actions { display: flex; gap: .45rem; flex-shrink: 0; }
.official-sheet { overflow: hidden; border: 1px solid #aeb9c8; border-radius: 12px; background: #fff; box-shadow: var(--hv-shadow-sm); }
.official-sheet-header { display: flex; justify-content: space-between; align-items: stretch; border-bottom: 2px solid #1f2937; }
.official-sheet-brand { display: grid; gap: .18rem; padding: 1rem 1.2rem; }
.official-sheet-brand strong { font-size: 1.2rem; letter-spacing: .06em; }
.official-sheet-brand span { color: #5f6b7a; font-size: .8rem; }
.official-sheet-status { min-width: 150px; display: grid; place-content: center; padding: .8rem 1rem; border-left: 1px solid #9aa5b4; text-align: center; }
.official-sheet-status span { color: #667085; font-size: .72rem; text-transform: uppercase; }
.official-sheet-status strong { margin-top: .2rem; }
.official-person-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; border-bottom: 2px solid #1f2937; }
.official-person-grid > div { min-height: 70px; display: grid; align-content: center; gap: .3rem; padding: .7rem .85rem; border-right: 1px solid #9aa5b4; border-bottom: 1px solid #9aa5b4; }
.official-person-grid > div:nth-child(3n) { border-right: 0; }
.official-person-grid .wide { grid-column: span 2; }
.official-person-grid span { color: #667085; font-size: .68rem; font-weight: 700; text-transform: uppercase; }
.official-person-grid strong { font-size: .88rem; }
.annotation-register-header, .annotation-row { display: grid; grid-template-columns: 62px 110px minmax(0,1fr) 90px; }
.annotation-register-header { color: #fff; background: #17365d; font-size: .72rem; font-weight: 800; text-transform: uppercase; }
.annotation-register-header span { padding: .65rem; border-right: 1px solid rgba(255,255,255,.35); }
.annotation-row { min-height: 110px; border-bottom: 1px solid #aeb9c8; }
.annotation-row > * { padding: .75rem; border-right: 1px solid #aeb9c8; }
.annotation-row > *:last-child { border-right: 0; }
.annotation-row > strong:first-child, .annotation-row > span { display: grid; place-content: start center; color: #475467; font-size: .78rem; }
.annotation-copy { min-width: 0; line-height: 1.45; }
.annotation-title-line { display: flex; align-items: center; justify-content: space-between; gap: .7rem; }
.annotation-copy p { margin: .35rem 0; white-space: pre-line; }
.annotation-copy small { display: block; margin-top: .5rem; font-style: italic; }
.annotation-score { display: grid; place-content: center; text-align: center; }
.annotation-empty { min-height: 250px; display: grid; place-content: center; justify-items: center; gap: .45rem; color: #667085; text-align: center; }
.annotation-empty i { color: var(--hv-primary); font-size: 1.8rem; }
.official-sheet-footer { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 2px solid #1f2937; }
.official-sheet-footer > div { display: grid; gap: .2rem; padding: .8rem 1rem; border-right: 1px solid #9aa5b4; }
.official-sheet-footer > div:last-child { border-right: 0; }
.official-sheet-footer span { color: #667085; font-size: .7rem; text-transform: uppercase; }
.stamp-dialog { display: grid; gap: 1rem; }
.stamp-preview { padding: 1rem; border: 1px solid var(--hv-border); border-radius: 10px; background: var(--hv-surface-soft); }
.stamp-preview p { white-space: pre-line; }
.stamp-dialog label { display: grid; gap: .45rem; font-weight: 700; }
@media (max-width: 1000px) {
  .life-record-summary { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .official-person-grid { grid-template-columns: 1fr 1fr; }
  .official-person-grid .wide { grid-column: span 2; }
  .official-person-grid > div:nth-child(3n) { border-right: 1px solid #9aa5b4; }
}
@media (max-width: 760px) {
  .life-record-view { padding: .8rem; }
  .life-record-header, .draft-item { flex-direction: column; }
  .life-record-actions, .draft-actions { width: 100%; justify-content: flex-start; }
  .annotation-register { overflow-x: auto; }
  .annotation-register-header, .annotation-row { min-width: 760px; }
}
@media (max-width: 560px) {
  .life-record-summary { grid-template-columns: 1fr; }
  .official-person-grid { grid-template-columns: 1fr; }
  .official-person-grid .wide { grid-column: auto; }
  .official-sheet-footer { grid-template-columns: 1fr; }
}
@media print {
  .no-print { display: none !important; }
  .life-record-view { padding: 0; background: #fff; }
  .official-sheet { border-radius: 0; box-shadow: none; }
  .annotation-row { break-inside: avoid; }
}
</style>
