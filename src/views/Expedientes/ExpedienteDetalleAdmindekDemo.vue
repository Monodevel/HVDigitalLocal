<script setup lang="ts">
import {
  computed,
  ref,
} from 'vue'

import ExpedienteInstrumentosLayout
  from '../../components/expediente/ExpedienteInstrumentosLayout.vue'

const emit = defineEmits<{
  volver: []
}>()

const instrumentoActivo = ref('hc1')

const tituloInstrumento = computed(() => {
  const titulos: Record<string, string> = {
    hc1: 'HC1',
    'hoja-vida': 'Hoja de Vida',
    evints: 'EVINTS',
    hc2: 'HC2',
    ham: 'HAM',
    hapsem: 'HAPSEM',
  }

  return titulos[instrumentoActivo.value] ?? 'Expediente'
})
</script>

<template>
  <ExpedienteInstrumentosLayout
    titulo="Expediente de Carlos Andrés Ramírez"
    subtitulo="Vista operativa del expediente individual y sus instrumentos"
    calificado="Carlos Andrés Ramírez"
    grado="Tte. Coronel"
    unidad="Brigada de Infantería N.º 5"
    estado="Abierto"
    periodo="Período 2026–2027"
    :instrumento-activo="instrumentoActivo"
    @volver="emit('volver')"
    @seleccionar-instrumento="instrumentoActivo = $event"
  >
    <template #actions>
      <button class="demo-secondary" type="button">
        Imprimir
      </button>

      <button class="demo-primary" type="button">
        Guardar cambios
      </button>
    </template>

    <template #summary>
      <article>
        <span>Instrumento activo</span>
        <strong>{{ tituloInstrumento }}</strong>
      </article>

      <article>
        <span>Avance expediente</span>
        <strong>64%</strong>
      </article>

      <article>
        <span>Última actividad</span>
        <strong>07/06/2026</strong>
      </article>
    </template>

    <section class="demo-grid">
      <article class="demo-panel demo-panel--large">
        <header>
          <div>
            <span>Instrumento</span>
            <h2>{{ tituloInstrumento }}</h2>
          </div>

          <strong class="demo-state">
            En proceso
          </strong>
        </header>

        <div class="demo-progress">
          <span>
            Progreso de revisión
          </span>

          <i>
            <b style="width: 64%" />
          </i>

          <strong>64%</strong>
        </div>

        <div class="demo-document">
          <p>
            Esta zona debe contener la vista real del instrumento seleccionado.
            Al presionar HC1, Hoja de Vida, EVINTS, HC2, HAM o HAPSEM, aquí se
            monta la pantalla correspondiente sin salir del expediente.
          </p>

          <p>
            La idea es mantener las pantallas globales a pantalla completa y
            usar este menú lateral únicamente dentro del expediente individual.
          </p>
        </div>
      </article>

      <aside class="demo-stack">
        <article class="demo-panel">
          <h3>Acciones rápidas</h3>

          <button type="button">
            Nueva anotación
          </button>

          <button type="button">
            Abrir resolución
          </button>

          <button type="button">
            Ver historial
          </button>
        </article>

        <article class="demo-panel">
          <h3>Estado de instrumentos</h3>

          <div class="demo-mini-row">
            <span>HC1</span>
            <strong>Completo</strong>
          </div>

          <div class="demo-mini-row">
            <span>Hoja de Vida</span>
            <strong>Abierta</strong>
          </div>

          <div class="demo-mini-row">
            <span>EVINTS</span>
            <strong>Pendiente</strong>
          </div>

          <div class="demo-mini-row">
            <span>HC2</span>
            <strong>En proceso</strong>
          </div>
        </article>
      </aside>
    </section>
  </ExpedienteInstrumentosLayout>
</template>

<style scoped>
.demo-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
}

.demo-stack {
  display: grid;
  gap: 16px;
}

.demo-panel {
  padding: 18px;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 16px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.035);
}

.demo-panel--large {
  min-height: 520px;
}

.demo-panel header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.demo-panel header span {
  color: #2563eb;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.demo-panel h2,
.demo-panel h3 {
  margin: 0;
  color: #0f172a;
  font-weight: 850;
  letter-spacing: -0.03em;
}

.demo-panel h2 {
  margin-top: 4px;
  font-size: 24px;
}

.demo-panel h3 {
  margin-bottom: 12px;
  font-size: 16px;
}

.demo-state {
  padding: 6px 10px;
  color: #1d4ed8;
  background: #dbeafe;
  border-radius: 999px;
  font-size: 11px;
}

.demo-progress {
  margin: 24px 0;
  display: grid;
  grid-template-columns: 150px 1fr 50px;
  gap: 12px;
  align-items: center;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.demo-progress i {
  height: 9px;
  overflow: hidden;
  background: #edf2f7;
  border-radius: 999px;
}

.demo-progress b {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #0ea5e9);
  border-radius: inherit;
}

.demo-progress strong {
  color: #0f172a;
}

.demo-document {
  min-height: 330px;
  padding: 22px;
  color: #475569;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  line-height: 1.6;
  font-size: 14px;
}

.demo-panel button,
.demo-primary,
.demo-secondary {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 9px;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.demo-panel button {
  width: 100%;
  margin-top: 8px;
  color: #334155;
  background: #f8fafc;
  border: 1px solid #dbe3ef;
  text-align: left;
}

.demo-primary {
  color: #ffffff;
  background: #2563eb;
  border: 1px solid #1d4ed8;
}

.demo-secondary {
  color: #2563eb;
  background: #ffffff;
  border: 1px solid #bfdbfe;
}

.demo-mini-row {
  min-height: 34px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  border-bottom: 1px solid #eef2f7;
  color: #64748b;
  font-size: 12px;
}

.demo-mini-row:last-child {
  border-bottom: 0;
}

.demo-mini-row strong {
  color: #0f172a;
}

@media (max-width: 1100px) {
  .demo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
