<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'

import {
  crearBorradorAnotacion,
  listarCategoriasAnotacion,
  listarConceptosComoOpciones,
  listarPlantillasOperativas,
  listarPuntajesPorEfecto,
  listarVariablesPlantilla,
} from '../../services/anotaciones'

import {
  listarResolucionesEmitidasPendientesPorHojaVida,
} from '../../services/resolucionesDocumentales'

import {
  listarHojasVidaAbiertasPorPersona,
  listarPersonasConHojaVidaAbierta,
} from '../../services/hojaVida'

import {
  construirCamposFormulario,
  obtenerVariablesPendientes,
  renderizarPlantilla,
  validarPlantillaCompletada,
} from '../../services/renderizadorAnotaciones'

import type {
  CampoFormularioAnotacion,
  CategoriaAnotacion,
  ConceptoOpcion,
  ModoRedaccionAnotacion,
  PlantillaAnotacionOperativa,
  PuntajeAnotacion,
  ValoresPlantilla,
  VariablePlantillaAnotacion,
} from '../../types/anotaciones'

import type {
  HojaVidaAbierta,
  PersonaConHojaVidaAbierta,
} from '../../types/hojaVida'

import type {
  ResolucionDocumento,
} from '../../types/resolucionesDocumentales'

const props = defineProps<{
  hojaVidaInicialId?: number | null
}>()

const cargando = ref(true)
const cargandoHojas = ref(false)
const guardando = ref(false)

const error = ref('')
const mensaje = ref('')

const personas =
  ref<PersonaConHojaVidaAbierta[]>([])

const hojasVida =
  ref<HojaVidaAbierta[]>([])

const categorias =
  ref<CategoriaAnotacion[]>([])

const plantillas =
  ref<PlantillaAnotacionOperativa[]>([])

const conceptos =
  ref<ConceptoOpcion[]>([])

const puntajes =
  ref<PuntajeAnotacion[]>([])

const variablesRegistradas =
  ref<VariablePlantillaAnotacion[]>([])

const resoluciones =
  ref<ResolucionDocumento[]>([])

const personaId = ref<number | null>(null)
const hojaVidaId = ref<number | null>(null)
const categoriaId = ref<number | null>(null)
const plantillaId = ref<number | null>(null)
const resolucionId = ref<number | null>(null)

const modoRedaccion =
  ref<ModoRedaccionAnotacion>('PLANTILLA')

const fechaAnotacion = ref(
  new Date().toISOString().slice(0, 10),
)

const tituloEditable = ref('')
const cuerpoEditable = ref('')
const valores =
  reactive<ValoresPlantilla>({})

const hojaVidaSeleccionada = computed(() =>
  hojasVida.value.find(
    (hoja: HojaVidaAbierta) => hoja.hoja_vida_id === hojaVidaId.value,
  ) ?? null,
)

const plantillasCategoria = computed(() =>
  plantillas.value.filter(
    plantilla =>
      plantilla.categoria_id === categoriaId.value,
  ),
)

const plantillaSeleccionada = computed(() =>
  plantillas.value.find(
    plantilla => plantilla.id === plantillaId.value,
  ) ?? null,
)

const esMeritoODemerito = computed(() => {
  const codigo =
    plantillaSeleccionada.value?.tipo_efecto_codigo

  return codigo === 'MERITO' ||
    codigo === 'DEMERITO'
})

/*
 * Regla documental:
 * Solo las anotaciones de mérito y demérito deben exigir resolución.
 * Las demás anotaciones pueden guardarse sin resolución, aunque el
 * catálogo tenga marcado requiere_resolucion por arrastre histórico.
 */
const requiereResolucion = computed(() =>
  esMeritoODemerito.value,
)

const permiteEdicionLibre = computed(() =>
  plantillaSeleccionada.value?.permite_edicion_libre === 1,
)

const esTextoLibre = computed(() =>
  modoRedaccion.value === 'LIBRE',
)

const resolucionSeleccionada = computed(() =>
  resoluciones.value.find(
    resolucion =>
      resolucion.resolucion_id === resolucionId.value,
  ) ?? null,
)

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

function formatearFechaDocumento(
  fecha: string | null | undefined,
): string {
  if (!fecha) {
    return ''
  }

  const [anio, mes, dia] = fecha
    .slice(0, 10)
    .split('-')

  const indiceMes = Number(mes) - 1

  if (
    !anio ||
    !dia ||
    indiceMes < 0 ||
    indiceMes >= mesesDocumento.length
  ) {
    return fecha
  }

  return `${dia}${mesesDocumento[indiceMes]}${anio}`
}

function construirTextoResolucionSeleccionada():
string {
  const resolucion = resolucionSeleccionada.value

  if (!resolucion) {
    return ''
  }

  const puntajeVisual =
    resolucion.puntaje_visual_actual ?? ''

  const puntajeLiteral =
    resolucion.puntaje_literal_actual ?? ''

  const textoLiteral =
    puntajeLiteral
      ? ` (${puntajeLiteral} puntos)`
      : ''

  if (resolucion.tipo_efecto_codigo === 'MERITO') {
    return `Es felicitado con ${puntajeVisual} ptos.${textoLiteral}.`
  }

  return `Es sancionado con ${puntajeVisual} ptos.${textoLiteral}.`
}

function construirLineaResolucionSeleccionada():
string {
  const resolucion = resolucionSeleccionada.value

  if (!resolucion?.numero_visible) {
    return ''
  }

  return [
    `RES. EXENTA N.º ${resolucion.numero_visible}`,
    'de fecha',
    formatearFechaDocumento(
      resolucion.fecha_documento,
    ),
  ].join(' ')
}

const campos = computed<CampoFormularioAnotacion[]>(
  () => {
    const plantilla = plantillaSeleccionada.value

    if (
      !plantilla ||
      requiereResolucion.value ||
      esTextoLibre.value ||
      modoRedaccion.value === 'PLANTILLA_EDITABLE'
    ) {
      return []
    }

    return construirCamposFormulario(
      plantilla.cuerpo_renderizable ??
        plantilla.cuerpo_fuente,
      variablesRegistradas.value,
    )
  },
)

const camposVisibles = computed(() =>
  campos.value.filter(
    campo =>
      campo.codigo !== 'puntaje_texto' &&
      campo.tipo_dato !== 'CONCEPTO' &&
      campo.tipo_dato !== 'PUNTAJE',
  ),
)

const cuerpoRenderizado = computed(() => {
  const plantilla = plantillaSeleccionada.value

  if (!plantilla) {
    return ''
  }

  /*
   * Las anotaciones del catálogo quedan editables por defecto.
   * Esto permite reemplazar textos tipo XXX o ajustar el ejemplo
   * normativo sin modificar el catálogo maestro.
   */
  if (
    requiereResolucion.value ||
    esTextoLibre.value ||
    modoRedaccion.value === 'PLANTILLA_EDITABLE'
  ) {
    return cuerpoEditable.value
  }

  return renderizarPlantilla(
    plantilla.cuerpo_renderizable ??
      plantilla.cuerpo_fuente,
    valores,
  )
})

const tituloFinal = computed(() => {
  const plantilla = plantillaSeleccionada.value

  if (!plantilla) {
    return ''
  }

  if (
    esTextoLibre.value ||
    modoRedaccion.value === 'PLANTILLA_EDITABLE'
  ) {
    return tituloEditable.value
  }

  return plantilla.titulo_fuente ??
    plantilla.nombre
})

const pendientes = computed(() =>
  obtenerVariablesPendientes(
    campos.value,
    valores,
  ),
)

async function inicializar(): Promise<void> {
  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const [
      personasResultado,
      categoriasResultado,
      plantillasResultado,
      conceptosResultado,
    ] = await Promise.all([
      listarPersonasConHojaVidaAbierta(),
      listarCategoriasAnotacion(),
      listarPlantillasOperativas(),
      listarConceptosComoOpciones(),
    ])

    personas.value = personasResultado
    categorias.value = categoriasResultado
    plantillas.value = plantillasResultado
    conceptos.value = conceptosResultado

    const hojaInicialId =
      props.hojaVidaInicialId ?? null

    if (hojaInicialId) {
      const personaInicial =
        await encontrarPersonaPorHojaVida(
          hojaInicialId,
        )

      if (personaInicial) {
        personaId.value =
          personaInicial.persona_id

        await cargarHojasVida()

        const hojaSolicitada =
          hojasVida.value.find(
            hoja =>
              hoja.hoja_vida_id ===
              hojaInicialId,
          )

        hojaVidaId.value =
          hojaSolicitada?.hoja_vida_id ??
          hojasVida.value[0]
            ?.hoja_vida_id ??
          null
      }
    }

    if (!personaId.value) {
      const primeraPersona =
        personas.value[0]

      if (primeraPersona) {
        personaId.value =
          primeraPersona.persona_id

        await cargarHojasVida()
      }
    }

    const primeraCategoria =
      categorias.value[0]

    if (primeraCategoria) {
      categoriaId.value =
        primeraCategoria.id

      seleccionarPrimeraPlantilla()
    }
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

async function encontrarPersonaPorHojaVida(
  hojaVidaBuscadaId: number,
): Promise<PersonaConHojaVidaAbierta | null> {
  for (const persona of personas.value) {
    const hojas =
      await listarHojasVidaAbiertasPorPersona(
        persona.persona_id,
      )

    if (
      hojas.some(
        hoja =>
          hoja.hoja_vida_id ===
          hojaVidaBuscadaId,
      )
    ) {
      return persona
    }
  }

  return null
}

async function cargarHojasVida(): Promise<void> {
  hojasVida.value = []
  hojaVidaId.value = null

  if (!personaId.value) {
    return
  }

  cargandoHojas.value = true
  error.value = ''

  try {
    hojasVida.value =
      await listarHojasVidaAbiertasPorPersona(
        personaId.value,
      )

    const hojaInicialId =
      props.hojaVidaInicialId ?? null

    const hojaSolicitada =
      hojaInicialId
        ? hojasVida.value.find(
            hoja =>
              hoja.hoja_vida_id ===
              hojaInicialId,
          )
        : null

    hojaVidaId.value =
      hojaSolicitada?.hoja_vida_id ??
      hojasVida.value[0]?.hoja_vida_id ??
      null
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    cargandoHojas.value = false
  }
}

function seleccionarPrimeraPlantilla():
void {
  plantillaId.value =
    plantillasCategoria.value[0]?.id ??
    null
}

function seleccionarPlantillaCompatibleConResolucion():
void {
  const resolucion =
    resolucionSeleccionada.value

  if (!resolucion) {
    return
  }

  const plantillaCompatible =
    plantillas.value.find(plantilla =>
      (
        plantilla.tipo_efecto_codigo === 'MERITO' ||
        plantilla.tipo_efecto_codigo === 'DEMERITO'
      ) &&
      plantilla.tipo_efecto_codigo ===
        resolucion.tipo_efecto_codigo,
    )

  if (!plantillaCompatible) {
    return
  }

  categoriaId.value =
    plantillaCompatible.categoria_id

  plantillaId.value =
    plantillaCompatible.id
}

async function cargarResolucionesPendientes():
Promise<void> {
  resoluciones.value = []
  resolucionId.value = null

  if (!hojaVidaId.value) {
    return
  }

  resoluciones.value =
    await listarResolucionesEmitidasPendientesPorHojaVida(
      hojaVidaId.value,
    )

  /*
   * No se selecciona automáticamente una resolución.
   * Solo mérito y demérito obligan a escogerla; el usuario debe
   * confirmar manualmente cuál corresponde.
   */
  resolucionId.value = null
}

function limpiarValores(): void {
  for (const clave of Object.keys(valores)) {
    delete valores[clave]
  }
}

async function cargarPlantilla(): Promise<void> {
  limpiarValores()

  variablesRegistradas.value = []
  puntajes.value = []
  resoluciones.value = []
  resolucionId.value = null

  const plantilla =
    plantillaSeleccionada.value

  if (!plantilla) {
    tituloEditable.value = ''
    cuerpoEditable.value = ''
    modoRedaccion.value = 'PLANTILLA'
    return
  }

  tituloEditable.value =
    plantilla.titulo_fuente ??
    plantilla.nombre

  cuerpoEditable.value =
    plantilla.cuerpo_fuente ??
    plantilla.cuerpo_renderizable ??
    ''

  /*
   * Regla UX: toda anotación seleccionada desde el catálogo
   * se puede editar antes de guardar el borrador.
   */
  modoRedaccion.value = 'PLANTILLA_EDITABLE'

  try {
    if (requiereResolucion.value) {
      modoRedaccion.value = 'PLANTILLA_EDITABLE'

      if (
        hojaVidaId.value &&
        resoluciones.value.length === 0
      ) {
        await cargarResolucionesPendientes()
      }

      if (
        resolucionSeleccionada.value &&
        resolucionSeleccionada.value.tipo_efecto_codigo !==
          plantilla.tipo_efecto_codigo
      ) {
        const resolucionCompatible =
          resoluciones.value.find(
            resolucion =>
              resolucion.tipo_efecto_codigo ===
              plantilla.tipo_efecto_codigo,
          )

        resolucionId.value =
          resolucionCompatible?.resolucion_id ??
          null
      }

      if (resolucionSeleccionada.value) {
        aplicarResolucion()
      }

      puntajes.value =
        await listarPuntajesPorEfecto(
          plantilla.tipo_efecto_codigo,
        )

      return
    }

    variablesRegistradas.value =
      await listarVariablesPlantilla(
        plantilla.id,
      )

    if (
      plantilla.permite_seleccionar_puntaje ===
        1 &&
      plantilla.tipo_efecto_codigo !==
        'NEUTRA'
    ) {
      puntajes.value =
        await listarPuntajesPorEfecto(
          plantilla.tipo_efecto_codigo,
        )
    }
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  }
}

function aplicarResolucion(): void {
  const resolucion =
    resolucionSeleccionada.value

  if (!resolucion) {
    valores.concepto_id = null
    valores.concepto = ''
    valores.puntaje_id = null
    valores.puntaje_numerico = ''
    valores.puntaje_texto = ''
    valores.resolucion_documental_id = null
    valores.numero_resolucion = ''
    valores.fecha_resolucion = ''
    valores.linea_resolucion = ''
    return
  }

  valores.resolucion_documental_id =
    resolucion.resolucion_id

  valores.concepto_id =
    resolucion.concepto_id

  valores.concepto =
    resolucion.concepto_nombre_actual

  valores.puntaje_id =
    resolucion.puntaje_id

  valores.puntaje_numerico =
    resolucion.puntaje_visual_actual

  valores.puntaje_texto =
    resolucion.puntaje_literal_actual

  valores.numero_resolucion =
    resolucion.numero_visible ?? ''

  valores.fecha_resolucion =
    resolucion.fecha_documento

  valores.linea_resolucion =
    construirLineaResolucionSeleccionada()

  cuerpoEditable.value =
    construirTextoResolucionSeleccionada()
}

async function guardarBorrador():
Promise<void> {
  const plantilla =
    plantillaSeleccionada.value

  const hoja =
    hojaVidaSeleccionada.value

  if (!hoja) {
    error.value =
      'Debe seleccionar una Hoja de Vida abierta.'
    return
  }

  if (!plantilla) {
    error.value =
      'Debe seleccionar una plantilla de anotación.'
    return
  }

  error.value = ''
  mensaje.value = ''
  guardando.value = true

  try {
    if (requiereResolucion.value) {
      aplicarResolucion()
    }

    if (!fechaAnotacion.value) {
      throw new Error(
        'Debe indicar la fecha de la anotación.',
      )
    }

    if (
      fechaAnotacion.value <
        hoja.fecha_inicio ||
      fechaAnotacion.value >
        hoja.fecha_termino
    ) {
      throw new Error(
        'La fecha de la anotación debe encontrarse dentro de la vigencia de la Hoja de Vida.',
      )
    }

    if (
      requiereResolucion.value &&
      !resolucionId.value
    ) {
      throw new Error(
        'Debe seleccionar una resolución emitida pendiente de estampar.',
      )
    }

    if (
      requiereResolucion.value &&
      resolucionSeleccionada.value &&
      resolucionSeleccionada.value.hoja_vida_id !== hoja.hoja_vida_id
    ) {
      throw new Error(
        'La resolución seleccionada no corresponde a esta Hoja de Vida.',
      )
    }

    if (
      requiereResolucion.value &&
      resolucionSeleccionada.value &&
      resolucionSeleccionada.value.tipo_efecto_codigo !==
        plantilla.tipo_efecto_codigo
    ) {
      throw new Error(
        'La resolución seleccionada no corresponde al tipo de anotación.',
      )
    }

    if (
      !requiereResolucion.value &&
      !esTextoLibre.value &&
      modoRedaccion.value === 'PLANTILLA' &&
      pendientes.value.length > 0
    ) {
      const nombresPendientes =
        pendientes.value
          .map(campo => campo.etiqueta)
          .join(', ')

      throw new Error(
        `Debe completar: ${nombresPendientes}.`,
      )
    }

    if (!tituloFinal.value.trim()) {
      throw new Error(
        'Debe indicar el título de la anotación.',
      )
    }

    if (!cuerpoRenderizado.value.trim()) {
      throw new Error(
        'Debe indicar el texto de la anotación.',
      )
    }

    if (
      modoRedaccion.value === 'PLANTILLA'
    ) {
      validarPlantillaCompletada(
        cuerpoRenderizado.value,
      )
    }

    const id =
      await crearBorradorAnotacion({
        plantilla,
        hojaVidaId:
          hoja.hoja_vida_id,
        fechaAnotacion:
          fechaAnotacion.value,
        valores,
        tituloFinal:
          tituloFinal.value,
        cuerpoFinal:
          cuerpoRenderizado.value,
        resolucionDocumentalId:
          requiereResolucion.value
            ? resolucionId.value
            : null,
        modoRedaccion:
          modoRedaccion.value,
      })

    mensaje.value =
      `Borrador N.º ${id} guardado en la Hoja de Vida seleccionada.`
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    guardando.value = false
  }
}

function inputType(
  campo: CampoFormularioAnotacion,
): string {
  if (campo.tipo_dato === 'FECHA') {
    return 'date'
  }

  if (
    campo.tipo_dato === 'ENTERO' ||
    campo.tipo_dato === 'DECIMAL'
  ) {
    return 'number'
  }

  return 'text'
}

function obtenerMensajeError(
  excepcion: unknown,
): string {
  return excepcion instanceof Error
    ? excepcion.message
    : String(excepcion)
}

watch(
  personaId,
  async () => {
    error.value = ''
    mensaje.value = ''
    await cargarHojasVida()
  },
)

watch(
  hojaVidaId,
  async () => {
    error.value = ''
    mensaje.value = ''
    await cargarResolucionesPendientes()
    await cargarPlantilla()
  },
)

watch(
  categoriaId,
  () => {
    error.value = ''
    mensaje.value = ''
    seleccionarPrimeraPlantilla()
  },
)

watch(
  plantillaId,
  async () => {
    error.value = ''
    mensaje.value = ''
    await cargarPlantilla()
  },
)

watch(
  resolucionId,
  () => {
    if (!requiereResolucion.value) {
      return
    }

    seleccionarPlantillaCompatibleConResolucion()
    aplicarResolucion()
  },
)

watch(
  () => props.hojaVidaInicialId,
  async nuevaHojaId => {
    if (!nuevaHojaId || cargando.value) {
      return
    }

    const personaInicial =
      await encontrarPersonaPorHojaVida(
        nuevaHojaId,
      )

    if (!personaInicial) {
      return
    }

    personaId.value =
      personaInicial.persona_id

    await cargarHojasVida()

    hojaVidaId.value =
      hojasVida.value.find(
        hoja =>
          hoja.hoja_vida_id ===
          nuevaHojaId,
      )?.hoja_vida_id ??
      null
  },
)

onMounted(inicializar)
</script>

<template>
  <main class="page">
    <header class="page-header">
      <div>
        <span class="eyebrow">
          HVDigital
        </span>

        <h1>Nueva anotación</h1>

        <p>
          Las felicitaciones y sanciones deben
          asociarse a una resolución registrada.
        </p>
      </div>
    </header>

    <div
      v-if="error"
      class="alert error"
    >
      {{ error }}
    </div>

    <div
      v-if="mensaje"
      class="alert success"
    >
      {{ mensaje }}
    </div>

    <div
      v-if="cargando"
      class="loading"
    >
      Cargando formulario…
    </div>

    <div
      v-else
      class="layout"
    >
      <form
        class="card form"
        @submit.prevent="guardarBorrador"
      >
        <section class="section">
          <div class="section-heading">
            <span>1</span>

            <div>
              <strong>Hoja de Vida</strong>

              <small>
                Seleccione el calificado y su período.
              </small>
            </div>
          </div>

          <label class="field">
            <span>Persona</span>

            <select v-model.number="personaId">
              <option :value="null">
                Seleccione una persona…
              </option>

              <option
                v-for="persona in personas"
                :key="persona.persona_id"
                :value="persona.persona_id"
              >
                {{ persona.etiqueta }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Hoja de Vida abierta</span>

            <select
              v-model.number="hojaVidaId"
              :disabled="
                !personaId ||
                cargandoHojas
              "
            >
              <option :value="null">
                {{
                  cargandoHojas
                    ? 'Cargando…'
                    : 'Seleccione una Hoja de Vida…'
                }}
              </option>

              <option
                v-for="hoja in hojasVida"
                :key="hoja.hoja_vida_id"
                :value="hoja.hoja_vida_id"
              >
                {{ hoja.etiqueta }}
              </option>
            </select>
          </label>

          <div
            v-if="hojaVidaSeleccionada"
            class="sheet-summary"
          >
            <strong>
              {{
                hojaVidaSeleccionada
                  .grado_calidad_abreviatura
              }}

              {{
                hojaVidaSeleccionada
                  .persona_nombre_completo
              }}
            </strong>

            <span>
              {{
                hojaVidaSeleccionada
                  .categoria_nombre
              }}
            </span>

            <span>
              Vigencia:
              {{ hojaVidaSeleccionada.fecha_inicio }}
              al
              {{ hojaVidaSeleccionada.fecha_termino }}
            </span>
          </div>
        </section>

        <section class="section">
          <div class="section-heading">
            <span>2</span>

            <div>
              <strong>Tipo de anotación</strong>

              <small>
                Seleccione la anotación normativa.
              </small>
            </div>
          </div>

          <label class="field">
            <span>Categoría</span>

            <select v-model.number="categoriaId">
              <option
                v-for="categoria in categorias"
                :key="categoria.id"
                :value="categoria.id"
              >
                {{ categoria.nombre }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Anotación</span>

            <select v-model.number="plantillaId">
              <option
                v-for="plantilla in
                  plantillasCategoria"
                :key="plantilla.id"
                :value="plantilla.id"
              >
                {{ plantilla.nombre }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Fecha de la anotación</span>

            <input
              v-model="fechaAnotacion"
              type="date"
              :min="
                hojaVidaSeleccionada
                  ?.fecha_inicio
              "
              :max="
                hojaVidaSeleccionada
                  ?.fecha_termino
              "
            >
          </label>

          <label
            v-if="plantillaSeleccionada"
            class="field"
          >
            <span>Tipo de redacción</span>

            <select v-model="modoRedaccion">
              <option value="PLANTILLA_EDITABLE">
                Usar texto del catálogo y editarlo
              </option>

              <option
                v-if="
                  permiteEdicionLibre &&
                  !requiereResolucion
                "
                value="LIBRE"
              >
                Redacción completamente libre
              </option>
            </select>

            <small class="help">
              Puede reemplazar textos como XXX antes de guardar el borrador.
            </small>
          </label>
        </section>

        <section
          v-if="
            plantillaSeleccionada &&
            requiereResolucion
          "
          class="section resolution-section"
        >
          <div class="section-heading">
            <span>3</span>

            <div>
              <strong>Resolución obligatoria</strong>

              <small>
                Solo las anotaciones de mérito y demérito requieren resolución. Las demás anotaciones se guardan sin resolución.
              </small>
            </div>
          </div>

          <label class="field">
            <span>Resolución emitida pendiente de estampar</span>

            <select
              v-model.number="resolucionId"
              :disabled="resoluciones.length === 0"
            >
              <option :value="null">
                Seleccione una resolución…
              </option>

              <option
                v-for="resolucion in resoluciones"
                :key="resolucion.resolucion_id"
                :value="resolucion.resolucion_id"
              >
                {{ resolucion.numero_visible }}
                · {{ resolucion.fecha_documento }}
                · Concepto
                {{ resolucion.concepto_numero_actual }}:
                {{ resolucion.concepto_nombre_actual }}
                · {{ resolucion.puntaje_visual_actual }}
              </option>
            </select>

            <small
              v-if="resoluciones.length === 0"
              class="help warning-help"
            >
              No existen resoluciones emitidas pendientes de estampar para esta Hoja de Vida.
              Primero debe emitir una resolución ADM o ADDM desde el módulo Resoluciones.
            </small>
          </label>

          <div
            v-if="resolucionSeleccionada"
            class="resolution-summary"
          >
            <strong>
              Resolución
              {{ resolucionSeleccionada.numero_visible }}
            </strong>

            <span>
              Fecha:
              {{ resolucionSeleccionada.fecha_documento }}
            </span>

            <span>
              Concepto
              {{
                resolucionSeleccionada
                  .concepto_numero_actual
              }}:
              {{
                resolucionSeleccionada
                  .concepto_nombre_actual
              }}
            </span>

            <span>
              Puntaje:
              {{
                resolucionSeleccionada
                  .puntaje_visual_actual
              }}
            </span>
          </div>
        </section>

        <section
          v-if="plantillaSeleccionada"
          class="section"
        >
          <div class="section-heading">
            <span>3</span>

            <div>
              <strong>Antecedentes</strong>

              <small>
                Revise el texto del catálogo y reemplace datos como XXX antes de guardar.
              </small>
            </div>
          </div>

          <template
            v-if="
              esTextoLibre ||
              modoRedaccion ===
                'PLANTILLA_EDITABLE'
            "
          >
            <label class="field">
              <span>Título *</span>

              <input
                v-model="tituloEditable"
                type="text"
              >
            </label>

            <label class="field">
              <span>Texto definitivo *</span>

              <textarea
                v-model="cuerpoEditable"
                rows="12"
              />

              <small class="help warning-help">
                Este texto será el texto definitivo del borrador. El catálogo maestro no se modifica.
              </small>
            </label>
          </template>

          <template v-else>
            <label
              v-for="campo in camposVisibles"
              :key="campo.codigo"
              class="field"
            >
              <span>
                {{ campo.etiqueta }}

                <small
                  v-if="campo.requerido === 1"
                >
                  *
                </small>
              </span>

              <select
                v-if="
                  campo.tipo_dato ===
                    'SELECCION'
                "
                v-model="
                  valores[campo.codigo]
                "
              >
                <option value="">
                  Seleccione…
                </option>

                <option
                  v-for="opcion in campo.opciones"
                  :key="opcion"
                  :value="opcion"
                >
                  {{ opcion }}
                </option>
              </select>

              <textarea
                v-else-if="
                  campo.tipo_dato ===
                    'TEXTO_LARGO'
                "
                v-model="
                  valores[campo.codigo]
                "
                rows="4"
              />

              <input
                v-else
                v-model="
                  valores[campo.codigo]
                "
                :type="inputType(campo)"
                :step="
                  campo.tipo_dato ===
                    'DECIMAL'
                    ? '0.01'
                    : undefined
                "
              >

              <small
                v-if="campo.ayuda"
                class="help"
              >
                {{ campo.ayuda }}
              </small>
            </label>
          </template>
        </section>

        <button
          class="primary"
          type="submit"
          :disabled="
            guardando ||
            !hojaVidaSeleccionada ||
            !plantillaSeleccionada
          "
        >
          {{
            guardando
              ? 'Guardando…'
              : 'Guardar borrador'
          }}
        </button>
      </form>

      <section
        v-if="plantillaSeleccionada"
        class="card preview"
      >
        <div class="preview-header">
          <div>
            <span class="eyebrow">
              Vista previa
            </span>

            <h2
              :style="{
                color:
                  plantillaSeleccionada
                    .color_hex,
              }"
            >
              {{ tituloFinal }}
            </h2>
          </div>

          <span
            class="color-badge"
            :class="
              plantillaSeleccionada
                .color_semantico
                .toLowerCase()
            "
          >
            {{
              plantillaSeleccionada
                .color_semantico
            }}
          </span>
        </div>

        <div
          v-if="hojaVidaSeleccionada"
          class="preview-person"
        >
          <strong>
            {{
              hojaVidaSeleccionada
                .grado_calidad_abreviatura
            }}

            {{
              hojaVidaSeleccionada
                .persona_nombre_completo
            }}
          </strong>

          <span>
            {{
              hojaVidaSeleccionada
                .periodo_nombre
            }}
          </span>
        </div>

        <div
          v-if="resolucionSeleccionada"
          class="preview-resolution"
        >
          <strong>
            Resolución
            {{ resolucionSeleccionada.numero_visible }}
          </strong>

          <span>
            {{ resolucionSeleccionada.fecha_documento }}
            ·
            {{ resolucionSeleccionada.concepto_nombre_actual }}
            ·
            {{ resolucionSeleccionada.puntaje_visual_actual }}
          </span>
        </div>

        <pre
          :style="{
            color:
              plantillaSeleccionada.color_hex,
          }"
        >{{ cuerpoRenderizado }}</pre>

        <div
          v-if="pendientes.length > 0"
          class="pending"
        >
          Faltan {{ pendientes.length }}
          campo(s) obligatorio(s).
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.page {
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

.page-header,
.layout,
.alert,
.loading {
  max-width: 1460px;
  margin-right: auto;
  margin-left: auto;
}

.page-header {
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  gap: 22px;
  align-items: flex-start;
}

.page-header h1 {
  margin: 5px 0 0;
  color: #111827;
  font-size: 29px;
  line-height: 1.12;
  letter-spacing: -0.03em;
  font-weight: 760;
}

.page-header p {
  max-width: 680px;
  margin: 6px 0 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.4;
}

.eyebrow {
  display: block;
  color: #155bd6;
  font-size: 11px;
  font-weight: 760;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.alert,
.loading {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 650;
}

.error {
  color: #b4232d;
  background: #fff0f1;
  border: 1px solid #facdd0;
}

.success {
  color: #11834f;
  background: #e7f7ef;
  border: 1px solid #c8ecd9;
}

.loading {
  min-height: 220px;
  display: grid;
  place-items: center;
  color: #64748b;
  background: #ffffff;
  border: 1px solid #dbe3ef;
}

.layout {
  display: grid;
  grid-template-columns:
    minmax(500px, 0.92fr)
    minmax(520px, 1.08fr);
  gap: 14px;
  align-items: start;
}

.card {
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.025);
}

.form {
  padding: 0;
  overflow: hidden;
}

.form,
.section,
.resolution-form,
.resolution-summary {
  display: grid;
}

.section {
  gap: 13px;
  padding: 18px;
}

.section + .section {
  border-top: 1px solid #edf1f6;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.section-heading > span {
  width: 26px;
  height: 26px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  color: #155bd6;
  background: #eef4ff;
  border: 1px solid #d9e6ff;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 800;
}

.section-heading > div {
  display: grid;
  gap: 2px;
}

.section-heading strong {
  color: #111827;
  font-size: 14px;
  font-weight: 760;
}

.section-heading small {
  color: #667085;
  font-size: 11.5px;
  line-height: 1.35;
}

.field {
  display: grid;
  gap: 5px;
}

.field > span {
  color: #536078;
  font-size: 11.5px;
  font-weight: 700;
}

.field span small {
  color: #b4232d;
}

.field input,
.field select,
.field textarea {
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

.field textarea {
  min-height: 136px;
  resize: vertical;
  line-height: 1.5;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: #7fa8ec;
  box-shadow: 0 0 0 3px rgba(21, 91, 214, 0.075);
}

.field select:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.help {
  color: #667085 !important;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.35;
}

.warning-help {
  color: #8a5a00 !important;
}

.sheet-summary,
.preview-person,
.preview-resolution,
.resolution-summary {
  padding: 10px 12px;
  background: #f8fbff;
  border: 1px solid #d9e6ff;
  border-radius: 8px;
}

.sheet-summary,
.preview-person,
.preview-resolution {
  display: grid;
  gap: 3px;
}

.sheet-summary strong,
.preview-person strong,
.preview-resolution strong,
.resolution-summary strong {
  color: #155bd6;
  font-size: 12.5px;
  font-weight: 760;
}

.sheet-summary span,
.preview-person span,
.preview-resolution span,
.resolution-summary span {
  color: #64748b;
  font-size: 11.5px;
}

.resolution-section {
  margin: 0;
  background: #fbfdff;
  border-top: 1px solid #edf1f6;
}

.resolution-section .section-heading > span {
  color: #a36700;
  background: #fff6df;
  border-color: #f2dfaa;
}

.resolution-form {
  gap: 12px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
}

.primary,
.secondary {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 7px;
  font: inherit;
  font-size: 13px;
  font-weight: 740;
  cursor: pointer;
}

.primary {
  margin: 0 18px 18px;
  color: #ffffff;
  background: #155bd6;
  border: 1px solid #124fb9;
  box-shadow: 0 5px 12px rgba(21, 91, 214, 0.12);
}

.primary:hover:not(:disabled) {
  background: #0f4fc2;
}

.primary:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.secondary {
  color: #334155;
  background: #ffffff;
  border: 1px solid #b9c9e7;
}

.preview {
  position: sticky;
  top: 18px;
  padding: 0;
  overflow: hidden;
}

.preview-header {
  min-height: 74px;
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  border-bottom: 1px solid #edf1f6;
}

.preview-header h2 {
  margin: 7px 0 0;
  font-size: 18px;
  line-height: 1.35;
  letter-spacing: -0.01em;
  text-decoration: underline;
}

.color-badge {
  padding: 5px 9px;
  color: #334155;
  background: #eef2f7;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 750;
}

.color-badge.rojo {
  color: #b4232d;
  background: #fff0f1;
}

.color-badge.azul {
  color: #155bd6;
  background: #eef4ff;
}

.color-badge.verde {
  color: #0f8f5a;
  background: #e7f7ef;
}

.preview-person,
.preview-resolution {
  margin: 14px 18px 0;
}

.preview pre {
  min-height: 330px;
  margin: 14px 18px 0;
  padding: 16px;
  white-space: pre-wrap;
  background: #ffffff;
  border: 1px solid #edf1f6;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  line-height: 1.72;
}

.pending {
  margin: 14px 18px 18px;
  padding: 9px 12px;
  color: #8a5a00;
  background: #fff8e1;
  border: 1px solid #f1dda3;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 650;
}

@media (max-width: 1180px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .preview {
    position: static;
  }
}

@media (max-width: 720px) {
  .page {
    padding: 22px;
  }

  .page-header {
    flex-direction: column;
  }

  .page-header h1 {
    font-size: 27px;
  }
}
</style>
