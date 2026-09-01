<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { listarGrados } from '../../services/grados'
import {
  crearUsuarioCalificador,
  editarUsuarioCalificador,
  eliminarUsuarioCalificador,
  listarUsuariosAdministrados,
  type UsuarioAdministrado,
} from '../../services/adminUsuarios'
import type { Grado } from '../../types/grados'

const usuarios = ref<UsuarioAdministrado[]>([])
const grados = ref<Grado[]>([])
const cargando = ref(false)
const guardando = ref(false)
const visible = ref(false)
const modoEdicion = ref(false)
const usuarioEditandoId = ref<number | null>(null)
const error = ref('')
const exito = ref('')

const formulario = ref({
  usuario: '', password: '', gradoId: null as number | null, run: '', nombres: '',
  apellidoPaterno: '', apellidoMaterno: '', unidadNombre: '', unidadSigla: '', puesto: '', activo: true,
})

async function cargar(): Promise<void> {
  cargando.value = true; error.value = ''
  try { ;[usuarios.value, grados.value] = await Promise.all([listarUsuariosAdministrados(), listarGrados()]) }
  catch (e) { error.value = e instanceof Error ? e.message : String(e) }
  finally { cargando.value = false }
}

function limpiarFormulario(): void {
  formulario.value = { usuario: '', password: '', gradoId: null, run: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', unidadNombre: '', unidadSigla: '', puesto: '', activo: true }
}

function abrirNuevo(): void {
  limpiarFormulario(); modoEdicion.value = false; usuarioEditandoId.value = null; error.value = ''; exito.value = ''; visible.value = true
}

function abrirEditar(u: UsuarioAdministrado): void {
  const grado = grados.value.find(g => g.abreviatura === u.grado)
  formulario.value = {
    usuario: u.usuario,
    password: '',
    gradoId: grado?.id ?? null,
    run: u.run ?? '',
    nombres: u.nombres ?? '',
    apellidoPaterno: u.apellido_paterno ?? '',
    apellidoMaterno: u.apellido_materno ?? '',
    unidadNombre: u.unidad_nombre ?? '',
    unidadSigla: u.unidad_sigla ?? '',
    puesto: u.puesto ?? '',
    activo: Number(u.activo) === 1,
  }
  modoEdicion.value = true; usuarioEditandoId.value = u.id; error.value = ''; exito.value = ''; visible.value = true
}

async function guardar(): Promise<void> {
  error.value = ''; exito.value = ''
  if (!formulario.value.usuario.trim()) { error.value = 'Debe ingresar el usuario.'; return }
  if (!formulario.value.gradoId) { error.value = 'Debe seleccionar el grado.'; return }
  if (!formulario.value.nombres.trim() || !formulario.value.apellidoPaterno.trim()) { error.value = 'Debe ingresar nombres y apellido paterno.'; return }
  if (!formulario.value.unidadNombre.trim() || !formulario.value.unidadSigla.trim() || !formulario.value.puesto.trim()) { error.value = 'Debe completar unidad, sigla y puesto.'; return }
  if (!modoEdicion.value && formulario.value.password.length < 10) { error.value = 'La contraseña inicial debe tener al menos 10 caracteres.'; return }
  guardando.value = true
  try {
    if (modoEdicion.value && usuarioEditandoId.value) {
      await editarUsuarioCalificador({
        id: usuarioEditandoId.value, usuario: formulario.value.usuario.trim(), gradoId: formulario.value.gradoId,
        run: formulario.value.run.trim() || null, nombres: formulario.value.nombres.trim(), apellidoPaterno: formulario.value.apellidoPaterno.trim(),
        apellidoMaterno: formulario.value.apellidoMaterno.trim() || null, unidadNombre: formulario.value.unidadNombre.trim(),
        unidadSigla: formulario.value.unidadSigla.trim(), puesto: formulario.value.puesto.trim(), activo: formulario.value.activo,
      })
      exito.value = 'Usuario actualizado correctamente.'
    } else {
      await crearUsuarioCalificador({
        usuario: formulario.value.usuario.trim(), password: formulario.value.password, gradoId: formulario.value.gradoId,
        run: formulario.value.run.trim() || null, nombres: formulario.value.nombres.trim(), apellidoPaterno: formulario.value.apellidoPaterno.trim(),
        apellidoMaterno: formulario.value.apellidoMaterno.trim() || null, unidadNombre: formulario.value.unidadNombre.trim(),
        unidadSigla: formulario.value.unidadSigla.trim(), puesto: formulario.value.puesto.trim(),
      })
      exito.value = 'Cuenta de calificador creada correctamente.'
    }
    visible.value = false; await cargar()
  } catch (e) { error.value = e instanceof Error ? e.message : String(e) }
  finally { guardando.value = false }
}

async function eliminar(u: UsuarioAdministrado): Promise<void> {
  if (u.rol === 'ADMIN') { error.value = 'La cuenta administradora principal no puede eliminarse desde esta pantalla.'; return }
  const aceptado = window.confirm(`¿Eliminar el acceso de ${u.usuario}?\n\nSus Hojas de Vida y antecedentes se conservarán para mantener la trazabilidad.`)
  if (!aceptado) return
  error.value = ''; exito.value = ''
  try { await eliminarUsuarioCalificador(u.id); exito.value = `El acceso de ${u.usuario} fue eliminado. Sus antecedentes permanecen resguardados.`; await cargar() }
  catch (e) { error.value = e instanceof Error ? e.message : String(e) }
}

function nombre(u: UsuarioAdministrado): string { return [u.grado, u.nombres, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(' ') || 'Sin perfil' }
onMounted(() => void cargar())
</script>

<template>
  <main class="hv-content hv-admin-users">
    <header class="hv-page-heading hv-page-heading-compact">
      <div><span class="hv-eyebrow">Administración</span><h1>Usuarios</h1><p>Administre las cuentas que utilizan HVDigital y sus perfiles de calificador.</p></div>
      <Button label="Nuevo usuario" icon="pi pi-user-plus" @click="abrirNuevo" />
    </header>
    <small v-if="error" class="hv-error">{{ error }}</small>
    <small v-if="exito" class="hv-success">{{ exito }}</small>

    <Card class="hv-table-card"><template #content>
      <DataTable :value="usuarios" :loading="cargando" striped-rows paginator :rows="10" empty-message="No existen usuarios registrados.">
        <Column field="usuario" header="Usuario" sortable />
        <Column header="Calificador"><template #body="{ data }"><strong>{{ nombre(data) }}</strong><small class="hv-cell-subtitle">{{ data.run || 'Sin RUN' }}</small></template></Column>
        <Column field="unidad_sigla" header="Unidad" /><Column field="puesto" header="Puesto" />
        <Column header="Rol"><template #body="{ data }"><Tag :value="data.rol" :severity="data.rol === 'ADMIN' ? 'info' : 'secondary'" /></template></Column>
        <Column header="Estado"><template #body="{ data }"><Tag :value="Number(data.activo) === 1 ? 'Activo' : 'Sin acceso'" :severity="Number(data.activo) === 1 ? 'success' : 'danger'" /></template></Column>
        <Column header="Acciones" :style="{ width: '10rem' }"><template #body="{ data }"><div class="hv-row-actions"><Button icon="pi pi-pencil" severity="secondary" outlined size="small" aria-label="Editar usuario" @click="abrirEditar(data)" /><Button v-if="data.rol !== 'ADMIN' && Number(data.activo) === 1" icon="pi pi-trash" severity="danger" outlined size="small" aria-label="Eliminar usuario" @click="eliminar(data)" /></div></template></Column>
      </DataTable>
    </template></Card>

    <Dialog v-model:visible="visible" modal :header="modoEdicion ? 'Editar usuario' : 'Crear cuenta de calificador'" :style="{ width: 'min(760px, 94vw)' }">
      <div class="hv-admin-form-grid">
        <label><span>Usuario</span><InputText v-model="formulario.usuario" autocomplete="off" /></label>
        <label v-if="!modoEdicion"><span>Contraseña inicial</span><Password v-model="formulario.password" :feedback="false" toggle-mask autocomplete="new-password" /></label>
        <label><span>Grado</span><Select v-model="formulario.gradoId" :options="grados" option-label="nombre" option-value="id" filter placeholder="Seleccione" /></label>
        <label><span>RUN</span><InputText v-model="formulario.run" /></label>
        <label><span>Nombres</span><InputText v-model="formulario.nombres" /></label>
        <label><span>Apellido paterno</span><InputText v-model="formulario.apellidoPaterno" /></label>
        <label><span>Apellido materno</span><InputText v-model="formulario.apellidoMaterno" /></label>
        <label><span>Unidad / repartición</span><InputText v-model="formulario.unidadNombre" /></label>
        <label><span>Sigla</span><InputText v-model="formulario.unidadSigla" /></label>
        <label class="hv-admin-form-wide"><span>Puesto</span><InputText v-model="formulario.puesto" /></label>
        <label v-if="modoEdicion" class="hv-admin-form-wide hv-switch-row"><input v-model="formulario.activo" type="checkbox"><span>Permitir acceso a HVDigital</span></label>
      </div>
      <small v-if="error" class="hv-error">{{ error }}</small>
      <template #footer><Button label="Cancelar" severity="secondary" outlined @click="visible = false" /><Button :label="modoEdicion ? 'Guardar cambios' : 'Crear cuenta'" icon="pi pi-check" :loading="guardando" @click="guardar" /></template>
    </Dialog>
  </main>
</template>

<style scoped>
.hv-cell-subtitle{display:block;margin-top:.2rem;color:var(--hv-muted);font-size:.75rem}.hv-success{display:block;margin-bottom:.75rem;color:var(--hv-success)}.hv-row-actions{display:flex;gap:.4rem}.hv-admin-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:.25rem 0 1rem}.hv-admin-form-grid label{display:grid;gap:.4rem}.hv-admin-form-grid label>span{font-size:.78rem;font-weight:700}.hv-admin-form-grid :deep(.p-inputtext),.hv-admin-form-grid :deep(.p-select),.hv-admin-form-grid :deep(.p-password){width:100%}.hv-admin-form-wide{grid-column:1/-1}.hv-switch-row{display:flex!important;grid-template-columns:none!important;align-items:center;gap:.65rem!important;padding:.7rem;border:1px solid var(--hv-border);border-radius:9px;background:var(--hv-surface-soft)}@media(max-width:680px){.hv-admin-form-grid{grid-template-columns:1fr}.hv-admin-form-wide{grid-column:auto}}
</style>
