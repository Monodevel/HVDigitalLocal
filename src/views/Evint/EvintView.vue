<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import {
  completarEvint,
  guardarEvint,
  guardarRespuestaEvint,
  listarConceptosEvint,
  listarEscalasEvint,
  obtenerOCrearEvint,
} from '../../services/evint'

import type {
  ConceptoEvint,
  DecisionRecursoEvint,
  EscalaEvint,
  EvintEncabezado,
  TipoRecursoEvint,
} from '../../types/evint'

const props = defineProps<{ instrumentoId: number }>()
const emit = defineEmits<{ volver: [] }>()

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')
const encabezado = ref<EvintEncabezado | null>(null)
const escalas = ref<EscalaEvint[]>([])
const conceptos = ref<ConceptoEvint[]>([])

const formulario = reactive({
  fechaEvaluacion: new Date().toISOString().slice(0, 10),
  realizaEvint: true,
  observacionGeneral: '',
  justificacionSiempre: '',
  justificacionCasiNunca: '',
  justificacionNoObservado: '',
  justificacionIsa: '',
  recursos: '',
  fechaTomaConocimiento: '',
  firmaCalificado: '',
  firmaCalificador: '',
  tipoRecurso: null as TipoRecursoEvint,
  fechaPresentacionRecurso: '',
  decisionCalificadorDirecto: null as DecisionRecursoEvint,
  fechaDecisionCalificadorDirecto: '',
  decisionCalificadorSuperior: null as DecisionRecursoEvint,
  fechaDecisionCalificadorSuperior: '',
})

const escalasVisuales = computed(() =>
  [...escalas.value].sort((a, b) => b.orden - a.orden),
)

const respuestas = computed(() =>
  conceptos.value.flatMap(concepto => concepto.respuestas),
)

const totalRespondidos = computed(() =>
  respuestas.value.filter(respuesta => respuesta.escala_id !== null).length,
)

const totalFactores = computed(() => respuestas.value.length)

const progreso = computed(() =>
  totalFactores.value === 0
    ? 0
    : Math.round(totalRespondidos.value / totalFactores.value * 100),
)

const totalSiempre = computed(() =>
  respuestas.value.filter(r => r.escala_codigo === 'SIEMPRE').length,
)

const porcentajeSiempre = computed(() =>
  totalFactores.value === 0
    ? 0
    : Math.round(totalSiempre.value / totalFactores.value * 100),
)

const requiereJustificacionSiempre = computed(
  () => porcentajeSiempre.value > 75,
)

const requiereJustificacionCasiNunca = computed(
  () => respuestas.value.some(r => r.escala_codigo === 'CASI_NUNCA'),
)

const requiereJustificacionNoObservado = computed(
  () => respuestas.value.some(r => r.escala_codigo === 'NO_OBSERVADO'),
)

const bloqueada = computed(
  () => encabezado.value?.estado === 'COMPLETADA',
)

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const [cabecera, escalasResultado] = await Promise.all([
      obtenerOCrearEvint(props.instrumentoId),
      listarEscalasEvint(),
    ])

    encabezado.value = cabecera
    escalas.value = escalasResultado
    conceptos.value = await listarConceptosEvint(cabecera.evaluacion_evint_id)

    formulario.fechaEvaluacion = cabecera.fecha_evaluacion
    formulario.realizaEvint = cabecera.realiza_evint === 1
    formulario.observacionGeneral = cabecera.observacion_general ?? ''
    formulario.justificacionSiempre = cabecera.justificacion_siempre ?? ''
    formulario.justificacionCasiNunca = cabecera.justificacion_casi_nunca ?? ''
    formulario.justificacionNoObservado = cabecera.justificacion_no_observado ?? ''
    formulario.justificacionIsa = cabecera.justificacion_isa ?? ''
    formulario.recursos = cabecera.recursos ?? ''
    formulario.fechaTomaConocimiento = cabecera.fecha_toma_conocimiento ?? ''
    formulario.firmaCalificado = cabecera.firma_calificado ?? ''
    formulario.firmaCalificador = cabecera.firma_calificador ?? ''
    formulario.tipoRecurso = cabecera.tipo_recurso
    formulario.fechaPresentacionRecurso = cabecera.fecha_presentacion_recurso ?? ''
    formulario.decisionCalificadorDirecto = cabecera.decision_calificador_directo
    formulario.fechaDecisionCalificadorDirecto =
      cabecera.fecha_decision_calificador_directo ?? ''
    formulario.decisionCalificadorSuperior = cabecera.decision_calificador_superior
    formulario.fechaDecisionCalificadorSuperior =
      cabecera.fecha_decision_calificador_superior ?? ''
  } catch (excepcion) {
    error.value = obtenerError(excepcion)
  } finally {
    cargando.value = false
  }
}

function manejarEscala(evento: Event, factorId: number): void {
  const elemento = evento.target as HTMLInputElement
  void cambiarEscala(factorId, Number(elemento.value))
}

async function cambiarEscala(factorId: number, escalaId: number): Promise<void> {
  if (!encabezado.value || bloqueada.value) return

  const respuesta = respuestas.value.find(item => item.factor_id === factorId)
  if (!respuesta) return

  const escala = escalas.value.find(item => item.id === escalaId)
  respuesta.escala_id = escalaId
  respuesta.escala_codigo = escala?.codigo ?? null
  respuesta.escala_nombre = escala?.nombre ?? null
  respuesta.escala_valor = escala?.valor ?? null

  try {
    await guardarRespuestaEvint({
      evaluacionEvintId: encabezado.value.evaluacion_evint_id,
      factorId,
      escalaId,
      observacion: respuesta.observacion ?? undefined,
    })
  } catch (excepcion) {
    error.value = obtenerError(excepcion)
  }
}

async function guardarBorrador(): Promise<void> {
  if (!encabezado.value) return

  guardando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const resultado = await guardarEvint({
      evaluacionEvintId: encabezado.value.evaluacion_evint_id,
      fechaEvaluacion: formulario.fechaEvaluacion,
      observacionGeneral: formulario.observacionGeneral,
      realizaEvint: formulario.realizaEvint,
      justificacionSiempre: formulario.justificacionSiempre,
      justificacionCasiNunca: formulario.justificacionCasiNunca,
      justificacionNoObservado: formulario.justificacionNoObservado,
      justificacionIsa: formulario.justificacionIsa,
      recursos: formulario.recursos,
      fechaTomaConocimiento: formulario.fechaTomaConocimiento,
      firmaCalificado: formulario.firmaCalificado,
      firmaCalificador: formulario.firmaCalificador,
      tipoRecurso: formulario.tipoRecurso,
      fechaPresentacionRecurso: formulario.fechaPresentacionRecurso,
      decisionCalificadorDirecto: formulario.decisionCalificadorDirecto,
      fechaDecisionCalificadorDirecto:
        formulario.fechaDecisionCalificadorDirecto,
      decisionCalificadorSuperior: formulario.decisionCalificadorSuperior,
      fechaDecisionCalificadorSuperior:
        formulario.fechaDecisionCalificadorSuperior,
    })

    mensaje.value = resultado.promedio === null
      ? 'EVINT guardada como borrador.'
      : `EVINT guardada. Promedio actual: ${resultado.promedio.toFixed(2)}.`
  } catch (excepcion) {
    error.value = obtenerError(excepcion)
  } finally {
    guardando.value = false
  }
}

async function finalizar(): Promise<void> {
  if (!encabezado.value) return

  if (!formulario.realizaEvint) {
    error.value = 'No se puede completar una EVINT marcada como no realizada.'
    return
  }

  if (requiereJustificacionSiempre.value &&
      !formulario.justificacionSiempre.trim()) {
    error.value = 'Debe justificar la frecuencia Siempre superior al 75 %.'
    return
  }

  if (requiereJustificacionCasiNunca.value &&
      !formulario.justificacionCasiNunca.trim()) {
    error.value = 'Debe justificar las respuestas Casi nunca.'
    return
  }

  if (requiereJustificacionNoObservado.value &&
      !formulario.justificacionNoObservado.trim()) {
    error.value = 'Debe justificar las respuestas No observado.'
    return
  }

  if (!window.confirm('¿Desea completar esta EVINT?')) return

  guardando.value = true
  try {
    await guardarBorrador()
    const resultado = await completarEvint(encabezado.value.evaluacion_evint_id)
    mensaje.value = `EVINT completada con promedio ${resultado.promedio?.toFixed(2)}.`
    await cargar()
  } catch (excepcion) {
    error.value = obtenerError(excepcion)
  } finally {
    guardando.value = false
  }
}

function obtenerError(excepcion: unknown): string {
  return excepcion instanceof Error ? excepcion.message : String(excepcion)
}

watch(() => props.instrumentoId, cargar)
function imprimir(): void {
  globalThis.print()
}

onMounted(cargar)
</script>

<template>
  <main class="page">
    <div class="shell">
      <header class="toolbar no-print">
        <button class="secondary" type="button" @click="emit('volver')">
          ← Volver al expediente
        </button>
        <div class="actions">
          <button class="secondary" type="button" :disabled="guardando" @click="imprimir">
            Imprimir
          </button>
          <button class="secondary" type="button" :disabled="guardando || bloqueada" @click="guardarBorrador">
            Guardar borrador
          </button>
          <button class="primary" type="button" :disabled="guardando || bloqueada" @click="finalizar">
            Completar EVINT
          </button>
        </div>
      </header>

      <div v-if="error" class="alert error no-print">{{ error }}</div>
      <div v-if="mensaje" class="alert success no-print">{{ mensaje }}</div>
      <section v-if="cargando" class="paper loading">Cargando EVINT…</section>

      <template v-else-if="encabezado">
        <section class="paper">
          <header class="document-header">
            <div class="title-block">
              <strong>HOJA CALIFICACIÓN N.º {{ encabezado.numero }} EVINT</strong>
              <span>CATEGORÍA</span>
              <strong>{{ encabezado.categoria_nombre.toUpperCase() }}</strong>
            </div>
            <div class="rut"><strong>RUT:</strong> {{ encabezado.run }}</div>
          </header>

          <div class="line">
            <strong>DEL:</strong>
            {{ encabezado.grado_calidad_abreviatura }}
            {{ encabezado.nombre_completo }}
          </div>

          <div class="period">
            <strong>FECHA:</strong>
            {{ encabezado.fecha_inicio }}
            <strong>HASTA EL</strong>
            {{ encabezado.fecha_termino }}
          </div>

          <div class="document-options">
            <div>
              <strong>Realiza EVINT</strong>
              <label><input v-model="formulario.realizaEvint" type="radio" :value="true" :disabled="bloqueada"> Sí</label>
              <label><input v-model="formulario.realizaEvint" type="radio" :value="false" :disabled="bloqueada"> No</label>
            </div>
            <div><strong>Art. 77</strong></div>
            <label>
              <strong>Fecha evaluación</strong>
              <input v-model="formulario.fechaEvaluacion" type="date"
                :min="encabezado.fecha_inicio" :max="encabezado.fecha_termino"
                :disabled="bloqueada">
            </label>
          </div>

          <div class="progress-row no-print">
            <span>Avance: {{ totalRespondidos }} / {{ totalFactores }}</span>
            <span>{{ progreso }} %</span>
          </div>

          <div class="matrix-wrap">
            <table class="matrix">
              <thead>
                <tr>
                  <th class="descriptor">DESCRIPTORES POR CONCEPTO</th>
                  <th v-for="escala in escalasVisuales" :key="escala.id" class="scale">
                    <span>{{ escala.nombre }}</span>
                  </th>
                </tr>
              </thead>
              <tbody v-for="concepto in conceptos" :key="concepto.concepto_id">
                <tr class="concept-row">
                  <th :colspan="1 + escalasVisuales.length">
                    {{ concepto.concepto_nombre.toUpperCase() }}
                  </th>
                </tr>
                <tr v-for="(respuesta, indice) in concepto.respuestas" :key="respuesta.factor_id">
                  <td class="descriptor">
                    <strong>{{ indice + 1 }}.</strong>
                    {{ respuesta.factor_descripcion }}
                  </td>
                  <td v-for="escala in escalasVisuales" :key="escala.id" class="choice">
                    <input
                      type="radio"
                      :name="`factor-${respuesta.factor_id}`"
                      :value="escala.id"
                      :checked="respuesta.escala_id === escala.id"
                      :disabled="bloqueada || !formulario.realizaEvint"
                      @change="manejarEscala($event, respuesta.factor_id)"
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="paper second-page">
          <h2>ANTECEDENTES COMPLEMENTARIOS</h2>

          <label class="long-field">
            <strong>A. JUSTIFICACIÓN (Sobre 75 % de SIEMPRE):</strong>
            <textarea v-model="formulario.justificacionSiempre" rows="4" :disabled="bloqueada" />
            <small v-if="requiereJustificacionSiempre">Obligatoria: Siempre alcanza {{ porcentajeSiempre }} %.</small>
          </label>

          <label class="long-field">
            <strong>B. JUSTIFICACIÓN (Para cada frecuencia de CASI NUNCA):</strong>
            <textarea v-model="formulario.justificacionCasiNunca" rows="4" :disabled="bloqueada" />
            <small v-if="requiereJustificacionCasiNunca">Obligatoria por existir respuestas Casi nunca.</small>
          </label>

          <label class="long-field">
            <strong>C. JUSTIFICACIÓN (Para cada frecuencia de NO OBSERVADO):</strong>
            <textarea v-model="formulario.justificacionNoObservado" rows="4" :disabled="bloqueada" />
            <small v-if="requiereJustificacionNoObservado">Obligatoria por existir respuestas No observado.</small>
          </label>

          <label class="long-field">
            <strong>D. JUSTIFICACIÓN (Descriptor de secretario y/o fiscal de ISA):</strong>
            <textarea v-model="formulario.justificacionIsa" rows="3" :disabled="bloqueada" />
          </label>

          <label class="long-field">
            <strong>E. RECURSOS:</strong>
            <textarea v-model="formulario.recursos" rows="3" :disabled="bloqueada" />
          </label>

          <div class="signature-grid">
            <label>
              <strong>F. TOMÉ CONOCIMIENTO EL</strong>
              <input v-model="formulario.fechaTomaConocimiento" type="date" :disabled="bloqueada">
            </label>
            <label>
              <strong>G. FIRMA DEL CALIFICADO</strong>
              <input v-model="formulario.firmaCalificado" type="text" :disabled="bloqueada">
            </label>
            <label>
              <strong>H. FIRMA DEL CALIFICADOR</strong>
              <input v-model="formulario.firmaCalificador" type="text" :disabled="bloqueada">
            </label>
          </div>

          <fieldset class="resources">
            <legend>Recurso presentado</legend>
            <label>
              <input v-model="formulario.tipoRecurso" type="radio"
                value="REPOSICION_JERARQUICO_SUBSIDIO" :disabled="bloqueada">
              Reposición y jerárquico en subsidio
            </label>
            <label>
              <input v-model="formulario.tipoRecurso" type="radio"
                value="JERARQUICO" :disabled="bloqueada">
              Jerárquico
            </label>
            <label>Fecha presentó recurso
              <input v-model="formulario.fechaPresentacionRecurso" type="date" :disabled="bloqueada">
            </label>

            <div class="decision-grid">
              <label>Calificador directo
                <select v-model="formulario.decisionCalificadorDirecto" :disabled="bloqueada">
                  <option :value="null">Sin decisión</option>
                  <option value="ACEPTA">Acepta</option>
                  <option value="RECHAZA">Rechaza</option>
                  <option value="ACEPTA_PARCIALMENTE">Acepta parcialmente</option>
                </select>
              </label>
              <label>Fecha
                <input v-model="formulario.fechaDecisionCalificadorDirecto" type="date" :disabled="bloqueada">
              </label>
              <label>Calificador superior
                <select v-model="formulario.decisionCalificadorSuperior" :disabled="bloqueada">
                  <option :value="null">Sin decisión</option>
                  <option value="ACEPTA">Acepta</option>
                  <option value="RECHAZA">Rechaza</option>
                  <option value="ACEPTA_PARCIALMENTE">Acepta parcialmente</option>
                </select>
              </label>
              <label>Fecha
                <input v-model="formulario.fechaDecisionCalificadorSuperior" type="date" :disabled="bloqueada">
              </label>
            </div>
          </fieldset>

          <label class="long-field">
            <strong>OBSERVACIÓN GENERAL:</strong>
            <textarea v-model="formulario.observacionGeneral" rows="4" :disabled="bloqueada" />
          </label>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 26px 32px 40px;
  box-sizing: border-box;
  color: #111827;
  background:
    radial-gradient(
      circle at 12% 0%,
      rgba(37, 99, 235, 0.025),
      transparent 26%
    ),
    linear-gradient(
      180deg,
      #f8fafc 0%,
      #f4f7fb 100%
    );
}

.shell {
  max-width: 1460px;
  margin: 0 auto;
}

.toolbar {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.primary,
.secondary {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 7px;
  font: inherit;
  font-size: 12.5px;
  font-weight: 740;
  cursor: pointer;
}

.primary {
  color: #ffffff;
  background: #155bd6;
  border: 1px solid #124fb9;
  box-shadow: 0 5px 12px rgba(21, 91, 214, 0.12);
}

.primary:hover:not(:disabled) {
  background: #0f4fc2;
}

.secondary {
  color: #155bd6;
  background: #ffffff;
  border: 1px solid #b9c9e7;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.025);
}

.secondary:hover:not(:disabled) {
  background: #f8fbff;
  border-color: #9fb4d8;
}

.primary:disabled,
.secondary:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.alert,
.loading {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 650;
}

.error {
  color: #b4232d;
  background: #fff0f1;
  border: 1px solid #facdd0;
}

.success {
  color: #11834f;
  background: #e7f7ef;
  border: 1px solid #c8ecd9;
}

.loading {
  min-height: 220px;
  display: grid;
  place-items: center;
  color: #64748b;
  background: #ffffff;
  border: 1px solid #dbe3ef;
}

.paper {
  margin-bottom: 14px;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.025);
  overflow: hidden;
}

.paper:not(.second-page) {
  padding: 0;
}

.document-header {
  min-height: 82px;
  padding: 18px 20px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px;
  align-items: start;
  background:
    linear-gradient(
      180deg,
      #ffffff 0%,
      #fbfdff 100%
    );
  border-bottom: 1px solid #edf1f6;
}

.title-block {
  display: grid;
  gap: 4px;
  text-align: left;
}

.title-block strong:first-child {
  color: #111827;
  font-size: 18px;
  line-height: 1.25;
  letter-spacing: -0.02em;
  font-weight: 780;
}

.title-block span {
  color: #155bd6;
  font-size: 10.5px;
  font-weight: 760;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.title-block strong:last-child {
  width: fit-content;
  padding: 4px 8px;
  color: #334155;
  background: #eef2f7;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 740;
}

.rut {
  min-width: 160px;
  padding: 8px 10px;
  color: #334155;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  text-align: right;
  font-size: 12px;
}

.rut strong {
  color: #64748b;
}

.line,
.period,
.document-options,
.progress-row,
.matrix-wrap {
  margin-right: 20px;
  margin-left: 20px;
}

.line {
  margin-top: 14px;
  padding: 10px 12px;
  color: #334155;
  background: #fbfdff;
  border: 1px solid #edf1f6;
  border-radius: 8px;
  font-size: 12.5px;
}

.line strong,
.period strong {
  color: #111827;
}

.period {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  color: #475569;
  font-size: 12px;
}

.document-options {
  margin-top: 14px;
  padding: 12px;
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto minmax(190px, 230px);
  gap: 14px;
  align-items: end;
  background: #f8fbff;
  border: 1px solid #d9e6ff;
  border-radius: 8px;
}

.document-options > div:first-child {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: center;
}

.document-options strong {
  color: #111827;
  font-size: 12px;
  font-weight: 760;
}

.document-options label {
  color: #475569;
  font-size: 12px;
}

.document-options input[type='radio'] {
  width: 13px;
  height: 13px;
  margin-right: 5px;
  accent-color: #155bd6;
}

.document-options input[type='date'] {
  margin-top: 5px;
}

.progress-row {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
}

.progress-row::after {
  height: 6px;
  margin-top: 6px;
  display: block;
  flex: 1;
  content: '';
  background: linear-gradient(
    90deg,
    #155bd6,
    #9fbdf2
  );
  border-radius: 999px;
}

.matrix-wrap {
  margin-top: 10px;
  margin-bottom: 20px;
  overflow-x: auto;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
}

.matrix {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  background: #ffffff;
  font-size: 11px;
}

.matrix th,
.matrix td {
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
}

.matrix th:last-child,
.matrix td:last-child {
  border-right: 0;
}

.matrix thead th {
  color: #334155;
  background: #f8fafc;
  font-weight: 760;
}

.matrix .descriptor {
  width: auto;
  padding: 7px 9px;
  text-align: left;
  line-height: 1.35;
}

.matrix .scale {
  width: 42px;
  height: 92px;
  padding: 0;
  vertical-align: bottom;
}

.matrix .scale span {
  display: inline-block;
  color: #475569;
  transform: rotate(-90deg) translate(-8px, 0);
  white-space: nowrap;
  transform-origin: center;
  font-size: 10px;
}

.concept-row th {
  padding: 6px 9px;
  color: #111827;
  text-align: left;
  background: #eef4ff;
  border-top: 1px solid #d9e6ff;
  font-size: 11.5px;
  letter-spacing: 0.015em;
}

.choice {
  width: 42px;
  text-align: center;
  background: #ffffff;
}

.choice input {
  width: 14px;
  height: 14px;
  accent-color: #155bd6;
}

.choice input:disabled {
  opacity: 0.5;
}

.second-page {
  padding: 0;
}

.second-page h2 {
  margin: 0;
  padding: 15px 18px;
  color: #111827;
  background: #fbfdff;
  border-bottom: 1px solid #edf1f6;
  text-align: left;
  font-size: 15px;
  letter-spacing: -0.01em;
  font-weight: 760;
}

.long-field {
  margin: 0;
  padding: 14px 18px;
  display: grid;
  gap: 7px;
  border-bottom: 1px solid #edf1f6;
}

.long-field strong,
.signature-grid strong,
.resources legend {
  color: #111827;
  font-size: 12px;
  font-weight: 760;
}

.long-field small {
  color: #b4232d;
  font-size: 11.5px;
  font-weight: 650;
}

textarea,
input[type='text'],
input[type='date'],
select {
  box-sizing: border-box;
  width: 100%;
  min-height: 36px;
  padding: 8px 10px;
  color: #1f2937;
  background: #ffffff;
  border: 1px solid #d7deea;
  border-radius: 7px;
  outline: none;
  font: inherit;
  font-size: 12.5px;
}

textarea {
  resize: vertical;
  line-height: 1.5;
}

textarea:focus,
input[type='text']:focus,
input[type='date']:focus,
select:focus {
  border-color: #7fa8ec;
  box-shadow: 0 0 0 3px rgba(21, 91, 214, 0.075);
}

textarea:disabled,
input:disabled,
select:disabled {
  cursor: not-allowed;
  background: #f8fafc;
  opacity: 0.72;
}

.signature-grid {
  margin: 0;
  padding: 14px 18px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  border-bottom: 1px solid #edf1f6;
}

.signature-grid label {
  display: grid;
  gap: 6px;
}

.resources {
  margin: 14px 18px;
  padding: 14px;
  display: grid;
  gap: 10px;
  background: #fbfdff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
}

.resources label {
  display: grid;
  gap: 6px;
  color: #334155;
  font-size: 12px;
}

.resources label:has(input[type='radio']) {
  display: flex;
  gap: 7px;
  align-items: center;
}

.resources input[type='radio'] {
  width: 13px;
  height: 13px;
  accent-color: #155bd6;
}

.decision-grid {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 12px;
}

@media (max-width: 980px) {
  .toolbar,
  .document-options {
    align-items: stretch;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .toolbar {
    align-items: stretch;
  }

  .actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .signature-grid,
  .decision-grid {
    grid-template-columns: 1fr;
  }

  .document-header {
    grid-template-columns: 1fr;
  }

  .rut {
    text-align: left;
  }
}

@media (max-width: 720px) {
  .page {
    padding: 22px;
  }

  .line,
  .period,
  .document-options,
  .progress-row,
  .matrix-wrap {
    margin-right: 14px;
    margin-left: 14px;
  }
}

@media print {
  .no-print {
    display: none !important;
  }

  .page {
    padding: 0;
    background: #ffffff;
  }

  .shell {
    max-width: none;
  }

  .paper {
    margin: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    page-break-after: always;
  }

  .paper:not(.second-page),
  .second-page {
    padding: 0;
  }

  .document-header {
    padding: 10mm 12mm 6mm;
    border-bottom: 0;
  }

  .line,
  .period,
  .document-options,
  .progress-row,
  .matrix-wrap {
    margin-right: 12mm;
    margin-left: 12mm;
  }

  .document-options {
    border-color: #000;
    background: #ffffff;
  }

  .matrix-wrap {
    border-color: #000;
  }

  .matrix th,
  .matrix td {
    border-color: #000;
  }

  .second-page h2,
  .long-field,
  .signature-grid {
    border-color: #000;
  }

  textarea,
  input[type='text'],
  input[type='date'],
  select {
    border-color: #000;
  }

  .second-page {
    page-break-after: auto;
  }
}
</style>
