<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
} from 'vue'

import {
  crearPeriodoInicial,
  guardarCalificadorDirecto,
  obtenerEstadoConfiguracionInicial,
} from '../../services/configuracionInicial'

import {
  listarGradosCalificables,
} from '../../services/grados'

import type {
  ResultadoCreacionPeriodo,
} from '../../types/configuracionInicial'

import type {
  Grado,
} from '../../types/grados'

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')

const paso = ref(1)
const grados = ref<Grado[]>([])
const periodoCreado =
  ref<ResultadoCreacionPeriodo | null>(null)

function recargarAplicacion(): void {
  globalThis.location.reload()
}

const calificador = reactive({
  gradoId: null as number | null,
  run: '',
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  unidadNombre: '',
  unidadSigla: '',
  puesto: '',
})

const anioSeleccionado = ref(
  new Date().getFullYear(),
)

const pasos = [
  {
    numero: 1,
    titulo: 'Calificador directo',
  },
  {
    numero: 2,
    titulo: 'Período',
  },
  {
    numero: 3,
    titulo: 'Personal',
  },
  {
    numero: 4,
    titulo: 'Confirmación',
  },
]

const gradoSeleccionado = computed(() =>
  grados.value.find(
    grado => grado.id === calificador.gradoId,
  ),
)

const nombreCompleto = computed(() =>
  [
    calificador.nombres,
    calificador.apellidoPaterno,
    calificador.apellidoMaterno,
  ]
    .filter(Boolean)
    .join(' ')
    .trim(),
)

const nombreCalificadorVisual = computed(() =>
  nombreCompleto.value ||
  'Calificador directo',
)

const periodoVisual = computed(() =>
  `${anioSeleccionado.value}–${anioSeleccionado.value + 1}`,
)

async function inicializar(): Promise<void> {
  cargando.value = true
  error.value = ''

  try {
    const [estado, gradosResultado] =
      await Promise.all([
        obtenerEstadoConfiguracionInicial(),
        listarGradosCalificables(),
      ])

    grados.value = gradosResultado
    paso.value = Math.min(
      Math.max(estado.paso_actual, 1),
      4,
    )

    if (estado.grado_id) {
      calificador.gradoId = estado.grado_id
    }

    calificador.run = estado.run ?? ''
    calificador.nombres = estado.nombres ?? ''
    calificador.apellidoPaterno =
      estado.apellido_paterno ?? ''
    calificador.apellidoMaterno =
      estado.apellido_materno ?? ''
    calificador.unidadNombre =
      estado.unidad_nombre ?? ''
    calificador.unidadSigla =
      estado.unidad_sigla ?? ''
    calificador.puesto =
      estado.puesto ?? ''

    if (estado.periodo_anio) {
      anioSeleccionado.value =
        estado.periodo_anio
    }
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

function validarCalificador(): void {
  if (!calificador.gradoId) {
    throw new Error(
      'Debe seleccionar el grado del calificador.',
    )
  }

  if (!calificador.nombres.trim()) {
    throw new Error(
      'Debe ingresar los nombres del calificador.',
    )
  }

  if (!calificador.apellidoPaterno.trim()) {
    throw new Error(
      'Debe ingresar el apellido paterno del calificador.',
    )
  }

  if (!calificador.unidadNombre.trim()) {
    throw new Error(
      'Debe ingresar la unidad o repartición.',
    )
  }

  if (!calificador.unidadSigla.trim()) {
    throw new Error(
      'Debe ingresar la sigla de la unidad.',
    )
  }

  if (!calificador.puesto.trim()) {
    throw new Error(
      'Debe ingresar el puesto o cargo.',
    )
  }
}

async function guardarPasoCalificador(
  avanzar = true,
): Promise<void> {
  error.value = ''
  mensaje.value = ''
  guardando.value = true

  try {
    validarCalificador()

    await guardarCalificadorDirecto({
      gradoId: calificador.gradoId!,
      run: calificador.run,
      nombres: calificador.nombres,
      apellidoPaterno:
        calificador.apellidoPaterno,
      apellidoMaterno:
        calificador.apellidoMaterno,
      unidadNombre:
        calificador.unidadNombre,
      unidadSigla:
        calificador.unidadSigla,
      puesto: calificador.puesto,
    })

    mensaje.value =
      avanzar
        ? 'Datos del calificador guardados.'
        : 'Borrador guardado.'

    if (avanzar) {
      paso.value = 2
    }
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    guardando.value = false
  }
}

async function guardarPasoPeriodo(
  avanzar = true,
): Promise<void> {
  error.value = ''
  mensaje.value = ''
  guardando.value = true

  try {
    periodoCreado.value =
      await crearPeriodoInicial(
        anioSeleccionado.value,
      )

    mensaje.value =
      avanzar
        ? `Período ${periodoCreado.value.nombre} creado correctamente.`
        : 'Borrador del período guardado.'

    if (avanzar) {
      paso.value = 3
    }
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    guardando.value = false
  }
}

function confirmarPersonal(): void {
  error.value = ''
  mensaje.value =
    'Configuración inicial preparada. El siguiente paso será designar el personal calificado.'
  paso.value = 4
}

function volver(): void {
  if (paso.value > 1) {
    paso.value -= 1
  }
}

function obtenerMensajeError(
  excepcion: unknown,
): string {
  return excepcion instanceof Error
    ? excepcion.message
    : String(excepcion)
}

onMounted(inicializar)
</script>

<template>
  <main class="setup-page">
    <section class="setup-shell">
      <header class="setup-title">
        <h1>Configuración inicial</h1>

        <p>
          Sigamos con algunos datos para dejar todo listo.
        </p>
      </header>

      <section class="wizard-card">
        <nav
          class="wizard-steps"
          aria-label="Pasos de configuración inicial"
        >
          <template
            v-for="item in pasos"
            :key="item.numero"
          >
            <div
              class="step-item"
              :class="{
                'step-item--active':
                  paso === item.numero,
                'step-item--done':
                  paso > item.numero,
              }"
            >
              <span>
                {{ item.numero }}
              </span>

              <strong>
                {{ item.titulo }}
              </strong>
            </div>

            <div
              v-if="item.numero < pasos.length"
              class="step-line"
              :class="{
                'step-line--done':
                  paso > item.numero,
              }"
            ></div>
          </template>
        </nav>

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

        <section
          v-if="cargando"
          class="loading-panel"
        >
          Cargando configuración…
        </section>

        <template v-else>
          <section
            v-if="paso === 1"
            class="wizard-content"
          >
            <form
              class="form-panel"
              @submit.prevent="
                guardarPasoCalificador(true)
              "
            >
              <div class="field">
                <label>Grado</label>

                <div class="control control--select">
                  <span class="control-icon">♙</span>

                  <select
                    v-model.number="
                      calificador.gradoId
                    "
                  >
                    <option :value="null">
                      Seleccione…
                    </option>

                    <option
                      v-for="grado in grados"
                      :key="grado.id"
                      :value="grado.id"
                    >
                      {{ grado.nombre }}
                      ({{ grado.abreviatura }})
                    </option>
                  </select>
                </div>
              </div>

              <div class="field">
                <label>Nombres</label>

                <div class="control">
                  <span class="control-icon">♙</span>

                  <input
                    v-model="calificador.nombres"
                    type="text"
                    placeholder="Juan Carlos"
                  >
                </div>
              </div>

              <div class="field">
                <label>Apellido paterno</label>

                <div class="control">
                  <span class="control-icon">♙</span>

                  <input
                    v-model="
                      calificador.apellidoPaterno
                    "
                    type="text"
                    placeholder="Pérez"
                  >
                </div>
              </div>

              <div class="field">
                <label>Apellido materno</label>

                <div class="control">
                  <span class="control-icon">♙</span>

                  <input
                    v-model="
                      calificador.apellidoMaterno
                    "
                    type="text"
                    placeholder="Soto"
                  >
                </div>
              </div>

              <div class="field">
                <label>RUN</label>

                <div class="control">
                  <span class="control-icon">▣</span>

                  <input
                    v-model="calificador.run"
                    type="text"
                    placeholder="17.842.654-3"
                  >
                </div>
              </div>

              <div class="field">
                <label>Unidad</label>

                <div class="control">
                  <span class="control-icon">▥</span>

                  <input
                    v-model="
                      calificador.unidadNombre
                    "
                    type="text"
                    placeholder="Escuadrilla de Servicios Generales"
                  >
                </div>
              </div>

              <div class="field">
                <label>Sigla</label>

                <div class="control">
                  <span class="control-icon">▭</span>

                  <input
                    v-model="
                      calificador.unidadSigla
                    "
                    type="text"
                    placeholder="ESG"
                  >
                </div>
              </div>

              <div class="field">
                <label>Puesto</label>

                <div class="control">
                  <span class="control-icon">▦</span>

                  <input
                    v-model="calificador.puesto"
                    type="text"
                    placeholder="Personal de Cuadro Permanente"
                  >
                </div>
              </div>
            </form>

            <aside class="info-panel">
              <div class="info-icon">
                🚀
              </div>

              <h2>Primer inicio</h2>

              <div class="small-line"></div>

              <p>
                Con estos datos crearemos tu configuración
                institucional y el período de calificaciones.
              </p>

              <p>
                Podrás revisarlos y ajustarlos más adelante
                en la configuración.
              </p>

              <div
                v-if="nombreCompleto"
                class="identity-card"
              >
                <strong>
                  {{ nombreCalificadorVisual }}
                </strong>

                <span>
                  {{
                    gradoSeleccionado?.abreviatura ??
                    'Sin grado'
                  }}
                  ·
                  {{
                    calificador.unidadSigla ||
                    'Sin unidad'
                  }}
                </span>
              </div>
            </aside>
          </section>

          <section
            v-else-if="paso === 2"
            class="wizard-content"
          >
            <form
              class="form-panel form-panel--single"
              @submit.prevent="
                guardarPasoPeriodo(true)
              "
            >
              <div class="period-heading">
                <h2>Período de calificaciones</h2>

                <p>
                  Seleccione el año de inicio del período.
                  Las vigencias se calcularán automáticamente.
                </p>
              </div>

              <div class="field field--large">
                <label>Año de inicio</label>

                <div class="control">
                  <span class="control-icon">◷</span>

                  <input
                    v-model.number="
                      anioSeleccionado
                    "
                    type="number"
                    min="2020"
                    max="2100"
                  >
                </div>
              </div>

              <div class="period-preview">
                <span>Período propuesto</span>

                <strong>
                  {{ periodoVisual }}
                </strong>

                <p>
                  Se generarán las vigencias institucionales
                  para las categorías que correspondan.
                </p>
              </div>
            </form>

            <aside class="info-panel">
              <div class="info-icon">
                📅
              </div>

              <h2>Período</h2>

              <div class="small-line"></div>

              <p>
                Este período será usado por las Hojas de Vida,
                EVINT, HC1, HC2, HAM y HAPSEM.
              </p>

              <p>
                Verifica bien el año antes de continuar.
              </p>
            </aside>
          </section>

          <section
            v-else-if="paso === 3"
            class="wizard-content"
          >
            <div class="form-panel form-panel--single">
              <div class="period-heading">
                <h2>Personal</h2>

                <p>
                  El sistema quedó preparado para registrar
                  el personal que será calificado.
                </p>
              </div>

              <div
                v-if="periodoCreado"
                class="vigencias"
              >
                <article
                  v-for="vigencia in
                    periodoCreado.vigencias"
                  :key="vigencia.id"
                >
                  <strong>
                    {{ vigencia.nombre_regimen }}
                  </strong>

                  <span>
                    {{ vigencia.fecha_inicio }}
                    al
                    {{ vigencia.fecha_termino }}
                  </span>
                </article>
              </div>

              <div class="next-card">
                <strong>
                  Siguiente acción
                </strong>

                <p>
                  Al confirmar, HVDigital quedará listo para
                  continuar con la designación del personal
                  calificado.
                </p>
              </div>
            </div>

            <aside class="info-panel">
              <div class="info-icon">
                👥
              </div>

              <h2>Personal</h2>

              <div class="small-line"></div>

              <p>
                En esta fase se crean los expedientes de las
                personas que serán calificadas durante el período.
              </p>
            </aside>
          </section>

          <section
            v-else
            class="wizard-content"
          >
            <div class="form-panel form-panel--single confirmation-panel">
              <div class="confirmation-icon">
                ✓
              </div>

              <h2>Configuración base completada</h2>

              <p>
                HVDigital ya tiene los datos mínimos para
                iniciar el período de calificaciones.
              </p>

              <div class="confirmation-summary">
                <article>
                  <span>Calificador directo</span>

                  <strong>
                    {{ nombreCalificadorVisual }}
                  </strong>
                </article>

                <article>
                  <span>Unidad</span>

                  <strong>
                    {{
                      calificador.unidadNombre ||
                      'Sin unidad'
                    }}
                  </strong>
                </article>

                <article>
                  <span>Período</span>

                  <strong>
                    {{ periodoVisual }}
                  </strong>
                </article>
              </div>
            </div>

            <aside class="info-panel">
              <div class="info-icon">
                🛡️
              </div>

              <h2>Confirmación</h2>

              <div class="small-line"></div>

              <p>
                Después de esta configuración, al abrir el sistema
                se ingresará directamente al panel principal.
              </p>
            </aside>
          </section>
        </template>

        <footer
          v-if="!cargando"
          class="wizard-actions"
        >
          <button
            v-if="paso > 1"
            class="secondary-action"
            type="button"
            :disabled="guardando"
            @click="volver"
          >
            Volver
          </button>

          <button
            v-if="paso === 1"
            class="secondary-action"
            type="button"
            :disabled="guardando"
            @click="
              guardarPasoCalificador(false)
            "
          >
            <span>▤</span>
            Guardar borrador
          </button>

          <button
            v-if="paso === 2"
            class="secondary-action"
            type="button"
            :disabled="guardando"
            @click="
              guardarPasoPeriodo(false)
            "
          >
            <span>▤</span>
            Guardar borrador
          </button>

          <button
            v-if="paso === 1"
            class="primary-action"
            type="button"
            :disabled="guardando"
            @click="
              guardarPasoCalificador(true)
            "
          >
            <span>→</span>
            Continuar
          </button>

          <button
            v-else-if="paso === 2"
            class="primary-action"
            type="button"
            :disabled="guardando"
            @click="
              guardarPasoPeriodo(true)
            "
          >
            <span>→</span>
            Continuar
          </button>

          <button
            v-else-if="paso === 3"
            class="primary-action"
            type="button"
            :disabled="guardando"
            @click="confirmarPersonal"
          >
            <span>→</span>
            Continuar
          </button>

          <button
            v-else
            class="primary-action"
            type="button"
            @click="recargarAplicacion" 
          >
            <span>→</span>
            Ir al panel principal
          </button>
        </footer>
      </section>
    </section>
  </main>
</template>

<style scoped>
.setup-page {
  min-height: 100vh;
  padding: 76px 88px 58px;
  box-sizing: border-box;
  color: #101828;
  background:
    radial-gradient(
      circle at 12% 0%,
      rgba(37, 99, 235, 0.06),
      transparent 28%
    ),
    linear-gradient(180deg, #f8fbff 0%, #f5f7fb 100%);
}

.setup-shell {
  max-width: 1440px;
  margin: 0 auto;
}

.setup-title {
  margin-bottom: 34px;
}

.setup-title h1 {
  margin: 0;
  color: #0f172a;
  font-size: 42px;
  line-height: 1.08;
  letter-spacing: -0.045em;
}

.setup-title p {
  margin: 12px 0 0;
  color: #65718f;
  font-size: 18px;
}

.wizard-card {
  padding: 42px 48px 28px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #dce4f1;
  border-radius: 12px;
  box-shadow: 0 18px 48px rgba(31, 42, 68, 0.05);
}

.wizard-steps {
  margin: 0 auto 34px;
  display: grid;
  grid-template-columns:
    auto minmax(80px, 1fr)
    auto minmax(80px, 1fr)
    auto minmax(80px, 1fr)
    auto;
  gap: 18px;
  align-items: center;
  max-width: 1160px;
}

.step-item {
  display: inline-flex;
  gap: 13px;
  align-items: center;
  color: #64708a;
}

.step-item span {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: #101828;
  background: #eef2f8;
  border-radius: 999px;
  font-weight: 800;
}

.step-item strong {
  white-space: nowrap;
  font-size: 15px;
  font-weight: 700;
}

.step-item--active {
  color: #0d54d4;
}

.step-item--active span,
.step-item--done span {
  color: white;
  background: #0d54d4;
  box-shadow: 0 10px 24px rgba(13, 84, 212, 0.18);
}

.step-line {
  height: 1px;
  background: #d7dfeb;
}

.step-line--done {
  background: #7aa5ef;
}

.notice {
  margin-bottom: 20px;
  padding: 13px 16px;
  border-radius: 10px;
  font-weight: 650;
}

.notice--error {
  color: #b4232d;
  background: #fff0f1;
  border: 1px solid #facdd0;
}

.notice--success {
  color: #11834f;
  background: #e7f7ef;
  border: 1px solid #c8ecd9;
}

.loading-panel {
  min-height: 380px;
  display: grid;
  place-items: center;
  color: #65718f;
}

.wizard-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  gap: 38px;
  align-items: stretch;
}

.form-panel,
.info-panel {
  border: 1px solid #dce4f1;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
}

.form-panel {
  min-height: 380px;
  padding: 32px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px 28px;
}

.form-panel--single {
  grid-template-columns: 1fr;
  align-content: start;
}

.info-panel {
  padding: 34px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.info-icon {
  width: 84px;
  height: 84px;
  margin-bottom: 26px;
  display: grid;
  place-items: center;
  color: #0d54d4;
  background: #eef3ff;
  border-radius: 999px;
  font-size: 38px;
}

.info-panel h2 {
  margin: 0;
  color: #101828;
  font-size: 21px;
}

.small-line {
  width: 24px;
  height: 1px;
  margin: 20px 0 18px;
  background: #b9c4d6;
}

.info-panel p {
  margin: 0 0 18px;
  color: #65718f;
  font-size: 16px;
  line-height: 1.7;
}

.identity-card {
  width: 100%;
  margin-top: auto;
  padding: 14px 16px;
  display: grid;
  gap: 5px;
  background: #f8fbff;
  border: 1px solid #dce4f1;
  border-radius: 10px;
}

.identity-card strong {
  color: #101828;
}

.identity-card span {
  color: #65718f;
  font-size: 13px;
}

.field {
  display: grid;
  gap: 9px;
}

.field label {
  color: #56627d;
  font-size: 14px;
  font-weight: 700;
}

.control {
  min-height: 50px;
  display: grid;
  grid-template-columns: 36px 1fr;
  align-items: center;
  background: #ffffff;
  border: 1px solid #d7dfeb;
  border-radius: 9px;
  box-shadow: 0 8px 20px rgba(31, 42, 68, 0.03);
}

.control:focus-within {
  border-color: #7aa5ef;
  box-shadow:
    0 0 0 4px rgba(13, 84, 212, 0.09),
    0 8px 20px rgba(31, 42, 68, 0.04);
}

.control-icon {
  display: grid;
  place-items: center;
  color: #38517a;
  font-size: 19px;
}

.control input,
.control select {
  width: 100%;
  min-height: 48px;
  padding: 0 14px 0 0;
  color: #1f2a44;
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
}

.control select {
  appearance: auto;
}

.period-heading h2,
.confirmation-panel h2 {
  margin: 0 0 10px;
  font-size: 25px;
}

.period-heading p,
.confirmation-panel p {
  max-width: 720px;
  margin: 0;
  color: #65718f;
  font-size: 16px;
  line-height: 1.6;
}

.field--large {
  max-width: 360px;
}

.period-preview,
.next-card,
.confirmation-summary {
  padding: 20px;
  display: grid;
  gap: 8px;
  background: #f8fbff;
  border: 1px solid #dce4f1;
  border-radius: 12px;
}

.period-preview span,
.confirmation-summary span {
  color: #65718f;
  font-size: 13px;
  font-weight: 700;
}

.period-preview strong {
  color: #0d54d4;
  font-size: 32px;
}

.period-preview p,
.next-card p {
  margin: 0;
  color: #65718f;
}

.vigencias {
  display: grid;
  gap: 12px;
}

.vigencias article {
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  background: #ffffff;
  border: 1px solid #dce4f1;
  border-radius: 10px;
}

.vigencias article strong {
  color: #101828;
}

.vigencias article span {
  color: #65718f;
}

.next-card strong {
  color: #0d54d4;
}

.confirmation-panel {
  justify-items: center;
  text-align: center;
}

.confirmation-icon {
  width: 86px;
  height: 86px;
  display: grid;
  place-items: center;
  color: #11834f;
  background: #e7f7ef;
  border: 1px solid #c8ecd9;
  border-radius: 999px;
  font-size: 44px;
  font-weight: 900;
}

.confirmation-summary {
  width: min(620px, 100%);
  margin-top: 16px;
  text-align: left;
}

.confirmation-summary article {
  padding: 12px 0;
  display: grid;
  gap: 5px;
  border-bottom: 1px solid #dce4f1;
}

.confirmation-summary article:last-child {
  border-bottom: 0;
}

.confirmation-summary strong {
  color: #101828;
}

.wizard-actions {
  margin-top: 34px;
  padding-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 18px;
  border-top: 1px solid #dce4f1;
}

.primary-action,
.secondary-action {
  min-height: 50px;
  min-width: 190px;
  padding: 0 24px;
  display: inline-flex;
  gap: 11px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font: inherit;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
}

.primary-action {
  color: white;
  background: linear-gradient(180deg, #1f6ae5 0%, #0d54d4 100%);
  border: 1px solid #0d54d4;
  box-shadow: 0 12px 24px rgba(13, 84, 212, 0.16);
}

.secondary-action {
  color: #0d54d4;
  background: #ffffff;
  border: 1px solid #a9c2ee;
}

.primary-action:disabled,
.secondary-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 1180px) {
  .setup-page {
    padding: 44px 28px;
  }

  .wizard-content {
    grid-template-columns: 1fr;
  }

  .wizard-steps {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .step-line {
    display: none;
  }
}

@media (max-width: 760px) {
  .setup-title h1 {
    font-size: 32px;
  }

  .wizard-card {
    padding: 24px;
  }

  .form-panel {
    grid-template-columns: 1fr;
    padding: 22px;
  }

  .wizard-actions {
    flex-direction: column;
  }

  .primary-action,
  .secondary-action {
    width: 100%;
  }

  .vigencias article {
    flex-direction: column;
  }
}
</style>
