<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import {
  formatearBytes,
  formatearFechaUnix,
  obtenerEstadoBasesDatos,
  seleccionarYCrearRespaldo,
  seleccionarYRestaurarRespaldo,
  type BackupResult,
  type DatabaseStatus,
  type RestoreResult,
} from '../../services/respaldos'

const emit = defineEmits<{ volver: [] }>()
type Seccion = 'GENERAL' | 'DATOS' | 'RESPALDOS' | 'MANTENIMIENTO' | 'ACERCA'

const seccion = ref<Seccion>('GENERAL')
const cargando = ref(true)
const procesando = ref(false)
const error = ref('')
const mensaje = ref('')
const bases = ref<DatabaseStatus[]>([])
const ultimoRespaldo = ref<BackupResult | null>(null)
const ultimaRestauracion = ref<RestoreResult | null>(null)

const baseOperacional = computed(() => bases.value.find(x => x.name === 'hvdigital.db'))
const baseCatalogo = computed(() => bases.value.find(x => x.name === 'catalog.db'))
const opciones: Array<{ id: Seccion; label: string; icon: string }> = [
  { id: 'GENERAL', label: 'General', icon: 'pi pi-home' },
  { id: 'DATOS', label: 'Base de datos', icon: 'pi pi-database' },
  { id: 'RESPALDOS', label: 'Respaldos', icon: 'pi pi-cloud-upload' },
  { id: 'MANTENIMIENTO', label: 'Mantenimiento', icon: 'pi pi-wrench' },
  { id: 'ACERCA', label: 'Acerca de', icon: 'pi pi-info-circle' },
]

function mensajeError(value: unknown): string {
  return value instanceof Error ? value.message : String(value)
}

async function cargarEstado(): Promise<void> {
  cargando.value = true
  error.value = ''
  try {
    bases.value = await obtenerEstadoBasesDatos()
  } catch (e) {
    error.value = mensajeError(e)
  } finally {
    cargando.value = false
  }
}

async function crearRespaldo(): Promise<void> {
  procesando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const result = await seleccionarYCrearRespaldo()
    if (!result) return
    ultimoRespaldo.value = result
    mensaje.value = `Respaldo creado correctamente en ${result.path}`
  } catch (e) {
    error.value = mensajeError(e)
  } finally {
    procesando.value = false
  }
}

async function restaurar(): Promise<void> {
  procesando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const result = await seleccionarYRestaurarRespaldo()
    if (!result) return
    ultimaRestauracion.value = result
    mensaje.value = 'Restauración completada. Reinicie HVDigital antes de continuar.'
    await cargarEstado()
  } catch (e) {
    error.value = mensajeError(e)
  } finally {
    procesando.value = false
  }
}

onMounted(cargarEstado)
</script>

<template>
  <section class="hv-content settings-page">
    <header class="hv-page-heading">
      <div>
        <span class="hv-eyebrow">Administración</span>
        <h1>Configuración</h1>
        <p>Estado local, bases de datos, respaldos y mantenimiento de HVDigital.</p>
      </div>
      <div class="actions">
        <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" outlined :loading="cargando" @click="cargarEstado" />
        <Button label="Volver" icon="pi pi-arrow-left" severity="secondary" text @click="emit('volver')" />
      </div>
    </header>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    <Message v-if="mensaje" severity="success" :closable="false">{{ mensaje }}</Message>

    <div class="settings-layout">
      <Card class="settings-nav-card">
        <template #content>
          <nav class="settings-nav">
            <button v-for="item in opciones" :key="item.id" type="button" :class="{ active: seccion === item.id }" @click="seccion = item.id">
              <i :class="item.icon" /><span>{{ item.label }}</span>
            </button>
          </nav>
        </template>
      </Card>

      <main class="settings-main">
        <div v-if="cargando" class="loading"><ProgressSpinner /><span>Cargando configuración…</span></div>

        <template v-else>
          <section v-if="seccion === 'GENERAL'" class="settings-section">
            <div class="section-title"><div><h2>Estado general</h2><p>Resumen operativo de la instalación.</p></div><Tag :value="baseOperacional?.exists ? 'Operativo' : 'Requiere atención'" :severity="baseOperacional?.exists ? 'success' : 'danger'" /></div>
            <div class="summary-grid">
              <Card><template #content><div class="metric"><i class="pi pi-desktop" /><div><small>Aplicación</small><strong>HVDigital 0.1.0</strong><span>Tauri 2 · Vue 3</span></div></div></template></Card>
              <Card><template #content><div class="metric"><i class="pi pi-database" /><div><small>Base operacional</small><strong>{{ baseOperacional?.exists ? 'Disponible' : 'No encontrada' }}</strong><span>{{ formatearBytes(baseOperacional?.sizeBytes ?? 0) }}</span></div></div></template></Card>
              <Card><template #content><div class="metric"><i class="pi pi-book" /><div><small>Base de catálogo</small><strong>{{ baseCatalogo?.exists ? 'Disponible' : 'No creada' }}</strong><span>{{ formatearBytes(baseCatalogo?.sizeBytes ?? 0) }}</span></div></div></template></Card>
            </div>
            <Card><template #title>Acciones recomendadas</template><template #content><div class="actions"><Button label="Crear respaldo completo" icon="pi pi-cloud-upload" :loading="procesando" @click="crearRespaldo" /><Button label="Revisar bases" icon="pi pi-database" severity="secondary" outlined @click="seccion = 'DATOS'" /></div></template></Card>
          </section>

          <section v-else-if="seccion === 'DATOS'" class="settings-section">
            <div class="section-title"><div><h2>Base de datos</h2><p>Ubicación, tamaño y modificación de los archivos locales.</p></div></div>
            <Card v-for="base in bases" :key="base.name">
              <template #title><div class="database-title"><span>{{ base.name }}</span><Tag :value="base.exists ? 'Operativa' : 'No disponible'" :severity="base.exists ? 'success' : 'secondary'" /></div></template>
              <template #content><dl class="details"><div><dt>Ruta</dt><dd>{{ base.path }}</dd></div><div><dt>Tamaño</dt><dd>{{ formatearBytes(base.sizeBytes) }}</dd></div><div><dt>Última modificación</dt><dd>{{ formatearFechaUnix(base.modifiedUnix) }}</dd></div></dl></template>
            </Card>
          </section>

          <section v-else-if="seccion === 'RESPALDOS'" class="settings-section">
            <div class="section-title"><div><h2>Respaldos y restauración</h2><p>Archivos .hvbk verificados mediante checksum SHA-256.</p></div></div>
            <div class="backup-grid">
              <Card><template #title>Crear respaldo</template><template #subtitle>Incluye todas las bases disponibles.</template><template #content><div class="operation"><i class="pi pi-cloud-upload" /><p>Seleccione una ubicación externa o carpeta segura.</p><Button label="Seleccionar destino y respaldar" icon="pi pi-save" :loading="procesando" @click="crearRespaldo" /></div></template></Card>
              <Card><template #title>Restaurar respaldo</template><template #subtitle>Reemplaza los datos después de validarlos.</template><template #content><div class="operation"><i class="pi pi-history" /><p>Se crea automáticamente un respaldo preventivo antes de restaurar.</p><Button label="Seleccionar y restaurar" icon="pi pi-upload" severity="danger" outlined :loading="procesando" @click="restaurar" /></div></template></Card>
            </div>
            <Card v-if="ultimoRespaldo"><template #title>Último respaldo</template><template #content><dl class="details"><div><dt>Archivo</dt><dd>{{ ultimoRespaldo.path }}</dd></div><div><dt>Bases</dt><dd>{{ ultimoRespaldo.databases.join(', ') }}</dd></div><div><dt>Tamaño</dt><dd>{{ formatearBytes(ultimoRespaldo.sizeBytes) }}</dd></div></dl></template></Card>
            <Card v-if="ultimaRestauracion"><template #title>Última restauración</template><template #content><dl class="details"><div><dt>Origen</dt><dd>{{ ultimaRestauracion.sourcePath }}</dd></div><div><dt>Respaldo preventivo</dt><dd>{{ ultimaRestauracion.safetyBackupPath }}</dd></div></dl></template></Card>
          </section>

          <section v-else-if="seccion === 'MANTENIMIENTO'" class="settings-section">
            <div class="section-title"><div><h2>Mantenimiento</h2><p>Protecciones activas sobre la información local.</p></div></div>
            <Card><template #content><div class="maintenance"><p><i class="pi pi-check-circle" /><span><strong>Verificación de integridad</strong>Checksum e integrity_check antes de restaurar.</span></p><p><i class="pi pi-shield" /><span><strong>Respaldo preventivo</strong>Copia automática previa a toda restauración.</span></p><p><i class="pi pi-refresh" /><span><strong>Recarga de estado</strong>Actualización manual del diagnóstico de archivos.</span></p></div></template></Card>
          </section>

          <section v-else class="settings-section">
            <div class="section-title"><div><h2>Acerca de HVDigital</h2><p>Información de la aplicación.</p></div></div>
            <Card><template #content><div class="about"><div class="logo">HV</div><div><h3>HVDigital</h3><p>Gestión digital local de hojas de vida y procesos de calificación.</p><span>Versión 0.1.0 · Tauri 2 · Vue 3 · PrimeVue</span></div></div></template></Card>
          </section>
        </template>
      </main>
    </div>
  </section>
</template>

<style scoped>
.settings-page,.settings-main,.settings-section{display:grid;gap:1rem}.actions{display:flex;gap:.65rem;flex-wrap:wrap}.settings-layout{display:grid;grid-template-columns:230px minmax(0,1fr);gap:1rem;align-items:start}.settings-nav-card :deep(.p-card-body),.settings-nav-card :deep(.p-card-content){padding:.55rem}.settings-nav{display:grid;gap:.25rem}.settings-nav button{min-height:42px;display:flex;align-items:center;gap:.7rem;padding:.65rem .8rem;color:var(--hv-muted);background:transparent;border:0;border-radius:.6rem;font:inherit;font-weight:650;text-align:left;cursor:pointer}.settings-nav button:hover,.settings-nav button.active{color:var(--hv-primary);background:var(--hv-primary-soft)}.loading{min-height:350px;display:grid;place-items:center;align-content:center;gap:1rem;color:var(--hv-muted)}.section-title,.database-title{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.section-title h2{margin:0;font-size:1.25rem}.section-title p{margin:.35rem 0 0;color:var(--hv-muted)}.summary-grid,.backup-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.backup-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.metric{display:flex;gap:.8rem;align-items:center}.metric>i,.operation>i{width:2.75rem;height:2.75rem;display:grid;place-items:center;flex:0 0 auto;color:var(--hv-primary);background:var(--hv-primary-soft);border-radius:.75rem;font-size:1.1rem}.metric small,.metric span{display:block;color:var(--hv-muted)}.metric strong{display:block;margin:.15rem 0}.details{display:grid;gap:.85rem;margin:0}.details>div{display:grid;grid-template-columns:180px minmax(0,1fr);gap:1rem}.details dt{color:var(--hv-muted);font-size:.8rem;font-weight:700}.details dd{margin:0;overflow-wrap:anywhere}.operation{min-height:180px;display:flex;flex-direction:column;align-items:flex-start;gap:1rem}.operation p{flex:1;margin:0;color:var(--hv-muted)}.maintenance{display:grid;gap:1rem}.maintenance p{display:flex;gap:.8rem;margin:0}.maintenance i{color:var(--hv-primary)}.maintenance span,.maintenance strong{display:block}.maintenance span{color:var(--hv-muted)}.maintenance strong{margin-bottom:.2rem;color:var(--hv-text)}.about{display:flex;gap:1rem;align-items:center}.logo{width:4rem;height:4rem;display:grid;place-items:center;flex:0 0 auto;color:#fff;background:var(--hv-primary);border-radius:1rem;font-size:1.25rem;font-weight:900}.about h3,.about p{margin:0}.about p,.about span{color:var(--hv-muted)}.about span{display:block;margin-top:.65rem;font-size:.8rem}@media(max-width:1000px){.settings-layout,.summary-grid,.backup-grid{grid-template-columns:1fr}.settings-nav{grid-template-columns:repeat(auto-fit,minmax(145px,1fr))}}@media(max-width:650px){.details>div{grid-template-columns:1fr;gap:.25rem}}
</style>
