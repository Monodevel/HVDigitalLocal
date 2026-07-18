<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'

import AppLayout from '../../components/layout/AppLayout.vue'
import AppCard from '../../components/ui/AppCard.vue'

import {
  anularBorradorHojaVida,
  listarAnotacionesHojaVida,
  listarBorradoresHojaVida,
  obtenerHojaVidaResumen,
} from '../../services/hojaVida'

import {
  estamparAnotacion,
  validarEstampadoAnotacion,
} from '../../services/estampadoAnotaciones'

import type {
  AnotacionHojaVida,
  BorradorHojaVida,
  HojaVidaResumen,
} from '../../types/hojaVida'

import type {
  OrigenAnotacion,
} from '../../types/estampadoAnotaciones'

const props = defineProps<{
  hojaVidaId: number
}>()

const emit = defineEmits<{
  volver: []
  nuevaAnotacion: [hojaVidaId: number]
}>()

const cargando = ref(true)
const procesando = ref(false)
const modalEstampado = ref(false)

const panelBorradoresExpandido = ref(false)

function alternarPanelBorradores(): void {
  panelBorradoresExpandido.value =
    !panelBorradoresExpandido.value
}

const error = ref('')
const mensaje = ref('')

const resumen = ref<HojaVidaResumen | null>(null)
const borradores = ref<BorradorHojaVida[]>([])
const anotaciones = ref<AnotacionHojaVida[]>([])
const borradorSeleccionado = ref<BorradorHojaVida | null>(null)

const estampado = reactive({
  origen: 'CALIFICADOR_DIRECTO' as OrigenAnotacion,
})

const mesesDocumento = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
]

const mesesLargos = [
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

const totalFilas = 62
const filasPrimerBloque = 28

const tituloModal = computed(() =>
  borradorSeleccionado.value
    ?.titulo_final ??
  borradorSeleccionado.value
    ?.plantilla_nombre ??
  'Anotación',
)

const nombreCalificado = computed(() => {
  const hoja = resumen.value

  if (!hoja) {
    return 'XXX. (X) XXXXXX XXXX XXXXXX XXXXX'
  }

  return [
    hoja.grado_calidad_abreviatura,
    hoja.nombre_completo,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
})

const subtituloCalificado = computed(() =>
  '(GRADO, CATEGORÍA O ESCALAFÓN,  APELLIDOS Y NOMBRES)',
)

const filasAnotaciones = computed(() => {
  const filas: Array<AnotacionHojaVida | null> =
    [...anotaciones.value]

  while (filas.length < totalFilas) {
    filas.push(null)
  }

  return filas.slice(0, totalFilas)
})

const filasBloqueSuperior = computed(() =>
  filasAnotaciones.value.slice(
    0,
    filasPrimerBloque,
  ),
)

const filasBloqueInferior = computed(() =>
  filasAnotaciones.value.slice(
    filasPrimerBloque,
  ),
)

function partesFecha(
  fecha: string | null | undefined,
): {
  dia: string
  mesNumero: string
  mesNombre: string
  anio: string
} {
  if (!fecha) {
    return {
      dia: '',
      mesNumero: '',
      mesNombre: '',
      anio: '',
    }
  }

  const [anio, mes, dia] =
    fecha.slice(0, 10).split('-')

  const indiceMes = Number(mes) - 1

  return {
    dia: dia ?? '',
    mesNumero: mes ?? '',
    mesNombre:
      indiceMes >= 0 &&
      indiceMes < mesesLargos.length
        ? mesesLargos[indiceMes]
        : '',
    anio: anio ?? '',
  }
}

function formatearFechaDocumento(
  fecha: string | null | undefined,
): string {
  if (!fecha) {
    return ''
  }

  const partes = partesFecha(fecha)
  const indiceMes =
    Number(partes.mesNumero) - 1

  if (
    !partes.anio ||
    !partes.dia ||
    indiceMes < 0 ||
    indiceMes >= mesesDocumento.length
  ) {
    return fecha
  }

  return `${partes.dia}${mesesDocumento[indiceMes]}${partes.anio}`
}

function fechaInicioPeriodo() {
  return partesFecha(
    resumen.value?.fecha_inicio,
  )
}

function fechaTerminoPeriodo() {
  return partesFecha(
    resumen.value?.fecha_termino,
  )
}

function tituloAnotacion(
  anotacion: AnotacionHojaVida,
): string {
  return (
    anotacion.titulo_final ??
    anotacion.plantilla_nombre ??
    ''
  ).toUpperCase()
}

function colorAnotacion(
  anotacion: AnotacionHojaVida | BorradorHojaVida,
): string {
  if (anotacion.color_hex) {
    return anotacion.color_hex
  }

  return anotacion.color_semantico === 'ROJO'
    ? '#b4232d'
    : '#111111'
}

function lineaResolucion(
  anotacion: AnotacionHojaVida | BorradorHojaVida,
): string {
  if (!anotacion.numero_resolucion) {
    return ''
  }

  return [
    `RES. EXENTA N.º ${anotacion.numero_resolucion}`,
    'de fecha',
    formatearFechaDocumento(
      anotacion.fecha_resolucion,
    ),
  ].join(' ')
}


function textoAnotacion(
  anotacion: AnotacionHojaVida,
): string {
  const partes = [
    tituloAnotacion(anotacion),
    anotacion.concepto_nombre ?? '',
    anotacion.cuerpo_final ?? '',
    lineaResolucion(anotacion),
  ].filter(parte => parte.trim().length > 0)

  return partes.join('\n')
}

function fechaAnotacion(
  anotacion: AnotacionHojaVida | null,
) {
  return partesFecha(
    anotacion?.fecha_anotacion,
  )
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const [
      resumenResultado,
      borradoresResultado,
      anotacionesResultado,
    ] = await Promise.all([
      obtenerHojaVidaResumen(props.hojaVidaId),
      listarBorradoresHojaVida(props.hojaVidaId),
      listarAnotacionesHojaVida(props.hojaVidaId),
    ])

    if (!resumenResultado) {
      throw new Error(
        'No se encontró la Hoja de Vida solicitada.',
      )
    }

    resumen.value = resumenResultado
    borradores.value = borradoresResultado
    anotaciones.value = anotacionesResultado
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

function abrirEstampado(
  borrador: BorradorHojaVida,
): void {
  borradorSeleccionado.value = borrador
  estampado.origen = 'CALIFICADOR_DIRECTO'
  modalEstampado.value = true
}

function cerrarEstampado(): void {
  if (procesando.value) {
    return
  }

  modalEstampado.value = false
  borradorSeleccionado.value = null
}

async function confirmarEstampado():
Promise<void> {
  const borrador = borradorSeleccionado.value

  if (!borrador) {
    return
  }

  procesando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const solicitud = {
      borradorId: borrador.borrador_id,
      origen: estampado.origen,
      resolucionDocumentalId:
        borrador.requiere_resolucion === 1
          ? borrador.resolucion_documental_id
          : null,
    }

    const validacion =
      await validarEstampadoAnotacion(
        solicitud,
      )

    if (!validacion.valido) {
      throw new Error(
        validacion.errores.join(' '),
      )
    }

    const resultado =
      await estamparAnotacion(
        solicitud,
      )

    mensaje.value =
      `Anotación N.º ${resultado.anotacionId} estampada correctamente.`

    modalEstampado.value = false
    borradorSeleccionado.value = null

    await cargar()
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    procesando.value = false
  }
}

async function anularBorrador(
  borrador: BorradorHojaVida,
): Promise<void> {
  const confirmado = window.confirm(
    '¿Desea anular este borrador?',
  )

  if (!confirmado) {
    return
  }

  procesando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    await anularBorradorHojaVida(
      borrador.borrador_id,
    )

    mensaje.value =
      'Borrador anulado correctamente.'

    await cargar()
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    procesando.value = false
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
    title="Hoja de Vida"
    subtitle="Formato oficial tipo formulario"
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
      Cargando Hoja de Vida…
    </section>

    <template v-else-if="resumen">
      <div class="page-grid">
        <div
          class="floating-toolbar no-print"
          aria-label="Acciones Hoja de Vida"
        >
          <button
            class="floating-toolbar__button"
            type="button"
            title="Volver"
            @click="emit('volver')"
          >
            ←
          </button>

          <button
            class="floating-toolbar__button"
            type="button"
            title="Actualizar"
            @click="cargar"
          >
            ↻
          </button>

          <button
            class="floating-toolbar__button"
            type="button"
            title="Imprimir"
            @click="imprimir"
          >
            ⎙
          </button>

          <button
            class="floating-toolbar__button floating-toolbar__button--primary"
            type="button"
            title="Nueva anotación"
            :disabled="
              resumen?.hoja_vida_estado !== 'abierta'
            "
            @click="
              emit(
                'nuevaAnotacion',
                props.hojaVidaId,
              )
            "
          >
            +
          </button>
        </div>

        <section class="sheet-stage">
          <article class="hv-official-sheet">
            <header class="sheet-top">
              <div class="unit-block">
                <strong>BRIMOT N.º 1 "CALAMA"</strong>
                <span>(Unidad o Repartición)</span>
              </div>

              <div class="folio-block">
                <span>HOJA N.º</span>
                <strong>01 (UNO)</strong>
              </div>
            </header>

            <h1 class="main-title">
              H O J A&nbsp;&nbsp;&nbsp;D E&nbsp;&nbsp;&nbsp;V I D A
            </h1>

            <section class="person-line">
              <span>DEL:</span>

              <strong>
                {{ nombreCalificado }}
              </strong>
            </section>

            <p class="person-help">
              {{ subtituloCalificado }}
            </p>

            <section class="period-line">
              <span>DESDE&nbsp;&nbsp;EL</span>
              <strong>{{ fechaInicioPeriodo().dia }}</strong>
              <span>DE</span>
              <strong>{{ fechaInicioPeriodo().mesNombre }}</strong>
              <span>DE</span>
              <strong>{{ fechaInicioPeriodo().anio }}</strong>

              <span>HASTA&nbsp;&nbsp;EL</span>
              <strong>{{ fechaTerminoPeriodo().dia }}</strong>
              <span>DE</span>
              <strong>{{ fechaTerminoPeriodo().mesNombre }}</strong>
              <span>DE</span>
              <strong>{{ fechaTerminoPeriodo().anio }}</strong>
            </section>

            <table class="official-table">
              <colgroup>
                <col class="col-date">
                <col class="col-date">
                <col class="col-date">
                <col class="col-annotation">
                <col class="col-signature">
                <col class="col-signature">
              </colgroup>
              <thead>
                <tr>
                  <th
                    colspan="3"
                    class="date-title"
                  >
                    F&nbsp;&nbsp;E&nbsp;&nbsp;C&nbsp;&nbsp;H&nbsp;&nbsp;A
                  </th>

                  <th
                    rowspan="2"
                    class="annotation-title-cell"
                  >
                    A&nbsp;&nbsp;N&nbsp;&nbsp;O&nbsp;&nbsp;T&nbsp;&nbsp;A&nbsp;&nbsp;C&nbsp;&nbsp;I&nbsp;&nbsp;O&nbsp;&nbsp;N&nbsp;&nbsp;E&nbsp;&nbsp;S
                  </th>

                  <th
                    colspan="2"
                    class="sign-title"
                  >
                    F&nbsp;&nbsp;I&nbsp;&nbsp;R&nbsp;&nbsp;M&nbsp;&nbsp;A&nbsp;&nbsp;S
                  </th>
                </tr>

                <tr>
                  <th>D</th>
                  <th>M</th>
                  <th>A</th>
                  <th class="signature-subtitle">CALIFICADOR</th>
                  <th class="signature-subtitle">CALIFICADO</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(
                    anotacion,
                    indice
                  ) in filasBloqueSuperior"
                  :key="`sup-${indice}`"
                  class="body-row"
                >
                  <td class="date-cell">
                    {{ fechaAnotacion(anotacion).dia }}
                  </td>

                  <td class="date-cell">
                    {{ fechaAnotacion(anotacion).mesNumero }}
                  </td>

                  <td class="date-cell">
                    {{ fechaAnotacion(anotacion).anio }}
                  </td>

                  <td
                    class="annotation-cell"
                    :style="{
                      color: anotacion
                        ? colorAnotacion(anotacion)
                        : '#111111',
                    }"
                  >
                    <template v-if="anotacion">
                      {{ textoAnotacion(anotacion) }}
                    </template>
                  </td>

                  <td class="signature-cell"></td>
                  <td class="signature-cell"></td>
                </tr>
              </tbody>
            </table>

            <div class="page-separator"></div>

            <table class="official-table official-table--second">
              <colgroup>
                <col class="col-date">
                <col class="col-date">
                <col class="col-date">
                <col class="col-annotation">
                <col class="col-signature">
                <col class="col-signature">
              </colgroup>
              <thead>
                <tr>
                  <th
                    colspan="3"
                    class="date-title"
                  >
                    F&nbsp;&nbsp;E&nbsp;&nbsp;C&nbsp;&nbsp;H&nbsp;&nbsp;A
                  </th>

                  <th
                    rowspan="2"
                    class="annotation-title-cell"
                  >
                    A&nbsp;&nbsp;N&nbsp;&nbsp;O&nbsp;&nbsp;T&nbsp;&nbsp;A&nbsp;&nbsp;C&nbsp;&nbsp;I&nbsp;&nbsp;O&nbsp;&nbsp;N&nbsp;&nbsp;E&nbsp;&nbsp;S
                  </th>

                  <th
                    colspan="2"
                    class="sign-title"
                  >
                    F&nbsp;&nbsp;I&nbsp;&nbsp;R&nbsp;&nbsp;M&nbsp;&nbsp;A&nbsp;&nbsp;S
                  </th>
                </tr>

                <tr>
                  <th>D</th>
                  <th>M</th>
                  <th>A</th>
                  <th class="signature-subtitle">CALIFICADOR</th>
                  <th class="signature-subtitle">CALIFICADO</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(
                    anotacion,
                    indice
                  ) in filasBloqueInferior"
                  :key="`inf-${indice}`"
                  class="body-row"
                >
                  <td class="date-cell">
                    {{ fechaAnotacion(anotacion).dia }}
                  </td>

                  <td class="date-cell">
                    {{ fechaAnotacion(anotacion).mesNumero }}
                  </td>

                  <td class="date-cell">
                    {{ fechaAnotacion(anotacion).anio }}
                  </td>

                  <td
                    class="annotation-cell"
                    :style="{
                      color: anotacion
                        ? colorAnotacion(anotacion)
                        : '#111111',
                    }"
                  >
                    <template v-if="anotacion">
                      {{ textoAnotacion(anotacion) }}
                    </template>
                  </td>

                  <td class="signature-cell"></td>
                  <td class="signature-cell"></td>
                </tr>
              </tbody>
            </table>

            <footer class="sheet-footer">
              <span>CÓDIGO 1-010-1480-00</span>
              <span>IGM TALLERES GRÁFICOS</span>
            </footer>
          </article>
        </section>

        <button
          class="draft-panel-toggle no-print"
          type="button"
          :aria-expanded="panelBorradoresExpandido"
          :title="
            panelBorradoresExpandido
              ? 'Ocultar borradores pendientes'
              : 'Mostrar borradores pendientes'
          "
          @click="alternarPanelBorradores"
        >
          <span>
            {{
              panelBorradoresExpandido
                ? '›'
                : '‹'
            }}
          </span>

          <strong>
            Borradores
          </strong>

          <em v-if="borradores.length > 0">
            {{ borradores.length }}
          </em>
        </button>

        <aside
          class="side-panel no-print"
          :class="{
            'side-panel--open':
              panelBorradoresExpandido,
          }"
        >
          <AppCard
            title="Borradores pendientes"
            subtitle="Anotaciones listas para estampar"
            padding="lg"
          >
            <div
              v-if="borradores.length === 0"
              class="empty-card"
            >
              No existen borradores pendientes.
            </div>

            <article
              v-for="borrador in borradores"
              v-else
              :key="borrador.borrador_id"
              class="draft-card"
            >
              <div class="draft-main">
                <small>
                  {{
                    formatearFechaDocumento(
                      borrador.fecha_anotacion,
                    )
                  }}
                </small>

                <strong
                  :style="{
                    color:
                      colorAnotacion(
                        borrador,
                      ),
                  }"
                >
                  {{
                    (
                      borrador.titulo_final ??
                      borrador.plantilla_nombre ??
                      ''
                    ).toUpperCase()
                  }}
                </strong>

                <span
                  v-if="
                    borrador.concepto_nombre
                  "
                >
                  {{
                    borrador.concepto_nombre
                  }}
                </span>

                <span
                  v-if="
                    lineaResolucion(
                      borrador,
                    )
                  "
                >
                  {{
                    lineaResolucion(
                      borrador,
                    )
                  }}
                </span>
              </div>

              <div class="draft-actions">
                <button
                  class="hv-button hv-button-primary hv-button-small"
                  type="button"
                  :disabled="procesando"
                  @click="
                    abrirEstampado(
                      borrador,
                    )
                  "
                >
                  Estampar
                </button>

                <button
                  class="hv-button hv-button-danger hv-button-small"
                  type="button"
                  :disabled="procesando"
                  @click="
                    anularBorrador(
                      borrador,
                    )
                  "
                >
                  Anular
                </button>
              </div>
            </article>
          </AppCard>
        </aside>
      </div>
    </template>

    <div
      v-if="modalEstampado"
      class="modal-backdrop no-print"
      @click.self="cerrarEstampado"
    >
      <section class="modal">
        <header class="modal-header">
          <div>
            <span>Confirmar estampado</span>
            <h2>{{ tituloModal }}</h2>
          </div>

          <button
            class="close"
            type="button"
            @click="cerrarEstampado"
          >
            ×
          </button>
        </header>

        <label class="field">
          <span>Origen *</span>

          <select
            v-model="estampado.origen"
            :disabled="procesando"
          >
            <option value="CALIFICADOR_DIRECTO">
              Calificador directo
            </option>

            <option value="AUTORIDAD_SUPERIOR">
              Autoridad superior
            </option>

            <option value="OFICIAL_GENERAL">
              Oficial general
            </option>

            <option value="OFICIAL_PERSONAL">
              Oficial de personal
            </option>

            <option value="SISTEMA">
              Sistema
            </option>
          </select>
        </label>

        <div
          v-if="
            borradorSeleccionado
              ?.requiere_resolucion === 1
          "
          class="resolution-summary"
        >
          <strong>Resolución asociada</strong>

          <span>
            {{
              borradorSeleccionado
                ?.numero_resolucion
                ? lineaResolucion(
                    borradorSeleccionado,
                  )
                : 'Sin resolución documental asociada'
            }}
          </span>

          <small>
            La resolución quedará marcada como usada
            solo cuando se confirme este estampado.
          </small>
        </div>

        <div class="modal-actions">
          <button
            class="hv-button hv-button-secondary"
            type="button"
            :disabled="procesando"
            @click="cerrarEstampado"
          >
            Cancelar
          </button>

          <button
            class="hv-button hv-button-primary"
            type="button"
            :disabled="procesando"
            @click="confirmarEstampado"
          >
            {{
              procesando
                ? 'Estampando…'
                : 'Confirmar estampado'
            }}
          </button>
        </div>
      </section>
    </div>
  </AppLayout>
</template>

<style scoped>

.floating-toolbar {
  position: fixed;
  top: 96px;
  right: 24px;
  z-index: 60;
  display: grid;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(16px);
}

.floating-toolbar__button {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: #334155;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  font: inherit;
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
  transition:
    transform 0.14s ease,
    color 0.14s ease,
    background 0.14s ease,
    border-color 0.14s ease;
}

.floating-toolbar__button:hover:not(:disabled) {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
  transform: translateY(-1px);
}

.floating-toolbar__button--primary {
  color: #ffffff;
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.floating-toolbar__button--primary:hover:not(:disabled) {
  color: #ffffff;
  background: #1e40af;
  border-color: #1e40af;
}

.floating-toolbar__button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 1180px) {
  .floating-toolbar {
    top: 82px;
    right: 18px;
  }
}


@media (max-width: 1180px) {
  .side-panel {
    top: 80px;
    width: 380px;
    max-width: calc(100vw - 72px);
    height: calc(100vh - 96px);
  }

  .draft-panel-toggle {
    top: 132px;
  }
}

@media print {
  .floating-toolbar {
    display: none !important;
  }
}

.notice {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
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

.loading-state {
  min-height: 260px;
  display: grid;
  place-items: center;
  color: #64748b;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.025);
  font-size: 13px;
}

.page-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.sheet-stage {
  padding: 18px;
  overflow: auto;
  background:
    radial-gradient(
      circle at 50% 0%,
      rgba(255, 255, 255, 0.9),
      rgba(241, 245, 249, 0.92) 46%,
      #e9eef6 100%
    );
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.025);
}

.hv-official-sheet {
  position: relative;
  width: 216mm;
  min-height: 330mm;
  margin: 0 auto;
  padding: 3.5mm 7mm 3mm;
  box-sizing: border-box;
  color: #111;
  background: #ffffff;
  box-shadow:
    0 18px 46px rgba(15, 23, 42, 0.14),
    0 0 0 1px rgba(17, 24, 39, 0.05);
  font-family: "Times New Roman", Times, serif;
  font-size: 10pt;
  line-height: 1.1;
}

.sheet-top {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
}

.unit-block {
  width: 55mm;
  margin-left: 8mm;
  display: grid;
  gap: 1mm;
  text-align: center;
  font-size: 10pt;
}

.unit-block span {
  font-size: 7pt;
}

.folio-block {
  display: grid;
  grid-template-columns: auto auto;
  gap: 8mm;
  align-items: center;
  font-size: 9pt;
}

.main-title {
  margin: 10mm 0 8mm;
  text-align: center;
  font-size: 19pt;
  font-weight: 400;
  letter-spacing: 0.16em;
}

.person-line {
  display: grid;
  grid-template-columns: 19mm 1fr;
  gap: 1mm;
  align-items: end;
  font-size: 10pt;
}

.person-line strong {
  padding-bottom: 0.7mm;
  border-bottom: 1px solid #111;
  font-weight: 400;
}

.person-help {
  margin: 1mm 0 6mm 19mm;
  text-align: center;
  font-size: 7pt;
}

.period-line {
  display: grid;
  grid-template-columns:
    25mm 15mm 10mm 25mm 10mm 16mm
    23mm 15mm 10mm 25mm 10mm 16mm;
  align-items: end;
  gap: 1mm;
  margin-bottom: 2mm;
  font-size: 10pt;
}

.period-line strong {
  padding-bottom: 0.7mm;
  text-align: center;
  border-bottom: 1px solid #111;
  font-weight: 400;
}

.official-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border: 1.5px solid #111;
}

.official-table th,
.official-table td {
  border: 1px solid #111;
}

.official-table thead th {
  height: 7mm;
  text-align: center;
  vertical-align: middle;
  font-weight: 400;
  font-size: 8pt;
}

.date-title,
.annotation-title-cell {
  letter-spacing: 0.18em;
}

.sign-title {
  letter-spacing: 0.08em;
  font-size: 6.8pt;
}

/*
 * Distribución oficial refinada:
 * - Fecha compacta.
 * - Anotaciones con mayor ancho útil.
 * - Firmas más angostas, solo como zona de rúbrica.
 */
.col-date,
.official-table th:nth-child(1),
.official-table th:nth-child(2),
.official-table th:nth-child(3),
.date-cell {
  width: 8mm;
}

.col-annotation,
.annotation-title-cell,
.annotation-cell {
  width: 142mm;
}

.col-signature,
.signature-cell,
.official-table thead th:nth-last-child(1),
.official-table thead th:nth-last-child(2) {
  width: 16mm;
}

.body-row {
  height: 7.15mm;
}

.date-cell {
  padding-top: 1.15mm;
  text-align: center;
  vertical-align: top;
  font-size: 7.6pt;
}

.annotation-cell {
  padding: 1.05mm 2mm;
  vertical-align: top;
  white-space: pre-wrap;
  font-size: 8.9pt;
  line-height: 1.16;
  word-break: normal;
  overflow-wrap: anywhere;
}

.signature-subtitle {
  padding: 0 0.6mm;
  font-size: 5.8pt !important;
  letter-spacing: 0;
  line-height: 1.05;
}

.signature-cell {
  vertical-align: top;
}

.page-separator {
  height: 27mm;
}

.official-table--second {
  margin-top: 0;
}

.sheet-footer {
  position: absolute;
  right: 9mm;
  bottom: 1.5mm;
  left: 9mm;
  display: flex;
  justify-content: space-between;
  color: #555;
  font-size: 6pt;
}

.side-panel {
  position: fixed;
  top: 86px;
  right: 0;
  z-index: 45;
  width: 390px;
  max-width: calc(100vw - 96px);
  height: calc(100vh - 110px);
  box-sizing: border-box;
  padding: 14px;
  display: grid;
  align-content: start;
  gap: 14px;
  overflow-y: auto;
  background: #f8fafc;
  border-left: 1px solid #dbe3ef;
  box-shadow: -18px 0 42px rgba(15, 23, 42, 0.12);
  transform: translateX(calc(100% + 18px));
  opacity: 0;
  pointer-events: none;
  transition:
    transform 0.22s ease,
    opacity 0.18s ease;
}

.side-panel--open {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}

.draft-panel-toggle {
  position: fixed;
  top: 154px;
  right: 0;
  z-index: 50;
  min-height: 42px;
  padding: 0 10px 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #1d4ed8;
  background: #ffffff;
  border: 1px solid #bfdbfe;
  border-right: 0;
  border-radius: 999px 0 0 999px;
  box-shadow: -8px 8px 22px rgba(15, 23, 42, 0.12);
  font: inherit;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.draft-panel-toggle:hover {
  background: #eff6ff;
}

.draft-panel-toggle span {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  color: #ffffff;
  background: #1d4ed8;
  border-radius: 999px;
  font-size: 20px;
  line-height: 1;
}

.draft-panel-toggle strong {
  max-width: 92px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-panel-toggle em {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  display: grid;
  place-items: center;
  color: #ffffff;
  background: #ef4444;
  border-radius: 999px;
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
}

.side-panel :deep(.app-card),
.side-panel :deep(.card),
.side-panel > * {
  border-radius: 10px;
}

.empty-card {
  min-height: 120px;
  padding: 16px;
  display: grid;
  place-items: center;
  color: #64748b;
  text-align: center;
  font-size: 12.5px;
}

.draft-card {
  padding: 12px 0;
  display: grid;
  gap: 10px;
  border-bottom: 1px solid #edf1f6;
}

.draft-card:last-child {
  border-bottom: 0;
}

.draft-main {
  display: grid;
  gap: 3px;
}

.draft-main small,
.draft-main span {
  color: #64748b;
  font-size: 11.5px;
  line-height: 1.35;
}

.draft-main strong {
  color: #111827;
  font-size: 12.5px;
  font-weight: 760;
}

.draft-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.hv-button-small {
  min-height: 30px;
  padding-inline: 9px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 740;
}

.hv-button-danger {
  color: #b4232d;
  background: #ffffff;
  border: 1px solid #e2b4b8;
}

.hv-button-danger:hover {
  background: #fff0f1;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  padding: 20px;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.46);
}

.modal {
  width: min(520px, 100%);
  padding: 18px;
  display: grid;
  gap: 14px;
  color: #111827;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.24);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.modal-header span {
  color: #155bd6;
  font-size: 10.5px;
  font-weight: 760;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.modal-header h2 {
  margin: 5px 0 0;
  color: #111827;
  font-size: 18px;
  line-height: 1.25;
  letter-spacing: -0.015em;
  font-weight: 760;
}

.close {
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  color: #64748b;
  background: transparent;
  border: 0;
  border-radius: 7px;
  font-size: 22px;
  cursor: pointer;
}

.close:hover {
  color: #111827;
  background: #f1f5f9;
}

.field {
  display: grid;
  gap: 6px;
}

.field > span {
  color: #536078;
  font-size: 11.5px;
  font-weight: 700;
}

.field select {
  width: 100%;
  min-height: 36px;
  box-sizing: border-box;
  padding: 8px 10px;
  color: #1f2937;
  background: #ffffff;
  border: 1px solid #d7deea;
  border-radius: 7px;
  outline: none;
  font: inherit;
  font-size: 12.5px;
}

.field select:focus {
  border-color: #7fa8ec;
  box-shadow: 0 0 0 3px rgba(21, 91, 214, 0.075);
}

.resolution-summary {
  padding: 10px 12px;
  display: grid;
  gap: 4px;
  background: #f8fbff;
  border: 1px solid #d9e6ff;
  border-radius: 8px;
}

.resolution-summary strong {
  color: #155bd6;
  font-size: 12.5px;
  font-weight: 760;
}

.resolution-summary span {
  color: #111827;
  font-size: 12px;
  font-weight: 740;
}

.resolution-summary small {
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal-actions :deep(.hv-button),
.modal-actions .hv-button {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 740;
}

@media (max-width: 1180px) {
  .page-grid {
    grid-template-columns: 1fr;
  }

  .side-panel {
    order: -1;
  }
}

@media (max-width: 760px) {
  .page-grid {
    gap: 12px;
  }

  .sheet-stage {
    padding: 12px;
  }

  .top-actions {
    justify-content: flex-start;
  }
}

@media print {
  @page {
    size: 216mm 330mm;
    margin: 0;
  }

  html,
  body {
    width: 216mm;
    min-height: 330mm;
    margin: 0;
    padding: 0;
    background: #ffffff;
  }

  .no-print {
    display: none !important;
  }

  :deep(.app-layout) {
    min-height: 0;
    padding: 0;
    background: #ffffff;
  }

  :deep(.app-layout__header),
  :deep(.app-layout__notice),
  :deep(.app-layout__summary),
  :deep(.app-layout__footer) {
    display: none !important;
  }

  .page-grid,
  .sheet-stage {
    display: block;
    margin: 0;
    padding: 0;
    overflow: visible;
    background: #ffffff;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .hv-official-sheet {
    width: 216mm;
    min-height: 330mm;
    margin: 0;
    padding: 3.5mm 7mm 3mm;
    box-shadow: none;
  }
}
</style>
