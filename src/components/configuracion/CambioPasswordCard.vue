<script setup lang="ts">
import { computed, ref } from 'vue'
import { cambiarPasswordLocal } from '../../services/authLocal'

const passwordActual = ref('')
const passwordNueva = ref('')
const confirmacion = ref('')
const procesando = ref(false)
const error = ref('')
const mensaje = ref('')

const usuario = computed(() => localStorage.getItem('hvdigital_usuario_recordado') || 'calificador')

async function cambiar(): Promise<void> {
  error.value = ''
  mensaje.value = ''

  if (!passwordActual.value || !passwordNueva.value || !confirmacion.value) {
    error.value = 'Complete los tres campos de contraseña.'
    return
  }

  if (passwordNueva.value !== confirmacion.value) {
    error.value = 'La confirmación no coincide con la nueva contraseña.'
    return
  }

  procesando.value = true

  try {
    mensaje.value = await cambiarPasswordLocal(
      usuario.value,
      passwordActual.value,
      passwordNueva.value,
    )
    passwordActual.value = ''
    passwordNueva.value = ''
    confirmacion.value = ''
  } catch (excepcion) {
    error.value = excepcion instanceof Error ? excepcion.message : String(excepcion)
  } finally {
    procesando.value = false
  }
}
</script>

<template>
  <section class="hv-password-card">
    <header class="hv-password-title">
      <span class="hv-password-icon"><i class="pi pi-key" /></span>
      <div>
        <strong>Contraseña de ingreso</strong>
        <small>Protege el acceso local a HVDigital.</small>
      </div>
    </header>

    <div v-if="error" class="hv-password-message hv-password-message-error">{{ error }}</div>
    <div v-if="mensaje" class="hv-password-message hv-password-message-success">{{ mensaje }}</div>

    <form class="hv-password-form" @submit.prevent="cambiar">
      <div class="hv-password-info">
        <i class="pi pi-user" />
        <span>Usuario local: <strong>{{ usuario }}</strong></span>
      </div>

      <label>
        <span>Contraseña actual</span>
        <input v-model="passwordActual" type="password" autocomplete="current-password">
      </label>

      <label>
        <span>Nueva contraseña</span>
        <input v-model="passwordNueva" type="password" autocomplete="new-password">
        <small>Mínimo 10 caracteres y debe ser distinta de la actual.</small>
      </label>

      <label>
        <span>Confirmar nueva contraseña</span>
        <input v-model="confirmacion" type="password" autocomplete="new-password" @keyup.enter="cambiar">
      </label>

      <div class="hv-password-actions">
        <div>
          <strong>Cambio inmediato</strong>
          <span>La contraseña anterior dejará de ser válida después de guardar.</span>
        </div>
        <button type="submit" class="hv-button hv-button-primary" :disabled="procesando">
          <i :class="procesando ? 'pi pi-spin pi-spinner' : 'pi pi-lock'" />
          {{ procesando ? 'Actualizando…' : 'Cambiar contraseña' }}
        </button>
      </div>
    </form>
  </section>
</template>
