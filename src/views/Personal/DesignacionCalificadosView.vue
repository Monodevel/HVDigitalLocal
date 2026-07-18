<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'

import {
  crearPersonaCalificada,
  designarPersona,
  listarPersonasDisponibles,
} from '../../services/designaciones'
import { obtenerEstadoConfiguracionInicial } from '../../services/configuracionInicial'
import {
  listarCalidadesPersonal,
  listarGradosCalificables,
} from '../../services/grados'
import type {
  PersonaDisponible,
  TipoVinculoPersona,
} from '../../types/designaciones'
import type { CalidadPersonal, Grado } from '../../types/grados'

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')
const modo = ref<'EXISTENTE' | 'NUEVA'>('NUEVA')
const personas = ref<PersonaDisponible[]>([])
const grados = ref<Grado[]>([])
const calidades = ref<CalidadPersonal[]>([])
const personaSeleccionadaId = ref<number | null>(null)
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

const opcionesPersonas = computed(() =>
  personas.value.map(persona => ({
    label: persona.etiqueta,
    value: persona.id,
  })),
)

const opcionesGrados = computed(() =>
  grados.value.map(grado => ({
    label: `${grado.abreviatura} — ${grado.nombre}`,
    value: grado.id,
  })),
)

const opcionesCalidades = computed(() =>
  calidades.value.map(calidad => ({
    label: `${calidad.abreviatura} — ${calidad.nombre}`,
    value: calidad.id,
  })),
)

async function inicializar(): Promise<void> {
  cargando.value = true
  error.value = ''

  try {
    const [
      estado,
      personasResultado,
      gradosResultado,
      calidadesResultado,
    ] = await Promise.all([
      obtenerEstadoConfiguracionInicial(),
      listarPersonasDisponibles(),
      listarGradosCalificables(),
      listarCalidadesPersonal(),
    ])

    personas.value = personasResultado
    grados.value = gradosResultado
    calidades.value = calidadesResultado
    unidadPredeterminada.value = estado.unidad_nombre ?? ''
    formulario.unidadNombre = unidadPredeterminada.value
    personaSeleccionadaId.value = personas.value[0]?.id ?? null
  } catch (excepcion) {
    error.value = excepcion instanceof Error
      ? excepcion.message
      : String(excepcion)
  } finally {
    cargando.value = false
  }
}

async function recargarPersonas(): Promise<void> {
  error.value = ''

  try {
    personas.value = await listarPersonasDisponibles()
    personaSeleccionadaId.value = personas.value[0]?.id ?? null
  } catch (excepcion) {
    error.value = excepcion instanceof Error
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
  formulario.unidadNombre = unidadPredeterminada.value
  mensaje.value = ''
  error.value = ''
}

function cambiarModo(nuevoModo: 'EXISTENTE' | 'NUEVA'): void {
  modo.value = nuevoModo
  error.value = ''
  mensaje.value = ''

  if (nuevoModo === 'EXISTENTE' && !personaSeleccionadaId.value) {
    personaSeleccionadaId.value = personas.value[0]?.id ?? null
  }
}

async function guardar(): Promise<void> {
  guardando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    let personaId: number

    if (modo.value === 'NUEVA') {
      personaId = await crearPersonaCalificada({
        run: formulario.run,
        nombres: formulario.nombres,
        apellidoPaterno: formulario.apellidoPaterno,
        apellidoMaterno: formulario.apellidoMaterno,
        tipoVinculo: formulario.tipoVinculo,
        gradoId: formulario.gradoId ?? undefined,
        calidadPersonalId: formulario.calidadPersonalId ?? undefined,
      })
    } else {
      if (!personaSeleccionadaId.value) {
        throw new Error('Debe seleccionar una persona existente.')
      }

      personaId = personaSeleccionadaId.value
    }

    const resultado = await designarPersona({
      personaId,
      unidadNombre: formulario.unidadNombre,
      puesto: formulario.puesto,
    })

    limpiarFormulario()
    mensaje.value =
      `Expediente N.º ${resultado.expedienteId} creado con ` +
      `${resultado.instrumentosCreados} instrumentos.`

    await recargarPersonas()
  } catch (excepcion) {
    error.value = excepcion instanceof Error
      ? excepcion.message
      : String(excepcion)
  } finally {
    guardando.value = false
  }
}

onMounted(inicializar)
</script>

<template>
  <section class="hv-content hv-qualified-create">
    <header class="hv-page-heading hv-page-heading-compact">
      <div>
        <span class="hv-eyebrow">Gestión de personal</span>
        <h1>Nuevo calificado</h1>
        <p>
          Registre una persona o seleccione una existente para crear
          su expediente en el período activo.
        </p>
      </div>
    </header>

    <Message v-if="error" severity="error" :closable="false">
      {{ error }}
    </Message>

    <Message v-if="mensaje" severity="success" :closable="false">
      {{ mensaje }}
    </Message>

    <Card class="hv-qualified-create__card">
      <template #title>Nueva designación</template>
      <template #subtitle>
        Complete los antecedentes necesarios para generar el expediente.
      </template>

      <template #content>
        <form class="hv-qualified-form" @submit.prevent="guardar">
          <div class="hv-qualified-form__mode">
            <Button
              label="Nueva persona"
              icon="pi pi-user-plus"
              type="button"
              :outlined="modo !== 'NUEVA'"
              :severity="modo === 'NUEVA' ? undefined : 'secondary'"
              @click="cambiarModo('NUEVA')"
            />
            <Button
              label="Persona existente"
              icon="pi pi-users"
              type="button"
              :outlined="modo !== 'EXISTENTE'"
              :severity="modo === 'EXISTENTE' ? undefined : 'secondary'"
              @click="cambiarModo('EXISTENTE')"
            />
          </div>

          <template v-if="modo === 'NUEVA'">
            <div class="hv-qualified-form__section-title">
              <span>Identificación</span>
              <small>Antecedentes personales del calificado.</small>
            </div>

            <div class="hv-qualified-form__grid">
              <label>
                <span>RUN *</span>
                <InputText
                  v-model.trim="formulario.run"
                  placeholder="12.345.678-9"
                  fluid
                />
              </label>
              <label>
                <span>Nombres *</span>
                <InputText
                  v-model.trim="formulario.nombres"
                  placeholder="Nombres"
                  fluid
                />
              </label>
              <label>
                <span>Apellido paterno *</span>
                <InputText
                  v-model.trim="formulario.apellidoPaterno"
                  placeholder="Apellido paterno"
                  fluid
                />
              </label>
              <label>
                <span>Apellido materno</span>
                <InputText
                  v-model.trim="formulario.apellidoMaterno"
                  placeholder="Apellido materno"
                  fluid
                />
              </label>
            </div>

            <div class="hv-qualified-form__section-title">
              <span>Clasificación institucional</span>
              <small>Seleccione grado o calidad de personal.</small>
            </div>

            <div class="hv-qualified-form__classification">
              <div class="hv-qualified-form__mode hv-qualified-form__mode--compact">
                <Button
                  label="Grado"
                  size="small"
                  type="button"
                  :outlined="formulario.tipoVinculo !== 'GRADO'"
                  :severity="formulario.tipoVinculo === 'GRADO' ? undefined : 'secondary'"
                  @click="formulario.tipoVinculo = 'GRADO'"
                />
                <Button
                  label="Calidad"
                  size="small"
                  type="button"
                  :outlined="formulario.tipoVinculo !== 'CALIDAD'"
                  :severity="formulario.tipoVinculo === 'CALIDAD' ? undefined : 'secondary'"
                  @click="formulario.tipoVinculo = 'CALIDAD'"
                />
              </div>

              <label v-if="formulario.tipoVinculo === 'GRADO'">
                <span>Grado *</span>
                <Select
                  v-model="formulario.gradoId"
                  :options="opcionesGrados"
                  option-label="label"
                  option-value="value"
                  placeholder="Seleccione un grado"
                  filter
                  fluid
                />
              </label>

              <label v-else>
                <span>Calidad *</span>
                <Select
                  v-model="formulario.calidadPersonalId"
                  :options="opcionesCalidades"
                  option-label="label"
                  option-value="value"
                  placeholder="Seleccione una calidad"
                  filter
                  fluid
                />
              </label>
            </div>
          </template>

          <label v-else>
            <span>Persona existente *</span>
            <Select
              v-model="personaSeleccionadaId"
              :options="opcionesPersonas"
              option-label="label"
              option-value="value"
              placeholder="Seleccione una persona"
              filter
              fluid
            />
          </label>

          <div class="hv-qualified-form__section-title">
            <span>Designación</span>
            <small>Unidad y función que tendrá durante el período.</small>
          </div>

          <div class="hv-qualified-form__grid">
            <label>
              <span>Unidad *</span>
              <InputText
                v-model.trim="formulario.unidadNombre"
                placeholder="Unidad o repartición"
                fluid
              />
            </label>
            <label>
              <span>Puesto o función *</span>
              <InputText
                v-model.trim="formulario.puesto"
                placeholder="Puesto o función"
                fluid
              />
            </label>
          </div>

          <div class="hv-qualified-form__actions">
            <Button
              label="Limpiar"
              icon="pi pi-eraser"
              severity="secondary"
              outlined
              type="button"
              :disabled="guardando"
              @click="limpiarFormulario"
            />
            <Button
              label="Designar y crear expediente"
              icon="pi pi-arrow-right"
              icon-pos="right"
              type="submit"
              :loading="guardando"
              :disabled="cargando"
            />
          </div>
        </form>
      </template>
    </Card>
  </section>
</template>

<style scoped>
.hv-qualified-create {
  display: grid;
  gap: 1rem;
}

.hv-qualified-create__card {
  width: 100%;
  max-width: 980px;
}

.hv-qualified-form {
  display: grid;
  gap: 1.15rem;
}

.hv-qualified-form__mode,
.hv-qualified-form__actions {
  display: flex;
  align-items: center;
  gap: .65rem;
  flex-wrap: wrap;
}

.hv-qualified-form__mode {
  padding: .35rem;
  border: 1px solid var(--hv-border);
  border-radius: .75rem;
  background: var(--hv-surface-soft);
}

.hv-qualified-form__mode > :deep(.p-button) {
  flex: 1;
}

.hv-qualified-form__mode--compact {
  width: fit-content;
}

.hv-qualified-form__section-title {
  padding-top: .75rem;
  border-top: 1px solid var(--hv-border);
}

.hv-qualified-form__section-title span {
  display: block;
  font-weight: 700;
}

.hv-qualified-form__section-title small {
  display: block;
  margin-top: .15rem;
  color: var(--hv-muted);
}

.hv-qualified-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .9rem 1rem;
}

.hv-qualified-form label,
.hv-qualified-form__classification {
  display: grid;
  gap: .4rem;
}

.hv-qualified-form label > span {
  font-size: .8rem;
  font-weight: 700;
}

.hv-qualified-form__classification {
  padding: 1rem;
  border: 1px solid var(--hv-border);
  border-radius: .75rem;
  background: var(--hv-surface-soft);
}

.hv-qualified-form__actions {
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--hv-border);
}

@media (max-width: 700px) {
  .hv-qualified-form__grid {
    grid-template-columns: 1fr;
  }

  .hv-qualified-form__actions {
    width: 100%;
  }
}
</style>
