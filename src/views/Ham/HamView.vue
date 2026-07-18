<script setup lang="ts">
import {
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'

import AppLayout from '../../components/layout/AppLayout.vue'

import {
  crearHamDatosVacios,
  guardarDocumentoCalificacion,
  obtenerDocumentoCalificacion,
} from '../../services/documentosCalificacion'

import type {
  DocumentoCalificacionResumen,
  HamDatos,
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
const datos = reactive<HamDatos>(crearHamDatosVacios())

const licenciasNombres = [
  'Primera',
  'Segunda',
  'Tercera',
  'Cuarta',
  'Quinta',
  'Sexta',
  'Séptima',
  'Octava',
  'Novena',
  'Décima',
  'Undécima',
  'Otras',
]

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
  origen: HamDatos,
): void {
  Object.assign(datos, {
    ...crearHamDatosVacios(),
    ...origen,
    licencias:
      origen.licencias?.length
        ? origen.licencias
        : crearHamDatosVacios().licencias,
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

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const documento =
      await obtenerDocumentoCalificacion<HamDatos>(
        'HAM',
        props.hojaVidaId,
        crearHamDatosVacios(),
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
      'HAM',
      props.hojaVidaId,
      datos,
    )

    mensaje.value =
      'HAM guardada correctamente.'
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
    title="HAM"
    subtitle="Hoja de Antecedentes Médicos Anuales"
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
      Cargando HAM…
    </section>

    <section
      v-else-if="resumen"
      class="stage"
    >
      <article class="sheet">
        <header class="unit">
          <strong>BRIMOT N.º 1 “CALAMA”</strong>
          <span>UNIDAD</span>
        </header>

        <h1>HOJA DE ANTECEDENTES MÉDICOS ANUALES</h1>
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

        <h2>A. CALIFICACIÓN MÉDICA</h2>

        <p class="paragraph-line">
          Con fecha
          <input v-model="datos.fechaExamenSaludDia" type="text">
          de
          <input v-model="datos.fechaExamenSaludMes" type="text">
          del
          <input v-model="datos.fechaExamenSaludAnio" type="text">
          , se efectuó el examen de salud, en cumplimiento con lo dispuesto en el Art. 37 del DNL. 928 de 1982 “Reglamento de Medicina Preventiva de las FAs.”, en consecuencia y de acuerdo con los antecedentes de la ficha médica, el estado de salud es el que se indica:
        </p>

        <section class="numbered">
          <div class="row-title">
            <strong>1.</strong>
            <strong>
              ESTADO DE SALUD PARA CONTINUAR AL SERVICIO DE LA INSTITUCIÓN
            </strong>
          </div>

          <div class="option-grid">
            <label>a. APTO MÉDICO: <input v-model="datos.estadoSalud" type="radio" value="APTO_MEDICO"></label>
            <label>b. APTO MÉDICO CON CAPACIDAD LIMITADA: <input v-model="datos.estadoSalud" type="radio" value="APTO_LIMITADA"></label>
            <label>TEMPORAL <input v-model="datos.capacidadLimitada" type="radio" value="TEMPORAL"></label>
            <label>PERMANENTE <input v-model="datos.capacidadLimitada" type="radio" value="PERMANENTE"></label>
            <label>c. NO APTO MÉDICO: <input v-model="datos.estadoSalud" type="radio" value="NO_APTO"></label>
          </div>

          <div class="measure-row">
            <strong>2.</strong>
            <span>MEDIDAS PONDO ESTATURAL:</span>
            <span>Estatura:</span>
            <input v-model="datos.estatura" type="text">
            <span>Peso:</span>
            <input v-model="datos.peso" type="text">
            <span>IMC:</span>
            <input v-model="datos.imc" type="text">
            <span>Clasificación:</span>
            <input v-model="datos.clasificacionImc" type="text">
          </div>

          <div class="measure-row">
            <strong>3.</strong>
            <span>LICENCIAS DURANTE EL PERÍODO:</span>
            <span>Cantidad de Licencias:</span>
            <input v-model="datos.licenciasCantidad" type="text">
            <span>Días acumulados:</span>
            <input v-model="datos.licenciasDias" type="text">
          </div>

          <table class="lic-table">
            <tbody>
              <tr
                v-for="(nombre, indice) in licenciasNombres"
                :key="nombre"
              >
                <th>{{ nombre }}</th>
                <td>
                  Licencia Desde -
                  <input v-model="datos.licencias[indice].desde" type="date">
                  Hasta
                  <input v-model="datos.licencias[indice].hasta" type="date">
                </td>
              </tr>
            </tbody>
          </table>

          <div class="yes-no">
            <strong>4.</strong>
            <span>RESOLUCIONES COMISIÓN DE SANIDAD DEL EJÉRCITO:</span>
            <label>SÍ <input v-model="datos.resolucionSanidadEjercito" type="radio" value="SI"></label>
            <label>NO <input v-model="datos.resolucionSanidadEjercito" type="radio" value="NO"></label>
          </div>

          <div class="yes-no">
            <strong>5.</strong>
            <span>RESOLUCIONES COMISIÓN CENTRAL DE MEDICINA PREVENTIVA:</span>
            <label>SÍ <input v-model="datos.resolucionMedicinaPreventiva" type="radio" value="SI"></label>
            <label>NO <input v-model="datos.resolucionMedicinaPreventiva" type="radio" value="NO"></label>
          </div>

          <div class="yes-no">
            <strong>6.</strong>
            <span>RESOLUCIONES COMISIÓN DE SANIDAD SECUNDARIA:</span>
            <label>SÍ <input v-model="datos.resolucionSanidadSecundaria" type="radio" value="SI"></label>
            <label>NO <input v-model="datos.resolucionSanidadSecundaria" type="radio" value="NO"></label>
          </div>

          <div class="yes-no">
            <strong>7.</strong>
            <span>APTO PARA PORTAR ARMAS: (Solo para personal militar activo)</span>
            <label>SÍ <input v-model="datos.aptoPortarArmas" type="radio" value="SI"></label>
            <label>NO <input v-model="datos.aptoPortarArmas" type="radio" value="NO"></label>
          </div>

          <label class="textarea-line">
            <strong>8. OBSERVACIONES DE LA CALIFICACIÓN MÉDICA:</strong>
            <textarea v-model="datos.observacionesMedicas"></textarea>
          </label>

          <div class="eval-grid">
            <span>1RA Evaluación</span><span>Peso:</span><input v-model="datos.primeraEvaluacionPeso" type="text"><span>Talla:</span><input v-model="datos.primeraEvaluacionTalla" type="text"><span>IMC:</span><input v-model="datos.primeraEvaluacionImc" type="text"><span>1ER DNI:</span><input v-model="datos.primerDni" type="text">
            <span>2DA Evaluación</span><span>Peso:</span><input v-model="datos.segundaEvaluacionPeso" type="text"><span>Talla:</span><input v-model="datos.segundaEvaluacionTalla" type="text"><span>IMC:</span><input v-model="datos.segundaEvaluacionImc" type="text"><span>2DO DNI:</span><input v-model="datos.segundoDni" type="text">
            <span>Bioimpedanciometría</span><span>Peso:</span><input v-model="datos.bioPeso" type="text"><span>Talla:</span><input v-model="datos.bioTalla" type="text"><span>IMC:</span><input v-model="datos.bioImc" type="text"><span>Clasificación final:</span><input v-model="datos.bioClasificacionFinal" type="text">
          </div>

          <label class="signature">
            <strong>9. FIRMA DEL OFICIAL DE SANIDAD:</strong>
            <input v-model="datos.firmaOficialSanidad" type="text">
            <span>GRADO, NOMBRE Y APELLIDOS</span>
          </label>
        </section>

        <h2 class="page-break">B. CALIFICACIÓN ODONTOLÓGICA</h2>

        <p class="paragraph-line">
          Con fecha
          <input v-model="datos.fechaExamenOdontologicoDia" type="text">
          de
          <input v-model="datos.fechaExamenOdontologicoMes" type="text">
          del
          <input v-model="datos.fechaExamenOdontologicoAnio" type="text">
          , se efectuó el examen odontológico, en consecuencia y de acuerdo con los antecedentes de la ficha odontológica, el estado de salud oral es el que se indica:
        </p>

        <div class="row-title">
          <strong>1.</strong>
          <strong>ESTADO DE SALUD: (Indicar con una X el estado de salud que corresponde)</strong>
        </div>

        <div class="option-grid">
          <label>a. SANO: <input v-model="datos.estadoOdontologico" type="radio" value="SANO"></label>
          <label>b. DE RIESGO: <input v-model="datos.estadoOdontologico" type="radio" value="RIESGO"></label>
          <label>c. DE ALTO RIESGO: <input v-model="datos.estadoOdontologico" type="radio" value="ALTO_RIESGO"></label>
        </div>

        <label class="textarea-line">
          <strong>2. OBSERVACIONES DE LA CALIFICACIÓN ODONTOLÓGICA:</strong>
          <textarea v-model="datos.observacionesOdontologicas"></textarea>
        </label>

        <label class="signature">
          <strong>3. FIRMA DEL OFICIAL DE SANIDAD DENTAL:</strong>
          <input v-model="datos.firmaOficialSanidadDental" type="text">
          <span>GRADO, NOMBRE Y APELLIDOS</span>
        </label>

        <label class="signature">
          <strong>C. FIRMA DEL CALIFICADOR DIRECTO:</strong>
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
          <strong>D. FIRMA DEL CALIFICADO:</strong>
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
.sheet { width: 216mm; min-height: 330mm; margin: 0 auto; padding: 13mm 17mm; box-sizing: border-box; color: #111; background: #fff; box-shadow: 0 18px 50px rgba(25,39,58,.17); font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.25; }
.unit { width: 58mm; display: grid; text-align: center; }
.unit span, .help, .signature span { font-size: 8pt; }
h1 { margin: 8mm 0 0; text-align: center; font-size: 14pt; }
.exclusive { margin: 1mm 0 8mm; text-align: center; font-weight: 700; }
.del-line { display: grid; grid-template-columns: 12mm 1fr; gap: 3mm; }
.del-line strong, .period strong, input, textarea { border: 0; border-bottom: 1px solid #111; background: transparent; font: inherit; }
.help { margin: 1mm 0 6mm 15mm; text-align: center; }
.period { display: grid; grid-template-columns: auto 12mm auto 28mm auto 17mm auto 12mm auto 28mm auto 17mm; gap: 2mm; align-items: end; }
.period strong { text-align: center; }
h2 { margin: 8mm 0 4mm; font-size: 12pt; }
.paragraph-line { text-align: justify; }
.paragraph-line input { width: 22mm; text-align: center; }
.numbered { display: grid; gap: 3mm; }
.row-title { display: grid; grid-template-columns: 8mm 1fr; gap: 2mm; }
.option-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; }
.measure-row, .yes-no, .knowledge { display: flex; flex-wrap: wrap; gap: 2mm; align-items: end; }
.measure-row input { width: 22mm; }
.yes-no span { flex: 1; }
.lic-table { width: 100%; border-collapse: collapse; }
.lic-table th, .lic-table td { border: 1px solid #111; padding: 1.5mm; text-align: left; }
.lic-table th { width: 25mm; }
.lic-table input { width: 34mm; }
.textarea-line { display: grid; gap: 2mm; }
textarea { min-height: 22mm; resize: vertical; }
.eval-grid { display: grid; grid-template-columns: 30mm 12mm 20mm 12mm 20mm 10mm 20mm 16mm 1fr; gap: 1mm 2mm; align-items: end; }
.signature { margin-top: 7mm; display: grid; gap: 2mm; text-align: center; }
.signature input { width: 95mm; margin: 0 auto; text-align: center; }
.page-break { break-before: page; page-break-before: always; }
.knowledge input { width: 24mm; text-align: center; }

@media print {
  @page { size: 216mm 330mm; margin: 0; }
  .no-print { display: none !important; }
  :deep(.app-layout__header), :deep(.app-layout__notice), :deep(.app-layout__summary), :deep(.app-layout__footer) { display: none !important; }
  .stage { padding: 0; background: #fff; }
  .sheet { width: 216mm; min-height: 330mm; padding: 13mm 17mm; box-shadow: none; }
}
</style>
