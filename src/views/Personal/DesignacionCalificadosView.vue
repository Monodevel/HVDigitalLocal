<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

import {
  crearPersonaCalificada,
  designarPersona,
  listarDesignacionesPeriodoActivo,
  listarPersonasDisponibles,
} from '../../services/designaciones'
import { obtenerEstadoConfiguracionInicial } from '../../services/configuracionInicial'
import {
  listarCalidadesPersonal,
  listarGradosCalificables,
} from '../../services/grados'
import type {
  DesignacionPeriodoActivo,
  PersonaDisponible,
  TipoVinculoPersona,
} from '../../types/designaciones'
import type { CalidadPersonal, Grado } from '../../types/grados'

const emit = defineEmits<{
  abrirExpediente: [expedienteId: number]
}>()

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')
const modo = ref<'EXISTENTE' | 'NUEVA'>('NUEVA')
const personas = ref<PersonaDisponible[]>([])
const designaciones = ref<DesignacionPeriodoActivo[]>([])
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

const totalDesignados = computed(() => designaciones.value.length)

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
    designaciones.value = designacionesResultado
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

async function recargar(): Promise<void> {
  error.value = ''

  try {
    const [personasResultado, designacionesResultado] = await Promise.all([
      listarPersonasDisponibles(),
      listarDesignacionesPeriodoActivo(),
    ])

    personas.value = personasResultado
    designaciones.value = designacionesResultado
    personaSeleccionadaId.value = personasResultado[0]?.id ?? null
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

    mensaje.value =
      `Expediente N.º ${resultado.expedienteId} creado con ` +
      `${resultado.instrumentosCreados} instrumentos.`

    limpiarFormulario()
    mensaje.value =
      `Expediente N.º ${resultado.expedienteId} creado con ` +
      `${resultado.instrumentosCreados} instrumentos.`
    await recargar()
  } catch (excepcion) {
    error.value = excepcion instanceof Error
      ? excepcion.message
      : String(excepcion)
  } finally {
    guardando.value = false
  }
}

function etiquetaEstado(estado: string): string {
  return estado
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, letra => letra.toUpperCase())
}

function severidadEstado(
  estado: string,
): 'success' | 'warn' | 'danger' | 'secondary' {
  const valor = estado.trim().toUpperCase()

  if (valor === 'COMPLETADO' || valor === 'CERRADO') return 'success'
  if (['BORRADOR', 'PENDIENTE', 'EN_ELABORACION'].includes(valor)) return 'warn'
  if (valor === 'NO_INICIADO' || valor === 'ABIERTO') return 'danger'
  return 'secondary'
}

function abrirExpedienteDesignado(item: DesignacionPeriodoActivo): void {
  if (item.expediente_id) emit('abrirExpediente', item.expediente_id)
}

onMounted(inicializar)
</script>

<template>
  <section class="hv-content hv-qualified-create">
    <header class="hv-page-heading hv-page-heading-compact">
      <div>
        <span class="hv-eyebrow">Gestión de personal</span>
        <h1>Nuevo calificado</h1>
        <p>Registre una persona o seleccione una existente para crear su expediente del período activo.</p>
      </div>

      <div class="hv-qualified-create__header-actions">
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="cargando"
          @click="recargar"
        />
        <Button
          label="Crear expediente"
          icon="pi pi-user-plus"
          :loading="guardando"
          :disabled="cargando"
          @click="guardar"
        />
      </div>
    </header>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    <Message v-if="mensaje" severity="success" :closable="false">{{ mensaje }}</Message>

    <section class="hv-qualified-create__summary">
      <Card>
        <template #content>
          <div class="hv-qualified-create__summary-item">
            <i class="pi pi-building" />
            <div>
              <small>Unidad predeterminada</small>
              <strong>{{ unidadPredeterminada || 'Sin configurar' }}</strong>
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="hv-qualified-create__summary-item">
            <i class="pi pi-users" />
            <div>
              <small>Calificados del período</small>
              <strong>{{ totalDesignados }}</strong>
            </div>
          </div>
        </template>
      </Card>
    </section>

    <section class="hv-qualified-create__layout">
      <Card>
        <template #title>Nueva designación</template>
        <template #subtitle>Complete los antecedentes necesarios para crear el expediente.</template>
        <template #content>
          <form class="hv-qualified-form" @submit.prevent="guardar">
            <div class="hv-qualified-form__mode">
              <Button
                label="Nueva persona"
                icon="pi pi-user-plus"
                :outlined="modo !== 'NUEVA'"
                :severity="modo === 'NUEVA' ? undefined : 'secondary'"
                @click="cambiarModo('NUEVA')"
              />
              <Button
                label="Persona existente"
                icon="pi pi-users"
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
                  <InputText v-model.trim="formulario.run" placeholder="12.345.678-9" fluid />
                </label>
                <label>
                  <span>Nombres *</span>
                  <InputText v-model.trim="formulario.nombres" placeholder="Nombres" fluid />
                </label>
                <label>
                  <span>Apellido paterno *</span>
                  <InputText v-model.trim="formulario.apellidoPaterno" placeholder="Apellido paterno" fluid />
                </label>
                <label>
                  <span>Apellido materno</span>
                  <InputText v-model.trim="formulario.apellidoMaterno" placeholder="Apellido materno" fluid />
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
                    :outlined="formulario.tipoVinculo !== 'GRADO'"
                    :severity="formulario.tipoVinculo === 'GRADO' ? undefined : 'secondary'"
                    @click="formulario.tipoVinculo = 'GRADO'"
                  />
                  <Button
                    label="Calidad"
                    size="small"
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
                <InputText v-model.trim="formulario.unidadNombre" placeholder="Unidad o repartición" fluid />
              </label>
              <label>
                <span>Puesto o función *</span>
                <InputText v-model.trim="formulario.puesto" placeholder="Puesto o función" fluid />
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
              />
            </div>
          </form>
        </template>
      </Card>

      <Card>
        <template #title>Calificados del período</template>
        <template #subtitle>{{ totalDesignados }} expediente(s) creado(s).</template>
        <template #content>
          <DataTable
            :value="designaciones"
            :loading="cargando"
            paginator
            :rows="8"
            striped-rows
            responsive-layout="scroll"
            empty-message="No existen calificados designados en el período."
          >
            <Column header="Calificado" sortable sort-field="nombre_completo">
              <template #body="slotProps">
                <div class="hv-qualified-person">
                  <span class="hv-qualified-person__avatar">
                    {{ slotProps.data.nombre_completo.charAt(0).toUpperCase() }}
                  </span>
                  <div>
                    <strong>
                      {{ slotProps.data.grado_calidad_abreviatura }}
                      {{ slotProps.data.nombre_completo }}
                    </strong>
                    <small>RUN {{ slotProps.data.run }}</small>
                  </div>
                </div>
              </template>
            </Column>
            <Column field="categoria_nombre" header="Categoría" sortable />
            <Column header="Unidad / función">
              <template #body="slotProps">
                <div class="hv-qualified-unit">
                  <strong>{{ slotProps.data.unidad_nombre }}</strong>
                  <small>{{ slotProps.data.puesto }}</small>
                </div>
              </template>
            </Column>
            <Column header="Estado">
              <template #body="slotProps">
                <Tag
                  :value="etiquetaEstado(slotProps.data.expediente_estado)"
                  :severity="severidadEstado(slotProps.data.expediente_estado)"
                />
              </template>
            </Column>
            <Column header="Acción" style="width: 7rem">
              <template #body="slotProps">
                <Button
                  label="Abrir"
                  icon="pi pi-eye"
                  size="small"
                  @click="abrirExpedienteDesignado(slotProps.data)"
                />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </section>
  </section>
</template>

<style scoped>
.hv-qualified-create {
  display: grid;
  gap: 1rem;
}

.hv-qualified-create__header-actions,
.hv-qualified-form__mode,
.hv-qualified-form__actions {
  display: flex;
  align-items: center;
  gap: .65rem;
  flex-wrap: wrap;
}

.hv-qualified-create__summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.hv-qualified-create__summary :deep(.p-card-body),
.hv-qualified-create__summary :deep(.p-card-content) {
  padding: .85rem 1rem;
}

.hv-qualified-create__summary-item {
  display: flex;
  align-items: center;
  gap: .8rem;
}

.hv-qualified-create__summary-item > i {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  border-radius: .65rem;
  color: var(--hv-primary);
  background: var(--hv-primary-soft);
  font-size: 1.05rem;
}

.hv-qualified-create__summary-item small,
.hv-qualified-person small,
.hv-qualified-unit small {
  display: block;
  color: var(--hv-muted);
}

.hv-qualified-create__summary-item strong {
  display: block;
  margin-top: .2rem;
}

.hv-qualified-create__layout {
  display: grid;
  grid-template-columns: minmax(390px, .9fr) minmax(560px, 1.35fr);
  gap: 1rem;
  align-items: start;
}

.hv-qualified-form {
  display: grid;
  gap: 1rem;
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
  padding-top: .25rem;
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
  gap: .85rem;
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
  padding: .85rem;
  border: 1px solid var(--hv-border);
  border-radius: .75rem;
  background: var(--hv-surface-soft);
}

.hv-qualified-form__actions {
  justify-content: flex-end;
  padding-top: .75rem;
  border-top: 1px solid var(--hv-border);
}

.hv-qualified-person {
  display: flex;
  align-items: center;
  gap: .65rem;
  min-width: 220px;
}

.hv-qualified-person__avatar {
  width: 2.2rem;
  height: 2.2rem;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  color: #fff;
  background: var(--hv-primary);
  font-weight: 800;
}

.hv-qualified-unit strong {
  display: block;
}

@media (max-width: 1180px) {
  .hv-qualified-create__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .hv-qualified-create__summary,
  .hv-qualified-form__grid {
    grid-template-columns: 1fr;
  }

  .hv-qualified-create__header-actions,
  .hv-qualified-form__actions {
    width: 100%;
  }
}
</style>
