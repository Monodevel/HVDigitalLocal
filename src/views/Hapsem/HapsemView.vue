<script setup lang="ts">
import {
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'

import AppLayout from '../../components/layout/AppLayout.vue'

import {
  crearHapsemDatosVacios,
  guardarDocumentoCalificacion,
  listarAnotacionesMeritoDemerito,
  obtenerDocumentoCalificacion,
} from '../../services/documentosCalificacion'

import type {
  DocumentoCalificacionAnotacion,
  DocumentoCalificacionResumen,
  HapsemDatos,
} from '../../types/documentosCalificacion'

const props = defineProps<{
  hojaVidaId: number
}>()

const emit = defineEmits<{
  volver: []
}>()

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')

const resumen = ref<DocumentoCalificacionResumen | null>(null)
const datos = reactive<HapsemDatos>(crearHapsemDatosVacios())

const meritos = ref<DocumentoCalificacionAnotacion[]>([])
const demeritos = ref<DocumentoCalificacionAnotacion[]>([])

const meses = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
]

function copiarDatos(
  origen: HapsemDatos,
): void {
  Object.assign(datos, {
    ...crearHapsemDatosVacios(),
    ...origen,
    especialidades:
      origen.especialidades?.length
        ? origen.especialidades
        : ['', '', '', '', '', ''],
  })
}

function partesFecha(
  fecha: string | null | undefined,
): {
  dia: string
  mes: string
  anio: string
} {
  if (!fecha) {
    return {
      dia: '',
      mes: '',
      anio: '',
    }
  }

  const [anio, mes, dia] =
    fecha.slice(0, 10).split('-')

  const indiceMes = Number(mes) - 1

  return {
    dia: dia ?? '',
    mes:
      indiceMes >= 0 &&
      indiceMes < meses.length
        ? meses[indiceMes]
        : '',
    anio: anio ?? '',
  }
}

function fechaCorta(
  fecha: string | null,
): string {
  if (!fecha) {
    return ''
  }

  const [anio, mes, dia] =
    fecha.slice(0, 10).split('-')

  if (!anio || !mes || !dia) {
    return fecha
  }

  const indiceMes = Number(mes) - 1
  const mesTexto =
    indiceMes >= 0 &&
    indiceMes < meses.length
      ? meses[indiceMes].slice(0, 3)
      : mes

  return `${dia}${mesTexto}${anio}`
}

function lineaAnotacion(
  anotacion: DocumentoCalificacionAnotacion,
): string {
  const resolucion =
    anotacion.numero_resolucion
      ? `Resol. Exenta N° ${anotacion.numero_resolucion} del ${fechaCorta(anotacion.fecha_resolucion)}`
      : 'Resol. Exenta'

  const puntaje =
    anotacion.puntaje_visual
      ? ` (${anotacion.puntaje_visual} ptos en “${anotacion.concepto_nombre ?? ''}”)`
      : ''

  return `${resolucion}${puntaje}`
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const [
      documento,
      anotaciones,
    ] = await Promise.all([
      obtenerDocumentoCalificacion<HapsemDatos>(
        'HAPSEM',
        props.hojaVidaId,
        crearHapsemDatosVacios(),
      ),
      listarAnotacionesMeritoDemerito(
        props.hojaVidaId,
      ),
    ])

    resumen.value = documento.resumen
    copiarDatos(documento.datos)
    meritos.value = anotaciones.merito
    demeritos.value = anotaciones.demerito
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

async function guardar(): Promise<void> {
  guardando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    await guardarDocumentoCalificacion(
      'HAPSEM',
      props.hojaVidaId,
      datos,
    )

    mensaje.value =
      'HAPSEM guardada correctamente.'
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    guardando.value = false
  }
}

function imprimir(): void {
  window.print()
}

function obtenerMensajeError(
  excepcion: unknown,
): string {
  return excepcion instanceof Error
    ? excepcion.message
    : String(excepcion)
}

watch(
  () => props.hojaVidaId,
  cargar,
)

onMounted(cargar)
</script>

<template>
  <AppLayout
    title="HAPSEM"
    subtitle="Antecedentes Profesionales y de Seguridad Militar Específicos"
    max-width="full"
  >
    <template #actions>
      <div class="actions no-print">
        <button
          class="hv-button hv-button-ghost"
          type="button"
          @click="emit('volver')"
        >
          Volver
        </button>

        <button
          class="hv-button hv-button-secondary"
          type="button"
          @click="imprimir"
        >
          Imprimir
        </button>

        <button
          class="hv-button hv-button-primary"
          type="button"
          :disabled="guardando"
          @click="guardar"
        >
          {{
            guardando
              ? 'Guardando…'
              : 'Guardar'
          }}
        </button>
      </div>
    </template>

    <template #notice>
      <div
        v-if="error"
        class="notice notice--error no-print"
      >
        {{ error }}
      </div>

      <div
        v-if="mensaje"
        class="notice notice--success no-print"
      >
        {{ mensaje }}
      </div>
    </template>

    <section
      v-if="cargando"
      class="loading-state no-print"
    >
      Cargando HAPSEM…
    </section>

    <section
      v-else-if="resumen"
      class="stage"
    >
      <article class="sheet">
        <header class="unit">
          <strong>BRIMOT N.° 1 “CALAMA”</strong>
          <span>UNIDAD</span>
        </header>

        <h1>
          A N T E C E D E N T E S&nbsp;&nbsp; P R O F E S I O N A L E S&nbsp;&nbsp; Y&nbsp;&nbsp; D E&nbsp;&nbsp; S E G U R I D A D<br>
          M I L I T A R&nbsp;&nbsp; E S P E C Í F I C O S
        </h1>

        <p class="exclusive">(USO EXCLUSIVO EN EL EJÉRCITO)</p>

        <div class="del-line">
          <span>DEL:</span>
          <strong>
            {{
              [
                resumen.grado_calidad_abreviatura,
                resumen.nombre_completo,
              ].join(' ').toUpperCase()
            }}
          </strong>
        </div>

        <p class="help">
          (GRADO, CATEGORÍA O ESCALAFÓN, APELLIDOS Y NOMBRES)
        </p>

        <div class="period">
          <span>DESDE EL</span>
          <strong>{{ partesFecha(resumen.fecha_inicio).dia }}</strong>
          <span>DE</span>
          <strong>{{ partesFecha(resumen.fecha_inicio).mes }}</strong>
          <span>DE</span>
          <strong>{{ partesFecha(resumen.fecha_inicio).anio }}</strong>
          <span>HASTA EL</span>
          <strong>{{ partesFecha(resumen.fecha_termino).dia }}</strong>
          <span>DE</span>
          <strong>{{ partesFecha(resumen.fecha_termino).mes }}</strong>
          <span>DE</span>
          <strong>{{ partesFecha(resumen.fecha_termino).anio }}</strong>
        </div>

        <h2>A. ANTECEDENTES PROFESIONALES</h2>

        <section class="specialties">
          <p>
            1. Especialidades primarias y/o secundarias que ostenta:
          </p>

          <div class="specialty-grid">
            <label
              v-for="indice in 6"
              :key="indice"
            >
              {{ indice }})
              <input v-model="datos.especialidades[indice - 1]" type="text">
            </label>
          </div>
        </section>

        <h2>
          B. CERTIFICACIÓN FÍSICA MILITAR Y HABILIDADES BÁSICAS DE COMBATE
        </h2>

        <section class="cert-section">
          <p>
            1. HA OBTENIDO EL SIGUIENTE NIVEL DE CERTIFICACIÓN FÍSICA MILITAR:
          </p>

          <div class="options">
            <label>APTO MUY BUENO: <input v-model="datos.certificacionFisica" type="radio" value="APTO_MUY_BUENO"></label>
            <label>APTO: <input v-model="datos.certificacionFisica" type="radio" value="APTO"></label>
            <label>CONDICIONAL: <input v-model="datos.certificacionFisica" type="radio" value="CONDICIONAL"></label>
            <label>NO APTO: <input v-model="datos.certificacionFisica" type="radio" value="NO_APTO"></label>
            <label>NO RENDIDA: <input v-model="datos.certificacionFisica" type="radio" value="NO_RENDIDA"></label>
            <label>APTO CON LIMITACIONES: <input v-model="datos.certificacionFisica" type="radio" value="APTO_CON_LIMITACIONES"></label>
            <label>APROBADO: <input v-model="datos.certificacionFisica" type="radio" value="APROBADO"></label>
            <label>REPROBADO: <input v-model="datos.certificacionFisica" type="radio" value="REPROBADO"></label>
          </div>

          <p>
            2. HA OBTENIDO EL SIGUIENTE NIVEL DE CERTIFICACIÓN DE HABILIDADES BÁSICAS DE COMBATE:
          </p>

          <div class="options">
            <label>ÓPTIMO PARA EL COMBATE: <input v-model="datos.certificacionCombate" type="radio" value="OPTIMO_COMBATE"></label>
            <label>APTO PARA EL COMBATE: <input v-model="datos.certificacionCombate" type="radio" value="APTO_COMBATE"></label>
            <label>NO APTO PARA EL COMBATE: <input v-model="datos.certificacionCombate" type="radio" value="NO_APTO_COMBATE"></label>
            <label>NO CERTIFICADO: <input v-model="datos.certificacionCombate" type="radio" value="NO_CERTIFICADO"></label>
          </div>

          <label class="limit-line">
            APTO CON LIMITACIONES:
            <input v-model="datos.limitacionesCombate" type="text">
          </label>
        </section>

        <h2>C. ANOTACIONES DE DEMÉRITO:</h2>

        <ol class="annotations">
          <li
            v-for="anotacion in demeritos"
            :key="anotacion.anotacion_id"
          >
            {{ lineaAnotacion(anotacion) }}
          </li>
        </ol>

        <h2>D. ANOTACIONES DE MÉRITO:</h2>

        <ol class="annotations">
          <li
            v-for="anotacion in meritos"
            :key="anotacion.anotacion_id"
          >
            {{ lineaAnotacion(anotacion) }}
          </li>
        </ol>

        <label class="signature page-break">
          <strong>E. FIRMA DEL CALIFICADOR DIRECTO:</strong>
          <input v-model="datos.firmaCalificadorDirecto" type="text">
          <span>GRADO, NOMBRE Y APELLIDOS</span>
        </label>

        <div class="knowledge">
          <span>TOMÉ CONOCIMIENTO EL</span>
          <input v-model="datos.fechaTomaConocimientoDia" type="text">
          <span>DE</span>
          <input v-model="datos.fechaTomaConocimientoMes" type="text">
          <span>DE</span>
          <input v-model="datos.fechaTomaConocimientoAnio" type="text">
        </div>

        <label class="signature">
          <strong>F. FIRMA DEL CALIFICADO:</strong>
          <input v-model="datos.firmaCalificado" type="text">
          <span>GRADO, NOMBRE Y APELLIDOS</span>
        </label>
      </article>
    </section>
  </AppLayout>
</template>

<style scoped>
.actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 9px; }
.notice { padding: 13px 15px; border-radius: var(--hv-radius-sm); font-size: 13px; }
.notice--error { color: var(--hv-danger); background: var(--hv-danger-soft); border: 1px solid #f2c8cc; }
.notice--success { color: var(--hv-success); background: var(--hv-success-soft); border: 1px solid #bce2cb; }
.loading-state { min-height: 300px; display: grid; place-items: center; }
.stage { padding: 24px; overflow: auto; background: #e7ebf0; border-radius: 16px; }
.sheet { width: 216mm; min-height: 330mm; margin: 0 auto; padding: 13mm 17mm; box-sizing: border-box; color: #111; background: #fff; box-shadow: 0 18px 50px rgba(25,39,58,.17); font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.25; }
.unit { width: 58mm; display: grid; text-align: center; }
.unit span, .help, .signature span { font-size: 8pt; }
h1 { margin: 8mm 0 0; text-align: center; font-size: 13pt; letter-spacing: .2em; line-height: 1.5; }
.exclusive { margin: 1mm 0 8mm; text-align: center; font-weight: 700; }
.del-line { display: grid; grid-template-columns: 12mm 1fr; gap: 3mm; }
.del-line strong, .period strong, input { border: 0; border-bottom: 1px solid #111; background: transparent; font: inherit; }
.help { margin: 1mm 0 6mm 15mm; text-align: center; }
.period { display: grid; grid-template-columns: auto 12mm auto 28mm auto 17mm auto 12mm auto 28mm auto 17mm; gap: 2mm; align-items: end; }
.period strong { text-align: center; }
h2 { margin: 7mm 0 3mm; font-size: 11pt; }
.specialties p, .cert-section p { margin: 0 0 3mm; }
.specialty-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 10mm; }
.specialty-grid label { display: flex; gap: 3mm; }
.specialty-grid input { flex: 1; }
.options { display: flex; flex-wrap: wrap; gap: 3mm 8mm; margin-bottom: 4mm; }
.options label { white-space: nowrap; }
.limit-line { display: flex; gap: 3mm; }
.limit-line input { flex: 1; }
.annotations { min-height: 25mm; margin: 0 0 5mm 8mm; padding-left: 8mm; }
.annotations li { margin-bottom: 2mm; }
.signature { margin-top: 9mm; display: grid; gap: 2mm; text-align: center; }
.signature input { width: 95mm; margin: 0 auto; text-align: center; }
.knowledge { margin-top: 8mm; display: flex; gap: 2mm; align-items: end; justify-content: center; }
.knowledge input { width: 24mm; text-align: center; }
.page-break { break-before: page; page-break-before: always; }

@media print {
  @page { size: 216mm 330mm; margin: 0; }
  .no-print { display: none !important; }
  :deep(.app-layout__header), :deep(.app-layout__notice), :deep(.app-layout__summary), :deep(.app-layout__footer) { display: none !important; }
  .stage { padding: 0; background: #fff; }
  .sheet { width: 216mm; min-height: 330mm; padding: 13mm 17mm; box-shadow: none; }
}
</style>
