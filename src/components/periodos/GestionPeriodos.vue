<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import Tag from 'primevue/tag'

import {
  cerrarPeriodoVigente,
  crearNuevoPeriodo,
  listarPeriodosGestion,
  type PeriodoGestion,
} from '../../services/periodosGestion'

const periodos = ref<PeriodoGestion[]>([])
const cargando = ref(true)
const procesando = ref(false)
const error = ref('')
const mensaje = ref('')
const mostrarNuevo = ref(false)
const anioNuevo = ref(new Date().getFullYear())

const periodoAbierto = computed(() => periodos.value.find(item => item.estado === 'abierto') ?? null)

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = ''
  try {
    periodos.value = await listarPeriodosGestion()
  } catch (excepcion) {
    error.value = excepcion instanceof Error ? excepcion.message : String(excepcion)
  } finally {
    cargando.value = false
  }
}

async function cerrarActual(): Promise<void> {
  if (!periodoAbierto.value) return
  const confirmado = window.confirm(
    `¿Desea cerrar el período ${periodoAbierto.value.nombre}?\n\nDespués de cerrarlo solo podrá consultarse y no podrá volver a abrirse.`,
  )
  if (!confirmado) return

  procesando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    await cerrarPeriodoVigente()
    mensaje.value = 'Período cerrado correctamente. Desde ahora queda disponible solo para consulta.'
    await cargar()
    window.dispatchEvent(new CustomEvent('hvdigital-periodos-actualizados'))
  } catch (excepcion) {
    error.value = excepcion instanceof Error ? excepcion.message : String(excepcion)
  } finally {
    procesando.value = false
  }
}

async function crear(): Promise<void> {
  procesando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    await crearNuevoPeriodo(anioNuevo.value)
    mostrarNuevo.value = false
    mensaje.value = `Período ${anioNuevo.value}-${anioNuevo.value + 1} creado correctamente.`
    await cargar()
    window.dispatchEvent(new CustomEvent('hvdigital-periodos-actualizados'))
  } catch (excepcion) {
    error.value = excepcion instanceof Error ? excepcion.message : String(excepcion)
  } finally {
    procesando.value = false
  }
}

onMounted(() => void cargar())
</script>

<template>
  <section class="hv-period-management">
    <div class="hv-period-management-copy">
      <span class="hv-eyebrow">Administración de períodos</span>
      <strong>{{ periodoAbierto ? `Período activo: ${periodoAbierto.nombre}` : 'No existe un período abierto' }}</strong>
      <small>
        {{ periodoAbierto
          ? 'Solo este período admite modificaciones. Los anteriores permanecen disponibles en modo consulta.'
          : 'Puede crear un nuevo período. Los períodos históricos permanecerán inalterables.' }}
      </small>
    </div>

    <div class="hv-period-management-actions">
      <Tag
        :value="periodoAbierto ? '1 período abierto' : 'Sin período abierto'"
        :severity="periodoAbierto ? 'success' : 'warn'"
      />
      <Button
        v-if="periodoAbierto"
        label="Cerrar período vigente"
        icon="pi pi-lock"
        severity="danger"
        outlined
        :loading="procesando"
        @click="cerrarActual"
      />
      <Button
        label="Nuevo período"
        icon="pi pi-plus"
        :disabled="Boolean(periodoAbierto)"
        @click="mostrarNuevo = true"
      />
    </div>
  </section>

  <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
  <Message v-if="mensaje" severity="success" :closable="false">{{ mensaje }}</Message>

  <Dialog v-model:visible="mostrarNuevo" modal header="Crear nuevo período" :style="{ width: '30rem' }">
    <div class="hv-period-dialog-content">
      <p>Solo puede existir un período abierto. Los períodos cerrados no pueden reabrirse.</p>
      <label for="anioPeriodo">Año de inicio</label>
      <InputNumber
        input-id="anioPeriodo"
        v-model="anioNuevo"
        :use-grouping="false"
        :min="2020"
        :max="2100"
        fluid
      />
      <small>Se creará el período {{ anioNuevo }}-{{ anioNuevo + 1 }} con sus vigencias reglamentarias.</small>
    </div>
    <template #footer>
      <Button label="Cancelar" severity="secondary" text @click="mostrarNuevo = false" />
      <Button label="Crear período" icon="pi pi-check" :loading="procesando" @click="crear" />
    </template>
  </Dialog>
</template>
