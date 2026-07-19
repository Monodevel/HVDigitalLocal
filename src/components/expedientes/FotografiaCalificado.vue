<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'

import {
  eliminarFotografiaCalificado,
  guardarFotografiaCalificado,
  obtenerFotografiaPorExpediente,
} from '../../services/fotografiasCalificados'

const props = defineProps<{
  expedienteId: number
  iniciales: string
}>()

const personaId = ref<number | null>(null)
const fotografia = ref<string | null>(null)
const cargando = ref(true)
const procesando = ref(false)
const error = ref('')
const inputArchivo = ref<HTMLInputElement | null>(null)

const tieneFotografia = computed(() => Boolean(fotografia.value))

function mensajeError(excepcion: unknown): string {
  return excepcion instanceof Error ? excepcion.message : String(excepcion)
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  try {
    const resultado = await obtenerFotografiaPorExpediente(props.expedienteId)
    personaId.value = resultado?.personaId ?? null
    fotografia.value = resultado?.dataUrl ?? null
  } catch (excepcion) {
    error.value = mensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

function abrirSelector(): void {
  inputArchivo.value?.click()
}

function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const imagen = new Image()
    imagen.onload = () => {
      URL.revokeObjectURL(url)
      resolve(imagen)
    }
    imagen.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No fue posible leer la imagen seleccionada.'))
    }
    imagen.src = url
  })
}

async function optimizar(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Seleccione una imagen JPG, PNG o WebP.')
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('La imagen original no puede superar 12 MB.')
  }

  const imagen = await cargarImagen(file)
  const maximo = 800
  const escala = Math.min(1, maximo / Math.max(imagen.naturalWidth, imagen.naturalHeight))
  const ancho = Math.max(1, Math.round(imagen.naturalWidth * escala))
  const alto = Math.max(1, Math.round(imagen.naturalHeight * escala))
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('No fue posible procesar la fotografía.')
  contexto.drawImage(imagen, 0, 0, ancho, alto)
  return canvas.toDataURL('image/jpeg', 0.82)
}

async function seleccionar(evento: Event): Promise<void> {
  const input = evento.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !personaId.value) return

  procesando.value = true
  error.value = ''
  try {
    const dataUrl = await optimizar(file)
    await guardarFotografiaCalificado(personaId.value, dataUrl)
    fotografia.value = dataUrl
  } catch (excepcion) {
    error.value = mensajeError(excepcion)
  } finally {
    procesando.value = false
  }
}

async function eliminar(): Promise<void> {
  if (!personaId.value || !fotografia.value) return
  if (!window.confirm('¿Desea eliminar la fotografía del calificado?')) return

  procesando.value = true
  error.value = ''
  try {
    await eliminarFotografiaCalificado(personaId.value)
    fotografia.value = null
  } catch (excepcion) {
    error.value = mensajeError(excepcion)
  } finally {
    procesando.value = false
  }
}

onMounted(() => void cargar())
</script>

<template>
  <div class="hv-photo-manager">
    <button
      class="hv-photo-frame"
      type="button"
      :disabled="cargando || procesando"
      :title="tieneFotografia ? 'Cambiar fotografía' : 'Agregar fotografía'"
      @click="abrirSelector"
    >
      <img v-if="fotografia" :src="fotografia" alt="Fotografía del calificado">
      <span v-else>{{ iniciales }}</span>
      <i v-if="cargando || procesando" class="pi pi-spin pi-spinner" />
      <small><i class="pi pi-camera" /> {{ tieneFotografia ? 'Cambiar' : 'Agregar' }}</small>
    </button>

    <input
      ref="inputArchivo"
      class="hv-photo-input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      @change="seleccionar"
    >

    <Button
      v-if="fotografia"
      label="Eliminar foto"
      icon="pi pi-trash"
      severity="secondary"
      text
      size="small"
      :disabled="procesando"
      @click="eliminar"
    />

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
  </div>
</template>
