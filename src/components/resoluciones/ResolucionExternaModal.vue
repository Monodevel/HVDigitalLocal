<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { listarConceptosComoOpciones, listarPuntajesPorEfecto } from '../../services/anotaciones'
import { listarHojasVidaAbiertasPorPersona, listarPersonasConHojaVidaAbierta } from '../../services/hojaVida'
import { crearResolucionExterna } from '../../services/resolucionesExternas'
import type { ConceptoOpcion, PuntajeAnotacion } from '../../types/anotaciones'
import type { HojaVidaAbierta, PersonaConHojaVidaAbierta } from '../../types/hojaVida'
import type { TipoEfectoResolucion } from '../../types/resolucionesDocumentales'

const emit = defineEmits<{ cerrar: []; registrada: [id: number] }>()

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const personas = ref<PersonaConHojaVidaAbierta[]>([])
const hojas = ref<HojaVidaAbierta[]>([])
const conceptos = ref<ConceptoOpcion[]>([])
const puntajes = ref<PuntajeAnotacion[]>([])

const personaId = ref<number | null>(null)
const hojaVidaId = ref<number | null>(null)
const tipo = ref<TipoEfectoResolucion>('MERITO')
const numero = ref('')
const fecha = ref(new Date().toISOString().slice(0, 10))
const organismo = ref('')
const conceptoId = ref<number | null>(null)
const puntajeId = ref<number | null>(null)
const asunto = ref('')
const textoResolucion = ref('')
const textoAnotacion = ref('')

const conceptoSeleccionado = computed(() => conceptos.value.find(x => x.id === conceptoId.value) ?? null)
const puntajeSeleccionado = computed(() => puntajes.value.find(x => x.id === puntajeId.value) ?? null)

function regenerarAnotacion(): void {
  const concepto = conceptoSeleccionado.value?.etiqueta ?? 'concepto seleccionado'
  const puntaje = puntajeSeleccionado.value?.texto_visual ?? 'puntaje seleccionado'
  const efecto = tipo.value === 'MERITO' ? 'mérito' : 'demérito'
  textoAnotacion.value = `Se deja constancia de la anotación de ${efecto} dispuesta mediante Resolución N.º ${numero.value.trim() || 'XX'} de ${organismo.value.trim() || 'organismo emisor'}, en el ${concepto}, con ${puntaje} ptos.`
}

async function cargarHojas(): Promise<void> {
  hojas.value = []
  hojaVidaId.value = null
  if (!personaId.value) return
  hojas.value = await listarHojasVidaAbiertasPorPersona(personaId.value)
  hojaVidaId.value = hojas.value[0]?.hoja_vida_id ?? null
}

async function cargarPuntajes(): Promise<void> {
  puntajes.value = await listarPuntajesPorEfecto(tipo.value)
  puntajeId.value = puntajes.value[0]?.id ?? null
  regenerarAnotacion()
}

async function inicializar(): Promise<void> {
  try {
    const [personasResultado, conceptosResultado] = await Promise.all([
      listarPersonasConHojaVidaAbierta(),
      listarConceptosComoOpciones(),
    ])
    personas.value = personasResultado
    conceptos.value = conceptosResultado
    personaId.value = personasResultado[0]?.persona_id ?? null
    conceptoId.value = conceptosResultado[0]?.id ?? null
    await cargarHojas()
    await cargarPuntajes()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    cargando.value = false
  }
}

async function guardar(): Promise<void> {
  if (!personaId.value || !hojaVidaId.value || !conceptoId.value || !puntajeId.value) {
    error.value = 'Debe completar calificado, Hoja de Vida, concepto y puntaje.'
    return
  }
  guardando.value = true
  error.value = ''
  try {
    const id = await crearResolucionExterna({
      hojaVidaId: hojaVidaId.value,
      personaId: personaId.value,
      tipoEfectoCodigo: tipo.value,
      numeroDocumento: numero.value,
      fechaDocumento: fecha.value,
      organismoEmisor: organismo.value,
      conceptoId: conceptoId.value,
      puntajeId: puntajeId.value,
      asunto: asunto.value,
      textoResolucion: textoResolucion.value,
      resuelvoAnotacion: textoAnotacion.value,
    })
    emit('registrada', id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    guardando.value = false
  }
}

watch(personaId, () => void cargarHojas())
watch(tipo, () => void cargarPuntajes())
watch([numero, organismo, conceptoId, puntajeId], regenerarAnotacion)
onMounted(() => void inicializar())
</script>

<template>
  <div class="rex-backdrop" @click.self="emit('cerrar')">
    <section class="rex-dialog" role="dialog" aria-modal="true" aria-label="Registrar resolución externa">
      <header class="rex-header">
        <div>
          <span>Resoluciones</span>
          <h2>Registrar resolución externa</h2>
          <p>Documento recibido desde un escalón u organismo superior. Su numeración original se conserva.</p>
        </div>
        <button type="button" class="rex-close" @click="emit('cerrar')"><i class="pi pi-times" /></button>
      </header>

      <div v-if="error" class="rex-error">{{ error }}</div>
      <div v-if="cargando" class="rex-loading"><i class="pi pi-spin pi-spinner" /> Cargando antecedentes…</div>

      <form v-else class="rex-form" @submit.prevent="guardar">
        <div class="rex-grid">
          <label class="rex-field wide"><span>Calificado *</span><select v-model.number="personaId"><option :value="null">Seleccione…</option><option v-for="p in personas" :key="p.persona_id" :value="p.persona_id">{{ p.etiqueta }}</option></select></label>
          <label class="rex-field wide"><span>Hoja de Vida *</span><select v-model.number="hojaVidaId" :disabled="!personaId"><option :value="null">Seleccione…</option><option v-for="h in hojas" :key="h.hoja_vida_id" :value="h.hoja_vida_id">{{ h.etiqueta }}</option></select></label>

          <label class="rex-field"><span>Tipo *</span><select v-model="tipo"><option value="MERITO">Mérito / felicitación</option><option value="DEMERITO">Demérito / sanción</option></select></label>
          <label class="rex-field"><span>Fecha resolución *</span><input v-model="fecha" type="date" required></label>
          <label class="rex-field"><span>Número original *</span><input v-model="numero" maxlength="80" required placeholder="Ej.: 6060/245 o RES. EX. N.º 82"></label>
          <label class="rex-field"><span>Organismo / escalón emisor *</span><input v-model="organismo" maxlength="180" required placeholder="Ej.: Comando de División"></label>

          <label class="rex-field"><span>Concepto *</span><select v-model.number="conceptoId"><option :value="null">Seleccione…</option><option v-for="c in conceptos" :key="c.id" :value="c.id">{{ c.etiqueta }}</option></select></label>
          <label class="rex-field"><span>Puntaje *</span><select v-model.number="puntajeId"><option :value="null">Seleccione…</option><option v-for="p in puntajes" :key="p.id" :value="p.id">{{ p.texto_visual }} · {{ p.texto_literal }}</option></select></label>

          <label class="rex-field wide"><span>Asunto</span><input v-model="asunto" maxlength="250" placeholder="Materia o asunto del documento"></label>
          <label class="rex-field wide"><span>Texto o extracto de la resolución *</span><textarea v-model="textoResolucion" rows="5" required placeholder="Transcriba el punto pertinente que dispone la felicitación o sanción…" /></label>
          <label class="rex-field wide"><span>Texto de anotación</span><textarea v-model="textoAnotacion" rows="4" required /></label>
        </div>

        <div class="rex-info"><i class="pi pi-info-circle" /><span>La resolución quedará registrada como <strong>externa y emitida</strong>. No consumirá correlativos internos 1530 ni 6060 y quedará disponible inmediatamente para crear la anotación.</span></div>

        <footer class="rex-footer">
          <button type="button" class="hv-button hv-button-secondary" @click="emit('cerrar')">Cancelar</button>
          <button type="submit" class="hv-button hv-button-primary" :disabled="guardando"><i :class="guardando ? 'pi pi-spin pi-spinner' : 'pi pi-save'" /> {{ guardando ? 'Registrando…' : 'Registrar resolución externa' }}</button>
        </footer>
      </form>
    </section>
  </div>
</template>
