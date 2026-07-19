<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

import {
  guardarCalificadorDirecto,
  obtenerEstadoConfiguracionInicial,
} from '../../services/configuracionInicial'
import { listarGradosCalificables } from '../../services/grados'
import {
  formatearBytes,
  formatearFechaUnix,
  obtenerEstadoBasesDatos,
  seleccionarYCrearRespaldo,
  seleccionarYRestaurarRespaldo,
  type BackupResult,
  type DatabaseStatus,
  type RestoreResult,
} from '../../services/respaldos'
import type { EstadoConfiguracionInicialDto } from '../../types/configuracionInicial'
import type { Grado } from '../../types/grados'

const emit = defineEmits<{ volver: [] }>()

type Seccion = 'USUARIO' | 'BASE_DATOS' | 'CATALOGOS' | 'SEGURIDAD' | 'ACERCA'

const seccion = ref<Seccion>('USUARIO')
const cargando = ref(true)
const procesando = ref(false)
const guardandoUsuario = ref(false)
const error = ref('')
const mensaje = ref('')
const bases = ref<DatabaseStatus[]>([])
const grados = ref<Grado[]>([])
const estadoConfiguracion = ref<EstadoConfiguracionInicialDto | null>(null)
const ultimoRespaldo = ref<BackupResult | null>(null)
const ultimaRestauracion = ref<RestoreResult | null>(null)

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

const baseOperacional = computed(() => bases.value.find(item => item.name === 'hvdigital.db'))
const baseCatalogo = computed(() => bases.value.find(item => item.name === 'catalog.db'))

const nombreCalificador = computed(() => {
  const grado = grados.value.find(item => item.id === calificador.gradoId)
  return [
    grado?.abreviatura,
    calificador.nombres,
    calificador.apellidoPaterno,
    calificador.apellidoMaterno,
  ].filter(Boolean).join(' ').trim() || 'Sin calificador configurado'
})

const instalacionOperativa = computed(() => Boolean(baseOperacional.value?.exists))

const opciones: Array<{
  id: Seccion
  label: string
  descripcion: string
  icon: string
}> = [
  {
    id: 'USUARIO',
    label: 'Calificador',
    descripcion: 'Identidad y unidad',
    icon: 'pi pi-user',
  },
  {
    id: 'BASE_DATOS',
    label: 'Base de datos',
    descripcion: 'Archivos y respaldos',
    icon: 'pi pi-database',
  },
  {
    id: 'CATALOGOS',
    label: 'Catálogos',
    descripcion: 'Datos institucionales',
    icon: 'pi pi-book',
  },
  {
    id: 'SEGURIDAD',
    label: 'Protección de datos',
    descripcion: 'Integridad y restauración',
    icon: 'pi pi-shield',
  },
  {
    id: 'ACERCA',
    label: 'Acerca de',
    descripcion: 'Versión y tecnología',
    icon: 'pi pi-info-circle',
  },
]

const catalogos = [
  {
    nombre: 'Grados y calidades',
    descripcion: 'Jerarquías, abreviaturas y categorías de personal.',
    icono: 'pi pi-id-card',
    nivel: 'Institucional',
  },
  {
    nombre: 'Anotaciones',
    descripcion: 'Categorías, tipos, plantillas y variables documentales.',
    icono: 'pi pi-file-edit',
    nivel: 'Normativo',
  },
  {
    nombre: 'Conceptos de calificación',
    descripcion: 'Conceptos disponibles según grado y categoría.',
    icono: 'pi pi-list-check',
    nivel: 'Normativo',
  },
  {
    nombre: 'Puntajes y efectos',
    descripcion: 'Valores de mérito, demérito y reglas de presentación.',
    icono: 'pi pi-chart-line',
    nivel: 'Normativo',
  },
  {
    nombre: 'Instrumentos',
    descripcion: 'Parámetros utilizados por EVINT, HC1, HC2, HAM y HAPSEM.',
    icono: 'pi pi-clipboard',
    nivel: 'Institucional',
  },
]

function mensajeError(value: unknown): string {
  return value instanceof Error ? value.message : String(value)
}

function copiarCalificador(estado: EstadoConfiguracionInicialDto): void {
  calificador.gradoId = estado.grado_id ?? null
  calificador.run = estado.run ?? ''
  calificador.nombres = estado.nombres ?? ''
  calificador.apellidoPaterno = estado.apellido_paterno ?? ''
  calificador.apellidoMaterno = estado.apellido_materno ?? ''
  calificador.unidadNombre = estado.unidad_nombre ?? ''
  calificador.unidadSigla = estado.unidad_sigla ?? ''
  calificador.puesto = estado.puesto ?? ''
}

async function cargarEstado(): Promise<void> {
  cargando.value = true
  error.value = ''

  try {
    const [basesResultado, estadoResultado, gradosResultado] = await Promise.all([
      obtenerEstadoBasesDatos(),
      obtenerEstadoConfiguracionInicial(),
      listarGradosCalificables(),
    ])

    bases.value = basesResultado
    estadoConfiguracion.value = estadoResultado
    grados.value = gradosResultado
    copiarCalificador(estadoResultado)
  } catch (excepcion) {
    error.value = mensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

function validarCalificador(): void {
  if (!calificador.gradoId) throw new Error('Debe seleccionar el grado del calificador.')
  if (!calificador.nombres.trim()) throw new Error('Debe ingresar los nombres del calificador.')
  if (!calificador.apellidoPaterno.trim()) throw new Error('Debe ingresar el apellido paterno.')
  if (!calificador.unidadNombre.trim()) throw new Error('Debe ingresar la unidad o repartición.')
  if (!calificador.unidadSigla.trim()) throw new Error('Debe ingresar la sigla de la unidad.')
  if (!calificador.puesto.trim()) throw new Error('Debe ingresar el puesto o cargo.')
}

async function guardarUsuario(): Promise<void> {
  guardandoUsuario.value = true
  error.value = ''
  mensaje.value = ''

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
    mensaje.value = 'Datos del calificador actualizados correctamente.'
    await cargarEstado()
  } catch (excepcion) {
    error.value = mensajeError(excepcion)
  } finally {
    guardandoUsuario.value = false
  }
}

async function crearRespaldo(): Promise<void> {
  procesando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const resultado = await seleccionarYCrearRespaldo()
    if (!resultado) return
    ultimoRespaldo.value = resultado
    mensaje.value = `Respaldo creado correctamente en ${resultado.path}`
  } catch (excepcion) {
    error.value = mensajeError(excepcion)
  } finally {
    procesando.value = false
  }
}

async function restaurar(): Promise<void> {
  procesando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const resultado = await seleccionarYRestaurarRespaldo()
    if (!resultado) return
    ultimaRestauracion.value = resultado
    mensaje.value = 'Restauración completada. Reinicie HVDigital antes de continuar.'
    await cargarEstado()
  } catch (excepcion) {
    error.value = mensajeError(excepcion)
  } finally {
    procesando.value = false
  }
}

onMounted(cargarEstado)
</script>

<template>
  <section class="hv-content settings-page">
    <header class="settings-header">
      <div>
        <span class="hv-eyebrow">Administración local</span>
        <h1>Configuración</h1>
        <p>Administre al calificador, la información local y los catálogos institucionales.</p>
      </div>

      <div class="header-actions">
        <Tag
          :value="instalacionOperativa ? 'Sistema operativo' : 'Requiere atención'"
          :severity="instalacionOperativa ? 'success' : 'danger'"
        />
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="cargando"
          @click="cargarEstado"
        />
        <Button
          label="Volver"
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          @click="emit('volver')"
        />
      </div>
    </header>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    <Message v-if="mensaje" severity="success" :closable="false">{{ mensaje }}</Message>

    <div class="settings-layout">
      <aside class="settings-sidebar">
        <div class="profile-summary">
          <span class="profile-avatar"><i class="pi pi-user" /></span>
          <div>
            <small>Calificador activo</small>
            <strong>{{ nombreCalificador }}</strong>
            <span>{{ calificador.unidadSigla || 'Sin unidad' }}</span>
          </div>
        </div>

        <nav class="settings-nav" aria-label="Secciones de configuración">
          <button
            v-for="item in opciones"
            :key="item.id"
            type="button"
            :class="{ active: seccion === item.id }"
            @click="seccion = item.id"
          >
            <i :class="item.icon" />
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.descripcion }}</small>
            </span>
          </button>
        </nav>
      </aside>

      <main class="settings-main">
        <div v-if="cargando" class="loading">
          <ProgressSpinner />
          <span>Cargando configuración…</span>
        </div>

        <template v-else>
          <section v-if="seccion === 'USUARIO'" class="settings-section">
            <div class="section-title">
              <div>
                <span class="section-icon"><i class="pi pi-user" /></span>
                <div>
                  <h2>Calificador o usuario de la aplicación</h2>
                  <p>Estos datos identifican al responsable de las hojas de vida y documentos emitidos.</p>
                </div>
              </div>
              <Tag
                :value="estadoConfiguracion?.calificador_directo_id ? 'Configurado' : 'Pendiente'"
                :severity="estadoConfiguracion?.calificador_directo_id ? 'success' : 'warn'"
              />
            </div>

            <Card>
              <template #content>
                <form class="settings-form" @submit.prevent="guardarUsuario">
                  <div class="field field-wide">
                    <label for="config-grado">Grado *</label>
                    <Select
                      id="config-grado"
                      v-model="calificador.gradoId"
                      :options="grados"
                      option-label="nombre"
                      option-value="id"
                      placeholder="Seleccione un grado"
                      filter
                      fluid
                    />
                  </div>

                  <div class="field">
                    <label for="config-run">RUN</label>
                    <InputText id="config-run" v-model="calificador.run" placeholder="12.345.678-9" fluid />
                  </div>

                  <div class="field">
                    <label for="config-nombres">Nombres *</label>
                    <InputText id="config-nombres" v-model="calificador.nombres" fluid />
                  </div>

                  <div class="field">
                    <label for="config-apellido-paterno">Apellido paterno *</label>
                    <InputText id="config-apellido-paterno" v-model="calificador.apellidoPaterno" fluid />
                  </div>

                  <div class="field">
                    <label for="config-apellido-materno">Apellido materno</label>
                    <InputText id="config-apellido-materno" v-model="calificador.apellidoMaterno" fluid />
                  </div>

                  <div class="field field-wide">
                    <label for="config-unidad">Unidad o repartición *</label>
                    <InputText id="config-unidad" v-model="calificador.unidadNombre" fluid />
                  </div>

                  <div class="field">
                    <label for="config-sigla">Sigla *</label>
                    <InputText id="config-sigla" v-model="calificador.unidadSigla" fluid />
                  </div>

                  <div class="field">
                    <label for="config-puesto">Puesto o cargo *</label>
                    <InputText id="config-puesto" v-model="calificador.puesto" fluid />
                  </div>

                  <div class="form-footer field-wide">
                    <div>
                      <strong>Uso documental</strong>
                      <span>Los cambios se aplicarán a los nuevos documentos y registros.</span>
                    </div>
                    <Button
                      type="submit"
                      label="Guardar datos del calificador"
                      icon="pi pi-save"
                      :loading="guardandoUsuario"
                    />
                  </div>
                </form>
              </template>
            </Card>
          </section>

          <section v-else-if="seccion === 'BASE_DATOS'" class="settings-section">
            <div class="section-title">
              <div>
                <span class="section-icon"><i class="pi pi-database" /></span>
                <div>
                  <h2>Base de datos</h2>
                  <p>Diagnóstico y acciones sobre los archivos locales de HVDigital.</p>
                </div>
              </div>
            </div>

            <div class="database-grid">
              <Card v-for="base in bases" :key="base.name" class="database-card">
                <template #title>
                  <div class="database-title">
                    <div>
                      <span class="database-icon"><i :class="base.name === 'catalog.db' ? 'pi pi-book' : 'pi pi-database'" /></span>
                      <div>
                        <strong>{{ base.name }}</strong>
                        <small>{{ base.name === 'catalog.db' ? 'Catálogos institucionales' : 'Información operacional' }}</small>
                      </div>
                    </div>
                    <Tag :value="base.exists ? 'Disponible' : 'No disponible'" :severity="base.exists ? 'success' : 'danger'" />
                  </div>
                </template>
                <template #content>
                  <dl class="details">
                    <div><dt>Ruta</dt><dd>{{ base.path }}</dd></div>
                    <div><dt>Tamaño</dt><dd>{{ formatearBytes(base.sizeBytes) }}</dd></div>
                    <div><dt>Última modificación</dt><dd>{{ formatearFechaUnix(base.modifiedUnix) }}</dd></div>
                  </dl>
                </template>
              </Card>
            </div>

            <div class="action-grid">
              <Card>
                <template #title>Crear respaldo completo</template>
                <template #subtitle>Proteja la base operacional y los catálogos disponibles.</template>
                <template #content>
                  <div class="operation">
                    <i class="pi pi-cloud-upload" />
                    <p>Guarde una copia verificada en una carpeta externa o ubicación segura.</p>
                    <Button label="Seleccionar destino" icon="pi pi-save" :loading="procesando" @click="crearRespaldo" />
                  </div>
                </template>
              </Card>

              <Card class="danger-card">
                <template #title>Restaurar respaldo</template>
                <template #subtitle>Reemplaza los datos locales después de validarlos.</template>
                <template #content>
                  <div class="operation">
                    <i class="pi pi-history" />
                    <p>Antes de restaurar se genera automáticamente un respaldo preventivo.</p>
                    <Button label="Seleccionar respaldo" icon="pi pi-upload" severity="danger" outlined :loading="procesando" @click="restaurar" />
                  </div>
                </template>
              </Card>
            </div>

            <Card v-if="ultimoRespaldo">
              <template #title>Último respaldo creado</template>
              <template #content>
                <dl class="details">
                  <div><dt>Archivo</dt><dd>{{ ultimoRespaldo.path }}</dd></div>
                  <div><dt>Bases incluidas</dt><dd>{{ ultimoRespaldo.databases.join(', ') }}</dd></div>
                  <div><dt>Tamaño</dt><dd>{{ formatearBytes(ultimoRespaldo.sizeBytes) }}</dd></div>
                </dl>
              </template>
            </Card>

            <Card v-if="ultimaRestauracion">
              <template #title>Última restauración</template>
              <template #content>
                <dl class="details">
                  <div><dt>Origen</dt><dd>{{ ultimaRestauracion.sourcePath }}</dd></div>
                  <div><dt>Respaldo preventivo</dt><dd>{{ ultimaRestauracion.safetyBackupPath }}</dd></div>
                </dl>
              </template>
            </Card>
          </section>

          <section v-else-if="seccion === 'CATALOGOS'" class="settings-section">
            <div class="section-title">
              <div>
                <span class="section-icon"><i class="pi pi-book" /></span>
                <div>
                  <h2>Control de datos de catálogo</h2>
                  <p>Revise el estado y alcance de los datos maestros utilizados por la aplicación.</p>
                </div>
              </div>
              <Tag
                :value="baseCatalogo?.exists ? 'Catálogo disponible' : 'Catálogo no disponible'"
                :severity="baseCatalogo?.exists ? 'success' : 'danger'"
              />
            </div>

            <Message severity="info" :closable="false">
              Los catálogos institucionales afectan cálculos, documentos y reglas de negocio. Deben modificarse únicamente mediante procesos controlados y con respaldo previo.
            </Message>

            <div class="catalog-grid">
              <Card v-for="catalogo in catalogos" :key="catalogo.nombre" class="catalog-card">
                <template #content>
                  <div class="catalog-content">
                    <span class="catalog-icon"><i :class="catalogo.icono" /></span>
                    <div>
                      <div class="catalog-heading">
                        <strong>{{ catalogo.nombre }}</strong>
                        <Tag :value="catalogo.nivel" severity="secondary" />
                      </div>
                      <p>{{ catalogo.descripcion }}</p>
                      <small>
                        {{ baseCatalogo?.exists ? 'Disponible para consulta desde la base de catálogo.' : 'No disponible hasta recuperar catalog.db.' }}
                      </small>
                    </div>
                  </div>
                </template>
              </Card>
            </div>

            <Card class="catalog-policy">
              <template #title>Política mínima de modificación</template>
              <template #content>
                <div class="policy-list">
                  <p><i class="pi pi-check-circle" /><span><strong>Respaldo previo obligatorio</strong>Cree un respaldo completo antes de modificar datos maestros.</span></p>
                  <p><i class="pi pi-lock" /><span><strong>Edición restringida</strong>No se permite eliminar catálogos utilizados por períodos o documentos existentes.</span></p>
                  <p><i class="pi pi-history" /><span><strong>Trazabilidad</strong>Las futuras herramientas de edición deberán registrar fecha, responsable y motivo del cambio.</span></p>
                  <p><i class="pi pi-refresh" /><span><strong>Actualización controlada</strong>Las cargas institucionales deberán validar versión, estructura e integridad.</span></p>
                </div>
                <div class="policy-actions">
                  <Button label="Crear respaldo antes de cambios" icon="pi pi-cloud-upload" :loading="procesando" @click="crearRespaldo" />
                  <Button label="Actualizar diagnóstico" icon="pi pi-refresh" severity="secondary" outlined @click="cargarEstado" />
                </div>
              </template>
            </Card>
          </section>

          <section v-else-if="seccion === 'SEGURIDAD'" class="settings-section">
            <div class="section-title">
              <div>
                <span class="section-icon"><i class="pi pi-shield" /></span>
                <div>
                  <h2>Protección e integridad</h2>
                  <p>Controles mínimos aplicados a la información local.</p>
                </div>
              </div>
            </div>

            <div class="security-grid">
              <Card>
                <template #content><div class="security-item"><i class="pi pi-verified" /><div><strong>Integridad del respaldo</strong><span>Validación mediante checksum SHA-256 e integrity_check.</span></div></div></template>
              </Card>
              <Card>
                <template #content><div class="security-item"><i class="pi pi-copy" /><div><strong>Respaldo preventivo</strong><span>Copia automática antes de reemplazar información local.</span></div></div></template>
              </Card>
              <Card>
                <template #content><div class="security-item"><i class="pi pi-folder" /><div><strong>Separación de datos</strong><span>Información operacional y catálogos se diagnostican por separado.</span></div></div></template>
              </Card>
              <Card>
                <template #content><div class="security-item"><i class="pi pi-exclamation-triangle" /><div><strong>Reinicio posterior</strong><span>Después de una restauración debe reiniciarse HVDigital.</span></div></div></template>
              </Card>
            </div>
          </section>

          <section v-else class="settings-section">
            <div class="section-title">
              <div>
                <span class="section-icon"><i class="pi pi-info-circle" /></span>
                <div>
                  <h2>Acerca de HVDigital</h2>
                  <p>Información técnica de esta instalación.</p>
                </div>
              </div>
            </div>

            <Card>
              <template #content>
                <div class="about">
                  <div class="logo">HV</div>
                  <div>
                    <h3>HVDigital</h3>
                    <p>Gestión digital local de hojas de vida y procesos de calificación.</p>
                    <span>Versión 0.1.0 · Tauri 2 · Vue 3 · PrimeVue · SQLite</span>
                  </div>
                </div>
              </template>
            </Card>
          </section>
        </template>
      </main>
    </div>
  </section>
</template>

<style scoped>
.settings-page{display:grid;gap:1rem;min-height:100%}.settings-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.settings-header h1{margin:.2rem 0 0;font-size:1.75rem}.settings-header p{margin:.35rem 0 0;color:var(--hv-muted)}.header-actions{display:flex;align-items:center;justify-content:flex-end;gap:.55rem;flex-wrap:wrap}.settings-layout{display:grid;grid-template-columns:270px minmax(0,1fr);gap:1rem;align-items:start}.settings-sidebar{position:sticky;top:1rem;display:grid;gap:.75rem;padding:.75rem;background:var(--hv-surface);border:1px solid var(--hv-border);border-radius:14px;box-shadow:0 6px 18px rgba(15,23,42,.035)}.profile-summary{display:flex;align-items:center;gap:.75rem;padding:.7rem;border-bottom:1px solid var(--hv-border)}.profile-avatar{width:2.8rem;height:2.8rem;display:grid;place-items:center;flex:0 0 auto;color:var(--hv-primary);background:var(--hv-primary-soft);border-radius:.8rem}.profile-summary>div{min-width:0}.profile-summary small,.profile-summary span{display:block;color:var(--hv-muted);font-size:.72rem}.profile-summary strong{display:block;margin:.1rem 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.84rem}.settings-nav{display:grid;gap:.25rem}.settings-nav button{width:100%;min-height:54px;display:grid;grid-template-columns:28px minmax(0,1fr);align-items:center;gap:.6rem;padding:.6rem .7rem;color:var(--hv-muted);background:transparent;border:0;border-radius:.7rem;font:inherit;text-align:left;cursor:pointer}.settings-nav button>i{text-align:center}.settings-nav button span{display:grid;gap:.1rem}.settings-nav button strong{font-size:.82rem}.settings-nav button small{font-size:.68rem;font-weight:500}.settings-nav button:hover,.settings-nav button.active{color:var(--hv-primary);background:var(--hv-primary-soft)}.settings-main,.settings-section{display:grid;gap:1rem;min-width:0}.loading{min-height:360px;display:grid;place-items:center;align-content:center;gap:1rem;color:var(--hv-muted)}.section-title{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.section-title>div{display:flex;align-items:flex-start;gap:.75rem}.section-icon{width:2.7rem;height:2.7rem;display:grid;place-items:center;flex:0 0 auto;color:var(--hv-primary);background:var(--hv-primary-soft);border-radius:.75rem}.section-title h2{margin:0;font-size:1.25rem}.section-title p{margin:.3rem 0 0;color:var(--hv-muted)}.settings-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.field{display:grid;gap:.4rem}.field label{font-size:.78rem;font-weight:700}.field-wide{grid-column:1/-1}.form-footer{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:1rem;border-top:1px solid var(--hv-border)}.form-footer>div{display:grid;gap:.15rem}.form-footer span{color:var(--hv-muted);font-size:.78rem}.database-grid,.action-grid,.catalog-grid,.security-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.database-title,.database-title>div{display:flex;align-items:center;justify-content:space-between;gap:.75rem}.database-title>div{justify-content:flex-start}.database-icon{width:2.35rem;height:2.35rem;display:grid;place-items:center;color:var(--hv-primary);background:var(--hv-primary-soft);border-radius:.65rem}.database-title small{display:block;color:var(--hv-muted);font-size:.7rem;font-weight:500}.details{display:grid;gap:.8rem;margin:0}.details>div{display:grid;grid-template-columns:150px minmax(0,1fr);gap:1rem}.details dt{color:var(--hv-muted);font-size:.76rem;font-weight:700}.details dd{margin:0;overflow-wrap:anywhere;font-size:.82rem}.operation{min-height:170px;display:flex;flex-direction:column;align-items:flex-start;gap:.9rem}.operation>i{width:2.8rem;height:2.8rem;display:grid;place-items:center;color:var(--hv-primary);background:var(--hv-primary-soft);border-radius:.8rem;font-size:1.1rem}.operation p{flex:1;margin:0;color:var(--hv-muted)}.catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.catalog-content{display:grid;grid-template-columns:42px minmax(0,1fr);gap:.8rem}.catalog-icon{width:2.6rem;height:2.6rem;display:grid;place-items:center;color:var(--hv-primary);background:var(--hv-primary-soft);border-radius:.75rem}.catalog-heading{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.catalog-content p{margin:.35rem 0;color:var(--hv-muted);font-size:.82rem}.catalog-content small{color:var(--hv-muted);font-size:.72rem}.policy-list{display:grid;gap:1rem}.policy-list p{display:flex;gap:.7rem;margin:0}.policy-list i{margin-top:.15rem;color:var(--hv-primary)}.policy-list span,.policy-list strong{display:block}.policy-list span{color:var(--hv-muted);font-size:.82rem}.policy-list strong{margin-bottom:.15rem;color:var(--hv-text)}.policy-actions{display:flex;gap:.65rem;flex-wrap:wrap;margin-top:1.1rem}.security-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.security-item{display:flex;align-items:flex-start;gap:.8rem}.security-item>i{width:2.6rem;height:2.6rem;display:grid;place-items:center;flex:0 0 auto;color:var(--hv-primary);background:var(--hv-primary-soft);border-radius:.75rem}.security-item strong,.security-item span{display:block}.security-item span{margin-top:.2rem;color:var(--hv-muted);font-size:.8rem}.about{display:flex;gap:1rem;align-items:center}.logo{width:4rem;height:4rem;display:grid;place-items:center;flex:0 0 auto;color:#fff;background:var(--hv-primary);border-radius:1rem;font-size:1.25rem;font-weight:900}.about h3,.about p{margin:0}.about p,.about span{color:var(--hv-muted)}.about span{display:block;margin-top:.65rem;font-size:.8rem}@media(max-width:1050px){.settings-layout{grid-template-columns:1fr}.settings-sidebar{position:static}.settings-nav{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}.profile-summary{display:none}}@media(max-width:760px){.settings-header,.form-footer{align-items:stretch;flex-direction:column}.header-actions{justify-content:flex-start}.settings-form,.database-grid,.action-grid,.catalog-grid,.security-grid{grid-template-columns:1fr}.field-wide{grid-column:auto}.details>div{grid-template-columns:1fr;gap:.2rem}.section-title{align-items:stretch;flex-direction:column}}
</style>
