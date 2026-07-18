<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
} from 'vue'

import {
  activarPeriodoAbierto,
  cerrarPeriodoCalificacion,
  contarPendientesPeriodo,
  crearPeriodoCalificacion,
  listarPeriodosCalificacion,
  obtenerContextoPeriodo,
  seleccionarPeriodoCerradoLectura,
  volverAlPeriodoActivo,
} from '../../services/periodos'

import type {
  ContextoPeriodo,
  PeriodoCalificacion,
} from '../../types/periodos'

const emit = defineEmits<{
  volver: []
}>()

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')

const periodos =
  ref<PeriodoCalificacion[]>([])

const contexto =
  ref<ContextoPeriodo | null>(null)

const cierre = reactive({
  observacion: '',
  pendientes: 0,
})

const nuevo = reactive({
  nombre: '',
  anio: new Date().getFullYear(),
  fechaInicio: '',
  fechaTermino: '',
})

const periodoActivo = computed(() =>
  contexto.value?.periodoActivo ?? null,
)

const periodoVisualizado = computed(() =>
  contexto.value?.periodoVisualizado ?? null,
)

const periodosCerrados = computed(() =>
  periodos.value.filter(
    periodo => periodo.estado === 'CERRADO',
  ),
)


const puedeCerrar = computed(() =>
  Boolean(periodoActivo.value) &&
  cierre.pendientes === 0,
)

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const [
      lista,
      ctx,
    ] =
      await Promise.all([
        listarPeriodosCalificacion(),
        obtenerContextoPeriodo(),
      ])

    periodos.value = lista
    contexto.value = ctx

    if (ctx.periodoActivoId) {
      cierre.pendientes =
        await contarPendientesPeriodo(
          ctx.periodoActivoId,
        )
    } else {
      cierre.pendientes = 0
    }
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  } finally {
    cargando.value = false
  }
}

async function crearPeriodo(): Promise<void> {
  guardando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    await crearPeriodoCalificacion({
      nombre: nuevo.nombre,
      anio: nuevo.anio,
      fechaInicio:
        nuevo.fechaInicio || null,
      fechaTermino:
        nuevo.fechaTermino || null,
      activar: true,
    })

    nuevo.nombre = ''
    nuevo.fechaInicio = ''
    nuevo.fechaTermino = ''

    mensaje.value =
      'Nuevo período creado y activado correctamente.'

    await cargar()
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  } finally {
    guardando.value = false
  }
}

async function cerrarPeriodo(): Promise<void> {
  if (!periodoActivo.value) {
    return
  }

  const confirmado =
    window.confirm(
      '¿Confirma el cierre del período activo? Después del cierre solo podrá consultarse en modo lectura.',
    )

  if (!confirmado) {
    return
  }

  guardando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    await cerrarPeriodoCalificacion({
      periodoId: periodoActivo.value.id,
      observacion:
        cierre.observacion || null,
    })

    cierre.observacion = ''

    mensaje.value =
      'Período cerrado correctamente. Quedó disponible solo en modo lectura.'

    await cargar()
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  } finally {
    guardando.value = false
  }
}

async function abrirLectura(
  periodo: PeriodoCalificacion,
): Promise<void> {
  guardando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    await seleccionarPeriodoCerradoLectura({
      periodoId: periodo.id,
    })

    mensaje.value =
      `Período ${periodo.nombre} abierto en modo lectura.`

    await cargar()
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  } finally {
    guardando.value = false
  }
}

async function volverActivo(): Promise<void> {
  guardando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    await volverAlPeriodoActivo()

    mensaje.value =
      'Se volvió al período activo de trabajo.'

    await cargar()
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  } finally {
    guardando.value = false
  }
}

async function activarAbierto(
  periodo: PeriodoCalificacion,
): Promise<void> {
  guardando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    await activarPeriodoAbierto({
      periodoId: periodo.id,
    })

    mensaje.value =
      `Período ${periodo.nombre} activado correctamente.`

    await cargar()
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <main class="periods-page">
    <section class="periods-shell">
      <header class="page-header">
        <div>
          <span class="eyebrow">
            HVDigital · Administración
          </span>

          <h1>Gestión de períodos</h1>

          <p>
            Cierre el período activo, cree un nuevo período de trabajo
            y consulte períodos cerrados únicamente en modo lectura.
          </p>
        </div>

        <div class="header-actions">
          <button
            class="secondary-action"
            type="button"
            :disabled="guardando"
            @click="cargar"
          >
            ↻ Actualizar
          </button>

          <button
            class="secondary-action"
            type="button"
            @click="emit('volver')"
          >
            Volver
          </button>
        </div>
      </header>

      <div
        v-if="error"
        class="notice notice-error"
      >
        {{ error }}
      </div>

      <div
        v-if="mensaje"
        class="notice notice-success"
      >
        {{ mensaje }}
      </div>

      <section
        v-if="cargando"
        class="loading-panel"
      >
        Cargando períodos…
      </section>

      <template v-else>
        <section class="kpi-strip">
          <article class="kpi-card kpi-blue">
            <span class="kpi-icon">▣</span>

            <div>
              <small>Período activo</small>

              <strong>
                {{
                  periodoActivo?.nombre ??
                  'Sin período activo'
                }}
              </strong>

              <em>Trabajo editable</em>
            </div>
          </article>

          <article class="kpi-card kpi-amber">
            <span class="kpi-icon">◷</span>

            <div>
              <small>Período visualizado</small>

              <strong>
                {{
                  periodoVisualizado?.nombre ??
                  'Sin visualización'
                }}
              </strong>

              <em>
                {{
                  contexto?.modoLectura
                    ? 'Modo lectura'
                    : 'Modo edición'
                }}
              </em>
            </div>
          </article>

          <article class="kpi-card kpi-red">
            <span class="kpi-icon">!</span>

            <div>
              <small>Pendientes antes de cerrar</small>

              <strong>
                {{ cierre.pendientes }}
              </strong>

              <em>
                Borradores e instrumentos abiertos
              </em>
            </div>
          </article>

          <article class="kpi-card kpi-green">
            <span class="kpi-icon">✓</span>

            <div>
              <small>Períodos cerrados</small>

              <strong>
                {{ periodosCerrados.length }}
              </strong>

              <em>Consulta histórica</em>
            </div>
          </article>
        </section>

        <section class="periods-grid">
          <article class="panel">
            <header class="panel-title">
              <h2>Cierre del período activo</h2>
            </header>

            <div class="panel-body">
              <div
                v-if="periodoActivo"
                class="active-period"
              >
                <span>Período actual</span>

                <strong>
                  {{ periodoActivo.nombre }}
                </strong>

                <small>
                  {{
                    periodoActivo.fechaInicio ??
                    'Sin fecha inicial'
                  }}
                  —
                  {{
                    periodoActivo.fechaTermino ??
                    'Sin fecha término'
                  }}
                </small>
              </div>

              <div
                v-else
                class="empty-state"
              >
                No existe período activo.
              </div>

              <label class="field">
                <span>Observación de cierre</span>

                <textarea
                  v-model="cierre.observacion"
                  rows="4"
                  placeholder="Ejemplo: Período cerrado con instrumentos revisados y sin borradores pendientes."
                />
              </label>

              <div
                v-if="cierre.pendientes > 0"
                class="warning-box"
              >
                No se recomienda cerrar el período mientras existan
                pendientes. Primero revise borradores e instrumentos abiertos.
              </div>

              <button
                class="primary-action danger-action"
                type="button"
                :disabled="
                  guardando ||
                  !puedeCerrar
                "
                @click="cerrarPeriodo"
              >
                Cerrar período activo
              </button>
            </div>
          </article>

          <article class="panel">
            <header class="panel-title">
              <h2>Crear nuevo período</h2>
            </header>

            <form
              class="panel-body"
              @submit.prevent="crearPeriodo"
            >
              <label class="field">
                <span>Nombre del período</span>

                <input
                  v-model="nuevo.nombre"
                  type="text"
                  placeholder="Período de calificaciones 2027–2028"
                  required
                >
              </label>

              <div class="form-grid">
                <label class="field">
                  <span>Año</span>

                  <input
                    v-model.number="nuevo.anio"
                    type="number"
                    min="2000"
                    max="2100"
                  >
                </label>

                <label class="field">
                  <span>Fecha inicio</span>

                  <input
                    v-model="nuevo.fechaInicio"
                    type="date"
                  >
                </label>

                <label class="field">
                  <span>Fecha término</span>

                  <input
                    v-model="nuevo.fechaTermino"
                    type="date"
                  >
                </label>
              </div>

              <button
                class="primary-action"
                type="submit"
                :disabled="guardando"
              >
                Crear y activar período
              </button>
            </form>
          </article>

          <article class="panel panel-wide">
            <header class="panel-title">
              <h2>Períodos disponibles</h2>

              <button
                v-if="contexto?.modoLectura"
                class="secondary-action compact"
                type="button"
                :disabled="guardando"
                @click="volverActivo"
              >
                Volver al período activo
              </button>
            </header>

            <div class="period-list">
              <article
                v-for="periodo in periodos"
                :key="periodo.id"
                class="period-row"
                :class="{
                  selected:
                    periodo.esPeriodoVisualizado,
                }"
              >
                <div>
                  <strong>{{ periodo.nombre }}</strong>

                  <span>
                    {{
                      periodo.fechaInicio ??
                      'Sin inicio'
                    }}
                    —
                    {{
                      periodo.fechaTermino ??
                      'Sin término'
                    }}
                  </span>
                </div>

                <span
                  class="status-pill"
                  :class="
                    periodo.estado === 'CERRADO'
                      ? 'status-closed'
                      : 'status-open'
                  "
                >
                  {{ periodo.estado }}
                </span>

                <span
                  v-if="periodo.esPeriodoActivo"
                  class="status-pill status-active"
                >
                  Activo
                </span>

                <span
                  v-if="periodo.esPeriodoVisualizado"
                  class="status-pill status-selected"
                >
                  Visualizado
                </span>

                <button
                  v-if="periodo.estado === 'CERRADO'"
                  class="secondary-action compact"
                  type="button"
                  :disabled="guardando"
                  @click="abrirLectura(periodo)"
                >
                  Abrir lectura
                </button>

                <button
                  v-else-if="!periodo.esPeriodoActivo"
                  class="secondary-action compact"
                  type="button"
                  :disabled="guardando"
                  @click="activarAbierto(periodo)"
                >
                  Activar
                </button>
              </article>

              <div
                v-if="periodos.length === 0"
                class="empty-state"
              >
                No existen períodos registrados.
              </div>
            </div>
          </article>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.periods-page {
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

.periods-shell {
  max-width: 1460px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  gap: 22px;
  align-items: flex-start;
}

.eyebrow {
  display: block;
  color: #155bd6;
  font-size: 11px;
  font-weight: 760;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 5px 0 0;
  color: #111827;
  font-size: 29px;
  line-height: 1.12;
  letter-spacing: -0.03em;
  font-weight: 760;
}

.page-header p {
  max-width: 720px;
  margin: 6px 0 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.4;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.primary-action,
.secondary-action {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 7px;
  font: inherit;
  font-size: 12.5px;
  font-weight: 740;
  cursor: pointer;
}

.primary-action {
  color: #ffffff;
  background: #155bd6;
  border: 1px solid #124fb9;
  box-shadow: 0 5px 12px rgba(21, 91, 214, 0.12);
}

.primary-action:hover:not(:disabled) {
  background: #0f4fc2;
}

.danger-action {
  background: #b4232d;
  border-color: #9e1f28;
  box-shadow: 0 5px 12px rgba(180, 35, 45, 0.12);
}

.danger-action:hover:not(:disabled) {
  background: #9e1f28;
}

.secondary-action {
  color: #155bd6;
  background: #ffffff;
  border: 1px solid #b9c9e7;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.025);
}

.secondary-action:hover:not(:disabled) {
  background: #f8fbff;
  border-color: #9fb4d8;
}

.primary-action:disabled,
.secondary-action:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.compact {
  min-height: 30px;
  padding: 0 10px;
  font-size: 11.5px;
}

.notice {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 650;
}

.notice-error {
  color: #b4232d;
  background: #fff0f1;
  border: 1px solid #facdd0;
}

.notice-success {
  color: #11834f;
  background: #e7f7ef;
  border: 1px solid #c8ecd9;
}

.loading-panel,
.empty-state {
  min-height: 180px;
  display: grid;
  place-items: center;
  color: #64748b;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  font-size: 13px;
}

.kpi-strip {
  margin-bottom: 14px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.025);
  overflow: hidden;
}

.kpi-card {
  min-height: 78px;
  padding: 12px 14px;
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 10px;
  align-items: center;
  border-right: 1px solid #e4e9f2;
}

.kpi-card:last-child {
  border-right: 0;
}

.kpi-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 16px;
}

.kpi-card small {
  display: block;
  color: #334155;
  font-size: 11px;
  line-height: 1.25;
  font-weight: 650;
}

.kpi-card strong {
  display: block;
  overflow: hidden;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
  line-height: 1.08;
  font-weight: 780;
}

.kpi-card em {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-style: normal;
  font-size: 10.5px;
}

.kpi-blue .kpi-icon {
  color: #155bd6;
  background: #eef4ff;
}

.kpi-amber .kpi-icon {
  color: #a36700;
  background: #fff6df;
}

.kpi-red .kpi-icon {
  color: #b4232d;
  background: #fff0f1;
}

.kpi-green .kpi-icon {
  color: #0f8f5a;
  background: #eaf7f0;
}

.periods-grid {
  display: grid;
  grid-template-columns:
    minmax(360px, 0.8fr)
    minmax(360px, 0.8fr);
  gap: 14px;
  align-items: start;
}

.panel,
.loading-panel {
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.025);
}

.panel-wide {
  grid-column: 1 / -1;
}

.panel-title {
  min-height: 42px;
  padding: 0 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  border-bottom: 1px solid #edf1f6;
}

.panel-title h2 {
  margin: 0;
  color: #111827;
  font-size: 14px;
  font-weight: 760;
}

.panel-body {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.active-period {
  padding: 11px 12px;
  display: grid;
  gap: 4px;
  background: #f8fbff;
  border: 1px solid #d9e6ff;
  border-radius: 8px;
}

.active-period span {
  color: #64748b;
  font-size: 11px;
  font-weight: 650;
}

.active-period strong {
  color: #111827;
  font-size: 14px;
  font-weight: 760;
}

.active-period small {
  color: #64748b;
  font-size: 11.5px;
}

.field {
  display: grid;
  gap: 5px;
}

.field span {
  color: #536078;
  font-size: 11.5px;
  font-weight: 700;
}

.field input,
.field textarea {
  width: 100%;
  min-height: 36px;
  box-sizing: border-box;
  padding: 8px 10px;
  color: #1f2937;
  background: #ffffff;
  border: 1px solid #d7deea;
  border-radius: 7px;
  outline: none;
  font: inherit;
  font-size: 12.5px;
}

.field textarea {
  resize: vertical;
  line-height: 1.5;
}

.field input:focus,
.field textarea:focus {
  border-color: #7fa8ec;
  box-shadow: 0 0 0 3px rgba(21, 91, 214, 0.075);
}

.form-grid {
  display: grid;
  grid-template-columns: 110px 1fr 1fr;
  gap: 10px;
}

.warning-box {
  padding: 10px 12px;
  color: #8a5a00;
  background: #fff8e1;
  border: 1px solid #f1dda3;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
}

.period-list {
  padding: 10px;
  display: grid;
  gap: 8px;
}

.period-row {
  min-height: 58px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto auto;
  gap: 8px;
  align-items: center;
  background: #ffffff;
  border: 1px solid #edf1f6;
  border-radius: 8px;
}

.period-row.selected {
  background: #f8fbff;
  border-color: #a9c4ef;
}

.period-row div {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.period-row strong {
  overflow: hidden;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 760;
}

.period-row span {
  color: #64748b;
  font-size: 11.5px;
}

.status-pill {
  width: fit-content;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10.5px !important;
  font-weight: 760;
}

.status-open {
  color: #0f8f5a !important;
  background: #e7f7ef;
}

.status-closed {
  color: #475569 !important;
  background: #eef2f7;
}

.status-active {
  color: #155bd6 !important;
  background: #eef4ff;
}

.status-selected {
  color: #a36700 !important;
  background: #fff6df;
}

@media (max-width: 1100px) {
  .periods-grid,
  .kpi-strip {
    grid-template-columns: 1fr;
  }

  .period-row {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .periods-page {
    padding: 22px;
  }

  .page-header,
  .header-actions,
  .panel-title {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
