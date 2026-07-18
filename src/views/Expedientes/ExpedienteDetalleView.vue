<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'

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
  abrirInstrumento: [instrumento: InstrumentoExpedienteDetalle]
  abrirEvint: [instrumentoId: number]
  abrirHojaVida: [hojaVidaId: number]
  nuevaAnotacion: [hojaVidaId: number]
}>()

const cargando = ref(true)
const error = ref('')
const expediente = ref<ExpedienteDetalle | null>(null)
const instrumentos = ref<InstrumentoExpedienteDetalle[]>([])
const anotaciones = ref<UltimaAnotacionExpediente[]>([])

const progresoGeneral = computed(() => {
  if (instrumentos.value.length === 0) return 0

  const total = instrumentos.value.reduce(
    (acumulado, instrumento) => acumulado + instrumento.porcentaje_avance,
    0,
  )

  return Math.round(total / instrumentos.value.length)
})

const iniciales = computed(() => {
  const nombre = expediente.value?.persona_nombre_completo ?? ''

  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0]?.toUpperCase() ?? '')
    .join('') || 'HV'
})

function etiquetaEstado(estado: string): string {
  return estado
    .replace(/_/g, ' ')
    .toLocaleLowerCase('es')
    .replace(/^./, letra => letra.toLocaleUpperCase('es'))
}

function severidadEstado(
  estado: string,
): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  const valor = estado.trim().toUpperCase()

  if (['COMPLETADO', 'CERRADO', 'FINALIZADO'].includes(valor)) {
    return 'success'
  }

  if (['EN_ELABORACION', 'BORRADOR', 'PENDIENTE', 'PENDIENTE_FIRMA'].includes(valor)) {
    return 'warn'
  }

  if (['NO_INICIADO', 'ABIERTO', 'NO_REALIZADO'].includes(valor)) {
    return 'info'
  }

  if (valor === 'NO_APLICA' || valor === 'ANULADO') {
    return 'secondary'
  }

  return 'secondary'
}

function iconoInstrumento(tipo: string): string {
  const valor = tipo.trim().toUpperCase()

  if (valor === 'HOJA_VIDA') return 'pi pi-book'
  if (valor === 'EVINT') return 'pi pi-chart-bar'
  if (valor === 'HC1' || valor === 'HC2') return 'pi pi-clipboard'
  if (valor === 'HAM') return 'pi pi-star'
  if (valor === 'HAPSEM') return 'pi pi-heart'
  return 'pi pi-file'
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''

  try {
    const [detalle, instrumentosResultado, anotacionesResultado] = await Promise.all([
      obtenerExpedienteDetalle(props.expedienteId),
      listarInstrumentosExpediente(props.expedienteId),
      listarUltimasAnotacionesExpediente(props.expedienteId),
    ])

    if (!detalle) {
      throw new Error('No se encontró el expediente solicitado.')
    }

    expediente.value = detalle
    instrumentos.value = instrumentosResultado
    anotaciones.value = anotacionesResultado
  } catch (excepcion) {
    error.value = excepcion instanceof Error
      ? excepcion.message
      : String(excepcion)
  } finally {
    cargando.value = false
  }
}

async function abrir(instrumento: InstrumentoExpedienteDetalle): Promise<void> {
  if (instrumento.aplica !== 1 || instrumento.estado === 'NO_APLICA') return

  try {
    error.value = ''
    await iniciarInstrumento(instrumento.instrumento_id)

    const tipo = instrumento.tipo_instrumento.trim().toUpperCase()

    if (tipo === 'EVINT') {
      emit('abrirEvint', instrumento.instrumento_id)
      return
    }

    if (['HOJA_VIDA', 'HOJA DE VIDA', 'HV'].includes(tipo)) {
      if (!expediente.value?.hoja_vida_id) {
        throw new Error('El expediente no tiene una Hoja de Vida asociada.')
      }

      emit('abrirHojaVida', expediente.value.hoja_vida_id)
      return
    }

    emit('abrirInstrumento', instrumento)
  } catch (excepcion) {
    error.value = excepcion instanceof Error
      ? excepcion.message
      : String(excepcion)
  }
}

watch(() => props.expedienteId, () => void cargar())
onMounted(() => void cargar())
</script>

<template>
  <section class="hv-expediente-prime">
    <div v-if="cargando" class="hv-expediente-loading">
      <i class="pi pi-spin pi-spinner" />
      <strong>Cargando expediente</strong>
      <span>Consultando antecedentes e instrumentos…</span>
    </div>

    <template v-else>
      <div v-if="error" class="hv-expediente-error">
        <i class="pi pi-exclamation-triangle" />
        <span>{{ error }}</span>
        <Button
          label="Reintentar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          size="small"
          @click="cargar"
        />
      </div>

      <template v-if="expediente">
        <header class="hv-expediente-heading">
          <div>
            <span class="hv-eyebrow">Expediente de calificación</span>
            <h1>{{ expediente.grado_calidad_abreviatura }} {{ expediente.persona_nombre_completo }}</h1>
            <p>{{ expediente.run }} · {{ expediente.categoria_nombre }} · {{ expediente.periodo_nombre }}</p>
          </div>

          <div class="hv-expediente-actions">
            <Button
              label="Actualizar"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              @click="cargar"
            />
            <Button
              label="Nueva anotación"
              icon="pi pi-file-edit"
              :disabled="!expediente.hoja_vida_id"
              @click="emit('nuevaAnotacion', expediente.hoja_vida_id)"
            />
          </div>
        </header>

        <Card class="hv-expediente-profile-card">
          <template #content>
            <div class="hv-expediente-profile">
              <div class="hv-expediente-avatar">{{ iniciales }}</div>

              <div class="hv-expediente-profile-main">
                <div class="hv-expediente-profile-title">
                  <div>
                    <strong>{{ expediente.grado_calidad_nombre }}</strong>
                    <span>Expediente N.º {{ expediente.expediente_id }}</span>
                  </div>
                  <Tag
                    :value="etiquetaEstado(expediente.expediente_estado)"
                    :severity="severidadEstado(expediente.expediente_estado)"
                  />
                </div>

                <div class="hv-expediente-meta-grid">
                  <div>
                    <span>Unidad</span>
                    <strong>{{ expediente.unidad_nombre || 'Sin unidad' }}</strong>
                  </div>
                  <div>
                    <span>Puesto</span>
                    <strong>{{ expediente.puesto || 'Sin puesto' }}</strong>
                  </div>
                  <div>
                    <span>Vigencia</span>
                    <strong>{{ expediente.fecha_inicio }} — {{ expediente.fecha_termino }}</strong>
                  </div>
                  <div>
                    <span>Hoja de Vida</span>
                    <strong>{{ etiquetaEstado(expediente.hoja_vida_estado) }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <section class="hv-expediente-summary-grid">
          <Card>
            <template #content>
              <div class="hv-expediente-summary-item">
                <i class="pi pi-user-edit" />
                <div>
                  <span>Calificador directo</span>
                  <strong>{{ expediente.calificador_grado }} {{ expediente.calificador_nombre_completo }}</strong>
                  <small>{{ expediente.calificador_puesto }}</small>
                </div>
              </div>
            </template>
          </Card>

          <Card>
            <template #content>
              <div class="hv-expediente-summary-item">
                <i class="pi pi-book" />
                <div>
                  <span>Anotaciones</span>
                  <strong>{{ expediente.total_anotaciones }}</strong>
                  <small>{{ expediente.total_borradores }} borrador(es)</small>
                </div>
              </div>
            </template>
          </Card>

          <Card>
            <template #content>
              <div class="hv-expediente-summary-item hv-expediente-progress-item">
                <i class="pi pi-chart-line" />
                <div>
                  <span>Avance general</span>
                  <strong>{{ progresoGeneral }}%</strong>
                  <ProgressBar :value="progresoGeneral" :show-value="false" />
                </div>
              </div>
            </template>
          </Card>
        </section>

        <Card class="hv-expediente-section-card">
          <template #title>Instrumentos del expediente</template>
          <template #subtitle>Seleccione un instrumento para abrirlo o continuar su elaboración.</template>
          <template #content>
            <div v-if="instrumentos.length === 0" class="hv-expediente-empty">
              <i class="pi pi-folder-open" />
              <strong>No existen instrumentos asociados</strong>
              <span>El expediente aún no tiene instrumentos disponibles.</span>
            </div>

            <div v-else class="hv-expediente-instrument-grid">
              <button
                v-for="instrumento in instrumentos"
                :key="instrumento.instrumento_id"
                class="hv-expediente-instrument"
                type="button"
                :disabled="instrumento.aplica !== 1 || instrumento.estado === 'NO_APLICA'"
                @click="abrir(instrumento)"
              >
                <div class="hv-expediente-instrument-icon">
                  <i :class="iconoInstrumento(instrumento.tipo_instrumento)" />
                </div>

                <div class="hv-expediente-instrument-copy">
                  <div class="hv-expediente-instrument-title">
                    <strong>{{ instrumento.nombre_instrumento }}</strong>
                    <Tag
                      :value="etiquetaEstado(instrumento.estado)"
                      :severity="severidadEstado(instrumento.estado)"
                    />
                  </div>
                  <span>Formato {{ instrumento.version_formato }}</span>
                  <ProgressBar
                    :value="instrumento.porcentaje_avance"
                    :show-value="false"
                  />
                </div>

                <div class="hv-expediente-instrument-action">
                  <strong>{{ instrumento.porcentaje_avance }}%</strong>
                  <i class="pi pi-chevron-right" />
                </div>
              </button>
            </div>
          </template>
        </Card>

        <Card class="hv-expediente-section-card">
          <template #title>Últimas anotaciones</template>
          <template #subtitle>Registros recientes asociados a la Hoja de Vida.</template>
          <template #content>
            <div v-if="anotaciones.length === 0" class="hv-expediente-empty hv-expediente-empty-compact">
              <i class="pi pi-file-edit" />
              <strong>No existen anotaciones registradas</strong>
              <span>Puede comenzar creando una nueva anotación.</span>
            </div>

            <div v-else class="hv-expediente-annotations">
              <article
                v-for="anotacion in anotaciones"
                :key="anotacion.anotacion_id"
                class="hv-expediente-annotation"
                :class="{ 'hv-expediente-annotation-danger': anotacion.color_semantico === 'ROJO' }"
              >
                <div class="hv-expediente-annotation-date">
                  <i class="pi pi-calendar" />
                  <span>{{ anotacion.fecha_anotacion }}</span>
                </div>

                <div class="hv-expediente-annotation-copy">
                  <div>
                    <strong>{{ anotacion.titulo_final }}</strong>
                    <Tag
                      :value="etiquetaEstado(anotacion.estado)"
                      :severity="severidadEstado(anotacion.estado)"
                    />
                  </div>
                  <p>{{ anotacion.cuerpo_final }}</p>
                  <small v-if="anotacion.concepto_nombre || anotacion.puntaje_visual">
                    {{ anotacion.concepto_nombre ?? 'Sin concepto' }}
                    <template v-if="anotacion.puntaje_visual"> · {{ anotacion.puntaje_visual }}</template>
                  </small>
                </div>
              </article>
            </div>
          </template>
        </Card>
      </template>
    </template>
  </section>
</template>

<style scoped>
.hv-expediente-prime {
  min-height: 100%;
  padding: 1.35rem;
  display: grid;
  align-content: start;
  gap: 1rem;
  background: var(--hv-page);
}

.hv-expediente-loading,
.hv-expediente-empty {
  min-height: 260px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: .6rem;
  color: var(--hv-muted);
  text-align: center;
}

.hv-expediente-loading i,
.hv-expediente-empty i {
  color: var(--hv-primary);
  font-size: 1.8rem;
}

.hv-expediente-loading strong,
.hv-expediente-empty strong {
  color: var(--hv-text);
}

.hv-expediente-error {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .85rem 1rem;
  border: 1px solid #fecaca;
  border-radius: var(--hv-radius-md);
  color: #991b1b;
  background: #fef2f2;
}

.hv-expediente-error span { flex: 1; }

.hv-expediente-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.hv-expediente-heading h1 {
  margin: .25rem 0 0;
  font-size: clamp(1.55rem, 2.5vw, 2rem);
  letter-spacing: -.035em;
}

.hv-expediente-heading p {
  margin: .45rem 0 0;
  color: var(--hv-muted);
}

.hv-expediente-actions {
  display: flex;
  gap: .65rem;
  flex-wrap: wrap;
}

.hv-expediente-profile-card,
.hv-expediente-section-card,
.hv-expediente-summary-grid :deep(.p-card) {
  border: 1px solid var(--hv-border);
  box-shadow: var(--hv-shadow-sm);
}

.hv-expediente-profile {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1.1rem;
  align-items: center;
}

.hv-expediente-avatar {
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(145deg, var(--hv-primary), var(--hv-primary-dark-2));
  font-size: 1.35rem;
  font-weight: 850;
  box-shadow: 0 10px 24px rgba(37, 99, 235, .2);
}

.hv-expediente-profile-main { min-width: 0; }

.hv-expediente-profile-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.hv-expediente-profile-title > div {
  display: grid;
  gap: .25rem;
}

.hv-expediente-profile-title strong { font-size: 1rem; }
.hv-expediente-profile-title span { color: var(--hv-muted); font-size: .83rem; }

.hv-expediente-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: .8rem;
}

.hv-expediente-meta-grid > div {
  display: grid;
  gap: .25rem;
  min-width: 0;
}

.hv-expediente-meta-grid span,
.hv-expediente-summary-item span {
  color: var(--hv-muted);
  font-size: .75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
}

.hv-expediente-meta-grid strong {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: .88rem;
}

.hv-expediente-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: .8rem;
}

.hv-expediente-summary-item {
  min-height: 86px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: .8rem;
}

.hv-expediente-summary-item > i {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  color: var(--hv-primary);
  background: var(--hv-primary-soft);
}

.hv-expediente-summary-item > div {
  display: grid;
  gap: .25rem;
  min-width: 0;
}

.hv-expediente-summary-item strong {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: .95rem;
}

.hv-expediente-summary-item small { color: var(--hv-muted); }
.hv-expediente-progress-item :deep(.p-progressbar) { height: 7px; }

.hv-expediente-instrument-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: .8rem;
}

.hv-expediente-instrument {
  width: 100%;
  min-height: 112px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: .85rem;
  padding: .95rem;
  border: 1px solid var(--hv-border);
  border-radius: 12px;
  color: var(--hv-text);
  background: #fff;
  text-align: left;
  transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
}

.hv-expediente-instrument:hover:not(:disabled) {
  border-color: #9dbcfb;
  box-shadow: 0 10px 24px rgba(37, 99, 235, .09);
  transform: translateY(-1px);
}

.hv-expediente-instrument:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.hv-expediente-instrument-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: var(--hv-primary);
  background: var(--hv-primary-soft);
  font-size: 1.1rem;
}

.hv-expediente-instrument-copy {
  min-width: 0;
  display: grid;
  gap: .55rem;
}

.hv-expediente-instrument-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .6rem;
}

.hv-expediente-instrument-copy > span {
  color: var(--hv-muted);
  font-size: .78rem;
}

.hv-expediente-instrument-copy :deep(.p-progressbar) { height: 6px; }

.hv-expediente-instrument-action {
  display: grid;
  justify-items: end;
  gap: .45rem;
  color: var(--hv-muted);
}

.hv-expediente-instrument-action strong {
  color: var(--hv-text);
  font-size: .85rem;
}

.hv-expediente-empty-compact { min-height: 180px; }

.hv-expediente-annotations {
  display: grid;
  gap: .75rem;
}

.hv-expediente-annotation {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 1rem;
  padding: .9rem;
  border: 1px solid var(--hv-border);
  border-left: 4px solid var(--hv-primary);
  border-radius: 10px;
  background: #fff;
}

.hv-expediente-annotation-danger { border-left-color: var(--hv-danger); }

.hv-expediente-annotation-date {
  display: flex;
  align-items: flex-start;
  gap: .45rem;
  color: var(--hv-muted);
  font-size: .8rem;
}

.hv-expediente-annotation-copy { min-width: 0; }

.hv-expediente-annotation-copy > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: .8rem;
}

.hv-expediente-annotation-copy p {
  margin: .45rem 0;
  color: #475467;
  font-size: .86rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hv-expediente-annotation-copy small { color: var(--hv-muted); }

@media (max-width: 1050px) {
  .hv-expediente-meta-grid { grid-template-columns: 1fr 1fr; }
  .hv-expediente-summary-grid { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .hv-expediente-prime { padding: 1rem; }
  .hv-expediente-heading,
  .hv-expediente-profile-title { flex-direction: column; }
  .hv-expediente-actions { width: 100%; }
  .hv-expediente-actions :deep(.p-button) { flex: 1; }
  .hv-expediente-profile { grid-template-columns: 1fr; }
  .hv-expediente-avatar { width: 58px; height: 58px; border-radius: 15px; }
  .hv-expediente-meta-grid { grid-template-columns: 1fr; }
  .hv-expediente-instrument-grid { grid-template-columns: 1fr; }
  .hv-expediente-annotation { grid-template-columns: 1fr; }
}
</style>
