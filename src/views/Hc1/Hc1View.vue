<script setup lang="ts">
import {
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'

import AppLayout from '../../components/layout/AppLayout.vue'

import {
  crearHc1DatosVacios,
  guardarDocumentoCalificacion,
  obtenerDocumentoCalificacion,
} from '../../services/documentosCalificacion'

import type {
  DocumentoCalificacionResumen,
  Hc1Datos,
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
const datos = reactive<Hc1Datos>(crearHc1DatosVacios())

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
  origen: Hc1Datos,
): void {
  Object.assign(datos, {
    ...crearHc1DatosVacios(),
    ...origen,
    cargos:
      origen.cargos?.length
        ? origen.cargos
        : ['', '', ''],
    examenes: {
      ...crearHc1DatosVacios().examenes,
      ...origen.examenes,
    },
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

function mostrarExamenes(): boolean {
  const codigo =
    resumen.value?.categoria_codigo
      ?.toUpperCase() ?? ''

  return [
    'CLASE',
    'SUBOFICIAL',
    'SG2',
    'SG1',
    'SOF',
    'SOM',
  ].some(valor => codigo.includes(valor))
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const documento =
      await obtenerDocumentoCalificacion<Hc1Datos>(
        'HC1',
        props.hojaVidaId,
        crearHc1DatosVacios(),
      )

    resumen.value = documento.resumen
    copiarDatos(documento.datos)
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
      'HC1',
      props.hojaVidaId,
      datos,
    )

    mensaje.value =
      'HC1 guardada correctamente.'
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
    title="HC1"
    subtitle="Calificación Hoja N.º 1"
    max-width="full"
    compact
    hide-header
  >

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
      Cargando HC1…
    </section>

    <section
      v-else-if="resumen"
      class="stage"
    >
      <div class="floating-actions no-print">
        <button
          class="floating-action"
          type="button"
          title="Volver"
          @click="emit('volver')"
        >
          ←
        </button>

        <button
          class="floating-action"
          type="button"
          title="Imprimir"
          @click="imprimir"
        >
          ⎙
        </button>

        <button
          class="floating-action floating-action--primary"
          type="button"
          title="Guardar"
          :disabled="guardando"
          @click="guardar"
        >
          {{
            guardando
              ? '…'
              : '✓'
          }}
        </button>
      </div>

      <article class="sheet">
        <header class="top">
          <div class="unit">
            <strong>BRIMOT N.º 1 “CALAMA”</strong>
            <span>UNIDAD</span>
          </div>

          <div class="run">
            <strong>RUN N°:</strong>
            <span>{{ resumen.run }}</span>
          </div>
        </header>

        <h1>
          C A L I F I C A C I Ó N&nbsp;&nbsp; H O J A&nbsp;&nbsp; N °&nbsp;&nbsp; 1
        </h1>

        <h2>C A T E G O R Í A</h2>

        <h3>
          {{
            resumen.categoria_nombre
              .toUpperCase()
              .split('')
              .join(' ')
          }}
        </h3>

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

        <h4>A. DATOS GENERALES</h4>

        <section class="numbered">
          <div class="block">
            <span>1.</span>
            <div>
              <p>
                Cargos, puestos y comisiones administrativas desempeñadas durante el período:
              </p>

              <label>
                a)
                <input v-model="datos.cargos[0]" type="text">
              </label>

              <label>
                b)
                <input v-model="datos.cargos[1]" type="text">
              </label>

              <label>
                c)
                <input v-model="datos.cargos[2]" type="text">
              </label>
            </div>
          </div>

          <div class="time-row">
            <span>2.</span>
            <span>Tiempo en el grado</span>
            <span>:</span>
            <input v-model="datos.tiempoGradoAnios" type="text">
            <span>años y</span>
            <input v-model="datos.tiempoGradoMeses" type="text">
            <span>meses (*)</span>
          </div>

          <div class="time-row">
            <span>3.</span>
            <span>Tiempo efectivo en la Institución</span>
            <span>:</span>
            <input v-model="datos.tiempoInstitucionAnios" type="text">
            <span>años y</span>
            <input v-model="datos.tiempoInstitucionMeses" type="text">
            <span>meses (*)</span>
          </div>

          <div class="time-row">
            <span>4.</span>
            <span>Tiempo válido para el retiro</span>
            <span>:</span>
            <input v-model="datos.tiempoRetiroAnios" type="text">
            <span>años y</span>
            <input v-model="datos.tiempoRetiroMeses" type="text">
            <span>meses (*)</span>
          </div>

          <div class="block">
            <span>5.</span>
            <div>
              <p>
                Cursos y estudios institucionales finalizados durante el período:
              </p>

              <label>
                a) Denominación:
                <input v-model="datos.cursoDenominacion" type="text">
              </label>

              <div class="course-row">
                <span>b) Desde el</span>
                <input v-model="datos.cursoDesde" type="date">
                <span>hasta el</span>
                <input v-model="datos.cursoHasta" type="date">
                <span>aprobado:</span>

                <label class="check">
                  SÍ
                  <input
                    v-model="datos.cursoAprobado"
                    type="radio"
                    value="SI"
                  >
                </label>

                <label class="check">
                  NO
                  <input
                    v-model="datos.cursoAprobado"
                    type="radio"
                    value="NO"
                  >
                </label>
              </div>

              <div class="course-row">
                <span>con: Nota</span>
                <input v-model="datos.cursoNota" type="text">
                <span>; ocupó el</span>
                <input v-model="datos.cursoPuesto" type="text">
                <span>puesto entre alumnos.</span>
              </div>
            </div>
          </div>

          <div
            v-if="mostrarExamenes()"
            class="block"
          >
            <span>6.</span>

            <div>
              <p>
                Exámenes rendidos durante el período:
              </p>

              <div class="exam-row">
                <span>1er. año Eje Doctrinario</span>
                <label>Reprobado <input v-model="datos.examenes.ejeDoctrinario" type="radio" value="REPROBADO"></label>
                <label>Aprobado <input v-model="datos.examenes.ejeDoctrinario" type="radio" value="APROBADO"></label>
              </div>

              <div class="exam-row">
                <span>2do. año Eje Complementario</span>
                <label>Reprobado <input v-model="datos.examenes.ejeComplementario" type="radio" value="REPROBADO"></label>
                <label>Aprobado <input v-model="datos.examenes.ejeComplementario" type="radio" value="APROBADO"></label>
              </div>

              <div class="exam-row">
                <span>3er. año Eje Táctico Técnico</span>
                <label>Reprobado <input v-model="datos.examenes.ejeTacticoTecnico" type="radio" value="REPROBADO"></label>
                <label>Aprobado <input v-model="datos.examenes.ejeTacticoTecnico" type="radio" value="APROBADO"></label>
              </div>
            </div>
          </div>

          <div class="block">
            <span>{{ mostrarExamenes() ? '7.' : '6.' }}</span>

            <div>
              <p>
                Acreditación de idioma: (obligación para oficiales y voluntario para el C.P)
              </p>

              <div class="language-lines">
                <span>Ha obtenido el siguiente nivel de acreditación en el idioma</span>
                <input v-model="datos.idioma" type="text">
                <span>nivel</span>
                <input v-model="datos.idiomaNivel" type="text">
                <span>el</span>
                <input v-model="datos.idiomaFecha" type="date">
                <span>, no registra acreditación caducada desde el</span>
                <input v-model="datos.idiomaNoRegistraCaducadaDesde" type="date">
              </div>
            </div>
          </div>

          <div class="civil-row">
            <span>{{ mostrarExamenes() ? '8.' : '7.' }}</span>
            <span>Estado Civil:</span>
            <input v-model="datos.estadoCivil" type="text">
            <span>{{ mostrarExamenes() ? '9.' : '8.' }}</span>
            <span>Número de hijos:</span>
            <input v-model="datos.numeroHijos" type="text">
          </div>
        </section>

        <footer class="notes">
          <p>
            NOTA: Los tiempos de los N.os 2, 3 y 4 deben ser calculados al 31.DIC. de cada año.
          </p>

          <p>
            (*) El Tiempo efectivo en la Institución como oficial, cuadro permanente o empleado civil.
          </p>

          <p>
            (**) El Tiempo válido para el retiro debe considerarse lo señalado en art.77 de la LOC.
          </p>
        </footer>
      </article>
    </section>
  </AppLayout>
</template>

<style scoped>
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 9px;
}

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

.loading-state {
  min-height: 300px;
  display: grid;
  place-items: center;
}

.stage {
  padding: 24px;
  overflow: auto;
  background: #e7ebf0;
  border-radius: 16px;
}

.sheet {
  width: 216mm;
  min-height: 330mm;
  margin: 0 auto;
  padding: 13mm 18mm;
  box-sizing: border-box;
  color: #111;
  background: #fff;
  box-shadow: 0 18px 50px rgba(25, 39, 58, 0.17);
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11pt;
  line-height: 1.2;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: start;
}

.unit {
  display: grid;
  text-align: center;
}

.unit span {
  font-size: 9pt;
}

.run {
  display: flex;
  gap: 6mm;
}

h1,
h2,
h3 {
  margin: 5mm 0 0;
  text-align: center;
  letter-spacing: 0.35em;
}

h1 {
  font-size: 14pt;
}

h2 {
  font-size: 12pt;
}

h3 {
  font-size: 12pt;
  font-weight: 800;
}

.del-line {
  margin-top: 10mm;
  display: grid;
  grid-template-columns: 12mm 1fr;
  gap: 3mm;
}

.del-line strong,
.period strong,
input {
  border: 0;
  border-bottom: 1px solid #111;
  background: transparent;
  font: inherit;
}

.help {
  margin: 1mm 0 6mm 15mm;
  text-align: center;
  font-size: 8pt;
}

.period {
  display: grid;
  grid-template-columns: auto 12mm auto 28mm auto 17mm auto 12mm auto 28mm auto 17mm;
  gap: 2mm;
  align-items: end;
}

.period strong {
  text-align: center;
}

h4 {
  margin: 8mm 0 5mm;
}

.numbered {
  display: grid;
  gap: 4mm;
}

.block {
  display: grid;
  grid-template-columns: 8mm 1fr;
  gap: 2mm;
}

.block p {
  margin: 0 0 2mm;
}

.block label {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3mm;
  margin-bottom: 2mm;
}

.time-row,
.course-row,
.exam-row,
.language-lines,
.civil-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2mm;
  align-items: end;
}

.time-row input {
  width: 18mm;
  text-align: center;
}

.course-row input[type='date'] {
  width: 34mm;
}

.course-row input[type='text'] {
  width: 24mm;
}

.check {
  display: inline-flex !important;
  grid-template-columns: none !important;
  gap: 2mm !important;
  margin: 0 !important;
}

.exam-row span {
  min-width: 58mm;
}

.exam-row label {
  display: inline-flex !important;
  grid-template-columns: none !important;
  gap: 2mm !important;
  margin: 0 !important;
}

.language-lines input[type='text'] {
  width: 32mm;
}

.language-lines input[type='date'] {
  width: 34mm;
}

.civil-row input {
  width: 36mm;
}

.notes {
  margin-top: 9mm;
  font-size: 9pt;
}

.notes p {
  margin: 2mm 0;
}

@media print {
  @page {
    size: 216mm 330mm;
    margin: 0;
  }

  .no-print {
    display: none !important;
  }

  :deep(.app-layout__header),
  :deep(.app-layout__notice),
  :deep(.app-layout__summary),
  :deep(.app-layout__footer) {
    display: none !important;
  }

  .stage {
    padding: 0;
    background: #fff;
  }

  .sheet {
    width: 216mm;
    min-height: 330mm;
    padding: 13mm 18mm;
    box-shadow: none;
  }
}

.stage {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 110px);
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.sheet {
  margin-top: 0 !important;
}

.floating-actions {
  position: fixed;
  top: 86px;
  right: 24px;
  z-index: 20;
  display: flex;
  gap: 7px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.10);
  backdrop-filter: blur(14px);
}

.floating-action {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  color: #334155;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  font-weight: 850;
  cursor: pointer;
}

.floating-action:hover:not(:disabled) {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.floating-action--primary {
  color: #ffffff;
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.floating-action--primary:hover:not(:disabled) {
  color: #ffffff;
  background: #1e40af;
}

.floating-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

</style>
