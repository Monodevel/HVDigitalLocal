<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Tag from 'primevue/tag'
import { cambiarPasswordUsuario, guardarPerfilUsuario, obtenerPerfilUsuario, type PerfilUsuarioDto } from '../../services/perfilUsuario'

const perfil = ref<PerfilUsuarioDto | null>(null)
const cargando = ref(true)
const guardando = ref(false)
const cambiandoPassword = ref(false)
const mensaje = ref('')
const error = ref('')

const formulario = reactive({
  nombres: '', apellidoPaterno: '', apellidoMaterno: '', run: '', unidadNombre: '', unidadSigla: '', puesto: '',
})
const seguridad = reactive({ actual: '', nueva: '', repetir: '' })

const iniciales = computed(() => {
  const p = perfil.value
  if (!p) return 'HV'
  const partes = [p.nombres, p.apellidoPaterno].filter(Boolean)
  return partes.map(v => v.trim().charAt(0).toUpperCase()).join('').slice(0, 2) || 'HV'
})

function cargarFormulario(p: PerfilUsuarioDto): void {
  formulario.nombres = p.nombres
  formulario.apellidoPaterno = p.apellidoPaterno
  formulario.apellidoMaterno = p.apellidoMaterno
  formulario.run = p.run ?? ''
  formulario.unidadNombre = p.unidadNombre
  formulario.unidadSigla = p.unidadSigla
  formulario.puesto = p.puesto
}

async function cargar(): Promise<void> {
  cargando.value = true; error.value = ''; mensaje.value = ''
  try { perfil.value = await obtenerPerfilUsuario(); cargarFormulario(perfil.value) }
  catch (e) { error.value = e instanceof Error ? e.message : String(e) }
  finally { cargando.value = false }
}

async function guardar(): Promise<void> {
  if (!perfil.value?.gradoId) { error.value = 'El perfil no tiene un grado asociado y no puede actualizarse todavía.'; return }
  guardando.value = true; error.value = ''; mensaje.value = ''
  try {
    await guardarPerfilUsuario({
      gradoId: perfil.value.gradoId,
      run: formulario.run,
      nombres: formulario.nombres,
      apellidoPaterno: formulario.apellidoPaterno,
      apellidoMaterno: formulario.apellidoMaterno,
      unidadNombre: formulario.unidadNombre,
      unidadSigla: formulario.unidadSigla,
      puesto: formulario.puesto,
    })
    perfil.value = await obtenerPerfilUsuario(); cargarFormulario(perfil.value)
    mensaje.value = 'Perfil actualizado correctamente.'
  } catch (e) { error.value = e instanceof Error ? e.message : String(e) }
  finally { guardando.value = false }
}

async function cambiarPassword(): Promise<void> {
  error.value = ''; mensaje.value = ''
  if (!seguridad.actual || !seguridad.nueva || !seguridad.repetir) { error.value = 'Complete los tres campos de contraseña.'; return }
  if (seguridad.nueva.length < 10) { error.value = 'La nueva contraseña debe tener al menos 10 caracteres.'; return }
  if (seguridad.nueva !== seguridad.repetir) { error.value = 'La confirmación no coincide con la nueva contraseña.'; return }
  cambiandoPassword.value = true
  try {
    mensaje.value = await cambiarPasswordUsuario(seguridad.actual, seguridad.nueva)
    seguridad.actual = ''; seguridad.nueva = ''; seguridad.repetir = ''
  } catch (e) { error.value = e instanceof Error ? e.message : String(e) }
  finally { cambiandoPassword.value = false }
}

onMounted(() => void cargar())
</script>

<template>
  <div class="hv-profile-page">
    <header class="hv-profile-hero">
      <div class="hv-profile-avatar">{{ iniciales }}</div>
      <div class="hv-profile-identity">
        <span class="hv-eyebrow">Mi cuenta</span>
        <h1>{{ perfil?.nombreMostrar || 'Perfil de usuario' }}</h1>
        <div class="hv-profile-meta">
          <span><i class="pi pi-at" /> {{ perfil?.usuario || '—' }}</span>
          <Tag :value="perfil?.rol === 'ADMIN' ? 'Administrador' : 'Calificador'" :severity="perfil?.rol === 'ADMIN' ? 'info' : 'secondary'" />
          <span v-if="perfil?.grado"><i class="pi pi-id-card" /> {{ perfil.grado }}</span>
        </div>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined aria-label="Actualizar perfil" :loading="cargando" @click="cargar" />
    </header>

    <div v-if="error || mensaje" :class="['hv-profile-feedback', error ? 'is-error' : 'is-success']">
      <i :class="error ? 'pi pi-exclamation-circle' : 'pi pi-check-circle'" />
      <span>{{ error || mensaje }}</span>
    </div>

    <div class="hv-profile-grid">
      <Card class="hv-profile-card hv-profile-card-main">
        <template #title>Datos personales e institucionales</template>
        <template #subtitle>Estos datos identifican al calificador dentro de HVDigital.</template>
        <template #content>
          <div class="hv-profile-form-grid">
            <div class="hv-field hv-field-span-2"><label>Nombres</label><InputText v-model="formulario.nombres" fluid :disabled="cargando" /></div>
            <div class="hv-field"><label>Apellido paterno</label><InputText v-model="formulario.apellidoPaterno" fluid :disabled="cargando" /></div>
            <div class="hv-field"><label>Apellido materno</label><InputText v-model="formulario.apellidoMaterno" fluid :disabled="cargando" /></div>
            <div class="hv-field"><label>RUN</label><InputText v-model="formulario.run" fluid :disabled="cargando" placeholder="12.345.678-9" /></div>
            <div class="hv-field"><label>Grado</label><InputText :model-value="perfil?.grado || 'Sin grado'" fluid disabled /></div>
            <div class="hv-field hv-field-span-2"><label>Unidad o repartición</label><InputText v-model="formulario.unidadNombre" fluid :disabled="cargando" /></div>
            <div class="hv-field"><label>Sigla</label><InputText v-model="formulario.unidadSigla" fluid :disabled="cargando" /></div>
            <div class="hv-field"><label>Puesto</label><InputText v-model="formulario.puesto" fluid :disabled="cargando" /></div>
          </div>
          <div class="hv-profile-actions"><span>El nombre de usuario y el rol son administrados por el sistema.</span><Button label="Guardar cambios" icon="pi pi-save" :loading="guardando" @click="guardar" /></div>
        </template>
      </Card>

      <Card class="hv-profile-card hv-security-card">
        <template #title>Seguridad de la cuenta</template>
        <template #subtitle>Cambie su contraseña sin intervención del administrador.</template>
        <template #content>
          <div class="hv-security-callout"><i class="pi pi-shield" /><div><strong>Contraseña protegida</strong><span>La nueva contraseña debe contener al menos 10 caracteres.</span></div></div>
          <div class="hv-form-stack">
            <label>Contraseña actual</label><Password v-model="seguridad.actual" :feedback="false" toggle-mask fluid autocomplete="current-password" />
            <label>Nueva contraseña</label><Password v-model="seguridad.nueva" :feedback="false" toggle-mask fluid autocomplete="new-password" />
            <label>Confirmar nueva contraseña</label><Password v-model="seguridad.repetir" :feedback="false" toggle-mask fluid autocomplete="new-password" @keyup.enter="cambiarPassword" />
          </div>
          <Button class="hv-security-button" label="Actualizar contraseña" icon="pi pi-key" severity="secondary" outlined fluid :loading="cambiandoPassword" @click="cambiarPassword" />
        </template>
      </Card>
    </div>
  </div>
</template>
