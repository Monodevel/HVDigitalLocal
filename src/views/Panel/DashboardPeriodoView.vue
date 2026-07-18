<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from 'vue'

import {
  obtenerDashboardPrincipal,
} from '../../services/dashboardPrincipal'

import type {
  DashboardAlerta,
  DashboardExpedienteReciente,
  DashboardInstrumentoEstado,
  DashboardPrincipal,
} from '../../types/dashboardPrincipal'

const emit = defineEmits<{
  agregarCalificados: []
  abrirExpediente: [expedienteId: number]
  nuevaAnotacion: [hojaVidaId: number]
}>()

const cargando = ref(true)
const error = ref('')
const dashboard =
  ref<DashboardPrincipal | null>(null)

const sidebarColapsada = ref(false)

function alternarBarraLateral(): void {
  sidebarColapsada.value = !sidebarColapsada.value

  localStorage.setItem(
    'hvdigital.sidebar.collapsed',
    sidebarColapsada.value ? '1' : '0',
  )
}

const resumen = computed(() =>
  dashboard.value?.resumen,
)

const calificador = computed(() =>
  dashboard.value?.calificador,
)

const inicialesCalificador = computed(() => {
  const nombre =
    calificador.value?.nombre ?? 'Calificador'

  const partes =
    nombre
      .split(/\s+/)
      .filter(Boolean)

  if (partes.length === 0) {
    return 'C'
  }

  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase()
  }

  return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
})

const totalAnotaciones = computed(() =>
  dashboard.value?.anotaciones.total ?? 0,
)

const anchoMerito = computed(() =>
  porcentajeSegmento(
    dashboard.value?.anotaciones.merito ?? 0,
    totalAnotaciones.value,
  ),
)

const anchoDemerito = computed(() =>
  porcentajeSegmento(
    dashboard.value?.anotaciones.demerito ?? 0,
    totalAnotaciones.value,
  ),
)


function porcentajeSegmento(
  valor: number,
  total: number,
): number {
  if (total <= 0) {
    return 0
  }

  return Math.round((valor / total) * 100)
}

function claseEstadoInstrumento(
  estado: DashboardInstrumentoEstado['estado'],
): string {
  if (estado === 'Completo') {
    return 'status-success'
  }

  if (estado === 'En proceso') {
    return 'status-info'
  }

  return 'status-warning'
}

function claseAlerta(
  tipo: DashboardAlerta['tipo'],
): string {
  return `alert-${tipo}`
}

function claseEstadoExpediente(
  tipo: DashboardExpedienteReciente['estadoTipo'],
): string {
  return `status-${tipo}`
}

function abrirExpediente(
  expediente: DashboardExpedienteReciente,
): void {
  if (expediente.expedienteId > 0) {
    emit('abrirExpediente', expediente.expedienteId)
  }
}

function abrirPrimerExpediente(): void {
  const expediente =
    dashboard.value?.expedientesRecientes.find(
      item => item.expedienteId > 0,
    )

  if (expediente) {
    emit('abrirExpediente', expediente.expedienteId)
  }
}

function crearNuevaAnotacion(): void {
  const hojaVidaId =
    dashboard.value?.expedientesRecientes.find(
      item => item.hojaVidaId,
    )?.hojaVidaId

  if (hojaVidaId) {
    emit('nuevaAnotacion', hojaVidaId)
    return
  }

  abrirPrimerExpediente()
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''

  try {
    dashboard.value =
      await obtenerDashboardPrincipal()
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  sidebarColapsada.value =
    localStorage.getItem(
      'hvdigital.sidebar.collapsed',
    ) === '1'

  void cargar()
})
</script>

<template>
  <main
    class="dashboard-page"
    :class="{
      'dashboard-page--collapsed':
        sidebarColapsada,
    }"
  >
    <aside class="dashboard-sidebar">
      <section class="brand">
        <div class="brand-mark">
          H
        </div>

        <div class="brand-text">
          <strong>HVDigital</strong>
          <span>Sistema de Evaluación<br>de Personal Institucional</span>
        </div>
      </section>

      <button
        class="sidebar-floating-toggle"
        type="button"
        :title="
          sidebarColapsada
            ? 'Mostrar barra lateral'
            : 'Ocultar barra lateral'
        "
        @click="alternarBarraLateral"
      >
        <span>
          ‹
        </span>
      </button>

      <nav class="side-nav">
        <button class="active" type="button">
          <span>⌂</span>
          <span class="nav-label">Panel principal</span>
        </button>

        <button type="button" @click="abrirPrimerExpediente">
          <span>□</span>
          <span class="nav-label">Expedientes</span>
        </button>

        <button type="button">
          <span>▤</span>
          <span class="nav-label">Instrumentos</span>
        </button>

        <button type="button" @click="crearNuevaAnotacion">
          <span>✎</span>
          <span class="nav-label">Anotaciones</span>
        </button>

        <button type="button">
          <span>▦</span>
          <span class="nav-label">Resoluciones</span>
        </button>

        <button type="button">
          <span>◷</span>
          <span class="nav-label">Reportes</span>
        </button>

        <button type="button">
          <span>▣</span>
          <span class="nav-label">Calendario</span>
        </button>

        <button type="button" @click="emit('agregarCalificados')">
          <span>♙</span>
          <span class="nav-label">Personas</span>
        </button>

        <button type="button">
          <span>⚙</span>
          <span class="nav-label">Configuración</span>
        </button>
      </nav>

      <button
        class="collapse-button"
        type="button"
        :title="
          sidebarColapsada
            ? 'Mostrar barra lateral'
            : 'Ocultar barra lateral'
        "
        @click="alternarBarraLateral"
      >
        <span class="collapse-icon">
          ‹
        </span>

        <span class="collapse-label">
          Contraer
        </span>
      </button>
    </aside>

    <section class="dashboard-main">
      <section
        v-if="cargando"
        class="state-panel"
      >
        Cargando panel principal…
      </section>

      <template v-else>
        <header class="dashboard-header">
          <div>
            <h1>Panel principal del período</h1>

            <p>
              Resumen operativo del proceso de calificaciones
            </p>
          </div>

          <div class="header-tools">
            <div class="period-chip">
              <span>▣</span>

              <div>
                <small>Período</small>
                <strong>
                  {{
                    resumen?.periodoActual ??
                    'Sin período'
                  }}
                </strong>
              </div>

              <b>⌄</b>
            </div>

            <label class="search-box">
              <span>⌕</span>

              <input
                type="search"
                placeholder="Buscar expediente, persona o RUN..."
              >
            </label>

            <div class="profile-chip">
              <div>
                <strong>
                  {{ calificador?.nombre ?? 'Calificador' }}
                </strong>

                <small>
                  {{ calificador?.cargo ?? 'Usuario activo' }}
                </small>
              </div>

              <span class="avatar">
                {{ inicialesCalificador }}
              </span>
            </div>
          </div>
        </header>

        <div
          v-if="error"
          class="state-error"
        >
          {{ error }}
        </div>

        <section class="kpi-strip">
          <article class="kpi-card kpi-blue">
            <span class="kpi-icon">□</span>

            <div>
              <small>Expedientes activos</small>
              <strong>{{ resumen?.expedientesActivos ?? 0 }}</strong>
              <em>Ver detalles ›</em>
            </div>
          </article>

          <article class="kpi-card kpi-amber">
            <span class="kpi-icon">◷</span>

            <div>
              <small>Anotaciones pendientes de estampar</small>
              <strong>{{ resumen?.anotacionesPendientesEstampar ?? 0 }}</strong>
              <em>Ver anotaciones ›</em>
            </div>
          </article>

          <article class="kpi-card kpi-green">
            <span class="kpi-icon">▤</span>

            <div>
              <small>Resoluciones emitidas disponibles</small>
              <strong>{{ resumen?.resolucionesEmitidasDisponibles ?? 0 }}</strong>
              <em>Ver resoluciones ›</em>
            </div>
          </article>

          <article class="kpi-card kpi-blue">
            <span class="kpi-icon">◔</span>

            <div>
              <small>Instrumentos completados</small>
              <strong>{{ resumen?.instrumentosCompletadosPorcentaje ?? 0 }}%</strong>
              <em>Promedio general</em>
            </div>
          </article>

          <article class="kpi-card kpi-red">
            <span class="kpi-icon">▧</span>

            <div>
              <small>HC2 pendientes</small>
              <strong>{{ resumen?.hc2Pendientes ?? 0 }}</strong>
              <em>Ver expedientes ›</em>
            </div>
          </article>

          <article class="kpi-card kpi-purple">
            <span class="kpi-icon">▨</span>

            <div>
              <small>EVINT pendientes</small>
              <strong>{{ resumen?.evintPendientes ?? 0 }}</strong>
              <em>Ver expedientes ›</em>
            </div>
          </article>
        </section>

        <section class="dashboard-grid">
          <article class="panel state-card">
            <header class="panel-title">
              <h2>Estado general del período</h2>
            </header>

            <div class="instrument-table">
              <div class="table-head">
                <span>Instrumento</span>
                <span>Completados</span>
                <span>Progreso</span>
                <span>Estado</span>
              </div>

              <div
                v-for="item in dashboard?.instrumentos ?? []"
                :key="item.instrumento"
                class="instrument-row"
              >
                <span>{{ item.instrumento }}</span>

                <span>
                  {{ item.completados }} / {{ item.total }}
                </span>

                <span class="progress-cell">
                  <i>
                    <b
                      :style="{
                        width: `${item.porcentaje}%`,
                      }"
                    />
                  </i>

                  <small>{{ item.porcentaje }}%</small>
                </span>

                <span
                  class="status-pill"
                  :class="claseEstadoInstrumento(item.estado)"
                >
                  {{ item.estado }}
                </span>
              </div>
            </div>
          </article>

          <article class="panel alerts-card">
            <header class="panel-title">
              <h2>
                <span class="danger-symbol">▲</span>
                Alertas y acciones prioritarias
              </h2>
            </header>

            <div class="alerts-list">
              <div
                v-for="alerta in dashboard?.alertas ?? []"
                :key="alerta.id"
                class="alert-row"
                :class="claseAlerta(alerta.tipo)"
              >
                <span class="alert-icon">!</span>

                <strong>{{ alerta.titulo }}</strong>

                <em>{{ alerta.total }}</em>

                <button type="button">
                  {{ alerta.accion }}
                </button>
              </div>
            </div>
          </article>

          <aside class="analytics-column">
            <article class="panel">
              <header class="panel-title">
                <h2>Distribución por categoría</h2>
              </header>

              <div class="category-list">
                <div
                  v-for="categoria in dashboard?.distribucionCategorias ?? []"
                  :key="categoria.categoria"
                  class="category-row"
                >
                  <span>{{ categoria.categoria }}</span>

                  <i>
                    <b
                      :style="{
                        width: `${categoria.porcentaje}%`,
                      }"
                    />
                  </i>

                  <strong>
                    {{ categoria.total }} ({{ categoria.porcentaje }}%)
                  </strong>
                </div>

                <small>
                  Total:
                  {{ resumen?.expedientesActivos ?? 0 }}
                  expedientes
                </small>
              </div>
            </article>

            <article class="panel annotations-card">
              <header class="panel-title">
                <h2>Anotaciones del período</h2>
              </header>

              <div class="annotation-chart">
                <div
                  class="donut"
                  :style="{
                    background: `conic-gradient(
                      #17a56b 0 ${anchoMerito}%,
                      #dc5656 ${anchoMerito}% ${anchoMerito + anchoDemerito}%,
                      #a3aab8 ${anchoMerito + anchoDemerito}% 100%
                    )`,
                  }"
                />

                <ul>
                  <li>
                    <span class="dot green" />
                    Mérito
                    <strong>{{ dashboard?.anotaciones.merito ?? 0 }}</strong>
                  </li>

                  <li>
                    <span class="dot red" />
                    Demérito
                    <strong>{{ dashboard?.anotaciones.demerito ?? 0 }}</strong>
                  </li>

                  <li>
                    <span class="dot gray" />
                    Otras
                    <strong>{{ dashboard?.anotaciones.otras ?? 0 }}</strong>
                  </li>
                </ul>
              </div>

              <small>
                Total:
                {{ totalAnotaciones }}
                anotaciones
              </small>
            </article>

            <article class="panel calendar-card">
              <header class="panel-title">
                <h2>▣ Calendario / hitos</h2>
              </header>

              <div
                v-for="hito in dashboard?.hitos ?? []"
                :key="hito.titulo"
                class="hito-row"
              >
                <span>{{ hito.titulo }}</span>
                <strong>{{ hito.fecha }}</strong>
              </div>
            </article>
          </aside>

          <article class="panel recent-card">
            <header class="panel-title">
              <h2>Expedientes recientes</h2>
            </header>

            <div class="recent-table">
              <div class="recent-head">
                <span>Calificado</span>
                <span>Grado</span>
                <span>Categoría</span>
                <span>Estado general</span>
                <span>Próxima acción</span>
              </div>

              <button
                v-for="expediente in dashboard?.expedientesRecientes ?? []"
                :key="`${expediente.expedienteId}-${expediente.calificado}`"
                class="recent-row"
                type="button"
                @click="abrirExpediente(expediente)"
              >
                <span>{{ expediente.calificado }}</span>
                <span>{{ expediente.grado }}</span>
                <span>{{ expediente.categoria }}</span>

                <span
                  class="status-pill"
                  :class="claseEstadoExpediente(expediente.estadoTipo)"
                >
                  {{ expediente.estadoGeneral }}
                </span>

                <strong>{{ expediente.proximaAccion }}</strong>
              </button>

              <div
                v-if="(dashboard?.expedientesRecientes.length ?? 0) === 0"
                class="empty-table"
              >
                No existen expedientes para mostrar.
              </div>
            </div>
          </article>

          <article class="panel quick-card">
            <header class="panel-title">
              <h2>Accesos rápidos</h2>
            </header>

            <div class="quick-grid">
              <button type="button" @click="crearNuevaAnotacion">
                <span>✎</span>
                Nueva anotación
              </button>

              <button type="button">
                <span>▤</span>
                Nueva resolución
              </button>

              <button type="button" @click="abrirPrimerExpediente">
                <span>□</span>
                Abrir expediente
              </button>

              <button type="button" @click="emit('agregarCalificados')">
                <span>♙</span>
                Designar calificados
              </button>

              <button type="button" @click="abrirPrimerExpediente">
                <span>▣</span>
                Ver Hoja de Vida
              </button>

              <button type="button">
                <span>⚙</span>
                Configuración
              </button>
            </div>
          </article>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 228px minmax(0, 1fr);
  color: #121826;
  background: #f6f8fc;
}

.dashboard-sidebar {
  position: relative;
  min-height: 100vh;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  background: rgba(255, 255, 255, 0.88);
  border-right: 1px solid #dde5f1;
}

.brand {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 12px;
  align-items: center;
}

.brand-mark {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: #155bd6;
  background: #eff5ff;
  border: 2px solid #155bd6;
  border-radius: 12px;
  font-weight: 900;
}

.brand strong {
  display: block;
  color: #111827;
  font-size: 18px;
  letter-spacing: -0.02em;
}

.brand span {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.25;
}

.side-nav {
  display: grid;
  gap: 4px;
}

.side-nav button,
.collapse-button,
.quick-grid button,
.alert-row button,
.recent-row {
  font: inherit;
  cursor: pointer;
}

.side-nav button {
  min-height: 38px;
  padding: 0 12px;
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 8px;
  align-items: center;
  color: #32415a;
  background: transparent;
  border: 0;
  border-radius: 8px;
  text-align: left;
  font-size: 13px;
  font-weight: 650;
}

.side-nav button.active,
.side-nav button:hover {
  color: #155bd6;
  background: #eef4ff;
}

.side-nav span {
  font-size: 15px;
}

.collapse-button {
  margin-top: auto;
  min-height: 34px;
  color: #475569;
  background: transparent;
  border: 0;
  text-align: left;
  font-size: 12px;
}

.dashboard-main {
  min-width: 0;
  padding: 26px 28px 34px;
}

.dashboard-header {
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.dashboard-header h1 {
  margin: 0;
  color: #111827;
  font-size: 27px;
  line-height: 1.12;
  letter-spacing: -0.03em;
  font-weight: 780;
}

.dashboard-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.header-tools {
  display: grid;
  grid-template-columns: 170px minmax(260px, 320px) 210px;
  gap: 10px;
  align-items: center;
}

.period-chip,
.search-box,
.profile-chip {
  min-height: 40px;
  box-sizing: border-box;
  display: grid;
  align-items: center;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.025);
}

.period-chip {
  padding: 0 11px;
  grid-template-columns: 26px 1fr 18px;
  gap: 8px;
}

.period-chip span {
  color: #155bd6;
}

.period-chip small,
.profile-chip small {
  display: block;
  color: #64748b;
  font-size: 10.5px;
}

.period-chip strong,
.profile-chip strong {
  display: block;
  overflow: hidden;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
}

.period-chip b {
  color: #64748b;
  font-weight: 700;
}

.search-box {
  grid-template-columns: 32px 1fr;
  padding-right: 10px;
}

.search-box span {
  display: grid;
  place-items: center;
  color: #64748b;
}

.search-box input {
  width: 100%;
  height: 36px;
  color: #111827;
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 12px;
}

.profile-chip {
  padding: 0 10px;
  grid-template-columns: 1fr 34px;
  gap: 8px;
}

.avatar {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  color: #ffffff;
  background: #34415e;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.kpi-strip {
  margin-bottom: 14px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.025);
  overflow: hidden;
}

.kpi-card {
  min-height: 84px;
  padding: 14px 14px;
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 10px;
  align-items: center;
  border-right: 1px solid #e4e9f2;
}

.kpi-card:last-child {
  border-right: 0;
}

.kpi-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 18px;
}

.kpi-card small {
  display: block;
  min-height: 28px;
  color: #334155;
  font-size: 11px;
  line-height: 1.25;
  font-weight: 650;
}

.kpi-card strong {
  display: block;
  color: #111827;
  font-size: 23px;
  line-height: 1.05;
  font-weight: 780;
  letter-spacing: -0.03em;
}

.kpi-card em {
  display: block;
  margin-top: 5px;
  color: #155bd6;
  font-style: normal;
  font-size: 11px;
  font-weight: 650;
}

.kpi-blue .kpi-icon {
  color: #155bd6;
  background: #eef4ff;
}

.kpi-amber .kpi-icon {
  color: #c47a00;
  background: #fff6df;
}

.kpi-green .kpi-icon {
  color: #0f8f5a;
  background: #eaf7f0;
}

.kpi-red .kpi-icon {
  color: #c0393f;
  background: #fff0f1;
}

.kpi-purple .kpi-icon {
  color: #7c3aed;
  background: #f3edff;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.72fr) 420px;
  gap: 14px;
  align-items: start;
}

.panel {
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.025);
}

.panel-title {
  min-height: 42px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #edf1f6;
}

.panel-title h2 {
  margin: 0;
  color: #111827;
  font-size: 14px;
  line-height: 1.2;
  letter-spacing: -0.01em;
  font-weight: 760;
}

.instrument-table,
.recent-table {
  padding: 10px 16px 14px;
}

.table-head,
.instrument-row {
  display: grid;
  grid-template-columns: 1fr 90px minmax(170px, 1fr) 90px;
  gap: 12px;
  align-items: center;
}

.table-head,
.recent-head {
  min-height: 30px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.instrument-row {
  min-height: 34px;
  border-top: 1px solid #edf1f6;
  color: #334155;
  font-size: 12px;
}

.progress-cell {
  display: grid;
  grid-template-columns: 1fr 38px;
  gap: 8px;
  align-items: center;
}

.progress-cell i,
.category-row i {
  height: 6px;
  display: block;
  overflow: hidden;
  background: #edf1f6;
  border-radius: 999px;
}

.progress-cell b,
.category-row b {
  height: 100%;
  display: block;
  background: #155bd6;
  border-radius: inherit;
}

.progress-cell small {
  color: #64748b;
  font-size: 11px;
}

.status-pill {
  width: fit-content;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 750;
}

.status-success {
  color: #0f8f5a;
  background: #e7f7ef;
}

.status-info {
  color: #155bd6;
  background: #eef4ff;
}

.status-warning {
  color: #a36700;
  background: #fff6df;
}

.status-danger {
  color: #b4232d;
  background: #fff0f1;
}

.status-neutral {
  color: #475569;
  background: #eef2f7;
}

.alerts-card {
  min-height: 263px;
}

.danger-symbol {
  margin-right: 7px;
  color: #dc2626;
  font-size: 12px;
}

.alerts-list {
  padding: 10px 14px 14px;
  display: grid;
  gap: 8px;
}

.alert-row {
  min-height: 42px;
  padding: 8px;
  display: grid;
  grid-template-columns: 26px 1fr 24px 54px;
  gap: 8px;
  align-items: center;
  border: 1px solid #edf1f6;
  border-radius: 8px;
}

.alert-icon {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.alert-row strong {
  color: #1f2937;
  font-size: 12px;
  line-height: 1.25;
  font-weight: 650;
}

.alert-row em {
  justify-self: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-style: normal;
  font-size: 10.5px;
  font-weight: 750;
}

.alert-row button,
.recent-row strong {
  min-height: 26px;
  padding: 0 10px;
  color: #155bd6;
  background: #ffffff;
  border: 1px solid #c8d7ee;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.alert-danger .alert-icon,
.alert-danger em {
  color: #b4232d;
  background: #fff0f1;
}

.alert-warning .alert-icon,
.alert-warning em {
  color: #a36700;
  background: #fff6df;
}

.alert-info .alert-icon,
.alert-info em {
  color: #155bd6;
  background: #eef4ff;
}

.analytics-column {
  display: grid;
  gap: 14px;
}

.category-list {
  padding: 12px 16px 14px;
  display: grid;
  gap: 12px;
}

.category-row {
  display: grid;
  grid-template-columns: 112px 1fr 70px;
  gap: 10px;
  align-items: center;
  font-size: 12px;
}

.category-row span {
  color: #334155;
}

.category-row strong {
  color: #111827;
  font-size: 11.5px;
  text-align: right;
}

.category-list > small,
.annotations-card > small {
  color: #64748b;
  font-size: 11px;
}

.annotation-chart {
  padding: 14px 16px 8px;
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 20px;
  align-items: center;
}

.donut {
  width: 78px;
  height: 78px;
  position: relative;
  border-radius: 999px;
}

.donut::after {
  width: 38px;
  height: 38px;
  position: absolute;
  inset: 20px;
  content: '';
  background: #ffffff;
  border-radius: 999px;
}

.annotation-chart ul {
  margin: 0;
  padding: 0;
  display: grid;
  gap: 9px;
  list-style: none;
}

.annotation-chart li {
  display: grid;
  grid-template-columns: 12px 1fr auto;
  gap: 8px;
  align-items: center;
  color: #334155;
  font-size: 12px;
}

.annotation-chart li strong {
  color: #111827;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.dot.green {
  background: #17a56b;
}

.dot.red {
  background: #dc5656;
}

.dot.gray {
  background: #a3aab8;
}

.annotations-card > small {
  display: block;
  padding: 0 16px 14px;
}

.calendar-card {
  padding-bottom: 10px;
}

.hito-row {
  min-height: 34px;
  margin: 0 16px;
  display: grid;
  grid-template-columns: 1fr 92px;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid #edf1f6;
  color: #334155;
  font-size: 12px;
}

.hito-row:last-child {
  border-bottom: 0;
}

.hito-row strong {
  color: #475569;
  font-size: 11.5px;
  text-align: right;
}

.recent-card {
  grid-column: 1 / span 2;
}

.recent-head,
.recent-row {
  display: grid;
  grid-template-columns: 1.2fr 70px 1fr 140px 128px;
  gap: 12px;
  align-items: center;
}

.recent-row {
  width: 100%;
  min-height: 34px;
  color: #334155;
  background: transparent;
  border: 0;
  border-top: 1px solid #edf1f6;
  text-align: left;
  font-size: 12px;
}

.recent-row:hover {
  background: #f8fbff;
}

.recent-row > span:first-child {
  color: #111827;
  font-weight: 650;
}

.recent-row strong {
  justify-self: start;
  display: inline-flex;
  align-items: center;
}

.quick-card {
  grid-column: 1 / -1;
}

.quick-grid {
  padding: 12px 16px 14px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.quick-grid button {
  min-height: 42px;
  padding: 0 12px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  color: #334155;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 650;
}

.quick-grid button:hover {
  color: #155bd6;
  border-color: #a9c4ef;
  background: #f8fbff;
}

.quick-grid span {
  color: #155bd6;
  font-size: 17px;
}

.empty-table,
.state-panel,
.state-error {
  min-height: 220px;
  display: grid;
  place-items: center;
  color: #64748b;
  font-size: 13px;
}

.state-error {
  min-height: auto;
  margin-bottom: 12px;
  padding: 9px 12px;
  color: #b4232d;
  background: #fff0f1;
  border: 1px solid #facdd0;
  border-radius: 7px;
}

@media (max-width: 1480px) {
  .dashboard-page {
    grid-template-columns: 1fr;
  }

  .dashboard-sidebar {
    display: none;
  }

  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr) 380px;
  }

  .analytics-column {
    grid-column: 2;
    grid-row: 1 / span 3;
  }

  .recent-card {
    grid-column: 1;
  }
}

@media (max-width: 1120px) {
  .header-tools,
  .kpi-strip,
  .dashboard-grid,
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .analytics-column,
  .recent-card {
    grid-column: auto;
    grid-row: auto;
  }

  .dashboard-header {
    flex-direction: column;
  }

  .table-head,
  .instrument-row,
  .recent-head,
  .recent-row {
    grid-template-columns: 1fr;
  }
}

.dashboard-page,
.dashboard-sidebar,
.dashboard-main,
.brand-text,
.nav-label,
.collapse-label,
.sidebar-floating-toggle span {
  transition:
    width 180ms ease,
    opacity 160ms ease,
    grid-template-columns 180ms ease,
    transform 180ms ease,
    padding 180ms ease;
}

.dashboard-page--collapsed {
  grid-template-columns: 76px minmax(0, 1fr);
}

.dashboard-page--collapsed .dashboard-sidebar {
  padding-right: 10px;
  padding-left: 10px;
  align-items: center;
}

.dashboard-page--collapsed .brand {
  grid-template-columns: 42px;
  justify-content: center;
}

.dashboard-page--collapsed .brand-text,
.dashboard-page--collapsed .nav-label,
.dashboard-page--collapsed .collapse-label {
  width: 0;
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
}

.dashboard-page--collapsed .side-nav {
  width: 100%;
}

.dashboard-page--collapsed .side-nav button {
  grid-template-columns: 1fr;
  justify-items: center;
  padding: 0;
}

.dashboard-page--collapsed .side-nav button > span:first-child {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
}

.dashboard-page--collapsed .collapse-button {
  width: 42px;
  justify-content: center;
  padding: 0;
}

.dashboard-page--collapsed .collapse-icon,
.dashboard-page--collapsed .sidebar-floating-toggle span {
  transform: rotate(180deg);
}

.sidebar-floating-toggle {
  position: absolute;
  top: 46px;
  right: -14px;
  z-index: 5;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: #64748b;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
  cursor: pointer;
}

.sidebar-floating-toggle:hover {
  color: #155bd6;
  border-color: #a9c4ef;
}

.sidebar-floating-toggle span {
  display: block;
  font-size: 21px;
  line-height: 1;
}

.collapse-button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.collapse-icon {
  display: inline-block;
  font-size: 18px;
  line-height: 1;
  transition: transform 180ms ease;
}

</style>
