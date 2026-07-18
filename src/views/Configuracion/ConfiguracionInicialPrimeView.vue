<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

import {
  crearPeriodoInicial,
  guardarCalificadorDirecto,
  obtenerEstadoConfiguracionInicial,
} from '../../services/configuracionInicial'
import { listarGradosCalificables } from '../../services/grados'
import type { ResultadoCreacionPeriodo } from '../../types/configuracionInicial'
import type { Grado } from '../../types/grados'

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')
const paso = ref(1)
const grados = ref<Grado[]>([])
const periodoCreado = ref<ResultadoCreacionPeriodo | null>(null)
const anioSeleccionado = ref(new Date().getFullYear())

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

const pasos = [
  { numero: 1, titulo: 'Calificador', descripcion: 'Datos personales y unidad', icono: 'pi pi-user' },
  { numero: 2, titulo: 'Período', descripcion: 'Año y vigencias', icono: 'pi pi-calendar' },
  { numero: 3, titulo: 'Preparación', descripcion: 'Revisión del entorno', icono: 'pi pi-users' },
  { numero: 4, titulo: 'Finalizar', descripcion: 'Confirmación', icono: 'pi pi-check-circle' },
]

const gradoSeleccionado = computed(() => grados.value.find(item => item.id === calificador.gradoId))
const nombreCompleto = computed(() => [calificador.nombres, calificador.apellidoPaterno, calificador.apellidoMaterno].filter(Boolean).join(' ').trim())
const periodoVisual = computed(() => `${anioSeleccionado.value}–${anioSeleccionado.value + 1}`)
const progreso = computed(() => `${(paso.value / pasos.length) * 100}%`)

function textoError(excepcion: unknown): string {
  return excepcion instanceof Error ? excepcion.message : String(excepcion)
}

async function inicializar(): Promise<void> {
  cargando.value = true
  error.value = ''
  try {
    const [estado, gradosResultado] = await Promise.all([
      obtenerEstadoConfiguracionInicial(),
      listarGradosCalificables(),
    ])
    grados.value = gradosResultado
    paso.value = Math.min(Math.max(estado.paso_actual || 1, 1), 4)
    calificador.gradoId = estado.grado_id ?? null
    calificador.run = estado.run ?? ''
    calificador.nombres = estado.nombres ?? ''
    calificador.apellidoPaterno = estado.apellido_paterno ?? ''
    calificador.apellidoMaterno = estado.apellido_materno ?? ''
    calificador.unidadNombre = estado.unidad_nombre ?? ''
    calificador.unidadSigla = estado.unidad_sigla ?? ''
    calificador.puesto = estado.puesto ?? ''
    if (estado.periodo_anio) anioSeleccionado.value = estado.periodo_anio
  } catch (excepcion) {
    error.value = textoError(excepcion)
  } finally {
    cargando.value = false
  }
}

function validarCalificador(): void {
  if (!calificador.gradoId) throw new Error('Seleccione el grado del calificador.')
  if (!calificador.nombres.trim()) throw new Error('Ingrese los nombres del calificador.')
  if (!calificador.apellidoPaterno.trim()) throw new Error('Ingrese el apellido paterno.')
  if (!calificador.unidadNombre.trim()) throw new Error('Ingrese la unidad o repartición.')
  if (!calificador.unidadSigla.trim()) throw new Error('Ingrese la sigla de la unidad.')
  if (!calificador.puesto.trim()) throw new Error('Ingrese el puesto o cargo.')
}

async function continuarCalificador(): Promise<void> {
  error.value = ''
  mensaje.value = ''
  guardando.value = true
  try {
    validarCalificador()
    await guardarCalificadorDirecto({
      gradoId: calificador.gradoId!,
      run: calificador.run,
      nombres: calificador.nombres,
      apellidoPaterno: calificador.apellidoPaterno,
      apellidoMaterno: calificador.apellidoMaterno,
      unidadNombre: calificador.unidadNombre,
      unidadSigla: calificador.unidadSigla,
      puesto: calificador.puesto,
    })
    mensaje.value = 'Datos del calificador guardados correctamente.'
    paso.value = 2
  } catch (excepcion) {
    error.value = textoError(excepcion)
  } finally {
    guardando.value = false
  }
}

async function continuarPeriodo(): Promise<void> {
  error.value = ''
  mensaje.value = ''
  guardando.value = true
  try {
    if (anioSeleccionado.value < 2020 || anioSeleccionado.value > 2100) {
      throw new Error('Ingrese un año válido entre 2020 y 2100.')
    }
    periodoCreado.value = await crearPeriodoInicial(anioSeleccionado.value)
    mensaje.value = `Período ${periodoCreado.value.nombre} creado correctamente.`
    paso.value = 3
  } catch (excepcion) {
    error.value = textoError(excepcion)
  } finally {
    guardando.value = false
  }
}

function continuarPreparacion(): void {
  error.value = ''
  mensaje.value = 'La configuración está lista para finalizar.'
  paso.value = 4
}

function volver(): void {
  error.value = ''
  mensaje.value = ''
  if (paso.value > 1) paso.value -= 1
}

function finalizar(): void {
  globalThis.location.reload()
}

onMounted(() => void inicializar())
</script>

<template>
  <main class="setup-prime-page">
    <section class="setup-prime-shell">
      <header class="setup-prime-header">
        <div>
          <span class="setup-prime-eyebrow">Primer inicio</span>
          <h1>Configure HVDigital</h1>
          <p>Complete estos pasos para preparar el período inicial y comenzar a trabajar.</p>
        </div>
        <Tag :value="`Paso ${paso} de ${pasos.length}`" severity="info" />
      </header>

      <div class="setup-progress"><span :style="{ width: progreso }" /></div>

      <section class="setup-prime-layout">
        <aside class="setup-step-list">
          <button
            v-for="item in pasos"
            :key="item.numero"
            type="button"
            class="setup-step"
            :class="{
              'setup-step-active': paso === item.numero,
              'setup-step-done': paso > item.numero,
            }"
            :disabled="item.numero > paso"
            @click="item.numero < paso && (paso = item.numero)"
          >
            <span class="setup-step-icon"><i :class="paso > item.numero ? 'pi pi-check' : item.icono" /></span>
            <span>
              <strong>{{ item.titulo }}</strong>
              <small>{{ item.descripcion }}</small>
            </span>
          </button>
        </aside>

        <Card class="setup-prime-card">
          <template #content>
            <div v-if="cargando" class="setup-loading">
              <i class="pi pi-spin pi-spinner" />
              <strong>Preparando la configuración inicial…</strong>
            </div>

            <template v-else>
              <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
              <Message v-if="mensaje" severity="success" :closable="false">{{ mensaje }}</Message>

              <section v-if="paso === 1" class="setup-panel">
                <div class="setup-panel-heading">
                  <span class="setup-panel-icon"><i class="pi pi-id-card" /></span>
                  <div>
                    <h2>Datos del calificador directo</h2>
                    <p>Estos datos identificarán al responsable principal del proceso.</p>
                  </div>
                </div>

                <div class="setup-form-grid">
                  <div class="setup-field setup-field-wide">
                    <label for="grado">Grado *</label>
                    <Select id="grado" v-model="calificador.gradoId" :options="grados" option-label="nombre" option-value="id" placeholder="Seleccione un grado" filter fluid />
                  </div>
                  <div class="setup-field">
                    <label for="nombres">Nombres *</label>
                    <InputText id="nombres" v-model="calificador.nombres" placeholder="Juan Carlos" fluid />
                  </div>
                  <div class="setup-field">
                    <label for="apellidoPaterno">Apellido paterno *</label>
                    <InputText id="apellidoPaterno" v-model="calificador.apellidoPaterno" placeholder="Pérez" fluid />
                  </div>
                  <div class="setup-field">
                    <label for="apellidoMaterno">Apellido materno</label>
                    <InputText id="apellidoMaterno" v-model="calificador.apellidoMaterno" placeholder="Soto" fluid />
                  </div>
                  <div class="setup-field">
                    <label for="run">RUN</label>
                    <InputText id="run" v-model="calificador.run" placeholder="17.842.654-3" fluid />
                  </div>
                  <div class="setup-field setup-field-wide">
                    <label for="unidad">Unidad o repartición *</label>
                    <InputText id="unidad" v-model="calificador.unidadNombre" placeholder="Escuadrilla de Servicios Generales" fluid />
                  </div>
                  <div class="setup-field">
                    <label for="sigla">Sigla *</label>
                    <InputText id="sigla" v-model="calificador.unidadSigla" placeholder="ESG" fluid />
                  </div>
                  <div class="setup-field">
                    <label for="puesto">Puesto o cargo *</label>
                    <InputText id="puesto" v-model="calificador.puesto" placeholder="Comandante de Unidad" fluid />
                  </div>
                </div>
              </section>

              <section v-else-if="paso === 2" class="setup-panel">
                <div class="setup-panel-heading">
                  <span class="setup-panel-icon"><i class="pi pi-calendar" /></span>
                  <div>
                    <h2>Período inicial</h2>
                    <p>Seleccione el año de inicio. HVDigital generará las vigencias institucionales.</p>
                  </div>
                </div>

                <div class="setup-period-box">
                  <div class="setup-field">
                    <label for="anio">Año de inicio *</label>
                    <InputNumber id="anio" v-model="anioSeleccionado" :use-grouping="false" :min="2020" :max="2100" fluid />
                  </div>
                  <div class="setup-period-preview">
                    <small>Período que se creará</small>
                    <strong>{{ periodoVisual }}</strong>
                    <span>Las fechas y vigencias se calcularán automáticamente.</span>
                  </div>
                </div>
              </section>

              <section v-else-if="paso === 3" class="setup-panel">
                <div class="setup-panel-heading">
                  <span class="setup-panel-icon"><i class="pi pi-check-square" /></span>
                  <div>
                    <h2>Revisión de la preparación</h2>
                    <p>Compruebe los datos antes de terminar el primer inicio.</p>
                  </div>
                </div>

                <div class="setup-summary-grid">
                  <article><small>Calificador</small><strong>{{ gradoSeleccionado?.abreviatura }} {{ nombreCompleto }}</strong></article>
                  <article><small>Unidad</small><strong>{{ calificador.unidadNombre }} · {{ calificador.unidadSigla }}</strong></article>
                  <article><small>Puesto</small><strong>{{ calificador.puesto }}</strong></article>
                  <article><small>Período</small><strong>{{ periodoCreado?.nombre ?? periodoVisual }}</strong></article>
                </div>

                <div v-if="periodoCreado?.vigencias?.length" class="setup-vigencias">
                  <h3>Vigencias generadas</h3>
                  <article v-for="vigencia in periodoCreado.vigencias" :key="vigencia.id">
                    <strong>{{ vigencia.nombre_regimen }}</strong>
                    <span>{{ vigencia.fecha_inicio }} al {{ vigencia.fecha_termino }}</span>
                  </article>
                </div>
              </section>

              <section v-else class="setup-panel setup-finished">
                <span class="setup-finished-icon"><i class="pi pi-check" /></span>
                <h2>HVDigital está listo</h2>
                <p>La configuración inicial y el período fueron creados correctamente.</p>
                <div class="setup-finished-summary">
                  <span><i class="pi pi-user" /> {{ nombreCompleto }}</span>
                  <span><i class="pi pi-building" /> {{ calificador.unidadSigla }}</span>
                  <span><i class="pi pi-calendar" /> {{ periodoVisual }}</span>
                </div>
              </section>
            </template>
          </template>

          <template #footer>
            <footer v-if="!cargando" class="setup-actions">
              <Button v-if="paso > 1" label="Atrás" icon="pi pi-arrow-left" severity="secondary" outlined :disabled="guardando" @click="volver" />
              <span class="setup-actions-spacer" />
              <Button v-if="paso === 1" label="Guardar y continuar" icon="pi pi-arrow-right" icon-pos="right" :loading="guardando" @click="continuarCalificador" />
              <Button v-else-if="paso === 2" label="Crear período y continuar" icon="pi pi-arrow-right" icon-pos="right" :loading="guardando" @click="continuarPeriodo" />
              <Button v-else-if="paso === 3" label="Confirmar configuración" icon="pi pi-check" icon-pos="right" @click="continuarPreparacion" />
              <Button v-else label="Ingresar a HVDigital" icon="pi pi-sign-in" icon-pos="right" @click="finalizar" />
            </footer>
          </template>
        </Card>
      </section>
    </section>
  </main>
</template>

<style scoped>
.setup-prime-page { min-height: 100vh; overflow: auto; padding: 32px; color: var(--hv-text); background: radial-gradient(circle at 8% 0%, rgba(37,99,235,.08), transparent 25%), var(--hv-page); }
.setup-prime-shell { width: min(1240px, 100%); margin: 0 auto; }
.setup-prime-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 18px; }
.setup-prime-header h1 { margin: 5px 0 0; font-size: clamp(28px, 4vw, 42px); letter-spacing: -.04em; }
.setup-prime-header p { margin: 9px 0 0; color: var(--hv-muted); }
.setup-prime-eyebrow { color: var(--hv-primary); font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.setup-progress { height: 6px; overflow: hidden; margin-bottom: 20px; border-radius: 999px; background: #dbe4ee; }
.setup-progress span { display: block; height: 100%; border-radius: inherit; background: var(--hv-primary); transition: width .25s ease; }
.setup-prime-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 18px; align-items: start; }
.setup-step-list { display: grid; gap: 8px; position: sticky; top: 20px; }
.setup-step { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px; border: 1px solid transparent; border-radius: 12px; color: var(--hv-muted); background: transparent; text-align: left; }
.setup-step:disabled { cursor: default; opacity: .72; }
.setup-step-active { color: var(--hv-primary); border-color: #b8cefb; background: var(--hv-primary-soft); }
.setup-step-done { color: var(--hv-success); }
.setup-step-icon { display: grid; width: 38px; height: 38px; flex: 0 0 38px; place-items: center; border-radius: 10px; background: #e8edf3; }
.setup-step-active .setup-step-icon { color: #fff; background: var(--hv-primary); }
.setup-step-done .setup-step-icon { color: #fff; background: var(--hv-success); }
.setup-step > span:last-child { display: grid; gap: 3px; }
.setup-step small { font-size: 11px; color: inherit; opacity: .82; }
.setup-prime-card { border: 1px solid var(--hv-border); box-shadow: var(--hv-shadow-md); }
.setup-loading { min-height: 420px; display: grid; place-content: center; gap: 12px; text-align: center; color: var(--hv-muted); }
.setup-loading i { color: var(--hv-primary); font-size: 30px; }
.setup-panel { min-height: 410px; padding: 8px 4px; }
.setup-panel-heading { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.setup-panel-heading h2 { margin: 0; font-size: 22px; }
.setup-panel-heading p { margin: 5px 0 0; color: var(--hv-muted); }
.setup-panel-icon { display: grid; width: 48px; height: 48px; flex: 0 0 48px; place-items: center; border-radius: 13px; color: var(--hv-primary); background: var(--hv-primary-soft); font-size: 20px; }
.setup-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 17px; }
.setup-field { display: grid; gap: 7px; }
.setup-field label { font-size: 13px; font-weight: 700; }
.setup-field-wide { grid-column: 1 / -1; }
.setup-period-box { display: grid; grid-template-columns: minmax(220px, 320px) minmax(0,1fr); gap: 22px; align-items: stretch; }
.setup-period-preview { display: grid; place-content: center; gap: 8px; padding: 28px; border: 1px dashed #9bb8e8; border-radius: 14px; background: var(--hv-primary-soft); text-align: center; }
.setup-period-preview strong { color: var(--hv-primary-dark); font-size: 34px; }
.setup-period-preview span, .setup-period-preview small { color: var(--hv-muted); }
.setup-summary-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
.setup-summary-grid article { display: grid; gap: 7px; padding: 16px; border: 1px solid var(--hv-border); border-radius: 11px; background: var(--hv-surface-soft); }
.setup-summary-grid small { color: var(--hv-muted); }
.setup-vigencias { margin-top: 18px; padding: 16px; border: 1px solid var(--hv-border); border-radius: 11px; }
.setup-vigencias h3 { margin: 0 0 10px; font-size: 15px; }
.setup-vigencias article { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-top: 1px solid var(--hv-border); }
.setup-vigencias span { color: var(--hv-muted); }
.setup-finished { display: grid; place-content: center; justify-items: center; gap: 12px; text-align: center; }
.setup-finished-icon { display: grid; width: 76px; height: 76px; place-items: center; border-radius: 50%; color: #fff; background: var(--hv-success); font-size: 32px; box-shadow: 0 0 0 10px rgba(22,128,79,.1); }
.setup-finished h2 { margin: 14px 0 0; font-size: 28px; }
.setup-finished p { margin: 0; color: var(--hv-muted); }
.setup-finished-summary { display: flex; flex-wrap: wrap; justify-content: center; gap: 9px; margin-top: 8px; }
.setup-finished-summary span { display: inline-flex; align-items: center; gap: 7px; padding: 8px 11px; border-radius: 999px; color: var(--hv-primary-dark); background: var(--hv-primary-soft); }
.setup-actions { position: sticky; bottom: 0; display: flex; align-items: center; gap: 10px; min-height: 66px; padding-top: 14px; border-top: 1px solid var(--hv-border); background: var(--hv-surface); z-index: 4; }
.setup-actions-spacer { flex: 1; }
@media (max-width: 900px) { .setup-prime-page { padding: 20px; } .setup-prime-layout { grid-template-columns: 1fr; } .setup-step-list { position: static; grid-template-columns: repeat(4,minmax(0,1fr)); } .setup-step { justify-content: center; padding: 10px; } .setup-step > span:last-child { display: none; } }
@media (max-width: 640px) { .setup-prime-page { padding: 14px; } .setup-prime-header { flex-direction: column; } .setup-form-grid, .setup-summary-grid, .setup-period-box { grid-template-columns: 1fr; } .setup-field-wide { grid-column: auto; } .setup-actions { flex-wrap: wrap; } .setup-actions-spacer { display: none; } .setup-actions .p-button { flex: 1 1 100%; } }
</style>
