<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'

import AppLayout from '../../components/layout/AppLayout.vue'
import AppCard from '../../components/ui/AppCard.vue'

import {
  guardarHc2,
  obtenerHc2,
} from '../../services/hc2'

import type {
  Hc2Concepto,
  Hc2Documento,
} from '../../types/hc2'

const props = defineProps<{
  hojaVidaId: number
}>()

const emit = defineEmits<{
  volver: []
}>()

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')

const hc2 = ref<Hc2Documento | null>(null)

const panelDerechoExpandido = ref(false)

function alternarPanelDerecho(): void {
  panelDerechoExpandido.value =
    !panelDerechoExpandido.value
}

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

const conceptosConducta = computed(() =>
  hc2.value?.conceptos.filter(
    concepto => concepto.area === 'CONDUCTA',
  ) ?? [],
)

const conceptosDesempeno = computed(() =>
  hc2.value?.conceptos.filter(
    concepto =>
      concepto.area === 'DESEMPEÑO PROFESIONAL',
  ) ?? [],
)

const nombreCalificado = computed(() => {
  const resumen = hc2.value?.resumen

  if (!resumen) {
    return ''
  }

  return [
    resumen.grado_calidad_abreviatura,
    resumen.nombre_completo,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
})

function formatearFecha(
  fecha: string | null | undefined,
): string {
  if (!fecha) {
    return ''
  }

  const [anio, mes, dia] =
    fecha.slice(0, 10).split('-')

  if (!anio || !mes || !dia) {
    return fecha
  }

  return `${dia}-${mes}-${anio}`
}

function claseIncompleta(
  concepto: Hc2Concepto,
): boolean {
  return concepto.notaFinal === null
}

function copiarCampos(): void {
  const documento = hc2.value

  if (!documento) {
    return
  }

  const origen = documento.campos

  campos.opinion_calificador_directo =
    origen.opinion_calificador_directo ?? ''

  campos.firma_calificador_directo =
    origen.firma_calificador_directo ?? ''

  campos.opinion_calificador_superior =
    origen.opinion_calificador_superior ?? ''

  campos.decision_calificador_superior =
    origen.decision_calificador_superior ?? ''

  campos.firma_calificador_superior =
    origen.firma_calificador_superior ?? ''

  campos.fecha_toma_conocimiento =
    origen.fecha_toma_conocimiento ?? ''

  campos.firma_calificado =
    origen.firma_calificado ?? ''

  campos.lista_clasificacion_junta =
    origen.lista_clasificacion_junta ?? ''

  campos.nota_tm_anual_junta =
    origen.nota_tm_anual_junta

  campos.firma_presidente_junta =
    origen.firma_presidente_junta ?? ''

  campos.fecha_toma_conocimiento_final =
    origen.fecha_toma_conocimiento_final ?? ''

  campos.firma_calificado_final =
    origen.firma_calificado_final ?? ''
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    hc2.value =
      await obtenerHc2(
        props.hojaVidaId,
      )

    copiarCampos()
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
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
      opinion_calificador_directo:
        campos.opinion_calificador_directo,
      firma_calificador_directo:
        campos.firma_calificador_directo,
      opinion_calificador_superior:
        campos.opinion_calificador_superior,
      decision_calificador_superior:
        campos.decision_calificador_superior || null,
      firma_calificador_superior:
        campos.firma_calificador_superior,
      fecha_toma_conocimiento:
        campos.fecha_toma_conocimiento || null,
      firma_calificado:
        campos.firma_calificado,
      lista_clasificacion_junta:
        campos.lista_clasificacion_junta,
      nota_tm_anual_junta:
        campos.nota_tm_anual_junta,
      firma_presidente_junta:
        campos.firma_presidente_junta,
      fecha_toma_conocimiento_final:
        campos.fecha_toma_conocimiento_final || null,
      firma_calificado_final:
        campos.firma_calificado_final,
    })

    mensaje.value =
      'HC2 guardada correctamente.'

    await cargar()
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    guardando.value = false
  }
}

function imprimir(): void {
  window.print()
}

function obtenerMensajeError(
  excepcion: unknown,
): string {
  return excepcion instanceof Error
    ? excepcion.message
    : String(excepcion)
}

watch(
  () => props.hojaVidaId,
  cargar,
)

onMounted(cargar)
</script>

<template>
  <AppLayout
    title="HC2"
    subtitle="Calificación Hoja N.º 2"
    max-width="full"
    compact
    hide-header
  >

    <template #notice>
      <div
        v-if="error"
        class="notice notice--error no-print"
      >
        {{ error }}
      </div>

      <div
        v-if="mensaje"
        class="notice notice--success no-print"
      >
        {{ mensaje }}
      </div>
    </template>

    <section
      v-if="cargando"
      class="loading-state no-print"
    >
      Cargando HC2…
    </section>

    <template v-else-if="hc2">
      <div class="hc2-layout">

        <div
          class="floating-toolbar no-print"
          aria-label="Acciones HC2"
        >
          <button
            class="floating-toolbar__button"
            type="button"
            title="Volver"
            @click="emit('volver')"
          >
            ←
          </button>

          <button
            class="floating-toolbar__button"
            type="button"
            title="Actualizar"
            @click="cargar"
          >
            ↻
          </button>

          <button
            class="floating-toolbar__button"
            type="button"
            title="Imprimir"
            @click="imprimir"
          >
            ⎙
          </button>

          <button
            class="floating-toolbar__button floating-toolbar__button--primary"
            type="button"
            title="Guardar HC2"
            :disabled="guardando"
            @click="guardar"
          >
            {{
              guardando
                ? '…'
                : '✓'
            }}
          </button>
        </div>

        <section class="sheet-stage">
          <article class="hc2-sheet">
            <header class="document-header">
              <div class="run-box">
                <strong>RUN:</strong>
                <span>{{ hc2.resumen.run }}</span>
              </div>

              <h1>CALIFICACION HOJA N°2</h1>

              <p>CATEGORÍA</p>
              <strong>
                {{
                  hc2.resumen.categoria_nombre
                    .toUpperCase()
                }}
              </strong>

              <div class="del-line">
                <span>DEL:</span>
                <strong>
                  {{ nombreCalificado }}
                </strong>
              </div>
            </header>

            <table class="hc2-table">
              <thead>
                <tr>
                  <th class="col-num">N°</th>
                  <th class="col-concept">
                    B. AREAS Y CONCEPTOS DE CALIFICACION
                  </th>
                  <th class="col-small">
                    PUNTAJE<br>
                    DE ANOT<br>
                    EN HVD
                  </th>
                  <th class="col-small">
                    NOTA<br>
                    PARCIAL
                  </th>
                  <th class="col-small">
                    NOTA<br>
                    1ERA<br>
                    EVINT
                  </th>
                  <th class="col-small">
                    NOTA<br>
                    2DA<br>
                    EVINT
                  </th>
                  <th class="col-small">
                    NOTA<br>
                    FINAL
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr class="area-row">
                  <td colspan="7">
                    CONDUCTA
                  </td>
                </tr>

                <tr
                  v-for="concepto in conceptosConducta"
                  :key="concepto.numero"
                  :class="{
                    incomplete:
                      claseIncompleta(concepto),
                  }"
                >
                  <td class="number-cell">
                    {{ concepto.numero }}
                  </td>

                  <td class="concept-cell">
                    <strong>
                      {{
                        concepto.nombre.toUpperCase()
                      }}.
                    </strong>

                    <p>
                      {{ concepto.descripcion }}
                    </p>
                  </td>

                  <td class="score-cell score-cell--annotations">
                    <div
                      v-if="
                        concepto.anotaciones.length > 0
                      "
                      class="annotation-scores"
                    >
                      <span
                        v-for="
                          anotacion in concepto.anotaciones
                        "
                        :key="
                          anotacion.anotacion_id
                        "
                      >
                        {{
                          anotacion.puntaje_visual
                        }}
                      </span>
                    </div>

                    <strong
                      v-else
                      class="empty-score"
                    >
                      —
                    </strong>
                  </td>

                  <td class="score-cell">
                    {{ concepto.notaParcialVisual }}
                  </td>

                  <td class="score-cell">
                    {{
                      concepto.notaPrimeraEvintVisual
                    }}
                  </td>

                  <td class="score-cell">
                    {{
                      concepto.notaSegundaEvintVisual
                    }}
                  </td>

                  <td class="score-cell final">
                    {{ concepto.notaFinalVisual }}
                  </td>
                </tr>

                <tr class="area-row">
                  <td colspan="7">
                    DESEMPEÑO PROFESIONAL
                  </td>
                </tr>

                <tr
                  v-for="concepto in conceptosDesempeno"
                  :key="concepto.numero"
                  :class="{
                    incomplete:
                      claseIncompleta(concepto),
                  }"
                >
                  <td class="number-cell">
                    {{ concepto.numero }}
                  </td>

                  <td class="concept-cell">
                    <strong>
                      {{
                        concepto.nombre.toUpperCase()
                      }}.
                    </strong>

                    <p>
                      {{ concepto.descripcion }}
                    </p>
                  </td>

                  <td class="score-cell score-cell--annotations">
                    <div
                      v-if="
                        concepto.anotaciones.length > 0
                      "
                      class="annotation-scores"
                    >
                      <span
                        v-for="
                          anotacion in concepto.anotaciones
                        "
                        :key="
                          anotacion.anotacion_id
                        "
                      >
                        {{
                          anotacion.puntaje_visual
                        }}
                      </span>

                      <strong class="score-total">
                        Total:
                        {{
                          concepto.puntajeHojaVidaVisual
                        }}
                      </strong>
                    </div>

                    <strong
                      v-else
                      class="empty-score"
                    >
                      —
                    </strong>
                  </td>

                  <td class="score-cell">
                    {{ concepto.notaParcialVisual }}
                  </td>

                  <td class="score-cell">
                    {{
                      concepto.notaPrimeraEvintVisual
                    }}
                  </td>

                  <td class="score-cell">
                    {{
                      concepto.notaSegundaEvintVisual
                    }}
                  </td>

                  <td class="score-cell final">
                    {{ concepto.notaFinalVisual }}
                  </td>
                </tr>

                <tr class="total-row">
                  <td colspan="2">
                    TERMINO MEDIO DE LAS NOTAS
                  </td>

                  <td>
                    {{
                      hc2.totalPuntajeHojaVidaVisual
                    }}
                  </td>

                  <td colspan="3"></td>

                  <td>
                    {{ hc2.terminoMedioVisual }}
                  </td>
                </tr>

                <tr class="total-row">
                  <td colspan="6">
                    LISTA DE CLASIFICACIÓN PROPUESTA POR EL CALIFICADOR DIRECTO
                  </td>

                  <td>
                    {{ hc2.listaPropuesta }}
                  </td>
                </tr>
              </tbody>
            </table>

            <section class="opinion-section page-break">
              <label>
                <strong>
                  C. OPINIÓN DEL CALIFICADOR DIRECTO:
                </strong>

                <textarea
                  v-model="
                    campos.opinion_calificador_directo
                  "
                  class="print-field"
                />
              </label>

              <label class="signature-line">
                <strong>
                  D. FIRMA DEL CALIFICADOR DIRECTO:
                </strong>

                <input
                  v-model="
                    campos.firma_calificador_directo
                  "
                  class="print-input"
                  type="text"
                >
              </label>

              <label>
                <strong>
                  E. OPINIÓN DEL CALIFICADOR SUPERIOR
                  <span>
                    (Aprueba o modifica lo propuesto por el calificador directo):
                  </span>
                </strong>

                <textarea
                  v-model="
                    campos.opinion_calificador_superior
                  "
                  class="print-field"
                />
              </label>

              <div class="approval-row">
                <label>
                  <input
                    v-model="
                      campos.decision_calificador_superior
                    "
                    type="radio"
                    value="APRUEBA"
                  >
                  APRUEBA LA CALIFICACIÓN
                </label>

                <label>
                  <input
                    v-model="
                      campos.decision_calificador_superior
                    "
                    type="radio"
                    value="MODIFICA"
                  >
                  MODIFICA LA CALIFICACIÓN
                </label>
              </div>

              <label class="signature-line">
                <strong>
                  F. FIRMA DEL CALIFICADOR SUPERIOR:
                </strong>

                <input
                  v-model="
                    campos.firma_calificador_superior
                  "
                  class="print-input"
                  type="text"
                >
              </label>

              <div class="knowledge-line">
                <strong>
                  G. TOMÉ CONOCIMIENTO EL
                </strong>

                <input
                  v-model="
                    campos.fecha_toma_conocimiento
                  "
                  class="date-input"
                  type="date"
                >

                <span>
                  y me declaro
                </span>
              </div>

              <label class="signature-line">
                <strong>
                  H. FIRMA DEL CALIFICADO:
                </strong>

                <input
                  v-model="
                    campos.firma_calificado
                  "
                  class="print-input"
                  type="text"
                >
              </label>

              <section class="junta-section">
                <strong>
                  I. RESOLUCIÓN DE LA JUNTA DE SELECCIÓN:
                </strong>

                <div class="junta-grid">
                  <span>
                    1. Lista de Clasificación N° :
                  </span>

                  <input
                    v-model="
                      campos.lista_clasificacion_junta
                    "
                    class="print-input"
                    type="text"
                  >

                  <span>
                    2. Nota T/M anual :
                  </span>

                  <input
                    v-model.number="
                      campos.nota_tm_anual_junta
                    "
                    class="print-input"
                    type="number"
                    min="1"
                    max="7"
                    step="0.01"
                  >
                </div>
              </section>

              <label class="signature-line">
                <strong>
                  J. FIRMA DEL PRESIDENTE DE JUNTA DE SELECCIÓN O COMANDANTE DEL COMANDO DE PERSONAL:
                </strong>

                <input
                  v-model="
                    campos.firma_presidente_junta
                  "
                  class="print-input"
                  type="text"
                >
              </label>

              <div class="knowledge-line">
                <strong>
                  K. TOMÉ CONOCIMIENTO EL
                </strong>

                <input
                  v-model="
                    campos.fecha_toma_conocimiento_final
                  "
                  class="date-input"
                  type="date"
                >
              </div>

              <label class="signature-line">
                <strong>
                  L. FIRMA DEL CALIFICADO:
                </strong>

                <input
                  v-model="
                    campos.firma_calificado_final
                  "
                  class="print-input"
                  type="text"
                >
              </label>
            </section>
          </article>
        </section>

        <button
          class="side-panel-toggle no-print"
          type="button"
          :aria-expanded="panelDerechoExpandido"
          :title="
            panelDerechoExpandido
              ? 'Ocultar panel derecho'
              : 'Mostrar panel derecho'
          "
          @click="alternarPanelDerecho"
        >
          <span>
            {{
              panelDerechoExpandido
                ? '›'
                : '‹'
            }}
          </span>

          <strong>
            Detalle HC2
          </strong>
        </button>

        <aside
          class="side-panel no-print"
          :class="{
            'side-panel--open':
              panelDerechoExpandido,
          }"
        >
          <AppCard
            title="Estado del cálculo"
            subtitle="HC2"
            padding="lg"
          >
            <div class="status-grid">
              <span>Término medio</span>
              <strong>
                {{
                  hc2.terminoMedioVisual ||
                  'Pendiente'
                }}
              </strong>

              <span>Lista propuesta</span>
              <strong>
                {{ hc2.listaPropuesta }}
              </strong>

              <span>Puntaje HVD</span>
              <strong>
                {{
                  hc2.totalPuntajeHojaVidaVisual
                }}
              </strong>
            </div>

            <p
              v-if="!hc2.completa"
              class="warning"
            >
              La HC2 queda pendiente mientras falte
              completar alguna EVINT.
            </p>
          </AppCard>

          <AppCard
            title="Detalle de anotaciones"
            subtitle="Puntajes que alimentan la HC2"
            padding="lg"
          >
            <article
              v-for="concepto in hc2.conceptos"
              :key="`detalle-${concepto.numero}`"
              class="detail-concept"
            >
              <header>
                <strong>
                  {{ concepto.numero }}.
                  {{ concepto.nombre }}
                </strong>

                <span>
                  {{
                    concepto.puntajeHojaVidaVisual
                  }}
                </span>
              </header>

              <div
                v-if="
                  concepto.anotaciones.length === 0
                "
                class="empty"
              >
                Sin anotaciones con puntaje.
              </div>

              <ul v-else>
                <li
                  v-for="
                    anotacion in concepto.anotaciones
                  "
                  :key="anotacion.anotacion_id"
                >
                  <span>
                    {{
                      formatearFecha(
                        anotacion.fecha_anotacion,
                      )
                    }}
                    ·
                    {{
                      anotacion.titulo_final
                    }}
                  </span>

                  <strong>
                    {{
                      anotacion.puntaje_visual
                    }}
                  </strong>
                </li>
              </ul>
            </article>
          </AppCard>
        </aside>
      </div>
    </template>
  </AppLayout>
</template>

<style scoped>

.floating-toolbar {
  position: fixed;
  top: 96px;
  right: 24px;
  z-index: 60;
  display: grid;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(16px);
}

.floating-toolbar__button {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: #334155;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  font: inherit;
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
  transition:
    transform 0.14s ease,
    color 0.14s ease,
    background 0.14s ease,
    border-color 0.14s ease;
}

.floating-toolbar__button:hover:not(:disabled) {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
  transform: translateY(-1px);
}

.floating-toolbar__button--primary {
  color: #ffffff;
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.floating-toolbar__button--primary:hover:not(:disabled) {
  color: #ffffff;
  background: #1e40af;
  border-color: #1e40af;
}

.floating-toolbar__button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 1180px) {
  .floating-toolbar {
    top: 82px;
    right: 18px;
  }
}

@media print {
  .floating-toolbar {
    display: none !important;
  }
}



.notice {
  padding: 13px 15px;
  border-radius: var(--hv-radius-sm);
  font-size: 13px;
}

.notice--error {
  color: var(--hv-danger);
  background: var(--hv-danger-soft);
  border: 1px solid #f2c8cc;
}

.notice--success {
  color: var(--hv-success);
  background: var(--hv-success-soft);
  border: 1px solid #bce2cb;
}

.loading-state {
  min-height: 300px;
  display: grid;
  place-items: center;
  color: var(--hv-muted);
  background: var(--hv-surface);
  border: 1px solid var(--hv-border);
  border-radius: var(--hv-radius-lg);
}

.hc2-layout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.sheet-stage {
  padding: 24px;
  overflow: auto;
  background: #e7ebf0;
  border: 1px solid #d4dae2;
  border-radius: 16px;
}

.hc2-sheet {
  width: 216mm;
  min-height: 330mm;
  margin: 0 auto;
  padding: 6mm 5mm;
  box-sizing: border-box;
  color: #111;
  background: #fff;
  box-shadow: 0 18px 50px rgba(25, 39, 58, 0.17);
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9pt;
}

.document-header {
  position: relative;
  text-align: center;
}

.document-header h1 {
  margin: 7mm 0 3mm;
  font-size: 12pt;
  text-decoration: underline;
}

.document-header p {
  margin: 0 0 2mm;
  font-size: 8pt;
}

.run-box {
  position: absolute;
  top: 0;
  right: 4mm;
  display: flex;
  gap: 4mm;
  font-size: 8pt;
}

.del-line {
  margin-top: 6mm;
  display: grid;
  grid-template-columns: 12mm 1fr;
  gap: 2mm;
  text-align: left;
}

.del-line strong {
  border-bottom: 1px solid #111;
}

.hc2-table {
  width: 100%;
  margin-top: 6mm;
  border-collapse: collapse;
  table-layout: fixed;
  border: 1.5px solid #111;
}

.hc2-table th,
.hc2-table td {
  border: 1px solid #111;
}

.hc2-table thead th {
  height: 13mm;
  text-align: center;
  vertical-align: middle;
  font-size: 8pt;
}

.col-num {
  width: 10mm;
}

.col-concept {
  width: 100mm;
}

.col-small {
  width: 18mm;
}

.area-row td {
  padding: 2mm 3mm;
  font-weight: 800;
  background: #f1f1f1;
}

.number-cell {
  text-align: center;
  vertical-align: middle;
}

.concept-cell {
  min-height: 18mm;
  padding: 2mm;
  vertical-align: top;
}

.concept-cell strong {
  display: block;
  margin-bottom: 1.5mm;
  font-style: italic;
}

.concept-cell p {
  margin: 0;
  font-style: italic;
  line-height: 1.15;
}

.score-cell {
  padding: 1mm;
  text-align: center;
  vertical-align: middle;
  font-weight: 600;
}

.score-cell--annotations {
  padding: 0;
  vertical-align: stretch;
}

.annotation-scores {
  min-height: 100%;
  display: grid;
  grid-auto-rows: minmax(5mm, auto);
  align-content: stretch;
}

.annotation-scores span,
.score-total,
.empty-score {
  min-height: 5mm;
  padding: 1mm;
  display: grid;
  place-items: center;
  border-bottom: 1px solid #111;
  font-size: 8pt;
}

.annotation-scores span:last-of-type {
  border-bottom: 1px solid #111;
}

.score-total {
  border-bottom: 0;
  font-size: 7pt;
  font-weight: 800;
  background: #f7f7f7;
}

.empty-score {
  height: 100%;
  border-bottom: 0;
  color: #777;
}

.score-cell.final {
  font-weight: 800;
}

.incomplete .score-cell.final {
  color: #9a6700;
  background: #fff9e6;
}

.total-row td {
  height: 12mm;
  padding: 2mm;
  text-align: center;
  font-weight: 800;
}

.opinion-section {
  margin-top: 8mm;
  display: grid;
  gap: 6mm;
}

.opinion-section label {
  display: grid;
  gap: 2mm;
}

.opinion-section strong {
  font-size: 10pt;
}

.opinion-section strong span {
  font-weight: 400;
}

.print-field {
  width: 100%;
  min-height: 24mm;
  padding: 2mm;
  box-sizing: border-box;
  border: 0;
  border-bottom: 1px solid #111;
  font: inherit;
  resize: vertical;
}

.print-input {
  width: 100%;
  min-height: 9mm;
  padding: 1mm 2mm;
  box-sizing: border-box;
  border: 0;
  border-bottom: 1px solid #111;
  font: inherit;
}

.signature-line {
  margin-top: 2mm;
}

.approval-row {
  display: flex;
  gap: 14mm;
  font-weight: 800;
}

.knowledge-line {
  display: flex;
  align-items: center;
  gap: 3mm;
}

.date-input {
  min-height: 8mm;
  border: 0;
  border-bottom: 1px solid #111;
  font: inherit;
}

.junta-section {
  display: grid;
  gap: 3mm;
}

.junta-grid {
  display: grid;
  grid-template-columns: 1fr 40mm;
  gap: 3mm 6mm;
  align-items: center;
}

.side-panel {
  position: fixed;
  top: 86px;
  right: 0;
  z-index: 25;
  width: 390px;
  max-width: calc(100vw - 96px);
  height: calc(100vh - 110px);
  box-sizing: border-box;
  padding: 14px;
  display: grid;
  align-content: start;
  gap: 14px;
  overflow-y: auto;
  background: #f8fafc;
  border-left: 1px solid #dbe3ef;
  box-shadow: -18px 0 42px rgba(15, 23, 42, 0.12);
  transform: translateX(calc(100% + 18px));
  opacity: 0;
  pointer-events: none;
  transition:
    transform 0.22s ease,
    opacity 0.18s ease;
}

.side-panel--open {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}

.side-panel-toggle {
  position: fixed;
  top: 150px;
  right: 0;
  z-index: 26;
  min-height: 42px;
  padding: 0 10px 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #1d4ed8;
  background: #ffffff;
  border: 1px solid #bfdbfe;
  border-right: 0;
  border-radius: 999px 0 0 999px;
  box-shadow: -8px 8px 22px rgba(15, 23, 42, 0.12);
  font: inherit;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.side-panel-toggle:hover {
  background: #eff6ff;
}

.side-panel-toggle span {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  color: #ffffff;
  background: #1d4ed8;
  border-radius: 999px;
  font-size: 20px;
  line-height: 1;
}

.side-panel-toggle strong {
  max-width: 92px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px 16px;
  align-items: center;
}

.status-grid span {
  color: var(--hv-muted);
}

.status-grid strong {
  color: var(--hv-primary);
}

.warning {
  margin: 14px 0 0;
  padding: 10px 12px;
  color: #7a5a00;
  background: var(--hv-warning-soft);
  border-radius: var(--hv-radius-sm);
  font-size: 12px;
}

.detail-concept {
  padding: 12px 0;
  display: grid;
  gap: 8px;
  border-bottom: 1px solid var(--hv-border);
}

.detail-concept:last-child {
  border-bottom: 0;
}

.detail-concept header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.detail-concept header span {
  color: var(--hv-primary);
  font-weight: 800;
}

.detail-concept ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 5px;
}

.detail-concept li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  color: var(--hv-muted);
  font-size: 12px;
}

.empty {
  color: var(--hv-muted);
  font-size: 12px;
}

@media (max-width: 1180px) {
  .hc2-layout {
    grid-template-columns: 1fr;
  }

  .side-panel {
    top: 80px;
    width: 380px;
    max-width: calc(100vw - 72px);
    height: calc(100vh - 96px);
  }

  .side-panel-toggle {
    top: 132px;
  }
}

@media print {
  @page {
    size: 216mm 330mm;
    margin: 0;
  }

  html,
  body {
    width: 216mm;
    min-height: 330mm;
    margin: 0;
    padding: 0;
    background: #fff;
  }

  .no-print {
    display: none !important;
  }

  :deep(.app-layout) {
    min-height: 0;
    padding: 0;
    background: #fff;
  }

  :deep(.app-layout__header),
  :deep(.app-layout__notice),
  :deep(.app-layout__summary),
  :deep(.app-layout__footer) {
    display: none !important;
  }

  .hc2-layout,
  .sheet-stage {
    display: block;
    margin: 0;
    padding: 0;
    overflow: visible;
    background: #fff;
    border: 0;
  }

  .hc2-sheet {
    width: 216mm;
    min-height: 330mm;
    margin: 0;
    padding: 6mm 5mm;
    box-shadow: none;
  }

  .page-break {
    break-before: page;
    page-break-before: always;
  }

  textarea,
  input {
    background: transparent;
  }
}
</style>
