<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import AppLayout from '../../components/layout/AppLayout.vue'
import AppCard from '../../components/ui/AppCard.vue'
import PageActions from '../../components/ui/PageActions.vue'

import {
  listarConceptosComoOpciones,
  listarPuntajesPorEfecto,
} from '../../services/anotaciones'

import {
  listarHojasVidaAbiertasPorPersona,
  listarPersonasConHojaVidaAbierta,
} from '../../services/hojaVida'

import {
  actualizarBorradorResolucion,
  construirPuntosIniciales,
  crearBorradorResolucion,
  emitirResolucion,
  listarPuntosResolucion,
  obtenerResolucion,
} from '../../services/resolucionesDocumentales'

import type {
  ConceptoOpcion,
  PuntajeAnotacion,
} from '../../types/anotaciones'

import type {
  HojaVidaAbierta,
  PersonaConHojaVidaAbierta,
} from '../../types/hojaVida'

import type {
  PuntoResolucion,
  ResolucionDocumento,
  SeccionResolucion,
  TipoEfectoResolucion,
} from '../../types/resolucionesDocumentales'

const props = defineProps<{
  resolucionId?: number | null
}>()

const emit = defineEmits<{
  volver: []
  guardada: [resolucionId: number]
  emitida: [resolucionId: number]
}>()

const cargando = ref(true)
const cargandoHojas = ref(false)
const guardando = ref(false)
const emitiendo = ref(false)

const error = ref('')
const mensaje = ref('')
const menuAccionesAbierto = ref(false)

const resolucion = ref<ResolucionDocumento | null>(null)
const personas = ref<PersonaConHojaVidaAbierta[]>([])
const hojasVida = ref<HojaVidaAbierta[]>([])
const conceptos = ref<ConceptoOpcion[]>([])
const puntajes = ref<PuntajeAnotacion[]>([])

const personaId = ref<number | null>(null)
const hojaVidaId = ref<number | null>(null)
const tipoEfecto = ref<TipoEfectoResolucion>('DEMERITO')
const fechaDocumento = ref(new Date().toISOString().slice(0, 10))
const conceptoId = ref<number | null>(null)
const puntajeId = ref<number | null>(null)

const asunto = ref('')
const antecedentePrincipal = ref('')
const resuelvoPrincipal = ref('')

const firmanteNombre = ref('')
const firmanteGrado = ref('')
const firmanteCargo = ref('Jefe de Plana Mayor')
const puntos = ref<PuntoResolucion[]>([])

const modoEdicion = computed(() => !!props.resolucionId)

const bloqueada = computed(() =>
  resolucion.value?.estado === 'EMITIDA' ||
  resolucion.value?.estado === 'ANULADA',
)

const hojaVidaSeleccionada = computed(() =>
  hojasVida.value.find((hoja: HojaVidaAbierta) => hoja.hoja_vida_id === hojaVidaId.value) ?? null,
)

const conceptoSeleccionado = computed(() =>
  conceptos.value.find(concepto => concepto.id === conceptoId.value) ?? null,
)

const puntajeSeleccionado = computed(() =>
  puntajes.value.find(puntaje => puntaje.id === puntajeId.value) ?? null,
)

const tituloVista = computed(() => {
  if (resolucion.value?.numero_visible) {
    return `Resolución ${resolucion.value.numero_visible}`
  }

  return modoEdicion.value ? 'Editar resolución' : 'Nueva resolución'
})

const subtituloVista = computed(() => {
  if (bloqueada.value && resolucion.value) {
    return `Estado: ${resolucion.value.estado}`
  }

  return 'Cree el borrador, complete los fundamentos y emita para asignar correlativo 1530/N'
})

const numeroVisible = computed(() =>
  resolucion.value?.numero_visible ?? 'PENDIENTE DE EMISIÓN',
)

const etiquetaTipo = computed(() =>
  tipoEfecto.value === 'MERITO' ? 'mérito' : 'demérito',
)

const nombreCalificado = computed(() => {
  if (!hojaVidaSeleccionada.value) {
    return 'GRADO, NOMBRE Y APELLIDOS'
  }

  return [
    hojaVidaSeleccionada.value.grado_calidad_abreviatura,
    hojaVidaSeleccionada.value.persona_nombre_completo,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
})

const vistos = computed(() => puntosPorSeccion('VISTOS'))
const considerandos = computed(() => puntosPorSeccion('CONSIDERANDO'))
const distribucion = computed(() => puntosPorSeccion('DISTRIBUCION'))

const resuelvoAnotacion = computed(() => {
  const concepto = conceptoSeleccionado.value?.etiqueta ?? 'Concepto seleccionado'
  const puntajeVisual = puntajeSeleccionado.value?.texto_visual ?? 'puntaje seleccionado'
  const puntajeLiteral = puntajeSeleccionado.value?.texto_literal ?? 'texto literal del puntaje'

  return [
    `La presente anotación de ${etiquetaTipo.value} le será estampada en su Hoja de Vida en el ${concepto},`,
    `con ${puntajeVisual} ptos. (${puntajeLiteral}).`,
  ].join(' ')
})

const puedeGuardar = computed(() =>
  !bloqueada.value &&
  !!personaId.value &&
  !!hojaVidaId.value &&
  !!conceptoId.value &&
  !!puntajeId.value &&
  !!fechaDocumento.value &&
  !!resuelvoPrincipal.value.trim(),
)


async function inicializar(): Promise<void> {
  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const [personasResultado, conceptosResultado] = await Promise.all([
      listarPersonasConHojaVidaAbierta(),
      listarConceptosComoOpciones(),
    ])

    personas.value = personasResultado
    conceptos.value = conceptosResultado

    if (props.resolucionId) {
      await cargarResolucionExistente(props.resolucionId)
    } else {
      await iniciarNuevaResolucion()
    }
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

async function iniciarNuevaResolucion(): Promise<void> {
  const primeraPersona = personas.value[0]

  if (primeraPersona) {
    personaId.value = primeraPersona.persona_id
    await cargarHojasVida()
    hojaVidaId.value = hojasVida.value[0]?.hoja_vida_id ?? null
  }

  await cargarPuntajes()
  conceptoId.value = conceptos.value[0]?.id ?? null
  puntos.value = await construirPuntosIniciales(tipoEfecto.value)

  resuelvoPrincipal.value =
    tipoEfecto.value === 'MERITO'
      ? `Felicítese al ${nombreCalificado.value}, por `
      : `Sanciónese al ${nombreCalificado.value}, con `
}

async function cargarResolucionExistente(resolucionId: number): Promise<void> {
  const resultado = await obtenerResolucion(resolucionId)

  if (!resultado) {
    throw new Error('No se encontró la resolución solicitada.')
  }

  resolucion.value = resultado
  personaId.value = resultado.persona_id
  tipoEfecto.value = resultado.tipo_efecto_codigo
  fechaDocumento.value = resultado.fecha_documento
  conceptoId.value = resultado.concepto_id
  puntajeId.value = resultado.puntaje_id
  asunto.value = resultado.asunto ?? ''
  antecedentePrincipal.value = resultado.antecedente_principal ?? ''
  resuelvoPrincipal.value = resultado.resuelvo_principal
  firmanteNombre.value = resultado.firmante_nombre ?? ''
  firmanteGrado.value = resultado.firmante_grado ?? ''
  firmanteCargo.value = resultado.firmante_cargo ?? 'Jefe de Plana Mayor'

  await cargarHojasVida()
  hojaVidaId.value = resultado.hoja_vida_id
  await cargarPuntajes()
  puntos.value = await listarPuntosResolucion(resolucionId)
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
    hojasVida.value = await listarHojasVidaAbiertasPorPersona(personaId.value)
    hojaVidaId.value = hojasVida.value[0]?.hoja_vida_id ?? null
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    cargandoHojas.value = false
  }
}

async function cargarPuntajes(): Promise<void> {
  puntajes.value = await listarPuntajesPorEfecto(tipoEfecto.value)

  if (puntajeId.value && !puntajes.value.some(puntaje => puntaje.id === puntajeId.value)) {
    puntajeId.value = null
  }

  puntajeId.value = puntajeId.value ?? puntajes.value[0]?.id ?? null
}

function puntosPorSeccion(seccion: SeccionResolucion): PuntoResolucion[] {
  return puntos.value
    .filter(punto => punto.seccion === seccion)
    .sort((a, b) => a.orden - b.orden)
}

function agregarPunto(seccion: SeccionResolucion): void {
  if (bloqueada.value) {
    return
  }

  puntos.value.push({
    seccion,
    orden: puntosPorSeccion(seccion).length + 1,
    texto: '',
    origen: 'USUARIO',
    obligatorio: 0,
    editable: 1,
  })

  renumerarSeccion(seccion)
}

function eliminarPunto(punto: PuntoResolucion): void {
  if (bloqueada.value || punto.obligatorio === 1 || punto.editable === 0) {
    return
  }

  puntos.value = puntos.value.filter(actual => actual !== punto)
  renumerarSeccion(punto.seccion)
}

function moverPunto(punto: PuntoResolucion, direccion: -1 | 1): void {
  if (bloqueada.value || punto.editable === 0) {
    return
  }

  const seccion = puntosPorSeccion(punto.seccion)
  const indice = seccion.indexOf(punto)
  const nuevoIndice = indice + direccion

  if (indice < 0 || nuevoIndice < 0 || nuevoIndice >= seccion.length) {
    return
  }

  const otro = seccion[nuevoIndice]
  const ordenActual = punto.orden
  punto.orden = otro.orden
  otro.orden = ordenActual
  renumerarSeccion(punto.seccion)
}

function renumerarSeccion(seccion: SeccionResolucion): void {
  puntosPorSeccion(seccion).forEach((punto, indice) => {
    punto.orden = indice + 1
  })
}

async function guardar(): Promise<number | null> {
  if (!puedeGuardar.value) {
    error.value = 'Debe completar persona, Hoja de Vida, concepto, puntaje, fecha y texto principal del RESUELVO.'
    return null
  }

  if (!personaId.value || !hojaVidaId.value || !conceptoId.value || !puntajeId.value) {
    return null
  }

  guardando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const entrada = {
      hojaVidaId: hojaVidaId.value,
      personaId: personaId.value,
      tipoEfectoCodigo: tipoEfecto.value,
      fechaDocumento: fechaDocumento.value,
      conceptoId: conceptoId.value,
      puntajeId: puntajeId.value,
      asunto: asunto.value,
      antecedentePrincipal: antecedentePrincipal.value,
      resuelvoPrincipal: resuelvoPrincipal.value,
      resuelvoAnotacion: resuelvoAnotacion.value,
      firmanteNombre: firmanteNombre.value,
      firmanteGrado: firmanteGrado.value,
      firmanteCargo: firmanteCargo.value,
      puntos: puntos.value,
    }

    let id: number

    if (resolucion.value) {
      await actualizarBorradorResolucion({
        ...entrada,
        resolucionId: resolucion.value.resolucion_id,
      })

      id = resolucion.value.resolucion_id
    } else {
      id = await crearBorradorResolucion(entrada)
    }

    resolucion.value = await obtenerResolucion(id)
    puntos.value = await listarPuntosResolucion(id)
    mensaje.value = 'Borrador de resolución guardado correctamente.'
    emit('guardada', id)

    return id
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
    return null
  } finally {
    guardando.value = false
  }
}

async function guardarYEmitir():
Promise<void> {
  if (bloqueada.value) {
    error.value =
      'La resolución ya no puede ser emitida porque no está en estado BORRADOR.'
    return
  }

  const confirmado = window.confirm(
    [
      '¿Desea emitir esta resolución?',
      '',
      'Al emitirla se asignará automáticamente el siguiente correlativo 1530/N.',
      'Los borradores no se contabilizan.',
      '',
      'Una vez emitida no podrá modificar sus antecedentes, concepto, puntaje ni texto.',
    ].join('\n'),
  )

  if (!confirmado) {
    return
  }

  emitiendo.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const idGuardado = await guardar()

    if (!idGuardado) {
      throw new Error(
        'No fue posible guardar el borrador antes de emitir.',
      )
    }

    const resultado =
      await emitirResolucion(idGuardado)

    const resolucionActualizada =
      await obtenerResolucion(idGuardado)

    if (!resolucionActualizada) {
      throw new Error(
        'La resolución fue emitida, pero no fue posible recargarla.',
      )
    }

    resolucion.value =
      resolucionActualizada

    puntos.value =
      await listarPuntosResolucion(
        idGuardado,
      )

    mensaje.value =
      `Resolución ${resultado.numeroVisible} emitida correctamente.`

    emit('emitida', idGuardado)
  } catch (excepcion) {
    console.error(
      'Error al emitir resolución:',
      excepcion,
    )

    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    emitiendo.value = false
  }
}

function imprimir(): void {
  window.print()
}

function obtenerMensajeError(excepcion: unknown): string {
  return excepcion instanceof Error ? excepcion.message : String(excepcion)
}

watch(personaId, async () => {
  if (cargando.value || bloqueada.value) {
    return
  }

  await cargarHojasVida()
})

watch(tipoEfecto, async () => {
  if (cargando.value || bloqueada.value) {
    return
  }

  await cargarPuntajes()
  puntos.value = await construirPuntosIniciales(tipoEfecto.value)
  resuelvoPrincipal.value =
    tipoEfecto.value === 'MERITO'
      ? `Felicítese al ${nombreCalificado.value}, por `
      : `Sanciónese al ${nombreCalificado.value}, con `
})

onMounted(inicializar)
</script>

<template>
  <AppLayout
    :title="tituloVista"
    :subtitle="subtituloVista"
    max-width="full"
  >
    <template #actions>
      <PageActions v-model:open="menuAccionesAbierto">
        <template #primary>
          <button
            v-if="!bloqueada"
            class="hv-button hv-button-primary"
            type="button"
            :disabled="guardando"
            @click="guardar"
          >
            {{ guardando ? 'Guardando…' : 'Guardar borrador' }}
          </button>

          <button
            v-else
            class="hv-button hv-button-primary"
            type="button"
            @click="imprimir"
          >
            Imprimir
          </button>
        </template>

        <button
          v-if="!bloqueada"
          type="button"
          :disabled="emitiendo"
          @click="guardarYEmitir"
        >
          {{ emitiendo ? 'Emitiendo…' : 'Emitir resolución' }}
        </button>

        <button type="button" @click="imprimir">
          Imprimir vista previa
        </button>

        <button type="button" @click="emit('volver')">
          Volver
        </button>
      </PageActions>
    </template>

    <template #notice>
      <div v-if="error" class="notice notice--error no-print">
        {{ error }}
      </div>

      <div v-if="mensaje" class="notice notice--success no-print">
        {{ mensaje }}
      </div>
    </template>

    <section v-if="cargando" class="loading-state no-print">
      Cargando resolución…
    </section>

    <div v-else class="resolution-layout">
      <AppCard
        title="Datos de la resolución"
        subtitle="Complete el borrador antes de emitir"
        padding="lg"
        class="no-print"
      >
        <form class="resolution-form" @submit.prevent="guardar">
          <section class="form-section">
            <div class="section-heading">
              <span>1</span>
              <div>
                <strong>Identificación</strong>
                <small>Persona, Hoja de Vida y tipo de resolución.</small>
              </div>
            </div>

            <label class="field">
              <span>Persona</span>
              <select v-model.number="personaId" :disabled="bloqueada">
                <option :value="null">Seleccione una persona…</option>
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
                :disabled="bloqueada || !personaId || cargandoHojas"
              >
                <option :value="null">
                  {{ cargandoHojas ? 'Cargando…' : 'Seleccione una Hoja de Vida…' }}
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

            <div v-if="hojaVidaSeleccionada" class="information-box">
              <strong>
                {{ hojaVidaSeleccionada.grado_calidad_abreviatura }}
                {{ hojaVidaSeleccionada.persona_nombre_completo }}
              </strong>
              <span>
                Vigencia: {{ hojaVidaSeleccionada.fecha_inicio }} al
                {{ hojaVidaSeleccionada.fecha_termino }}
              </span>
            </div>

            <label class="field">
              <span>Tipo</span>
              <select v-model="tipoEfecto" :disabled="bloqueada">
                <option value="MERITO">Mérito</option>
                <option value="DEMERITO">Demérito</option>
              </select>
            </label>

            <label class="field">
              <span>Fecha documento</span>
              <input v-model="fechaDocumento" type="date" :disabled="bloqueada">
            </label>
          </section>

          <section class="form-section">
            <div class="section-heading">
              <span>2</span>
              <div>
                <strong>Concepto y puntaje</strong>
                <small>Estos datos generan el efecto en la Hoja de Vida.</small>
              </div>
            </div>

            <label class="field">
              <span>Concepto</span>
              <select v-model.number="conceptoId" :disabled="bloqueada">
                <option :value="null">Seleccione un concepto…</option>
                <option
                  v-for="concepto in conceptos"
                  :key="concepto.id"
                  :value="concepto.id"
                >
                  {{ concepto.etiqueta }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>Puntaje</span>
              <select v-model.number="puntajeId" :disabled="bloqueada">
                <option :value="null">Seleccione un puntaje…</option>
                <option
                  v-for="puntaje in puntajes"
                  :key="puntaje.id"
                  :value="puntaje.id"
                >
                  {{ puntaje.texto_visual }} — {{ puntaje.texto_literal }}
                </option>
              </select>
            </label>
          </section>

          <section class="form-section">
            <div class="section-heading">
              <span>3</span>
              <div>
                <strong>Fundamentos</strong>
                <small>Los puntos reglamentarios se cargan automáticamente.</small>
              </div>
            </div>

            <label class="field">
              <span>Asunto</span>
              <input v-model="asunto" type="text" :disabled="bloqueada">
            </label>

            <label class="field">
              <span>Antecedente principal</span>
              <textarea v-model="antecedentePrincipal" rows="3" :disabled="bloqueada" />
            </label>

            <div class="points-block">
              <header>
                <strong>VISTOS</strong>
                <button type="button" :disabled="bloqueada" @click="agregarPunto('VISTOS')">
                  + Agregar punto
                </button>
              </header>

              <article
                v-for="punto in vistos"
                :key="`vistos-${punto.orden}`"
                class="point-item"
              >
                <span class="point-number">{{ punto.orden }}.</span>
                <textarea
                  v-model="punto.texto"
                  rows="2"
                  :disabled="bloqueada || punto.editable === 0"
                />
                <div class="point-actions">
                  <span v-if="punto.obligatorio === 1">Obligatorio</span>
                  <button type="button" :disabled="bloqueada || punto.editable === 0" @click="moverPunto(punto, -1)">↑</button>
                  <button type="button" :disabled="bloqueada || punto.editable === 0" @click="moverPunto(punto, 1)">↓</button>
                  <button type="button" :disabled="bloqueada || punto.obligatorio === 1 || punto.editable === 0" @click="eliminarPunto(punto)">Eliminar</button>
                </div>
              </article>
            </div>

            <div class="points-block">
              <header>
                <strong>CONSIDERANDO</strong>
                <button type="button" :disabled="bloqueada" @click="agregarPunto('CONSIDERANDO')">
                  + Agregar punto
                </button>
              </header>

              <article
                v-for="punto in considerandos"
                :key="`considerando-${punto.orden}`"
                class="point-item"
              >
                <span class="point-number">{{ punto.orden }}.</span>
                <textarea
                  v-model="punto.texto"
                  rows="2"
                  :disabled="bloqueada || punto.editable === 0"
                />
                <div class="point-actions">
                  <span v-if="punto.obligatorio === 1">Obligatorio</span>
                  <button type="button" :disabled="bloqueada || punto.editable === 0" @click="moverPunto(punto, -1)">↑</button>
                  <button type="button" :disabled="bloqueada || punto.editable === 0" @click="moverPunto(punto, 1)">↓</button>
                  <button type="button" :disabled="bloqueada || punto.obligatorio === 1 || punto.editable === 0" @click="eliminarPunto(punto)">Eliminar</button>
                </div>
              </article>
            </div>
          </section>

          <section class="form-section">
            <div class="section-heading">
              <span>4</span>
              <div>
                <strong>RESUELVO</strong>
                <small>El punto 2 se genera desde concepto y puntaje.</small>
              </div>
            </div>

            <label class="field">
              <span>Texto principal *</span>
              <textarea v-model="resuelvoPrincipal" rows="7" :disabled="bloqueada" />
            </label>

            <div class="generated-box">
              <strong>Punto automático</strong>
              <p>{{ resuelvoAnotacion }}</p>
            </div>
          </section>

          <section class="form-section">
            <div class="section-heading">
              <span>5</span>
              <div>
                <strong>Firma</strong>
                <small>Datos del firmante de la resolución.</small>
              </div>
            </div>

            <label class="field">
              <span>Nombre firmante</span>
              <input v-model="firmanteNombre" type="text" :disabled="bloqueada">
            </label>

            <label class="field">
              <span>Grado firmante</span>
              <input v-model="firmanteGrado" type="text" :disabled="bloqueada">
            </label>

            <label class="field">
              <span>Cargo</span>
              <input v-model="firmanteCargo" type="text" :disabled="bloqueada">
            </label>
          </section>
        </form>
      </AppCard>

      <section class="preview-stage">
        <article class="resolution-document">
          <div v-if="!resolucion || resolucion.estado === 'BORRADOR'" class="draft-watermark">
            BORRADOR
          </div>

          <header class="official-header">
            <div class="institution-block">
              <strong>EJÉRCITO DE CHILE</strong>
              <span>I DIVISIÓN</span>
              <span>Brig. Mot. N.º 1 “Calama”</span>
            </div>

            <div class="copy-block">
              <span>EJEMPLAR N.º ___/</span>
              <span>HOJA N.º ___/</span>
            </div>
          </header>

          <p class="city-line">CALAMA, {{ fechaDocumento }}</p>

          <h1 class="resolution-title">
            RESOLUCIÓN EXENTA (R) N.º {{ numeroVisible }}
          </h1>

          <section class="document-section">
            <h2>VISTOS:</h2>
            <ol>
              <li v-for="punto in vistos" :key="`preview-vistos-${punto.orden}`">
                {{ punto.texto }}
              </li>
            </ol>
          </section>

          <section class="document-section">
            <h2>CONSIDERANDO:</h2>
            <ol>
              <li v-for="punto in considerandos" :key="`preview-considerando-${punto.orden}`">
                {{ punto.texto }}
              </li>
              <li v-if="antecedentePrincipal">
                {{ antecedentePrincipal }}
              </li>
            </ol>
          </section>

          <section class="document-section">
            <h2>RESUELVO:</h2>
            <ol>
              <li>{{ resuelvoPrincipal }}</li>
              <li>{{ resuelvoAnotacion }}</li>
            </ol>
          </section>

          <p class="closing-line">Anótese, notifíquese, regístrese y archívese.</p>

          <section class="signature-block">
            <strong>{{ firmanteNombre || 'XXXXXXXXXXXX' }}</strong>
            <span>{{ firmanteGrado || '(Grado)' }}</span>
            <span>{{ firmanteCargo || 'Jefe de Plana Mayor' }}</span>
          </section>

          <section class="distribution-block">
            <h2>DISTRIBUCIÓN:</h2>
            <ol>
              <li v-for="punto in distribucion" :key="`preview-distribucion-${punto.orden}`">
                {{ punto.texto }}
              </li>
            </ol>
          </section>
        </article>
      </section>
    </div>
  </AppLayout>
</template>

<style scoped>
.notice { padding: 13px 15px; border-radius: var(--hv-radius-sm); font-size: 13px; }
.notice--error { color: var(--hv-danger); background: var(--hv-danger-soft); border: 1px solid #f2c8cc; }
.notice--success { color: var(--hv-success); background: var(--hv-success-soft); border: 1px solid #bce2cb; }
.loading-state { min-height: 300px; display: grid; place-items: center; color: var(--hv-muted); background: var(--hv-surface); border: 1px solid var(--hv-border); border-radius: var(--hv-radius-lg); }
.resolution-layout { display: grid; grid-template-columns: minmax(440px, 0.86fr) minmax(0, 1.14fr); gap: 18px; align-items: start; }
.resolution-form, .form-section { display: grid; gap: 15px; }
.form-section + .form-section { padding-top: 22px; border-top: 1px solid var(--hv-border); }
.section-heading { display: flex; align-items: center; gap: 11px; }
.section-heading > span { width: 30px; height: 30px; flex: 0 0 auto; display: grid; place-items: center; color: #fff; background: var(--hv-primary); border-radius: 9px; font-size: 12px; font-weight: 800; }
.section-heading > div { display: grid; gap: 2px; }
.section-heading strong { font-size: 14px; }
.section-heading small { color: var(--hv-muted); font-size: 12px; }
.field { display: grid; gap: 7px; }
.field > span { color: #344054; font-size: 12px; font-weight: 750; }
.field input, .field select, .field textarea, .point-item textarea { width: 100%; min-height: 42px; padding: 9px 11px; box-sizing: border-box; color: var(--hv-text); background: #fbfcfd; border: 1px solid #d8dde4; border-radius: var(--hv-radius-sm); font: inherit; }
.field textarea, .point-item textarea { resize: vertical; }
.field input:focus, .field select:focus, .field textarea:focus, .point-item textarea:focus { background: #fff; border-color: #6b9bc2; outline: none; box-shadow: 0 0 0 3px rgba(31, 93, 147, 0.1); }
.field input:disabled, .field select:disabled, .field textarea:disabled, .point-item textarea:disabled { cursor: not-allowed; opacity: 0.72; }
.information-box, .generated-box { padding: 13px 14px; display: grid; gap: 4px; background: var(--hv-primary-soft); border: 1px solid #c9dcec; border-radius: 10px; }
.information-box strong, .generated-box strong { color: var(--hv-primary); font-size: 13px; }
.information-box span, .generated-box p { margin: 0; color: var(--hv-muted); font-size: 12px; }
.points-block { display: grid; gap: 10px; }
.points-block > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.points-block > header strong { color: var(--hv-text); font-size: 12px; letter-spacing: 0.05em; }
.points-block > header button, .point-actions button { min-height: 30px; padding: 0 9px; color: var(--hv-primary); background: var(--hv-surface); border: 1px solid var(--hv-border); border-radius: var(--hv-radius-sm); font-size: 11px; font-weight: 720; }
.points-block > header button:disabled, .point-actions button:disabled { cursor: not-allowed; opacity: 0.55; }
.point-item { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 8px; padding: 10px; background: #fafbfd; border: 1px solid var(--hv-border); border-radius: 10px; }
.point-number { padding-top: 10px; color: var(--hv-primary); font-weight: 800; }
.point-actions { grid-column: 2; display: flex; flex-wrap: wrap; gap: 7px; }
.point-actions span { min-height: 30px; padding: 0 9px; display: inline-grid; place-items: center; color: #755514; background: var(--hv-warning-soft); border-radius: 999px; font-size: 10px; font-weight: 800; }
.preview-stage { padding: 24px; overflow: auto; background: #e7ebf0; border: 1px solid #d4dae2; border-radius: 16px; }
.resolution-document { position: relative; width: 216mm; min-height: 330mm; margin: 0 auto; padding: 18mm 18mm 16mm; box-sizing: border-box; color: #111; background: #fff; box-shadow: 0 18px 50px rgba(25, 39, 58, 0.17); font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.35; }
.draft-watermark { position: absolute; top: 145mm; left: 50%; z-index: 0; color: rgba(180, 35, 45, 0.1); transform: translateX(-50%) rotate(-28deg); font-size: 72pt; font-weight: 800; letter-spacing: 0.08em; pointer-events: none; }
.official-header { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr auto; gap: 20px; }
.institution-block { display: grid; width: fit-content; min-width: 260px; gap: 2px; text-align: center; }
.institution-block strong { text-decoration: underline; }
.copy-block { display: grid; gap: 4px; font-size: 10pt; }
.city-line { position: relative; z-index: 1; margin: 22px 0 10px; text-align: right; }
.resolution-title { position: relative; z-index: 1; margin: 0 0 22px; text-align: center; font-size: 13pt; font-weight: 700; text-decoration: underline; }
.document-section { position: relative; z-index: 1; margin-top: 18px; }
.document-section h2, .distribution-block h2 { margin: 0 0 6px; font-size: 12pt; font-weight: 700; }
.document-section ol, .distribution-block ol { margin: 0; padding-left: 22px; }
.document-section li { margin-bottom: 7px; text-align: justify; }
.closing-line { position: relative; z-index: 1; margin: 28px 0 52px; text-align: center; }
.signature-block { position: relative; z-index: 1; width: 72mm; margin-left: auto; display: grid; gap: 4px; text-align: center; }
.signature-block strong { text-transform: uppercase; }
.distribution-block { position: relative; z-index: 1; margin-top: 44mm; break-before: page; page-break-before: always; }
.distribution-block li { margin-bottom: 6px; }
@media (max-width: 1120px) { .resolution-layout { grid-template-columns: 1fr; } }
@media print { @page { size: 216mm 330mm; margin: 12mm 15mm; } html, body { width: 216mm; min-height: 330mm; margin: 0; padding: 0; background: #fff; } .no-print { display: none !important; } :deep(.app-layout) { min-height: 0; padding: 0; background: #fff; } :deep(.app-layout__header), :deep(.app-layout__notice), :deep(.app-layout__summary), :deep(.app-layout__footer) { display: none !important; } .resolution-layout, .preview-stage { display: block; margin: 0; padding: 0; overflow: visible; background: #fff; border: 0; } .resolution-document { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; } .document-section, .document-section li, .signature-block, .distribution-block { break-inside: avoid; page-break-inside: avoid; } }
</style>
