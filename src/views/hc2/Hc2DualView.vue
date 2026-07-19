<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'

import Hc2View from './Hc2View.vue'
import { guardarHc2, obtenerHc2 } from '../../services/hc2'
import type { Hc2Concepto, Hc2Documento } from '../../types/hc2'

const props = defineProps<{ hojaVidaId: number }>()
const emit = defineEmits<{ volver: [] }>()

type VistaHc2 = 'TABLA' | 'OFICIAL'

const vista = ref<VistaHc2>('TABLA')
const opcionesVista = [
  { label: 'Tabla HC2', value: 'TABLA', icon: 'pi pi-table' },
  { label: 'Vista oficial', value: 'OFICIAL', icon: 'pi pi-file' },
]

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')
const busqueda = ref('')
const hc2 = ref<Hc2Documento | null>(null)

const campos = reactive({
  opinion_calificador_directo: '',
  firma_calificador_directo: '',
  opinion_calificador_superior: '',
  decision_calificador_superior: '' as '' | 'APRUEBA' | 'MODIFICA',
  firma_calificador_superior: '',
  fecha_toma_conocimiento: '',
  firma_calificado: '',
  lista_clasificacion_junta: '',
  nota_tm_anual_junta: null as number | null,
  firma_presidente_junta: '',
  fecha_toma_conocimiento_final: '',
  firma_calificado_final: '',
})

const nombreCalificado = computed(() => {
  const resumen = hc2.value?.resumen
  if (!resumen) return ''
  return [resumen.grado_calidad_abreviatura, resumen.nombre_completo]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
})

const conceptosFiltrados = computed(() => {
  const consulta = busqueda.value.trim().toLocaleLowerCase('es')
  const conceptos = hc2.value?.conceptos ?? []
  if (!consulta) return conceptos

  return conceptos.filter(concepto => [
    String(concepto.numero),
    concepto.area,
    concepto.nombre,
    concepto.descripcion,
  ].some(valor => valor.toLocaleLowerCase('es').includes(consulta)))
})

function copiarCampos(documento: Hc2Documento): void {
  const origen = documento.campos
  campos.opinion_calificador_directo = origen.opinion_calificador_directo ?? ''
  campos.firma_calificador_directo = origen.firma_calificador_directo ?? ''
  campos.opinion_calificador_superior = origen.opinion_calificador_superior ?? ''
  campos.decision_calificador_superior = origen.decision_calificador_superior ?? ''
  campos.firma_calificador_superior = origen.firma_calificador_superior ?? ''
  campos.fecha_toma_conocimiento = origen.fecha_toma_conocimiento ?? ''
  campos.firma_calificado = origen.firma_calificado ?? ''
  campos.lista_clasificacion_junta = origen.lista_clasificacion_junta ?? ''
  campos.nota_tm_anual_junta = origen.nota_tm_anual_junta
  campos.firma_presidente_junta = origen.firma_presidente_junta ?? ''
  campos.fecha_toma_conocimiento_final = origen.fecha_toma_conocimiento_final ?? ''
  campos.firma_calificado_final = origen.firma_calificado_final ?? ''
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const documento = await obtenerHc2(props.hojaVidaId)
    hc2.value = documento
    copiarCampos(documento)
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

async function guardar(): Promise<void> {
  guardando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    await guardarHc2({
      hojaVidaId: props.hojaVidaId,
      opinion_calificador_directo: campos.opinion_calificador_directo,
      firma_calificador_directo: campos.firma_calificador_directo,
      opinion_calificador_superior: campos.opinion_calificador_superior,
      decision_calificador_superior: campos.decision_calificador_superior || null,
      firma_calificador_superior: campos.firma_calificador_superior,
      fecha_toma_conocimiento: campos.fecha_toma_conocimiento || null,
      firma_calificado: campos.firma_calificado,
      lista_clasificacion_junta: campos.lista_clasificacion_junta,
      nota_tm_anual_junta: campos.nota_tm_anual_junta,
      firma_presidente_junta: campos.firma_presidente_junta,
      fecha_toma_conocimiento_final: campos.fecha_toma_conocimiento_final || null,
      firma_calificado_final: campos.firma_calificado_final,
    })

    mensaje.value = 'HC2 guardada correctamente.'
    await cargar()
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    guardando.value = false
  }
}

function imprimir(): void {
  vista.value = 'OFICIAL'
  requestAnimationFrame(() => window.print())
}

function puntajesAnotaciones(concepto: Hc2Concepto): string {
  if (!concepto.anotaciones.length) return '—'
  return concepto.anotaciones.map(item => item.puntaje_visual).join(', ')
}

function obtenerMensajeError(excepcion: unknown): string {
  return excepcion instanceof Error ? excepcion.message : String(excepcion)
}

watch(() => props.hojaVidaId, cargar)
onMounted(cargar)
</script>

<template>
  <section class="hc2-dual-view">
    <header class="hc2-dual-header no-print">
      <div>
        <span class="hc2-eyebrow">Instrumento de calificación</span>
        <h1>HC2</h1>
        <p>Calificación Hoja N.º 2</p>
      </div>

      <div class="hc2-header-actions">
        <SelectButton
          v-model="vista"
          :options="opcionesVista"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          aria-label="Seleccionar vista HC2"
        >
          <template #option="slotProps">
            <i :class="slotProps.option.icon" />
            <span>{{ slotProps.option.label }}</span>
          </template>
        </SelectButton>

        <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" outlined :loading="cargando" @click="cargar" />
        <Button v-if="vista === 'OFICIAL'" label="Imprimir" icon="pi pi-print" severity="secondary" outlined @click="imprimir" />
        <Button v-if="vista === 'TABLA'" label="Guardar HC2" icon="pi pi-save" :loading="guardando" @click="guardar" />
      </div>
    </header>

    <div v-if="error" class="hc2-notice hc2-notice-error no-print">{{ error }}</div>
    <div v-if="mensaje" class="hc2-notice hc2-notice-success no-print">{{ mensaje }}</div>

    <section v-if="cargando" class="hc2-loading no-print">
      <i class="pi pi-spin pi-spinner" />
      Cargando HC2…
    </section>

    <template v-else-if="hc2">
      <section v-if="vista === 'TABLA'" class="hc2-operational-view">
        <article class="hc2-summary-card">
          <div>
            <span>Calificado</span>
            <strong>{{ nombreCalificado }}</strong>
          </div>
          <div>
            <span>RUN</span>
            <strong>{{ hc2.resumen.run }}</strong>
          </div>
          <div>
            <span>Categoría</span>
            <strong>{{ hc2.resumen.categoria_nombre }}</strong>
          </div>
          <div>
            <span>Término medio</span>
            <strong>{{ hc2.terminoMedioVisual || 'Pendiente' }}</strong>
          </div>
          <div>
            <span>Lista propuesta</span>
            <strong>{{ hc2.listaPropuesta }}</strong>
          </div>
          <div>
            <span>Estado</span>
            <Tag :value="hc2.completa ? 'Completa' : 'Pendiente'" :severity="hc2.completa ? 'success' : 'warn'" />
          </div>
        </article>

        <article class="hc2-table-card">
          <header class="hc2-card-heading">
            <div>
              <h2>Áreas y conceptos de calificación</h2>
              <p>Resumen operativo de notas, EVINT y puntajes de la Hoja de Vida.</p>
            </div>
            <span class="hc2-search"><i class="pi pi-search" /><InputText v-model="busqueda" placeholder="Buscar concepto…" /></span>
          </header>

          <DataTable
            :value="conceptosFiltrados"
            data-key="numero"
            striped-rows
            row-hover
            responsive-layout="scroll"
            :paginator="conceptosFiltrados.length > 12"
            :rows="12"
            empty-message="No se encontraron conceptos."
          >
            <Column field="numero" header="N.º" sortable style="width:5rem" />
            <Column field="area" header="Área" sortable style="min-width:12rem">
              <template #body="slotProps"><Tag :value="slotProps.data.area" severity="secondary" /></template>
            </Column>
            <Column field="nombre" header="Concepto" sortable style="min-width:15rem">
              <template #body="slotProps">
                <div class="hc2-concept-cell"><strong>{{ slotProps.data.nombre }}</strong><small>{{ slotProps.data.descripcion }}</small></div>
              </template>
            </Column>
            <Column header="Anotaciones HVD" style="min-width:10rem">
              <template #body="slotProps">{{ puntajesAnotaciones(slotProps.data) }}</template>
            </Column>
            <Column field="puntajeHojaVidaVisual" header="Puntaje HVD" style="width:8rem" />
            <Column field="notaParcialVisual" header="Nota parcial" style="width:8rem" />
            <Column field="notaPrimeraEvintVisual" header="EVINT 1" style="width:7rem" />
            <Column field="notaSegundaEvintVisual" header="EVINT 2" style="width:7rem" />
            <Column field="notaFinalVisual" header="Nota final" style="width:7rem">
              <template #body="slotProps">
                <Tag :value="slotProps.data.notaFinalVisual || 'Pendiente'" :severity="slotProps.data.notaFinal === null ? 'warn' : 'success'" />
              </template>
            </Column>
          </DataTable>
        </article>

        <form class="hc2-form-card" @submit.prevent="guardar">
          <header class="hc2-card-heading">
            <div><h2>Opiniones, decisiones y firmas</h2><p>Antecedentes complementarios de la HC2.</p></div>
          </header>

          <div class="hc2-form-grid">
            <label class="hc2-field hc2-field-wide"><span>Opinión del calificador directo</span><Textarea v-model="campos.opinion_calificador_directo" rows="5" auto-resize /></label>
            <label class="hc2-field"><span>Firma del calificador directo</span><InputText v-model="campos.firma_calificador_directo" /></label>
            <label class="hc2-field"><span>Decisión del calificador superior</span><select v-model="campos.decision_calificador_superior"><option value="">Sin decisión</option><option value="APRUEBA">Aprueba</option><option value="MODIFICA">Modifica</option></select></label>
            <label class="hc2-field hc2-field-wide"><span>Opinión del calificador superior</span><Textarea v-model="campos.opinion_calificador_superior" rows="5" auto-resize /></label>
            <label class="hc2-field"><span>Firma del calificador superior</span><InputText v-model="campos.firma_calificador_superior" /></label>
            <label class="hc2-field"><span>Fecha de toma de conocimiento</span><input v-model="campos.fecha_toma_conocimiento" type="date"></label>
            <label class="hc2-field"><span>Firma del calificado</span><InputText v-model="campos.firma_calificado" /></label>
            <label class="hc2-field"><span>Lista de clasificación de la Junta</span><InputText v-model="campos.lista_clasificacion_junta" /></label>
            <label class="hc2-field"><span>Nota término medio anual</span><InputNumber v-model="campos.nota_tm_anual_junta" :min="1" :max="7" :min-fraction-digits="2" :max-fraction-digits="2" /></label>
            <label class="hc2-field hc2-field-wide"><span>Firma del presidente de la Junta</span><InputText v-model="campos.firma_presidente_junta" /></label>
            <label class="hc2-field"><span>Fecha de toma de conocimiento final</span><input v-model="campos.fecha_toma_conocimiento_final" type="date"></label>
            <label class="hc2-field"><span>Firma final del calificado</span><InputText v-model="campos.firma_calificado_final" /></label>
          </div>

          <footer class="hc2-form-actions"><Button type="submit" label="Guardar HC2" icon="pi pi-save" :loading="guardando" /></footer>
        </form>
      </section>

      <section v-else class="hc2-official-host">
        <Hc2View :hoja-vida-id="hojaVidaId" @volver="emit('volver')" />
      </section>
    </template>
  </section>
</template>

<style scoped>
.hc2-dual-view{min-height:100%;padding:1.25rem;background:var(--hv-page)}
.hc2-dual-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}
.hc2-dual-header h1{margin:.2rem 0 0;font-size:1.75rem}.hc2-dual-header p{margin:.35rem 0 0;color:var(--hv-muted)}
.hc2-eyebrow{color:var(--hv-primary);font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.hc2-header-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:.55rem}
.hc2-header-actions :deep(.p-selectbutton .p-togglebutton-content){display:flex;align-items:center;gap:.4rem}
.hc2-notice{margin-bottom:.8rem;padding:.8rem 1rem;border-radius:8px;font-size:.9rem}.hc2-notice-error{color:#8a1c1c;background:#fff1f1;border:1px solid #f2b8b8}.hc2-notice-success{color:#17633f;background:#edfdf5;border:1px solid #a7e3c5}
.hc2-loading{display:flex;align-items:center;justify-content:center;gap:.65rem;min-height:280px;color:var(--hv-muted)}
.hc2-operational-view{display:grid;gap:1rem}.hc2-summary-card,.hc2-table-card,.hc2-form-card{border:1px solid var(--hv-border);border-radius:12px;background:var(--hv-surface);box-shadow:var(--hv-shadow-sm)}
.hc2-summary-card{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:0}.hc2-summary-card>div{display:grid;gap:.3rem;padding:1rem;border-right:1px solid var(--hv-border)}.hc2-summary-card>div:last-child{border-right:0}.hc2-summary-card span{color:var(--hv-muted);font-size:.76rem}.hc2-summary-card strong{font-size:.92rem}
.hc2-table-card,.hc2-form-card{padding:1rem}.hc2-card-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem}.hc2-card-heading h2{margin:0;font-size:1.05rem}.hc2-card-heading p{margin:.3rem 0 0;color:var(--hv-muted);font-size:.84rem}
.hc2-search{display:flex;align-items:center;gap:.45rem;min-width:260px;padding:0 .7rem;border:1px solid var(--hv-border);border-radius:8px;background:var(--hv-surface)}.hc2-search i{color:var(--hv-muted)}.hc2-search :deep(input){border:0;box-shadow:none}
.hc2-concept-cell{display:grid;gap:.22rem}.hc2-concept-cell small{max-width:520px;color:var(--hv-muted);line-height:1.35}
.hc2-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.hc2-field{display:grid;gap:.4rem}.hc2-field>span{font-size:.82rem;font-weight:700}.hc2-field input,.hc2-field select,.hc2-field :deep(input),.hc2-field :deep(textarea){width:100%;box-sizing:border-box}.hc2-field input,.hc2-field select{min-height:42px;padding:.65rem .75rem;border:1px solid var(--hv-border);border-radius:8px;background:var(--hv-surface);font:inherit}.hc2-field-wide{grid-column:1/-1}.hc2-form-actions{display:flex;justify-content:flex-end;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--hv-border)}
.hc2-official-host{margin:-1.25rem}.hc2-official-host :deep(.floating-toolbar__button[title="Volver"]){display:none}
@media(max-width:1100px){.hc2-summary-card{grid-template-columns:repeat(3,minmax(0,1fr))}.hc2-summary-card>div:nth-child(3n){border-right:0}.hc2-summary-card>div:nth-child(-n+3){border-bottom:1px solid var(--hv-border)}}
@media(max-width:760px){.hc2-dual-header,.hc2-card-heading{align-items:stretch;flex-direction:column}.hc2-header-actions{justify-content:flex-start}.hc2-summary-card,.hc2-form-grid{grid-template-columns:1fr}.hc2-summary-card>div{border-right:0;border-bottom:1px solid var(--hv-border)}.hc2-field-wide{grid-column:auto}.hc2-search{min-width:0}}
@media print{.no-print{display:none!important}.hc2-dual-view{padding:0;background:#fff}.hc2-official-host{margin:0}}
</style>
