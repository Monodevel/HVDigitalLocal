<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { obtenerEstadoConfiguracionInicial } from '../../services/configuracionInicial'
import { SERIES_RESOLUCION, obtenerSerieResolucionActual, seleccionarSerieResolucion, type SerieResolucion } from '../../services/seriesResoluciones'
import { obtenerEstadoBasesDatos, seleccionarYCrearRespaldo, seleccionarYRestaurarRespaldo, formatearBytes, formatearFechaUnix, type DatabaseStatus } from '../../services/respaldos'
import { obtenerSesionWeb } from '../../web/api'

const emit = defineEmits<{ volver: [] }>()
type Seccion = 'INICIO'|'GENERAL'|'RESOLUCIONES'|'HOJAS'|'CATALOGOS'|'DATOS'|'APLICACION'
const seccion = ref<Seccion>('INICIO')
const cargando = ref(true)
const procesando = ref(false)
const error = ref('')
const mensaje = ref('')
const serie = ref<SerieResolucion>('1530')
const estado = ref<any>(null)
const bases = ref<DatabaseStatus[]>([])
const sesion = computed(() => obtenerSesionWeb())
const esAdmin = computed(() => sesion.value?.rol === 'ADMIN')
const preferencias = reactive({ densidad:'COMODA', filas:10, confirmar:true, recordarPeriodo:true, mostrarRun:true, gradoAntesNombre:true, formatoFecha:'DDMMMYYYY' })
const opcionesFilas=[10,20,30,50]
const opcionesDensidad=[{label:'Cómoda',value:'COMODA'},{label:'Compacta',value:'COMPACTA'}]
const formatosFecha=[{label:'01SEP2026',value:'DDMMMYYYY'},{label:'01-09-2026',value:'DD-MM-YYYY'},{label:'01/09/2026',value:'DD/MM/YYYY'}]
const tarjetas=[
 {id:'GENERAL',icon:'pi pi-sliders-h',titulo:'General',texto:'Preferencias de funcionamiento e interfaz.'},
 {id:'RESOLUCIONES',icon:'pi pi-file',titulo:'Resoluciones',texto:'Serie documental y numeración de resoluciones.'},
 {id:'HOJAS',icon:'pi pi-book',titulo:'Hojas de Vida',texto:'Visualización y comportamiento de los listados.'},
 {id:'CATALOGOS',icon:'pi pi-list-check',titulo:'Catálogos',texto:'Parámetros institucionales y anotaciones.'},
 {id:'DATOS',icon:'pi pi-database',titulo:'Datos y respaldo',texto:'Estado de datos, exportación y recuperación.'},
 {id:'APLICACION',icon:'pi pi-info-circle',titulo:'Aplicación',texto:'Versión, servidor y diagnóstico.'},
] as const
const catalogos=[
 ['Anotaciones','Categorías, tipos y parámetros documentales.','pi pi-file-edit'],
 ['Grados y calidades','Jerarquías y categorías de personal.','pi pi-id-card'],
 ['Conceptos de calificación','Conceptos disponibles según categoría.','pi pi-list-check'],
 ['Instrumentos','Parámetros EVINT, HC1, HC2, HAM y HAPSEM.','pi pi-clipboard'],
]
function cargarPreferencias(){try{const p=JSON.parse(localStorage.getItem('hvdigital.preferencias')||'{}');Object.assign(preferencias,p)}catch{}}
function guardarPreferencias(){localStorage.setItem('hvdigital.preferencias',JSON.stringify(preferencias));mensaje.value='Preferencias guardadas correctamente.'}
async function cargar(){cargando.value=true;error.value='';try{[estado.value,serie.value,bases.value]=await Promise.all([obtenerEstadoConfiguracionInicial(),obtenerSerieResolucionActual(),obtenerEstadoBasesDatos()]);cargarPreferencias()}catch(e){error.value=e instanceof Error?e.message:String(e)}finally{cargando.value=false}}
async function guardarSerie(){procesando.value=true;error.value='';mensaje.value='';try{await seleccionarSerieResolucion(serie.value);mensaje.value=`Serie ${serie.value} configurada correctamente.`}catch(e){error.value=e instanceof Error?e.message:String(e)}finally{procesando.value=false}}
async function respaldo(){procesando.value=true;try{const r=await seleccionarYCrearRespaldo();if(r)mensaje.value=`Respaldo generado: ${r.path}`}catch(e){error.value=e instanceof Error?e.message:String(e)}finally{procesando.value=false}}
async function restaurar(){procesando.value=true;try{const r=await seleccionarYRestaurarRespaldo();if(r)mensaje.value='Restauración completada correctamente.'}catch(e){error.value=e instanceof Error?e.message:String(e)}finally{procesando.value=false}}
async function copiarDiagnostico(){const texto=[`HVDigital 0.4.0`,`API: ${bases.value.length?'OK':'Sin datos'}`,`Sesión: ${sesion.value?'autenticada':'no disponible'}`,`Rol: ${sesion.value?.rol||'—'}`,`Período: ${estado.value?.periodo_nombre||'Sin seleccionar'} / ${estado.value?.periodo_estado||'—'}`].join('\n');await navigator.clipboard.writeText(texto);mensaje.value='Diagnóstico copiado al portapapeles.'}
onMounted(()=>void cargar())
</script>

<template>
<section class="hv-content hv-settings-center">
 <header class="hv-page-heading hv-page-heading-compact"><div><span class="hv-eyebrow">Sistema</span><h1>Configuración</h1><p>Personalice HVDigital y consulte el estado de su espacio de trabajo.</p></div><div class="hv-period-admin-actions"><Button v-if="seccion!=='INICIO'" label="Configuración" icon="pi pi-arrow-left" severity="secondary" outlined @click="seccion='INICIO'"/><Button icon="pi pi-refresh" severity="secondary" outlined :loading="cargando" @click="cargar"/><Button label="Volver" icon="pi pi-times" severity="secondary" text @click="emit('volver')"/></div></header>
 <div v-if="error" class="hv-profile-feedback is-error"><i class="pi pi-exclamation-circle"/><span>{{error}}</span></div>
 <div v-if="mensaje" class="hv-profile-feedback is-success"><i class="pi pi-check-circle"/><span>{{mensaje}}</span></div>

 <div v-if="cargando" class="hv-empty-state"><i class="pi pi-spin pi-spinner"/><strong>Cargando configuración</strong></div>
 <template v-else>
  <div v-if="seccion==='INICIO'" class="hv-settings-home">
   <div class="hv-settings-summary"><div><small>Usuario</small><strong>{{sesion?.usuario}}</strong></div><div><small>Rol</small><strong>{{sesion?.rol==='ADMIN'?'Administrador':'Calificador'}}</strong></div><div><small>Período</small><strong>{{estado?.periodo_nombre||'Sin seleccionar'}}</strong></div><div><small>Estado</small><Tag :value="estado?.periodo_estado||'—'" :severity="estado?.periodo_estado==='ABIERTO'?'success':'secondary'"/></div></div>
   <div class="hv-settings-grid"><button v-for="item in tarjetas" :key="item.id" type="button" class="hv-settings-tile" @click="seccion=item.id"><span class="hv-settings-tile-icon"><i :class="item.icon"/></span><div><strong>{{item.titulo}}</strong><p>{{item.texto}}</p></div><i class="pi pi-arrow-right"/></button></div>
  </div>

  <section v-else-if="seccion==='GENERAL'" class="hv-settings-section"><div class="hv-settings-section-heading"><div><span class="hv-settings-tile-icon"><i class="pi pi-sliders-h"/></span><div><h2>General</h2><p>Preferencias personales de funcionamiento.</p></div></div></div><Card><template #content><div class="hv-profile-form-grid"><div class="hv-field"><label>Densidad de interfaz</label><Select v-model="preferencias.densidad" :options="opcionesDensidad" option-label="label" option-value="value" fluid/></div><div class="hv-field"><label>Registros por página</label><Select v-model="preferencias.filas" :options="opcionesFilas" fluid/></div><label class="hv-settings-toggle"><input v-model="preferencias.recordarPeriodo" type="checkbox"><span><strong>Recordar último período</strong><small>Abrir automáticamente el período utilizado recientemente.</small></span></label><label class="hv-settings-toggle"><input v-model="preferencias.confirmar" type="checkbox"><span><strong>Confirmar acciones importantes</strong><small>Solicitar confirmación antes de operaciones sensibles.</small></span></label></div><div class="hv-profile-actions"><span>Estas preferencias son propias de este navegador.</span><Button label="Guardar preferencias" icon="pi pi-save" @click="guardarPreferencias"/></div></template></Card></section>

  <section v-else-if="seccion==='RESOLUCIONES'" class="hv-settings-section"><div class="hv-settings-section-heading"><div><span class="hv-settings-tile-icon"><i class="pi pi-file"/></span><div><h2>Resoluciones</h2><p>Configure la serie documental utilizada por su cuenta.</p></div></div></div><Card><template #content><div class="hv-resolution-settings"><div class="hv-field"><label>Serie / prefijo</label><Select v-model="serie" :options="SERIES_RESOLUCION" option-label="label" option-value="value" fluid/></div><div class="hv-resolution-preview"><small>Vista previa</small><strong>{{serie}}/001</strong><span>La numeración correlativa real es controlada por HVDigital.</span></div></div><div class="hv-profile-actions"><span>La serie se aplica a las nuevas resoluciones.</span><Button label="Guardar serie" icon="pi pi-save" :loading="procesando" @click="guardarSerie"/></div></template></Card></section>

  <section v-else-if="seccion==='HOJAS'" class="hv-settings-section"><div class="hv-settings-section-heading"><div><span class="hv-settings-tile-icon"><i class="pi pi-book"/></span><div><h2>Hojas de Vida</h2><p>Preferencias de presentación para el trabajo cotidiano.</p></div></div></div><Card><template #content><div class="hv-profile-form-grid"><label class="hv-settings-toggle"><input v-model="preferencias.gradoAntesNombre" type="checkbox"><span><strong>Mostrar grado antes del nombre</strong><small>Facilita la lectura de listados de personal.</small></span></label><label class="hv-settings-toggle"><input v-model="preferencias.mostrarRun" type="checkbox"><span><strong>Mostrar RUN en listados</strong><small>Permite identificar rápidamente al personal.</small></span></label><div class="hv-field"><label>Formato de fecha documental</label><Select v-model="preferencias.formatoFecha" :options="formatosFecha" option-label="label" option-value="value" fluid/></div></div><div class="hv-profile-actions"><span>Las opciones de presentación no modifican los datos registrados.</span><Button label="Guardar preferencias" icon="pi pi-save" @click="guardarPreferencias"/></div></template></Card></section>

  <section v-else-if="seccion==='CATALOGOS'" class="hv-settings-section"><div class="hv-settings-section-heading"><div><span class="hv-settings-tile-icon"><i class="pi pi-list-check"/></span><div><h2>Catálogos</h2><p>Parámetros que utiliza HVDigital para documentos e instrumentos.</p></div></div><Tag value="Institucional" severity="info"/></div><div class="hv-catalog-grid"><Card v-for="c in catalogos" :key="c[0]"><template #content><div class="hv-catalog-item"><span class="hv-settings-tile-icon"><i :class="c[2]"/></span><div><strong>{{c[0]}}</strong><p>{{c[1]}}</p><small>La edición avanzada se habilitará mediante administración de catálogos.</small></div></div></template></Card></div></section>

  <section v-else-if="seccion==='DATOS'" class="hv-settings-section"><div class="hv-settings-section-heading"><div><span class="hv-settings-tile-icon"><i class="pi pi-database"/></span><div><h2>Datos y respaldo</h2><p>Estado de almacenamiento y protección de información.</p></div></div></div><div class="hv-database-list"><Card v-for="b in bases" :key="b.name"><template #content><div class="hv-database-row"><span class="hv-settings-tile-icon"><i class="pi pi-database"/></span><div><strong>{{b.name}}</strong><small>{{b.path}}</small></div><div><small>Tamaño</small><strong>{{formatearBytes(b.sizeBytes)}}</strong></div><div><small>Actualización</small><strong>{{formatearFechaUnix(b.modifiedUnix)}}</strong></div><Tag :value="b.exists?'Disponible':'No disponible'" :severity="b.exists?'success':'danger'"/></div></template></Card></div><Card v-if="esAdmin" class="hv-settings-danger"><template #title>Administración de respaldos</template><template #content><p>El respaldo contiene la base MariaDB central. La restauración afecta a todos los usuarios.</p><div class="hv-period-admin-actions"><Button label="Crear respaldo" icon="pi pi-download" :loading="procesando" @click="respaldo"/><Button label="Restaurar respaldo" icon="pi pi-upload" severity="danger" outlined :loading="procesando" @click="restaurar"/></div></template></Card><div v-else class="hv-settings-info"><i class="pi pi-shield"/><span>Los respaldos centrales son administrados exclusivamente por un administrador.</span></div></section>

  <section v-else-if="seccion==='APLICACION'" class="hv-settings-section"><div class="hv-settings-section-heading"><div><span class="hv-settings-tile-icon"><i class="pi pi-info-circle"/></span><div><h2>Aplicación y diagnóstico</h2><p>Información útil para soporte y comprobación del servicio.</p></div></div></div><Card><template #content><div class="hv-diagnostic-grid"><div><small>Aplicación</small><strong>HVDigital 0.4.0</strong></div><div><small>Servidor</small><strong>HVDigital Server</strong></div><div><small>Sesión</small><strong>Autenticada</strong></div><div><small>Rol</small><strong>{{sesion?.rol}}</strong></div><div><small>Período</small><strong>{{estado?.periodo_nombre||'Sin seleccionar'}}</strong></div><div><small>Estado período</small><Tag :value="estado?.periodo_estado||'—'" :severity="estado?.periodo_estado==='ABIERTO'?'success':'secondary'"/></div></div><div class="hv-profile-actions"><span>El diagnóstico no incluye contraseñas ni tokens.</span><Button label="Copiar diagnóstico" icon="pi pi-copy" severity="secondary" outlined @click="copiarDiagnostico"/></div></template></Card></section>
 </template>
</section>
</template>
