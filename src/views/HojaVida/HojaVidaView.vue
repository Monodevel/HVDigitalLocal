<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

import {
  anularBorradorHojaVida,
  listarAnotacionesHojaVida,
  listarBorradoresHojaVida,
  obtenerHojaVidaResumen,
  obtenerUnidadSistema,
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

type VistaHojaVida = 'ANOTACIONES' | 'OFICIAL'

const vistaActiva = ref<VistaHojaVida>('ANOTACIONES')
const busqueda = ref('')
const cargando = ref(true)
const procesando = ref(false)
const error = ref('')
const mensaje = ref('')
const resumen = ref<HojaVidaResumen | null>(null)
const unidad = ref('')
const borradores = ref<BorradorHojaVida[]>([])
const anotaciones = ref<AnotacionHojaVida[]>([])
const borradorSeleccionado = ref<BorradorHojaVida | null>(null)
const modalEstampado = ref(false)
const estampado = reactive({ origen: 'CALIFICADOR_DIRECTO' as OrigenAnotacion })

const opcionesOrigen = [
  { label: 'Calificador directo', value: 'CALIFICADOR_DIRECTO' },
  { label: 'Autoridad superior', value: 'AUTORIDAD_SUPERIOR' },
  { label: 'Oficial general', value: 'OFICIAL_GENERAL' },
  { label: 'Oficial de personal', value: 'OFICIAL_PERSONAL' },
  { label: 'Sistema', value: 'SISTEMA' },
]

const meses = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
]

const totalFilas = 62
const filasPrimerBloque = 28

const nombreCalificado = computed(() => {
  if (!resumen.value) return ''
  return [resumen.value.grado_calidad_abreviatura, resumen.value.nombre_completo]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
})

const modoSoloLectura = computed(() => resumen.value?.hoja_vida_estado !== 'abierta')

const anotacionesFiltradas = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es')
  if (!termino) return anotaciones.value

  return anotaciones.value.filter(anotacion => [
    anotacion.titulo_final,
    anotacion.concepto_nombre,
    anotacion.cuerpo_final,
    anotacion.numero_resolucion,
    anotacion.puntaje_visual,
  ].some(valor => String(valor ?? '').toLocaleLowerCase('es').includes(termino)))
})

const filasDocumento = computed<Array<AnotacionHojaVida | null>>(() => {
  const filas: Array<AnotacionHojaVida | null> = [...anotaciones.value]
  while (filas.length < totalFilas) filas.push(null)
  return filas.slice(0, totalFilas)
})

const filasSuperiores = computed(() => filasDocumento.value.slice(0, filasPrimerBloque))
const filasInferiores = computed(() => filasDocumento.value.slice(filasPrimerBloque))

function obtenerMensajeError(excepcion: unknown): string {
  return excepcion instanceof Error ? excepcion.message : String(excepcion)
}

function partesFecha(fecha: string | null | undefined) {
  if (!fecha) return { dia: '', mes: '', anio: '' }
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return { dia: dia ?? '', mes: meses[Number(mes) - 1] ?? '', anio: anio ?? '' }
}

function fechaCorta(fecha: string | null | undefined): string {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia ?? ''}/${mes ?? ''}/${anio ?? ''}`
}

function textoAnotacion(anotacion: AnotacionHojaVida): string {
  const partes = [
    anotacion.titulo_final,
    anotacion.concepto_nombre,
    anotacion.cuerpo_final,
    anotacion.numero_resolucion
      ? `RES. EXENTA N.º ${anotacion.numero_resolucion} de fecha ${fechaCorta(anotacion.fecha_resolucion)}`
      : '',
  ]
  return partes.filter(Boolean).join('\n')
}

function colorAnotacion(anotacion: AnotacionHojaVida): string {
  return anotacion.color_hex || (anotacion.color_semantico === 'ROJO' ? '#b42318' : '#111111')
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const [resumenResultado, borradoresResultado, anotacionesResultado, unidadResultado] = await Promise.all([
      obtenerHojaVidaResumen(props.hojaVidaId),
      listarBorradoresHojaVida(props.hojaVidaId),
      listarAnotacionesHojaVida(props.hojaVidaId),
      obtenerUnidadSistema(),
    ])
    if (!resumenResultado) throw new Error('No se encontró la Hoja de Vida solicitada.')
    resumen.value = resumenResultado
    borradores.value = borradoresResultado
    anotaciones.value = anotacionesResultado
    unidad.value = unidadResultado
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

function abrirEstampado(borrador: BorradorHojaVida): void {
  borradorSeleccionado.value = borrador
  estampado.origen = 'CALIFICADOR_DIRECTO'
  modalEstampado.value = true
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
      resolucionDocumentalId: borrador.requiere_resolucion === 1
        ? borrador.resolucion_documental_id
        : null,
    }
    const validacion = await validarEstampadoAnotacion(solicitud)
    if (!validacion.valido) throw new Error(validacion.errores.join(' '))
    await estamparAnotacion(solicitud)
    mensaje.value = 'Anotación estampada correctamente.'
    modalEstampado.value = false
    borradorSeleccionado.value = null
    await cargar()
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    procesando.value = false
  }
}

async function anularBorrador(borrador: BorradorHojaVida): Promise<void> {
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
  vistaActiva.value = 'OFICIAL'
  requestAnimationFrame(() => window.print())
}

watch(() => props.hojaVidaId, cargar)
onMounted(cargar)
</script>

<template>
  <section class="hv-sheet-view">
    <header class="hv-sheet-actions no-print">
      <div>
        <span class="hv-eyebrow">Instrumento de calificación</span>
        <h1>Hoja de Vida</h1>
        <p>{{ nombreCalificado || 'Consulta y administración de anotaciones' }}</p>
      </div>
      <div class="hv-sheet-action-buttons">
        <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" outlined :loading="cargando" @click="cargar" />
        <Button v-if="vistaActiva === 'OFICIAL'" label="Imprimir" icon="pi pi-print" severity="secondary" outlined @click="imprimir" />
        <Button label="Nueva anotación" icon="pi pi-plus" :disabled="modoSoloLectura" @click="emit('nuevaAnotacion', hojaVidaId)" />
      </div>
    </header>

    <nav class="hv-view-switcher no-print" aria-label="Vistas de la Hoja de Vida">
      <button type="button" :class="{ active: vistaActiva === 'ANOTACIONES' }" @click="vistaActiva = 'ANOTACIONES'">
        <i class="pi pi-list" />
        <span>Anotaciones</span>
        <small>Vista operativa en tabla</small>
      </button>
      <button type="button" :class="{ active: vistaActiva === 'OFICIAL' }" @click="vistaActiva = 'OFICIAL'">
        <i class="pi pi-file" />
        <span>Vista oficial</span>
        <small>Formato institucional</small>
      </button>
    </nav>

    <div v-if="error" class="hv-sheet-notice hv-sheet-notice-error no-print">{{ error }}</div>
    <div v-if="mensaje" class="hv-sheet-notice hv-sheet-notice-success no-print">{{ mensaje }}</div>

    <section v-if="cargando" class="hv-sheet-loading no-print">
      <i class="pi pi-spin pi-spinner" /> Cargando Hoja de Vida…
    </section>

    <template v-else-if="resumen">
      <section v-if="borradores.length" class="hv-drafts-panel no-print">
        <div class="hv-drafts-heading">
          <div><strong>Borradores pendientes</strong><span>{{ borradores.length }} anotación(es) pendientes de estampar</span></div>
          <Tag :value="String(borradores.length)" severity="warn" />
        </div>
        <article v-for="borrador in borradores" :key="borrador.borrador_id" class="hv-draft-item">
          <div>
            <strong>{{ borrador.titulo_final || borrador.plantilla_nombre }}</strong>
            <span>{{ fechaCorta(borrador.fecha_anotacion) }}</span>
            <p>{{ borrador.cuerpo_final }}</p>
          </div>
          <div class="hv-draft-actions">
            <Button label="Estampar" icon="pi pi-check" size="small" :disabled="modoSoloLectura || procesando" @click="abrirEstampado(borrador)" />
            <Button label="Anular" icon="pi pi-times" severity="danger" outlined size="small" :disabled="modoSoloLectura || procesando" @click="anularBorrador(borrador)" />
          </div>
        </article>
      </section>

      <section v-if="vistaActiva === 'ANOTACIONES'" class="hv-annotations-panel no-print">
        <header class="hv-annotations-toolbar">
          <div>
            <strong>Anotaciones estampadas</strong>
            <span>{{ anotaciones.length }} registro(s) en la Hoja de Vida</span>
          </div>
          <span class="hv-search-box">
            <i class="pi pi-search" />
            <InputText v-model="busqueda" placeholder="Buscar anotación, concepto o resolución…" />
          </span>
        </header>

        <div class="hv-annotations-table-wrap">
          <table class="hv-annotations-table">
            <thead>
              <tr>
                <th>N.º</th>
                <th>Fecha</th>
                <th>Tipo / concepto</th>
                <th>Anotación</th>
                <th>Resolución</th>
                <th>Puntaje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="anotacion in anotacionesFiltradas" :key="anotacion.anotacion_id">
                <td><strong>{{ anotacion.correlativo }}</strong></td>
                <td>{{ fechaCorta(anotacion.fecha_anotacion) }}</td>
                <td>
                  <strong>{{ anotacion.titulo_final || 'Anotación' }}</strong>
                  <span>{{ anotacion.concepto_nombre || 'Sin concepto asociado' }}</span>
                </td>
                <td class="hv-table-annotation" :style="{ color: colorAnotacion(anotacion) }">{{ anotacion.cuerpo_final }}</td>
                <td>
                  <span v-if="anotacion.numero_resolucion">N.º {{ anotacion.numero_resolucion }}</span>
                  <small v-if="anotacion.fecha_resolucion">{{ fechaCorta(anotacion.fecha_resolucion) }}</small>
                  <span v-if="!anotacion.numero_resolucion">—</span>
                </td>
                <td><strong>{{ anotacion.puntaje_visual || '—' }}</strong></td>
              </tr>
              <tr v-if="!anotacionesFiltradas.length">
                <td colspan="6" class="hv-empty-table">No existen anotaciones que coincidan con la búsqueda.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div v-show="vistaActiva === 'OFICIAL'" class="hv-official-sheet-wrap">
        <article class="hv-official-sheet">
          <header class="hv-excel-topline">
            <div class="hv-excel-unit"><strong>{{ unidad || 'UNIDAD O REPARTICIÓN' }}</strong><small>(Unidad o Repartición)</small></div>
            <div class="hv-excel-number"><span>HOJA Nº</span><strong>01 (UNO)</strong></div>
          </header>
          <h2 class="hv-excel-title">H O J A&nbsp;&nbsp; D E&nbsp;&nbsp; V I D A</h2>
          <section class="hv-excel-person">
            <strong>DEL:</strong>
            <div><span>{{ nombreCalificado }}</span><small>(GRADO, CATEGORÍA O ESCALAFÓN, APELLIDOS Y NOMBRES)</small></div>
          </section>
          <section class="hv-excel-period">
            <span>DESDE EL</span><strong>{{ partesFecha(resumen.fecha_inicio).dia }}</strong>
            <span>DE</span><strong>{{ partesFecha(resumen.fecha_inicio).mes }}</strong>
            <span>DE</span><strong>{{ partesFecha(resumen.fecha_inicio).anio }}</strong>
            <span>HASTA EL</span><strong>{{ partesFecha(resumen.fecha_termino).dia }}</strong>
            <span>DE</span><strong>{{ partesFecha(resumen.fecha_termino).mes }}</strong>
            <span>DE</span><strong>{{ partesFecha(resumen.fecha_termino).anio }}</strong>
          </section>

          <table class="hv-excel-table">
            <colgroup><col class="hv-col-day"><col class="hv-col-month"><col class="hv-col-year"><col class="hv-col-annotation"><col class="hv-col-signature"><col class="hv-col-signature"></colgroup>
            <thead><tr><th colspan="3">F E C H A</th><th rowspan="2">A N O T A C I O N E S</th><th colspan="2">F I R M A S</th></tr><tr><th>D</th><th>M</th><th>A</th><th>CALIFICADOR</th><th>CALIFICADO</th></tr></thead>
            <tbody>
              <tr v-for="(anotacion, indice) in filasSuperiores" :key="`superior-${indice}`">
                <td>{{ anotacion ? partesFecha(anotacion.fecha_anotacion).dia : '' }}</td>
                <td>{{ anotacion ? partesFecha(anotacion.fecha_anotacion).mes.slice(0, 3) : '' }}</td>
                <td>{{ anotacion ? partesFecha(anotacion.fecha_anotacion).anio.slice(-2) : '' }}</td>
                <td class="hv-annotation-cell"><div v-if="anotacion" :style="{ color: colorAnotacion(anotacion) }"><span class="hv-row-number">{{ anotacion.correlativo }}.</span><span class="hv-row-text">{{ textoAnotacion(anotacion) }}</span><strong v-if="anotacion.puntaje_visual" class="hv-row-score">{{ anotacion.puntaje_visual }}</strong></div></td>
                <td></td><td></td>
              </tr>
            </tbody>
          </table>

          <table class="hv-excel-table hv-excel-table-second">
            <colgroup><col class="hv-col-day"><col class="hv-col-month"><col class="hv-col-year"><col class="hv-col-annotation"><col class="hv-col-signature"><col class="hv-col-signature"></colgroup>
            <thead><tr><th colspan="3">F E C H A</th><th rowspan="2">A N O T A C I O N E S</th><th colspan="2">F I R M A S</th></tr><tr><th>D</th><th>M</th><th>A</th><th>CALIFICADOR</th><th>CALIFICADO</th></tr></thead>
            <tbody>
              <tr v-for="(anotacion, indice) in filasInferiores" :key="`inferior-${indice}`">
                <td>{{ anotacion ? partesFecha(anotacion.fecha_anotacion).dia : '' }}</td>
                <td>{{ anotacion ? partesFecha(anotacion.fecha_anotacion).mes.slice(0, 3) : '' }}</td>
                <td>{{ anotacion ? partesFecha(anotacion.fecha_anotacion).anio.slice(-2) : '' }}</td>
                <td class="hv-annotation-cell"><div v-if="anotacion" :style="{ color: colorAnotacion(anotacion) }"><span class="hv-row-number">{{ anotacion.correlativo }}.</span><span class="hv-row-text">{{ textoAnotacion(anotacion) }}</span><strong v-if="anotacion.puntaje_visual" class="hv-row-score">{{ anotacion.puntaje_visual }}</strong></div></td>
                <td></td><td></td>
              </tr>
            </tbody>
          </table>
          <footer class="hv-excel-footer"><span>CODIGO 1-00-1480-00</span><span>IGM TALLERES GRAFICOS</span></footer>
        </article>
      </div>
    </template>

    <Dialog v-model:visible="modalEstampado" modal header="Estampar anotación" :style="{ width: 'min(520px, 92vw)' }" :closable="!procesando">
      <div class="hv-stamp-dialog">
        <p>{{ borradorSeleccionado?.titulo_final || borradorSeleccionado?.plantilla_nombre }}</p>
        <label for="origen-anotacion">Origen de la anotación</label>
        <Select id="origen-anotacion" v-model="estampado.origen" :options="opcionesOrigen" option-label="label" option-value="value" fluid />
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text :disabled="procesando" @click="modalEstampado = false" />
        <Button label="Confirmar estampado" icon="pi pi-check" :loading="procesando" @click="confirmarEstampado" />
      </template>
    </Dialog>
  </section>
</template>

<style scoped>
.hv-sheet-view{min-height:100%;padding:1.25rem;background:var(--hv-page)}
.hv-sheet-actions{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}.hv-sheet-actions h1{margin:.2rem 0 0;font-size:1.75rem}.hv-sheet-actions p{margin:.35rem 0 0;color:var(--hv-muted)}
.hv-sheet-action-buttons,.hv-draft-actions{display:flex;flex-wrap:wrap;gap:.55rem}
.hv-view-switcher{display:grid;grid-template-columns:repeat(2,minmax(220px,1fr));gap:.7rem;margin-bottom:1rem;padding:.35rem;border:1px solid var(--hv-border);border-radius:12px;background:var(--hv-surface-soft)}
.hv-view-switcher button{display:grid;grid-template-columns:auto 1fr;column-gap:.65rem;align-items:center;padding:.8rem 1rem;text-align:left;color:var(--hv-muted);background:transparent;border:0;border-radius:9px;cursor:pointer}.hv-view-switcher button i{grid-row:1/3;font-size:1.2rem}.hv-view-switcher button span{font-weight:800}.hv-view-switcher button small{margin-top:.12rem}.hv-view-switcher button.active{color:var(--hv-primary);background:#fff;box-shadow:0 3px 10px rgba(15,23,42,.08)}
.hv-sheet-notice{margin-bottom:.8rem;padding:.8rem 1rem;border-radius:8px;font-size:.9rem}.hv-sheet-notice-error{color:#8a1c1c;background:#fff1f1;border:1px solid #f2b8b8}.hv-sheet-notice-success{color:#17633f;background:#edfdf5;border:1px solid #a7e3c5}
.hv-sheet-loading{display:flex;align-items:center;justify-content:center;gap:.65rem;min-height:280px;color:var(--hv-muted)}
.hv-drafts-panel,.hv-annotations-panel{margin-bottom:1rem;border:1px solid var(--hv-border);border-radius:12px;background:#fff;overflow:hidden}.hv-drafts-panel{padding:1rem}
.hv-drafts-heading,.hv-draft-item,.hv-annotations-toolbar{display:flex;align-items:center;justify-content:space-between;gap:1rem}.hv-drafts-heading>div,.hv-draft-item>div:first-child,.hv-annotations-toolbar>div{display:grid;gap:.25rem}.hv-drafts-heading span,.hv-draft-item span,.hv-draft-item p,.hv-annotations-toolbar span{color:var(--hv-muted);font-size:.84rem}.hv-draft-item{margin-top:.75rem;padding-top:.75rem;border-top:1px solid var(--hv-border)}.hv-draft-item p{margin:.2rem 0 0;white-space:pre-wrap}
.hv-annotations-toolbar{padding:1rem;border-bottom:1px solid var(--hv-border);background:var(--hv-surface-soft)}.hv-search-box{position:relative;display:block;width:min(420px,100%)}.hv-search-box i{position:absolute;left:.8rem;top:50%;z-index:2;transform:translateY(-50%);color:#98a2b3}.hv-search-box :deep(input){width:100%;padding-left:2.35rem}
.hv-annotations-table-wrap{overflow:auto}.hv-annotations-table{width:100%;min-width:980px;border-collapse:collapse}.hv-annotations-table th,.hv-annotations-table td{padding:.8rem .75rem;border-bottom:1px solid var(--hv-border);vertical-align:top;text-align:left;font-size:.82rem}.hv-annotations-table th{color:#475467;background:#fbfcfe;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em}.hv-annotations-table td:nth-child(1){width:60px}.hv-annotations-table td:nth-child(2){width:105px;white-space:nowrap}.hv-annotations-table td:nth-child(3){width:210px}.hv-annotations-table td:nth-child(5){width:130px}.hv-annotations-table td:nth-child(6){width:90px}.hv-annotations-table td span,.hv-annotations-table td small{display:block;margin-top:.2rem;color:var(--hv-muted)}.hv-table-annotation{min-width:320px;white-space:pre-wrap;line-height:1.45}.hv-empty-table{padding:2.5rem!important;text-align:center!important;color:var(--hv-muted)}
.hv-official-sheet-wrap{overflow:auto;padding:1rem;border-radius:12px;background:#cfd4da}.hv-official-sheet{width:100%;min-width:980px;max-width:1180px;margin:0 auto;padding:24px 28px 18px;color:#111;background:#fff;box-shadow:0 16px 44px rgba(15,23,42,.18);font-family:Arial,Helvetica,sans-serif}
.hv-excel-topline{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.hv-excel-unit{display:grid;min-width:340px;text-align:center}.hv-excel-unit strong{padding-bottom:3px;border-bottom:1px solid #111;font-size:14px}.hv-excel-unit small{margin-top:3px;font-size:10px}.hv-excel-number{display:grid;grid-template-columns:auto 92px;gap:10px;align-items:center;font-size:13px}.hv-excel-number strong{padding:4px 6px;border:1px solid #111;text-align:center}
.hv-excel-title{margin:14px 0 22px;text-align:center;text-decoration:underline;font-size:19px;letter-spacing:.22em}.hv-excel-person{display:grid;grid-template-columns:68px 1fr;gap:8px;align-items:end;margin-bottom:20px}.hv-excel-person>div{display:grid;text-align:center}.hv-excel-person span{padding:0 8px 3px;border-bottom:1px solid #111;font-size:14px;font-weight:700}.hv-excel-person small{margin-top:3px;font-size:9px}
.hv-excel-period{display:grid;grid-template-columns:auto 42px auto minmax(90px,1fr) auto 56px auto 42px auto minmax(90px,1fr) auto 56px;gap:6px;align-items:end;margin-bottom:18px;font-size:12px;white-space:nowrap}.hv-excel-period strong{min-height:19px;padding:2px 4px;border-bottom:1px solid #111;text-align:center}
.hv-excel-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px}.hv-excel-table-second{margin-top:16px}.hv-col-day,.hv-col-month,.hv-col-year{width:4.4%}.hv-col-annotation{width:60.8%}.hv-col-signature{width:13%}.hv-excel-table th,.hv-excel-table td{border:1px solid #111}.hv-excel-table th{height:25px;padding:3px;text-align:center;vertical-align:middle;font-weight:700;letter-spacing:.08em}.hv-excel-table tbody td{height:22px;padding:2px 3px;text-align:center;vertical-align:top}.hv-annotation-cell{text-align:left!important}.hv-annotation-cell>div{display:grid;grid-template-columns:28px 1fr auto;gap:4px;align-items:start;white-space:pre-wrap;line-height:1.25}.hv-row-number{font-weight:700}.hv-row-text{overflow-wrap:anywhere}.hv-row-score{white-space:nowrap}.hv-excel-footer{display:flex;justify-content:space-between;margin-top:10px;font-size:9px}
.hv-stamp-dialog{display:grid;gap:.75rem}.hv-stamp-dialog p{margin:0;color:var(--hv-muted)}.hv-stamp-dialog label{font-weight:700}
@media(max-width:900px){.hv-sheet-actions,.hv-drafts-heading,.hv-draft-item,.hv-annotations-toolbar{align-items:stretch;flex-direction:column}.hv-view-switcher{grid-template-columns:1fr}.hv-search-box{width:100%}}
@media print{:global(body){overflow:visible!important;background:#fff!important}:global(.hv-sidebar),:global(.hv-topbar),:global(.hv-global-statusbar),.no-print{display:none!important}.hv-sheet-view,.hv-official-sheet-wrap{padding:0;overflow:visible;background:#fff}.hv-official-sheet{display:block!important;width:100%;min-width:0;max-width:none;margin:0;padding:0;box-shadow:none}@page{size:landscape;margin:10mm}}
</style>
