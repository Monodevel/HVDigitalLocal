<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from 'vue'

import AppLayout from '../../components/layout/AppLayout.vue'
import AppCard from '../../components/ui/AppCard.vue'
import PageActions from '../../components/ui/PageActions.vue'

import {
  anularResolucion,
  emitirResolucion,
  listarResoluciones,
} from '../../services/resolucionesDocumentales'

import type {
  EstadoResolucion,
  ResolucionDocumento,
} from '../../types/resolucionesDocumentales'

const emit = defineEmits<{
  nuevaResolucion: []
  abrirResolucion: [resolucionId: number]
  editarResolucion: [resolucionId: number]
  imprimirResolucion: [resolucionId: number]
  crearAnotacion: [resolucionId: number]
}>()

const cargando = ref(true)
const procesando = ref(false)

const error = ref('')
const mensaje = ref('')
const busqueda = ref('')
const menuAccionesAbierto = ref(false)

const filtroEstado =
  ref<'TODAS' | EstadoResolucion>('TODAS')

const resoluciones =
  ref<ResolucionDocumento[]>([])

const totalBorradores = computed(() => {
  return resoluciones.value.filter(
    resolucion =>
      resolucion.estado === 'BORRADOR',
  ).length
})

const totalEmitidas = computed(() => {
  return resoluciones.value.filter(
    resolucion =>
      resolucion.estado === 'EMITIDA',
  ).length
})

const totalAnuladas = computed(() => {
  return resoluciones.value.filter(
    resolucion =>
      resolucion.estado === 'ANULADA',
  ).length
})

const resolucionesFiltradas = computed(() => {
  const termino = busqueda.value
    .trim()
    .toLowerCase()

  return resoluciones.value.filter(
    resolucion => {
      const coincideEstado =
        filtroEstado.value === 'TODAS' ||
        resolucion.estado ===
          filtroEstado.value

      if (!coincideEstado) {
        return false
      }

      if (!termino) {
        return true
      }

      return [
        resolucion.numero_visible,
        resolucion.persona_nombre_completo,
        resolucion.run,
        resolucion.tipo_efecto_codigo,
        resolucion.concepto_nombre_actual,
        resolucion.puntaje_visual_actual,
        resolucion.estado,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(termino)
    },
  )
})

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''

  try {
    resoluciones.value =
      await listarResoluciones()
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

async function confirmarEmision(
  resolucion: ResolucionDocumento,
): Promise<void> {
  if (resolucion.estado !== 'BORRADOR') {
    return
  }

  const confirmado = window.confirm(
    [
      '¿Desea emitir esta resolución?',
      '',
      'Al emitirla se asignará automáticamente el siguiente correlativo 1530/N.',
      'Los borradores no se contabilizan.',
      '',
      'Una vez emitida no podrá modificar sus antecedentes, concepto, puntaje ni texto.',
    ].join('\n'),
  )

  if (!confirmado) {
    return
  }

  procesando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const resultado =
      await emitirResolucion(
        resolucion.resolucion_id,
      )

    mensaje.value =
      `Resolución ${resultado.numeroVisible} emitida correctamente.`

    await cargar()
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    procesando.value = false
  }
}

async function confirmarAnulacion(
  resolucion: ResolucionDocumento,
): Promise<void> {
  if (resolucion.estado === 'ANULADA') {
    return
  }

  const motivo = window.prompt(
    'Indique el motivo de anulación de la resolución:',
  )

  if (!motivo) {
    return
  }

  procesando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    await anularResolucion(
      resolucion.resolucion_id,
      motivo,
    )

    mensaje.value =
      'Resolución anulada correctamente.'

    await cargar()
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    procesando.value = false
  }
}

function etiquetaEstado(
  estado: EstadoResolucion,
): string {
  switch (estado) {
    case 'BORRADOR':
      return 'Borrador'

    case 'EMITIDA':
      return 'Emitida'

    case 'ANULADA':
      return 'Anulada'

    default:
      return estado
  }
}

function etiquetaTipo(
  tipo: string,
): string {
  if (tipo === 'MERITO') {
    return 'Mérito'
  }

  if (tipo === 'DEMERITO') {
    return 'Demérito'
  }

  return tipo
}

function claseEstado(
  estado: EstadoResolucion,
): 'warning' | 'success' | 'danger' {
  switch (estado) {
    case 'EMITIDA':
      return 'success'

    case 'ANULADA':
      return 'danger'

    default:
      return 'warning'
  }
}

function numeroResolucion(
  resolucion: ResolucionDocumento,
): string {
  return (
    resolucion.numero_visible ??
    'Pendiente de emisión'
  )
}

function obtenerMensajeError(
  excepcion: unknown,
): string {
  return excepcion instanceof Error
    ? excepcion.message
    : String(excepcion)
}

onMounted(cargar)
</script>

<template>
  <AppLayout
    title="Resoluciones"
    subtitle="Creación, emisión, impresión y control de resoluciones de mérito y demérito"
    max-width="full"
  >
    <template #actions>
      <PageActions
        v-model:open="menuAccionesAbierto"
      >
        <template #primary>
          <button
            class="hv-button hv-button-primary"
            type="button"
            @click="emit('nuevaResolucion')"
          >
            Nueva resolución
          </button>
        </template>

        <button
          type="button"
          :disabled="cargando"
          @click="cargar"
        >
          Actualizar
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

      <div
        v-if="mensaje"
        class="notice notice--success"
      >
        {{ mensaje }}
      </div>
    </template>

    <template #summary>
      <div class="metrics-grid">
        <article
          class="metric-card metric-card--warning"
          role="button"
          tabindex="0"
          @click="filtroEstado = 'BORRADOR'"
        >
          <span>Borradores</span>
          <strong>{{ totalBorradores }}</strong>
          <small>No consumen correlativo</small>
        </article>

        <article
          class="metric-card metric-card--success"
          role="button"
          tabindex="0"
          @click="filtroEstado = 'EMITIDA'"
        >
          <span>Emitidas</span>
          <strong>{{ totalEmitidas }}</strong>
          <small>Con número 1530/N</small>
        </article>

        <article
          class="metric-card metric-card--danger"
          role="button"
          tabindex="0"
          @click="filtroEstado = 'ANULADA'"
        >
          <span>Anuladas</span>
          <strong>{{ totalAnuladas }}</strong>
          <small>Solo consulta histórica</small>
        </article>

        <article
          class="metric-card"
          role="button"
          tabindex="0"
          @click="filtroEstado = 'TODAS'"
        >
          <span>Total</span>
          <strong>{{ resoluciones.length }}</strong>
          <small>Todos los estados</small>
        </article>
      </div>
    </template>

    <section
      v-if="cargando"
      class="loading-state"
    >
      Cargando resoluciones…
    </section>

    <AppCard
      v-else
      title="Registro de resoluciones"
      subtitle="Las resoluciones en borrador no tienen número; el correlativo se asigna al emitir"
      padding="none"
    >
      <template #actions>
        <div class="filters">
          <select v-model="filtroEstado">
            <option value="TODAS">
              Todas
            </option>

            <option value="BORRADOR">
              Borradores
            </option>

            <option value="EMITIDA">
              Emitidas
            </option>

            <option value="ANULADA">
              Anuladas
            </option>
          </select>

          <input
            v-model="busqueda"
            type="search"
            placeholder="Buscar por número, persona, RUN, concepto o puntaje…"
          >
        </div>
      </template>

      <div
        v-if="resolucionesFiltradas.length === 0"
        class="empty-state"
      >
        <strong>
          No existen resoluciones para mostrar
        </strong>

        <span>
          Cree una nueva resolución o ajuste los filtros de búsqueda.
        </span>
      </div>

      <div
        v-else
        class="table-wrapper"
      >
        <table class="resolution-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Calificado</th>
              <th>Tipo</th>
              <th>Concepto</th>
              <th>Puntaje</th>
              <th>Estado</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="resolucion in resolucionesFiltradas"
              :key="resolucion.resolucion_id"
            >
              <td>
                <div class="number-cell">
                  <strong>
                    {{ numeroResolucion(resolucion) }}
                  </strong>

                  <span
                    v-if="
                      resolucion.estado === 'BORRADOR'
                    "
                  >
                    Se asignará al emitir
                  </span>
                </div>
              </td>

              <td>
                <span class="date-cell">
                  {{ resolucion.fecha_documento }}
                </span>
              </td>

              <td>
                <div class="person-cell">
                  <strong>
                    {{
                      resolucion
                        .grado_calidad_abreviatura
                    }}
                    {{
                      resolucion
                        .persona_nombre_completo
                    }}
                  </strong>

                  <span>
                    {{ resolucion.run }}
                  </span>
                </div>
              </td>

              <td>
                <span
                  class="type-pill"
                  :class="
                    resolucion.tipo_efecto_codigo ===
                    'MERITO'
                      ? 'type-pill--merito'
                      : 'type-pill--demerito'
                  "
                >
                  {{
                    etiquetaTipo(
                      resolucion.tipo_efecto_codigo,
                    )
                  }}
                </span>
              </td>

              <td>
                <div class="concept-cell">
                  <strong>
                    Concepto
                    {{
                      resolucion
                        .concepto_numero_actual
                    }}
                  </strong>

                  <span>
                    {{
                      resolucion
                        .concepto_nombre_actual
                    }}
                  </span>
                </div>
              </td>

              <td>
                <strong class="score-cell">
                  {{
                    resolucion
                      .puntaje_visual_actual
                  }}
                </strong>
              </td>

              <td>
                <span
                  class="status-pill"
                  :class="
                    `status-pill--${claseEstado(
                      resolucion.estado,
                    )}`
                  "
                >
                  {{
                    etiquetaEstado(
                      resolucion.estado,
                    )
                  }}
                </span>
              </td>

              <td>
                <div class="row-actions">
                  <button
                    type="button"
                    @click="
                      emit(
                        'abrirResolucion',
                        resolucion.resolucion_id,
                      )
                    "
                  >
                    Abrir
                  </button>

                  <button
                    v-if="
                      resolucion.estado === 'BORRADOR'
                    "
                    type="button"
                    @click="
                      emit(
                        'editarResolucion',
                        resolucion.resolucion_id,
                      )
                    "
                  >
                    Editar
                  </button>

                  <button
                    v-if="
                      resolucion.estado === 'BORRADOR'
                    "
                    type="button"
                    :disabled="procesando"
                    @click="
                      confirmarEmision(
                        resolucion,
                      )
                    "
                  >
                    Emitir
                  </button>

                  <button
                    v-if="
                      resolucion.estado === 'EMITIDA'
                    "
                    type="button"
                    @click="
                      emit(
                        'crearAnotacion',
                        resolucion.resolucion_id,
                      )
                    "
                  >
                    Crear anotación
                  </button>

                  <button
                    type="button"
                    @click="
                      emit(
                        'imprimirResolucion',
                        resolucion.resolucion_id,
                      )
                    "
                  >
                    Imprimir
                  </button>

                  <button
                    v-if="
                      resolucion.estado !== 'ANULADA'
                    "
                    type="button"
                    :disabled="procesando"
                    @click="
                      confirmarAnulacion(
                        resolucion,
                      )
                    "
                  >
                    Anular
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>
  </AppLayout>
</template>

<style scoped>
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

.metrics-grid {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  min-height: 108px;
  padding: 17px;
  display: grid;
  align-content: center;
  gap: 6px;
  cursor: pointer;
  background: var(--hv-surface);
  border: 1px solid var(--hv-border);
  border-radius: var(--hv-radius-lg);
  box-shadow: var(--hv-shadow-sm);
}

.metric-card:hover {
  border-color: #bcd1e4;
  box-shadow: 0 8px 24px rgba(16, 32, 54, 0.08);
}

.metric-card span {
  color: var(--hv-muted);
  font-size: 12px;
}

.metric-card strong {
  color: var(--hv-primary);
  font-size: 28px;
  font-weight: 820;
}

.metric-card small {
  color: var(--hv-muted);
  font-size: 11px;
}

.metric-card--warning strong {
  color: var(--hv-warning);
}

.metric-card--success strong {
  color: var(--hv-success);
}

.metric-card--danger strong {
  color: var(--hv-danger);
}

.loading-state,
.empty-state {
  min-height: 280px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  color: var(--hv-muted);
  text-align: center;
}

.empty-state strong {
  color: var(--hv-text);
  font-size: 14px;
}

.empty-state span {
  font-size: 12px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 9px;
}

.filters select,
.filters input {
  min-height: 40px;
  padding: 8px 11px;
  color: var(--hv-text);
  background: #fbfcfd;
  border: 1px solid #d8dde4;
  border-radius: var(--hv-radius-sm);
  font: inherit;
  font-size: 13px;
}

.filters input {
  width: min(390px, 100%);
}

.filters select:focus,
.filters input:focus {
  background: #fff;
  border-color: #6b9bc2;
  outline: none;
  box-shadow:
    0 0 0 3px
    rgba(31, 93, 147, 0.1);
}

.table-wrapper {
  overflow-x: auto;
}

.resolution-table {
  width: 100%;
  border-collapse: collapse;
}

.resolution-table th,
.resolution-table td {
  padding: 14px;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--hv-border);
}

.resolution-table th {
  color: var(--hv-muted);
  background: #fafbfd;
  font-size: 10px;
  font-weight: 820;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.resolution-table tbody tr:hover {
  background: #fafbfd;
}

.resolution-table tbody tr:last-child td {
  border-bottom: 0;
}

.number-cell,
.person-cell,
.concept-cell {
  display: grid;
  gap: 3px;
}

.number-cell strong,
.person-cell strong,
.concept-cell strong {
  color: var(--hv-text);
  font-size: 13px;
}

.number-cell span,
.person-cell span,
.concept-cell span {
  color: var(--hv-muted);
  font-size: 11px;
}

.date-cell {
  color: var(--hv-muted);
  white-space: nowrap;
  font-size: 12px;
}

.score-cell {
  white-space: nowrap;
  font-size: 13px;
}

.type-pill,
.status-pill {
  width: fit-content;
  padding: 5px 8px;
  display: inline-block;
  white-space: nowrap;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
}

.type-pill--merito {
  color: #167447;
  background: #eaf8f0;
}

.type-pill--demerito {
  color: #b4232d;
  background: #fff0f1;
}

.status-pill--warning {
  color: #9a6500;
  background: #fff6d8;
}

.status-pill--success {
  color: #167447;
  background: #eaf8f0;
}

.status-pill--danger {
  color: #b4232d;
  background: #fff0f1;
}

.row-actions {
  min-width: 260px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.row-actions button {
  min-height: 31px;
  padding: 0 9px;
  color: var(--hv-primary);
  background: var(--hv-surface);
  border: 1px solid var(--hv-border);
  border-radius: var(--hv-radius-sm);
  font-size: 11px;
  font-weight: 730;
}

.row-actions button:hover:not(:disabled) {
  background: var(--hv-primary-soft);
  border-color: #bfd4e6;
}

.row-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 980px) {
  .metrics-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .filters {
    justify-content: stretch;
  }

  .filters select,
  .filters input {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
