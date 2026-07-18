<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
} from 'vue'

import {
  crearPersonaCalificada,
  designarPersona,
  listarDesignacionesPeriodoActivo,
  listarPersonasDisponibles,
} from '../../services/designaciones'

import {
  obtenerEstadoConfiguracionInicial,
} from '../../services/configuracionInicial'

import {
  listarCalidadesPersonal,
  listarGradosCalificables,
} from '../../services/grados'

import type {
  DesignacionPeriodoActivo,
  PersonaDisponible,
  TipoVinculoPersona,
} from '../../types/designaciones'

import type {
  CalidadPersonal,
  Grado,
} from '../../types/grados'

const emit = defineEmits<{
  abrirExpediente: [expedienteId: number]
}>()

const cargando = ref(true)
const guardando = ref(false)

const error = ref('')
const mensaje = ref('')

const modo =
  ref<'EXISTENTE' | 'NUEVA'>('NUEVA')

const personas =
  ref<PersonaDisponible[]>([])

const designaciones =
  ref<DesignacionPeriodoActivo[]>([])

const grados =
  ref<Grado[]>([])

const calidades =
  ref<CalidadPersonal[]>([])

const personaSeleccionadaId =
  ref<number | null>(null)

const unidadPredeterminada = ref('')

const formulario = reactive({
  run: '',
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  tipoVinculo: 'GRADO' as TipoVinculoPersona,
  gradoId: null as number | null,
  calidadPersonalId: null as number | null,
  unidadNombre: '',
  puesto: '',
})

const totalDesignados = computed(
  () => designaciones.value.length,
)

const tituloAccion = computed(() => {
  return modo.value === 'NUEVA'
    ? 'Designar nueva persona'
    : 'Designar persona existente'
})

async function inicializar(): Promise<void> {
  cargando.value = true
  error.value = ''

  try {
    const [
      estado,
      personasResultado,
      designacionesResultado,
      gradosResultado,
      calidadesResultado,
    ] = await Promise.all([
      obtenerEstadoConfiguracionInicial(),
      listarPersonasDisponibles(),
      listarDesignacionesPeriodoActivo(),
      listarGradosCalificables(),
      listarCalidadesPersonal(),
    ])

    personas.value = personasResultado
    designaciones.value =
      designacionesResultado
    grados.value = gradosResultado
    calidades.value = calidadesResultado

    unidadPredeterminada.value =
      estado.unidad_nombre ?? ''

    formulario.unidadNombre =
      unidadPredeterminada.value

    personaSeleccionadaId.value =
      personas.value[0]?.id ?? null
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  } finally {
    cargando.value = false
  }
}

async function recargar(): Promise<void> {
  error.value = ''

  try {
    const [
      personasResultado,
      designacionesResultado,
    ] = await Promise.all([
      listarPersonasDisponibles(),
      listarDesignacionesPeriodoActivo(),
    ])

    personas.value = personasResultado
    designaciones.value =
      designacionesResultado

    personaSeleccionadaId.value =
      personasResultado[0]?.id ?? null
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  }
}

function limpiarFormulario(): void {
  formulario.run = ''
  formulario.nombres = ''
  formulario.apellidoPaterno = ''
  formulario.apellidoMaterno = ''
  formulario.tipoVinculo = 'GRADO'
  formulario.gradoId = null
  formulario.calidadPersonalId = null
  formulario.puesto = ''
  formulario.unidadNombre =
    unidadPredeterminada.value
}

function cambiarModo(
  nuevoModo: 'EXISTENTE' | 'NUEVA',
): void {
  modo.value = nuevoModo
  error.value = ''
  mensaje.value = ''

  if (
    nuevoModo === 'EXISTENTE' &&
    !personaSeleccionadaId.value
  ) {
    personaSeleccionadaId.value =
      personas.value[0]?.id ?? null
  }
}

async function guardar(): Promise<void> {
  guardando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    let personaId: number

    if (modo.value === 'NUEVA') {
      personaId =
        await crearPersonaCalificada({
          run: formulario.run,
          nombres: formulario.nombres,
          apellidoPaterno:
            formulario.apellidoPaterno,
          apellidoMaterno:
            formulario.apellidoMaterno,
          tipoVinculo:
            formulario.tipoVinculo,
          gradoId:
            formulario.gradoId ??
            undefined,
          calidadPersonalId:
            formulario.calidadPersonalId ??
            undefined,
        })
    } else {
      if (!personaSeleccionadaId.value) {
        throw new Error(
          'Debe seleccionar una persona existente.',
        )
      }

      personaId =
        personaSeleccionadaId.value
    }

    const resultado =
      await designarPersona({
        personaId,
        unidadNombre:
          formulario.unidadNombre,
        puesto: formulario.puesto,
      })

    mensaje.value =
      `Expediente N.º ${resultado.expedienteId} ` +
      `creado con ${resultado.instrumentosCreados} ` +
      'instrumentos.'

    limpiarFormulario()
    await recargar()
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  } finally {
    guardando.value = false
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

function claseEstado(
  estado: string,
): string {
  const valor =
    estado.trim().toUpperCase()

  if (
    valor === 'COMPLETADO' ||
    valor === 'CERRADO'
  ) {
    return 'success'
  }

  if (
    valor === 'BORRADOR' ||
    valor === 'PENDIENTE' ||
    valor === 'EN_ELABORACION'
  ) {
    return 'warning'
  }

  if (
    valor === 'NO_INICIADO' ||
    valor === 'ABIERTO'
  ) {
    return 'danger'
  }

  return 'neutral'
}

function abrirExpedienteDesignado(
  item: DesignacionPeriodoActivo,
): void {
  if (!item.expediente_id) {
    return
  }

  emit(
    'abrirExpediente',
    item.expediente_id,
  )
}

onMounted(inicializar)
</script>


<template>
  <main class="people-page">
    <section class="people-shell">
      <header class="people-header">
        <div>
          <h1>Personal calificado</h1>

          <p>
            Agregue personas y genere automáticamente sus
            expedientes de calificación.
          </p>
        </div>

        <div class="header-actions">
          <button
            class="primary-action"
            type="button"
            :disabled="guardando || cargando"
            @click="guardar"
          >
            <span>＋</span>
            {{
              guardando
                ? 'Creando expediente…'
                : tituloAccion
            }}
          </button>

          <button
            class="icon-action"
            type="button"
            title="Actualizar listado"
            :disabled="cargando"
            @click="recargar"
          >
            ↻
          </button>
        </div>
      </header>

      <section class="summary-grid">
        <article class="summary-card summary-card--blue">
          <div class="summary-icon">
            ▣
          </div>

          <div>
            <span>Período activo</span>

            <strong>
              Configuración vigente
            </strong>

            <small>
              Base institucional
            </small>
          </div>
        </article>

        <article class="summary-card summary-card--green">
          <div class="summary-icon">
            ▥
          </div>

          <div>
            <span>Unidad predeterminada</span>

            <strong>
              {{
                unidadPredeterminada ||
                'Sin configurar'
              }}
            </strong>

            <small>
              Aplicada a nuevas designaciones
            </small>
          </div>
        </article>

        <article class="summary-card summary-card--amber">
          <div class="summary-icon">
            ☑
          </div>

          <div>
            <span>Personas designadas</span>

            <strong>
              {{ totalDesignados }}
            </strong>

            <small>
              Expedientes creados
            </small>
          </div>
        </article>
      </section>

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
        Cargando personal…
      </section>

      <section
        v-else
        class="people-layout"
      >
        <article class="form-card">
          <header class="panel-header">
            <div>
              <h2>Nueva designación</h2>

              <p>
                Seleccione una persona existente o registre una
                nueva para crear su expediente.
              </p>
            </div>

            <button
              class="soft-action"
              type="button"
              @click="limpiarFormulario"
            >
              Limpiar
            </button>
          </header>

          <form
            class="designation-form"
            @submit.prevent="guardar"
          >
            <div class="mode-selector">
              <button
                type="button"
                :class="{
                  active:
                    modo === 'NUEVA',
                }"
                @click="
                  cambiarModo('NUEVA')
                "
              >
                Nueva persona
              </button>

              <button
                type="button"
                :class="{
                  active:
                    modo === 'EXISTENTE',
                }"
                @click="
                  cambiarModo('EXISTENTE')
                "
              >
                Persona existente
              </button>
            </div>

            <template v-if="modo === 'NUEVA'">
              <section class="form-grid">
                <label class="field">
                  <span>RUN *</span>

                  <div class="control">
                    <em>▣</em>

                    <input
                      v-model.trim="formulario.run"
                      type="text"
                      autocomplete="off"
                      placeholder="12.345.678-9"
                    >
                  </div>
                </label>

                <label class="field">
                  <span>Nombres *</span>

                  <div class="control">
                    <em>♙</em>

                    <input
                      v-model.trim="
                        formulario.nombres
                      "
                      type="text"
                      autocomplete="off"
                      placeholder="Juan Carlos"
                    >
                  </div>
                </label>

                <label class="field">
                  <span>Apellido paterno *</span>

                  <div class="control">
                    <em>♙</em>

                    <input
                      v-model.trim="
                        formulario.apellidoPaterno
                      "
                      type="text"
                      autocomplete="off"
                      placeholder="Pérez"
                    >
                  </div>
                </label>

                <label class="field">
                  <span>Apellido materno</span>

                  <div class="control">
                    <em>♙</em>

                    <input
                      v-model.trim="
                        formulario.apellidoMaterno
                      "
                      type="text"
                      autocomplete="off"
                      placeholder="Soto"
                    >
                  </div>
                </label>
              </section>

              <section class="classification-box">
                <div class="classification-heading">
                  <div>
                    <h3>Clasificación</h3>

                    <p>
                      Indique si la persona se vincula mediante grado
                      o calidad.
                    </p>
                  </div>

                  <div class="mini-selector">
                    <button
                      type="button"
                      :class="{
                        active:
                          formulario.tipoVinculo ===
                          'GRADO',
                      }"
                      @click="
                        formulario.tipoVinculo =
                          'GRADO'
                      "
                    >
                      Grado
                    </button>

                    <button
                      type="button"
                      :class="{
                        active:
                          formulario.tipoVinculo ===
                          'CALIDAD',
                      }"
                      @click="
                        formulario.tipoVinculo =
                          'CALIDAD'
                      "
                    >
                      Calidad
                    </button>
                  </div>
                </div>

                <label
                  v-if="
                    formulario.tipoVinculo ===
                    'GRADO'
                  "
                  class="field"
                >
                  <span>Grado *</span>

                  <div class="control control--select">
                    <em>▥</em>

                    <select
                      v-model.number="
                        formulario.gradoId
                      "
                    >
                      <option :value="null">
                        Seleccione una opción
                      </option>

                      <option
                        v-for="grado in grados"
                        :key="grado.id"
                        :value="grado.id"
                      >
                        {{ grado.abreviatura }}
                        —
                        {{ grado.nombre }}
                      </option>
                    </select>
                  </div>
                </label>

                <label
                  v-else
                  class="field"
                >
                  <span>Calidad *</span>

                  <div class="control control--select">
                    <em>▥</em>

                    <select
                      v-model.number="
                        formulario.calidadPersonalId
                      "
                    >
                      <option :value="null">
                        Seleccione una opción
                      </option>

                      <option
                        v-for="calidad in calidades"
                        :key="calidad.id"
                        :value="calidad.id"
                      >
                        {{ calidad.abreviatura }}
                        —
                        {{ calidad.nombre }}
                      </option>
                    </select>
                  </div>
                </label>
              </section>
            </template>

            <label
              v-else
              class="field field--full"
            >
              <span>Persona existente *</span>

              <div class="control control--select">
                <em>♙</em>

                <select
                  v-model.number="
                    personaSeleccionadaId
                  "
                >
                  <option :value="null">
                    Seleccione una persona…
                  </option>

                  <option
                    v-for="persona in personas"
                    :key="persona.id"
                    :value="persona.id"
                  >
                    {{ persona.etiqueta }}
                  </option>
                </select>
              </div>
            </label>

            <section class="form-grid">
              <label class="field">
                <span>Unidad *</span>

                <div class="control">
                  <em>▥</em>

                  <input
                    v-model.trim="
                      formulario.unidadNombre
                    "
                    type="text"
                    placeholder="Escuadrilla de Servicios Generales"
                  >
                </div>
              </label>

              <label class="field">
                <span>Puesto o función *</span>

                <div class="control">
                  <em>▦</em>

                  <input
                    v-model.trim="
                      formulario.puesto
                    "
                    type="text"
                    placeholder="Personal de Cuadro Permanente"
                  >
                </div>
              </label>
            </section>

            <footer class="form-actions">
              <button
                class="secondary-action"
                type="button"
                :disabled="guardando"
                @click="limpiarFormulario"
              >
                Guardar borrador
              </button>

              <button
                class="primary-action form-primary"
                type="submit"
                :disabled="guardando"
              >
                <span>→</span>
                {{
                  guardando
                    ? 'Creando expediente…'
                    : 'Designar y crear expediente'
                }}
              </button>
            </footer>
          </form>
        </article>

        <article class="list-card">
          <header class="panel-header list-header">
            <div>
              <h2>Calificados del período</h2>

              <p>
                {{ totalDesignados }}
                persona(s) designada(s). Presione una tarjeta
                para abrir su expediente.
              </p>
            </div>

            <button
              class="soft-action refresh-soft"
              type="button"
              @click="recargar"
            >
              <span>↻</span>
              Actualizar
            </button>
          </header>

          <section
            v-if="designaciones.length === 0"
            class="empty-state"
          >
            <div class="empty-icon">
              ▣
            </div>

            <strong>
              Todavía no existen personas designadas
            </strong>

            <span>
              Utilice el formulario para generar el primer
              expediente del período.
            </span>
          </section>

          <div
            v-else
            class="designation-list"
          >
            <button
              v-for="item in designaciones"
              :key="item.designacion_id"
              class="designation-item"
              type="button"
              :title="
                `Abrir expediente de ${item.nombre_completo}`
              "
              @click="
                abrirExpedienteDesignado(item)
              "
            >
              <div class="person-identity">
                <div class="person-avatar">
                  {{
                    item.nombre_completo
                      .charAt(0)
                      .toUpperCase()
                  }}
                </div>

                <div>
                  <strong>
                    {{
                      item.grado_calidad_abreviatura
                    }}
                    {{ item.nombre_completo }}
                  </strong>

                  <span>
                    RUN {{ item.run }}
                  </span>
                </div>
              </div>

              <div class="designation-data">
                <span>Categoría</span>

                <strong>
                  {{ item.categoria_nombre }}
                </strong>
              </div>

              <div class="designation-data">
                <span>Unidad y función</span>

                <strong>
                  {{ item.unidad_nombre }}
                </strong>

                <small>
                  {{ item.puesto }}
                </small>
              </div>

              <div class="designation-status">
                <span>Estado</span>

                <strong
                  class="status-pill"
                  :class="
                    `status-pill--${claseEstado(
                      item.expediente_estado,
                    )}`
                  "
                >
                  {{
                    etiquetaEstado(
                      item.expediente_estado,
                    )
                  }}
                </strong>

                <small class="open-hint">
                  Abrir expediente
                  <b>›</b>
                </small>
              </div>
            </button>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>

<style scoped>
.people-page {
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

.people-shell {
  max-width: 1460px;
  margin: 0 auto;
}

.people-header {
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  gap: 22px;
  align-items: flex-start;
}

.people-header h1 {
  margin: 0;
  color: #111827;
  font-size: 29px;
  line-height: 1.12;
  letter-spacing: -0.03em;
  font-weight: 760;
}

.people-header p {
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
.secondary-action,
.soft-action,
.icon-action,
.mode-selector button,
.mini-selector button,
.designation-item {
  font: inherit;
  cursor: pointer;
}

.primary-action {
  min-height: 36px;
  padding: 0 14px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: #155bd6;
  border: 1px solid #124fb9;
  border-radius: 7px;
  box-shadow: 0 5px 12px rgba(21, 91, 214, 0.12);
  font-size: 13px;
  font-weight: 700;
}

.primary-action:hover {
  background: #0f4fc2;
}

.primary-action span {
  font-size: 16px;
  line-height: 1;
  font-weight: 500;
}

.form-primary {
  min-height: 36px;
  padding-inline: 14px;
  font-size: 13px;
}

.icon-action {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: #111827;
  background: #ffffff;
  border: 1px solid #d7deea;
  border-radius: 7px;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.025);
  font-size: 17px;
}

.icon-action:hover,
.soft-action:hover,
.secondary-action:hover {
  border-color: #9fb4d8;
  background: #f8fbff;
}

.primary-action:disabled,
.secondary-action:disabled,
.icon-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.summary-grid {
  margin-bottom: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card,
.form-card,
.list-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #dbe3ef;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.025);
}

.summary-card {
  min-height: 78px;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 14px;
  align-items: center;
  border-radius: 10px;
}

.summary-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 18px;
}

.summary-card span,
.summary-card small {
  display: block;
}

.summary-card span {
  color: #667085;
  font-size: 12px;
  font-weight: 650;
}

.summary-card strong {
  margin-top: 3px;
  display: block;
  overflow: hidden;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  letter-spacing: -0.015em;
  font-weight: 740;
}

.summary-card small {
  margin-top: 3px;
  font-size: 12px;
  font-weight: 700;
}

.summary-card--blue .summary-icon {
  color: #155bd6;
  background: #eef4ff;
  border: 1px solid #d9e6ff;
}

.summary-card--blue small {
  color: #155bd6;
}

.summary-card--green .summary-icon {
  color: #0f8f5a;
  background: #eaf7f0;
  border: 1px solid #ccebd9;
}

.summary-card--green small {
  color: #0f8f5a;
}

.summary-card--amber .summary-icon {
  color: #c47a00;
  background: #fff6df;
  border: 1px solid #f4dfa2;
}

.summary-card--amber small {
  color: #c47a00;
}

.notice {
  margin-bottom: 12px;
  padding: 9px 12px;
  border-radius: 7px;
  font-size: 12px;
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
  min-height: 260px;
  display: grid;
  place-items: center;
  color: #667085;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #dbe3ef;
  border-radius: 10px;
}

.people-layout {
  display: grid;
  grid-template-columns: minmax(390px, 0.74fr) minmax(600px, 1.26fr);
  gap: 14px;
  align-items: start;
}

.form-card,
.list-card {
  border-radius: 10px;
}

.form-card {
  padding: 18px;
}

.list-card {
  min-height: 405px;
  padding: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.form-card .panel-header {
  margin-bottom: 14px;
}

.list-header {
  margin-bottom: 18px;
}

.panel-header h2 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-weight: 740;
}

.panel-header p {
  max-width: 520px;
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.42;
}

.soft-action,
.secondary-action {
  min-height: 32px;
  padding: 0 11px;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  color: #155bd6;
  background: #ffffff;
  border: 1px solid #b9c9e7;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}

.refresh-soft {
  min-width: auto;
  font-size: 12px;
}

.refresh-soft span {
  font-size: 14px;
}

.designation-form {
  display: grid;
  gap: 13px;
}

.mode-selector {
  height: 36px;
  padding: 3px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #eef2f7;
  border: 1px solid #dbe3ef;
  border-radius: 7px;
}

.mode-selector button {
  color: #667085;
  background: transparent;
  border: 0;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 700;
}

.mode-selector button.active {
  color: #155bd6;
  background: #ffffff;
  box-shadow:
    inset 0 -2px 0 #155bd6,
    0 3px 8px rgba(15, 23, 42, 0.045);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px 12px;
}

.field {
  display: grid;
  gap: 5px;
}

.field--full {
  grid-column: 1 / -1;
}

.field > span {
  color: #536078;
  font-size: 11px;
  font-weight: 700;
}

.control {
  min-height: 34px;
  display: grid;
  grid-template-columns: 28px 1fr;
  align-items: center;
  background: #ffffff;
  border: 1px solid #d7deea;
  border-radius: 6px;
  box-shadow: none;
}

.control:focus-within {
  border-color: #7fa8ec;
  box-shadow: 0 0 0 3px rgba(21, 91, 214, 0.075);
}

.control em {
  display: grid;
  place-items: center;
  color: #475569;
  font-style: normal;
  font-size: 12px;
}

.control input,
.control select {
  width: 100%;
  min-height: 32px;
  padding: 0 8px 0 0;
  color: #1f2937;
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 12px;
}

.control input::placeholder {
  color: #9aa5b5;
}

.control select {
  appearance: auto;
}

.classification-box {
  padding: 12px;
  display: grid;
  gap: 10px;
  background: #fbfdff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
}

.classification-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.classification-box h3 {
  margin: 0;
  color: #111827;
  font-size: 14px;
  letter-spacing: -0.01em;
  font-weight: 740;
}

.classification-box p {
  margin: 4px 0 0;
  color: #667085;
  font-size: 11px;
  line-height: 1.4;
}

.mini-selector {
  width: 164px;
  min-width: 164px;
  height: 30px;
  padding: 2px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #eef2f7;
  border: 1px solid #dbe3ef;
  border-radius: 7px;
}

.mini-selector button {
  color: #667085;
  background: transparent;
  border: 0;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
}

.mini-selector button.active {
  color: #155bd6;
  background: #ffffff;
  box-shadow: 0 2px 7px rgba(15, 23, 42, 0.045);
}

.form-actions {
  padding-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #e2e8f0;
}

.empty-state {
  min-height: 220px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  color: #667085;
  text-align: center;
}

.empty-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  color: #155bd6;
  background: #eef4ff;
  border: 1px solid #d9e6ff;
  border-radius: 999px;
  font-size: 19px;
}

.empty-state strong {
  color: #111827;
  font-size: 14px;
}

.empty-state span {
  max-width: 340px;
  font-size: 12px;
  line-height: 1.4;
}

.designation-list {
  display: grid;
  gap: 8px;
}

.designation-item {
  width: 100%;
  min-height: 82px;
  padding: 12px;
  display: grid;
  grid-template-columns:
    42px
    minmax(150px, 1.2fr)
    minmax(110px, 0.7fr)
    minmax(140px, 0.9fr)
    minmax(112px, 0.65fr);
  gap: 12px;
  align-items: center;
  color: inherit;
  text-align: left;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.025);
  transition:
    transform 120ms ease,
    border-color 120ms ease,
    box-shadow 120ms ease,
    background-color 120ms ease;
}

.designation-item:hover {
  background: #fbfdff;
  border-color: #9fb9e6;
  box-shadow: 0 8px 18px rgba(21, 91, 214, 0.06);
  transform: translateY(-1px);
}

.designation-item:focus-visible {
  outline: 3px solid rgba(21, 91, 214, 0.16);
  outline-offset: 2px;
}

.person-identity {
  min-width: 0;
  display: contents;
}

.person-avatar {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: #155bd6;
  background: #eef4ff;
  border: 1px solid #d9e6ff;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 800;
}

.person-identity > div:last-child,
.designation-data,
.designation-status {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.person-identity > div:last-child {
  align-content: center;
}

.person-identity strong {
  overflow: hidden;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  letter-spacing: -0.005em;
  font-weight: 740;
}

.person-identity span,
.designation-data span,
.designation-status > span,
.designation-data small {
  color: #667085;
  font-size: 10.5px;
}

.designation-data,
.designation-status {
  padding-left: 12px;
  border-left: 1px solid #e2e8f0;
}

.designation-data strong {
  overflow: hidden;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 740;
}

.designation-data small {
  text-transform: uppercase;
}

.designation-status {
  justify-items: start;
}

.status-pill {
  width: fit-content;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 750;
}

.status-pill--success {
  color: #11834f;
  background: #e7f7ef;
}

.status-pill--warning {
  color: #9a6500;
  background: #fff6dc;
}

.status-pill--danger {
  color: #b4232d;
  background: #fff0f1;
}

.status-pill--neutral {
  color: #4f5d70;
  background: #eef2f8;
}

.open-hint {
  color: #155bd6;
  font-size: 11px !important;
  font-weight: 740;
}

.open-hint b {
  margin-left: 4px;
  font-size: 13px;
  line-height: 1;
}

@media (max-width: 1280px) {
  .people-page {
    padding: 24px 22px 38px;
  }

  .people-layout {
    grid-template-columns: 1fr;
  }

  .list-card {
    min-height: auto;
  }
}

@media (max-width: 960px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .designation-item {
    grid-template-columns: 42px 1fr;
  }

  .designation-data,
  .designation-status {
    padding-left: 0;
    border-left: 0;
  }
}

@media (max-width: 720px) {
  .people-header,
  .header-actions,
  .panel-header,
  .classification-heading,
  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .people-header h1 {
    font-size: 27px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .mini-selector {
    width: 100%;
    min-width: 0;
  }

  .primary-action,
  .secondary-action,
  .soft-action,
  .icon-action {
    width: 100%;
  }

  .icon-action {
    height: 34px;
  }
}
</style>
