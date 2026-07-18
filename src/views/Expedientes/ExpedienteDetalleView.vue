<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
  watch,
} from 'vue'

import AppLayout from '../../components/layout/AppLayout.vue'
import AppCard from '../../components/ui/AppCard.vue'
import PageActions from '../../components/ui/PageActions.vue'

import {
  iniciarInstrumento,
  listarInstrumentosExpediente,
  listarUltimasAnotacionesExpediente,
  obtenerExpedienteDetalle,
} from '../../services/expedienteDetalle'

import type {
  ExpedienteDetalle,
  InstrumentoExpedienteDetalle,
  UltimaAnotacionExpediente,
} from '../../types/expedienteDetalle'

const props = defineProps<{
  expedienteId: number
}>()

const emit = defineEmits<{
  volver: []
  abrirInstrumento: [
    instrumento: InstrumentoExpedienteDetalle,
  ]
  abrirEvint: [instrumentoId: number]
  abrirHojaVida: [hojaVidaId: number]
  nuevaAnotacion: [hojaVidaId: number]
}>()

const cargando = ref(true)
const error = ref('')
const menuAccionesAbierto = ref(false)

const expediente =
  ref<ExpedienteDetalle | null>(null)

const instrumentos =
  ref<InstrumentoExpedienteDetalle[]>([])

const anotaciones =
  ref<UltimaAnotacionExpediente[]>([])

const progresoGeneral = computed(() => {
  if (instrumentos.value.length === 0) {
    return 0
  }

  const total = instrumentos.value.reduce(
    (acumulado, instrumento) =>
      acumulado +
      instrumento.porcentaje_avance,
    0,
  )

  return Math.round(
    total / instrumentos.value.length,
  )
})

const iniciales = computed(() => {
  const nombre =
    expediente.value?.persona_nombre_completo ?? ''

  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0]?.toUpperCase() ?? '')
    .join('')
})

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''

  try {
    const [
      expedienteResultado,
      instrumentosResultado,
      anotacionesResultado,
    ] = await Promise.all([
      obtenerExpedienteDetalle(
        props.expedienteId,
      ),
      listarInstrumentosExpediente(
        props.expedienteId,
      ),
      listarUltimasAnotacionesExpediente(
        props.expedienteId,
      ),
    ])

    if (!expedienteResultado) {
      throw new Error(
        'No se encontró el expediente solicitado.',
      )
    }

    expediente.value = expedienteResultado
    instrumentos.value = instrumentosResultado
    anotaciones.value = anotacionesResultado
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  } finally {
    cargando.value = false
  }
}

async function abrir(
  instrumento: InstrumentoExpedienteDetalle,
): Promise<void> {
  if (
    instrumento.aplica !== 1 ||
    instrumento.estado === 'NO_APLICA'
  ) {
    return
  }

  try {
    await iniciarInstrumento(
      instrumento.instrumento_id,
    )

    const tipo =
      instrumento.tipo_instrumento
        .trim()
        .toUpperCase()

    if (tipo === 'EVINT') {
      emit(
        'abrirEvint',
        instrumento.instrumento_id,
      )
      return
    }

    if (
      tipo === 'HOJA_VIDA' ||
      tipo === 'HOJA DE VIDA' ||
      tipo === 'HV'
    ) {
      if (!expediente.value?.hoja_vida_id) {
        throw new Error(
          'El expediente no tiene una Hoja de Vida asociada.',
        )
      }

      emit(
        'abrirHojaVida',
        expediente.value.hoja_vida_id,
      )
      return
    }

    emit('abrirInstrumento', instrumento)
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  }
}

function etiquetaEstado(
  estado: string,
): string {
  return estado
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(
      /^\w/,
      (letra: string) => letra.toUpperCase(),
    )
}

function claseSemanticaEstado(
  estado: string,
): 'success' | 'warning' | 'danger' | 'neutral' {
  const valor = estado
    .trim()
    .toUpperCase()

  if (
    valor === 'COMPLETADO' ||
    valor === 'CERRADO' ||
    valor === 'FINALIZADO'
  ) {
    return 'success'
  }

  if (
    valor === 'EN_ELABORACION' ||
    valor === 'BORRADOR' ||
    valor === 'PENDIENTE' ||
    valor === 'PENDIENTE_FIRMA'
  ) {
    return 'warning'
  }

  if (
    valor === 'NO_INICIADO' ||
    valor === 'ABIERTO' ||
    valor === 'NO_REALIZADO'
  ) {
    return 'danger'
  }

  return 'neutral'
}

watch(
  () => props.expedienteId,
  cargar,
)

onMounted(cargar)
</script>

<template>
  <AppLayout
    title="Expediente del calificado"
    subtitle="Gestión de instrumentos y antecedentes del calificado"
    max-width="full"
  >
    <template #actions>
      <PageActions
        v-model:open="menuAccionesAbierto"
      >
        <template #primary>
          <button
            v-if="expediente"
            class="hv-button hv-button-primary"
            type="button"
            @click="
              emit(
                'nuevaAnotacion',
                expediente.hoja_vida_id,
              )
            "
          >
            Nueva anotación
          </button>
        </template>

        <button
          type="button"
          @click="cargar"
        >
          Actualizar
        </button>

        <button
          type="button"
          @click="emit('volver')"
        >
          Volver
        </button>
      </PageActions>
    </template>

    <template #notice>
      <div
        v-if="error"
        class="notice notice--error"
      >
        {{ error }}
      </div>
    </template>

    <template #summary>
      <AppCard
        v-if="!cargando && expediente"
        padding="lg"
      >
        <div class="profile-summary">
          <div class="profile-photo">
            <span>{{ iniciales }}</span>
            <small>Fotografía</small>
          </div>

          <div class="profile-data">
            <span class="eyebrow">
              Expediente de calificación
            </span>

            <h2>
              {{
                expediente
                  .grado_calidad_abreviatura
              }}
              {{
                expediente
                  .persona_nombre_completo
              }}
            </h2>

            <p>
              {{ expediente.run }}
              · {{ expediente.categoria_nombre }}
              · {{ expediente.periodo_nombre }}
            </p>

            <div class="profile-meta">
              <div>
                <span>Unidad</span>
                <strong>
                  {{ expediente.unidad_nombre }}
                </strong>
              </div>

              <div>
                <span>Puesto</span>
                <strong>
                  {{ expediente.puesto }}
                </strong>
              </div>

              <div>
                <span>Expediente</span>
                <strong>
                  N.º {{ expediente.expediente_id }}
                </strong>
              </div>

              <div>
                <span>Estado general</span>
                <strong class="state-general">
                  {{ expediente.expediente_estado }}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </AppCard>
    </template>

    <section
      v-if="cargando"
      class="loading-state"
    >
      Cargando expediente…
    </section>

    <template v-else-if="expediente">

      <div class="summary-grid">
        <AppCard padding="md">
          <div class="summary-item">
            <span>Vigencia</span>
            <strong>
              {{ expediente.fecha_inicio }}
            </strong>
            <small>
              al {{ expediente.fecha_termino }}
            </small>
          </div>
        </AppCard>

        <AppCard padding="md">
          <div class="summary-item">
            <span>Calificador directo</span>
            <strong>
              {{ expediente.calificador_grado }}
              {{
                expediente
                  .calificador_nombre_completo
              }}
            </strong>
            <small>
              {{ expediente.calificador_puesto }}
            </small>
          </div>
        </AppCard>

        <AppCard padding="md">
          <div class="summary-item">
            <span>Hoja de Vida</span>
            <strong>
              {{ expediente.total_anotaciones }}
              anotación(es)
            </strong>
            <small>
              {{ expediente.total_borradores }}
              borrador(es)
            </small>
          </div>
        </AppCard>

        <AppCard padding="md">
          <div class="summary-item">
            <span>Avance general</span>
            <strong>
              {{ progresoGeneral }}%
            </strong>

            <div class="progress">
              <span
                :style="{
                  width: `${progresoGeneral}%`,
                }"
              />
            </div>
          </div>
        </AppCard>
      </div>

      <AppCard
        title="Instrumentos del expediente"
        subtitle="Seleccione un instrumento para abrirlo o continuar su elaboración"
        padding="lg"
      >
        <div
          v-if="instrumentos.length === 0"
          class="empty-state"
        >
          No existen instrumentos asociados.
        </div>

        <div
          v-else
          class="instrument-grid"
        >
          <button
            v-for="instrumento in instrumentos"
            :key="instrumento.instrumento_id"
            class="instrument-card"
            :class="
              `instrument-card--${claseSemanticaEstado(
                instrumento.estado,
              )}`
            "
            type="button"
            :disabled="
              instrumento.aplica !== 1 ||
              instrumento.estado === 'NO_APLICA'
            "
            @click="abrir(instrumento)"
          >
            <div class="instrument-card__icon">
              {{
                instrumento.nombre_instrumento
                  .charAt(0)
                  .toUpperCase()
              }}
            </div>

            <div class="instrument-card__content">
              <strong>
                {{
                  instrumento.nombre_instrumento
                }}
              </strong>

              <span>
                Formato
                {{ instrumento.version_formato }}
              </span>

              <span
                class="instrument-card__status"
              >
                {{
                  etiquetaEstado(
                    instrumento.estado,
                  )
                }}
              </span>
            </div>

            <small>
              {{
                instrumento
                  .porcentaje_avance
              }}%
            </small>
          </button>
        </div>
      </AppCard>

      <div class="lower-grid">
        <AppCard
          title="Hoja de Vida"
          subtitle="Acceso rápido a las anotaciones del período"
          padding="lg"
        >
          <div class="quick-actions">
            <button
              class="hv-button hv-button-secondary"
              type="button"
              @click="
                emit(
                  'abrirHojaVida',
                  expediente.hoja_vida_id,
                )
              "
            >
              Abrir Hoja de Vida
            </button>

            <button
              class="hv-button hv-button-primary"
              type="button"
              @click="
                emit(
                  'nuevaAnotacion',
                  expediente.hoja_vida_id,
                )
              "
            >
              Nueva anotación
            </button>
          </div>
        </AppCard>

        <AppCard
          title="Actividad reciente"
          subtitle="Últimas anotaciones estampadas"
          padding="lg"
        >
          <div
            v-if="anotaciones.length === 0"
            class="empty-state"
          >
            No existen anotaciones estampadas.
          </div>

          <div
            v-else
            class="timeline"
          >
            <article
              v-for="anotacion in anotaciones"
              :key="anotacion.anotacion_id"
              class="timeline-item"
            >
              <span
                class="timeline-dot"
                :class="
                  anotacion
                    .color_semantico
                    .toLowerCase()
                "
              />

              <div>
                <small>
                  {{ anotacion.fecha_anotacion }}
                </small>

                <strong
                  :style="{
                    color: anotacion.color_hex,
                  }"
                >
                  {{ anotacion.titulo_final }}
                </strong>

                <span
                  v-if="
                    anotacion.concepto_nombre
                  "
                >
                  Concepto
                  {{ anotacion.concepto_numero }}
                  ·
                  {{
                    anotacion.concepto_nombre
                  }}
                </span>

                <span
                  v-if="
                    anotacion.puntaje_visual
                  "
                >
                  {{ anotacion.puntaje_visual }}
                </span>
              </div>
            </article>
          </div>
        </AppCard>
      </div>
    </template>
  </AppLayout>
</template>

<style scoped>
.notice {
  padding: 10px 12px;
  color: #b4232d;
  background: #fff0f1;
  border: 1px solid #facdd0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 650;
}

.loading-state,
.empty-state {
  min-height: 160px;
  display: grid;
  place-items: center;
  color: #64748b;
  text-align: center;
  font-size: 13px;
}

.profile-summary {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.profile-photo {
  width: 78px;
  height: 92px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 5px;
  color: #155bd6;
  background: #eef4ff;
  border: 1px solid #d9e6ff;
  border-radius: 10px;
}

.profile-photo span {
  font-size: 22px;
  font-weight: 820;
}

.profile-photo small {
  color: #64748b;
  font-size: 10.5px;
}

.eyebrow {
  display: block;
  color: #155bd6;
  font-size: 10.5px;
  font-weight: 760;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.profile-data h2 {
  margin: 5px 0 4px;
  color: #111827;
  font-size: 21px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-weight: 760;
}

.profile-data > p {
  margin: 0;
  color: #64748b;
  font-size: 12.5px;
  line-height: 1.4;
}

.profile-meta {
  margin-top: 14px;
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.profile-meta > div,
.summary-item {
  display: grid;
  gap: 4px;
}

.profile-meta > div {
  min-height: 54px;
  padding: 9px 10px;
  box-sizing: border-box;
  background: #fbfdff;
  border: 1px solid #edf1f6;
  border-radius: 8px;
}

.profile-meta span,
.summary-item span,
.summary-item small {
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
}

.profile-meta strong,
.summary-item strong {
  overflow: hidden;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 740;
}

.state-general {
  width: fit-content;
  padding: 3px 8px;
  color: #0f8f5a !important;
  background: #e7f7ef;
  border-radius: 999px;
  font-size: 11px !important;
  font-weight: 760 !important;
}

.summary-grid {
  margin-bottom: 14px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-item {
  min-height: 54px;
}

.progress {
  height: 6px;
  margin-top: 5px;
  overflow: hidden;
  background: #edf1f6;
  border-radius: 999px;
}

.progress span {
  height: 100%;
  display: block;
  background: #155bd6;
  border-radius: inherit;
}

.instrument-grid {
  display: grid;
  grid-template-columns:
    repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.instrument-card {
  min-height: 82px;
  padding: 12px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  gap: 10px;
  align-items: center;
  color: #111827;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 9px;
  text-align: left;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.025);
  transition:
    transform 120ms ease,
    border-color 120ms ease,
    box-shadow 120ms ease,
    background-color 120ms ease;
  cursor: pointer;
}

.instrument-card:hover:not(:disabled) {
  background: #fbfdff;
  border-color: #9fb9e6;
  box-shadow: 0 8px 18px rgba(21, 91, 214, 0.06);
  transform: translateY(-1px);
}

.instrument-card:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.instrument-card__icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: #155bd6;
  background: #eef4ff;
  border: 1px solid #d9e6ff;
  border-radius: 9px;
  font-size: 15px;
  font-weight: 800;
}

.instrument-card__content {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.instrument-card__content strong {
  overflow: hidden;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 760;
}

.instrument-card__content span {
  color: #64748b;
  font-size: 11px;
}

.instrument-card__status {
  width: fit-content;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 10.5px !important;
  font-weight: 760;
}

.instrument-card > small {
  justify-self: end;
  width: fit-content;
  padding: 4px 7px;
  color: #334155;
  background: #eef2f7;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 760;
}

.instrument-card--success .instrument-card__status {
  color: #0f8f5a;
  background: #e7f7ef;
}

.instrument-card--warning .instrument-card__status {
  color: #a36700;
  background: #fff6df;
}

.instrument-card--danger .instrument-card__status {
  color: #b4232d;
  background: #fff0f1;
}

.instrument-card--neutral .instrument-card__status {
  color: #475569;
  background: #eef2f7;
}

.lower-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: minmax(320px, 0.82fr) minmax(420px, 1.18fr);
  gap: 14px;
  align-items: start;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-actions .hv-button {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 740;
}

.timeline {
  position: relative;
  display: grid;
  gap: 10px;
}

.timeline::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 6px;
  width: 1px;
  content: '';
  background: #dbe3ef;
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
}

.timeline-dot {
  width: 11px;
  height: 11px;
  margin-top: 3px;
  display: block;
  background: #94a3b8;
  border: 2px solid #ffffff;
  border-radius: 999px;
  box-shadow: 0 0 0 1px #dbe3ef;
  z-index: 1;
}

.timeline-dot.verde,
.timeline-dot.green {
  background: #17a56b;
}

.timeline-dot.rojo,
.timeline-dot.red {
  background: #dc5656;
}

.timeline-dot.azul,
.timeline-dot.blue {
  background: #155bd6;
}

.timeline-item div {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.timeline-item small {
  color: #64748b;
  font-size: 10.5px;
}

.timeline-item strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 760;
}

.timeline-item span:not(.timeline-dot) {
  color: #475569;
  font-size: 11.5px;
  line-height: 1.35;
}

@media (max-width: 1100px) {
  .profile-summary {
    grid-template-columns: 1fr;
  }

  .profile-meta,
  .summary-grid,
  .lower-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .instrument-grid {
    grid-template-columns: 1fr;
  }
}
</style>
