<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Password from 'primevue/password'
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
  <Card class="hv-password-card">
    <template #title>
      <div class="hv-password-title">
        <span class="hv-password-icon"><i class="pi pi-key" /></span>
        <div>
          <strong>Contraseña de ingreso</strong>
          <small>Protege el acceso local a HVDigital.</small>
        </div>
      </div>
    </template>

    <template #content>
      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
      <Message v-if="mensaje" severity="success" :closable="false">{{ mensaje }}</Message>

      <form class="hv-password-form" @submit.prevent="cambiar">
        <div class="hv-password-info">
          <i class="pi pi-user" />
          <span>Usuario local: <strong>{{ usuario }}</strong></span>
        </div>

        <label>
          <span>Contraseña actual</span>
          <Password
            v-model="passwordActual"
            :feedback="false"
            toggle-mask
            autocomplete="current-password"
            fluid
          />
        </label>

        <label>
          <span>Nueva contraseña</span>
          <Password
            v-model="passwordNueva"
            :feedback="false"
            toggle-mask
            autocomplete="new-password"
            fluid
          />
          <small>Mínimo 10 caracteres y debe ser distinta de la actual.</small>
        </label>

        <label>
          <span>Confirmar nueva contraseña</span>
          <Password
            v-model="confirmacion"
            :feedback="false"
            toggle-mask
            autocomplete="new-password"
            fluid
            @keyup.enter="cambiar"
          />
        </label>

        <div class="hv-password-actions">
          <div>
            <strong>Cambio inmediato</strong>
            <span>La contraseña anterior dejará de ser válida después de guardar.</span>
          </div>
          <Button
            type="submit"
            label="Cambiar contraseña"
            icon="pi pi-lock"
            :loading="procesando"
          />
        </div>
      </form>
    </template>
  </Card>
</template>
