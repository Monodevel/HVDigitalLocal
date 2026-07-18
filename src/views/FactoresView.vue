<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from 'vue'

import {
  listarConceptosConFactores,
  validarIntegridadFactores,
} from '../services/factores'

import type {
  ConceptoConFactores,
} from '../types/factores'

const cargando = ref(true)
const error = ref('')

const conceptos =
  ref<ConceptoConFactores[]>([])

const conceptoSeleccionadoId =
  ref<number | null>(null)

const conceptoSeleccionado = computed(
  () =>
    conceptos.value.find(
      concepto =>
        concepto.concepto_id ===
        conceptoSeleccionadoId.value,
    ) ?? null,
)

const totalFactores = computed(
  () =>
    conceptos.value.reduce(
      (total, concepto) =>
        total + concepto.factores.length,
      0,
    ),
)

async function inicializar(): Promise<void> {
  cargando.value = true
  error.value = ''

  try {
    await validarIntegridadFactores()

    conceptos.value =
      await listarConceptosConFactores()

    const primerConcepto =
      conceptos.value[0]

    if (primerConcepto) {
      conceptoSeleccionadoId.value =
        primerConcepto.concepto_id
    }
  } catch (excepcion) {
    error.value =
      obtenerMensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

function seleccionarConcepto(
  conceptoId: number,
): void {
  conceptoSeleccionadoId.value =
    conceptoId
}

function obtenerMensajeError(
  excepcion: unknown,
): string {
  if (excepcion instanceof Error) {
    return excepcion.message
  }

  return String(excepcion)
}

onMounted(inicializar)
</script>

<template>
  <main class="factor-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">
          CAP-01001 · Anexo 5
        </span>

        <h1>
          Conceptos y factores
        </h1>

        <p>
          Estructura normativa del Sistema de
          Calificaciones Institucional.
        </p>
      </div>

      <div class="summary">
        <span>
          <strong>{{ conceptos.length }}</strong>
          conceptos
        </span>

        <span>
          <strong>{{ totalFactores }}</strong>
          factores
        </span>
      </div>
    </header>

    <div
      v-if="error"
      class="alert-error"
    >
      {{ error }}
    </div>

    <section
      v-if="cargando"
      class="loading-card"
    >
      Cargando factores normativos…
    </section>

    <div
      v-else
      class="factor-layout"
    >
      <aside class="concept-list">
        <div class="panel-heading">
          <h2>Conceptos</h2>

          <span class="count-badge">
            {{ conceptos.length }}
          </span>
        </div>

        <button
          v-for="concepto in conceptos"
          :key="concepto.concepto_id"
          type="button"
          class="concept-button"
          :class="{
            selected:
              conceptoSeleccionadoId ===
              concepto.concepto_id,
          }"
          @click="
            seleccionarConcepto(
              concepto.concepto_id,
            )
          "
        >
          <span class="concept-number">
            {{ concepto.concepto_numero }}
          </span>

          <span class="concept-button-text">
            <strong>
              {{ concepto.concepto_nombre }}
            </strong>

            <small>
              {{ concepto.factores.length }}
              factores
            </small>
          </span>
        </button>
      </aside>

      <section
        v-if="conceptoSeleccionado"
        class="factor-panel"
      >
        <header class="concept-header">
          <div>
            <span class="area-badge">
              {{
                conceptoSeleccionado.area_nombre
              }}
            </span>

            <h2>
              Concepto N.º
              {{
                conceptoSeleccionado
                  .concepto_numero
              }}
              “{{
                conceptoSeleccionado
                  .concepto_nombre
              }}”
            </h2>

            <p>
              {{
                conceptoSeleccionado
                  .concepto_descripcion
              }}
            </p>
          </div>

          <span class="factor-count">
            {{
              conceptoSeleccionado
                .factores.length
            }}
          </span>
        </header>

        <div class="factor-list">
          <article
            v-for="factor in
              conceptoSeleccionado.factores"
            :key="factor.id"
            class="factor-card"
          >
            <span class="factor-order">
              {{ factor.orden }}
            </span>

            <div>
              <div class="factor-title">
                <strong>
                  {{ factor.nombre }}
                </strong>

                <code>
                  {{ factor.codigo }}
                </code>
              </div>

              <p>
                {{ factor.descripcion }}
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.factor-page {
  min-height: 100vh;
  padding: 40px;
  color: #172033;
  background: #f4f6f9;
}

.page-header {
  max-width: 1180px;
  margin: 0 auto 28px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.page-header h1 {
  margin: 7px 0;
  font-size: 34px;
  letter-spacing: -0.035em;
}

.page-header p {
  margin: 0;
  color: #6c788a;
}

.eyebrow {
  color: #245b94;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.summary {
  display: flex;
  gap: 10px;
}

.summary span {
  padding: 9px 13px;
  color: #506075;
  background: #ffffff;
  border: 1px solid #d7dee7;
  border-radius: 9px;
  font-size: 12px;
}

.summary strong {
  margin-right: 4px;
  color: #174f87;
  font-size: 15px;
}

.factor-layout {
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns:
    330px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.concept-list,
.factor-panel {
  padding: 22px;
  background: #ffffff;
  border: 1px solid #dce2ea;
  border-radius: 14px;
  box-shadow:
    0 12px 32px
    rgba(25, 42, 70, 0.05);
}

.concept-list {
  display: grid;
  gap: 8px;
}

.panel-heading {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-heading h2 {
  margin: 0;
  font-size: 19px;
}

.count-badge,
.factor-count {
  min-width: 34px;
  height: 34px;
  padding: 0 10px;
  display: inline-grid;
  place-items: center;
  color: #245b94;
  background: #edf5fc;
  border: 1px solid #c4dbef;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.concept-button {
  width: 100%;
  padding: 11px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #354157;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  text-align: left;
}

.concept-button:hover {
  background: #f4f7fa;
}

.concept-button.selected {
  color: #174f87;
  background: #edf5fc;
  border-color: #b7d1e8;
}

.concept-number {
  width: 35px;
  height: 35px;
  flex: 0 0 35px;
  display: grid;
  place-items: center;
  color: #ffffff;
  background: #245b94;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
}

.concept-button-text {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.concept-button-text strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.concept-button-text small {
  color: #7a8596;
}

.concept-header {
  padding-bottom: 22px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid #e0e5ec;
}

.concept-header h2 {
  margin: 12px 0 8px;
  font-size: 23px;
}

.concept-header p {
  max-width: 720px;
  margin: 0;
  color: #667286;
  line-height: 1.6;
}

.area-badge {
  padding: 6px 9px;
  display: inline-flex;
  color: #245b94;
  background: #edf5fc;
  border: 1px solid #c4dbef;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.factor-list {
  margin-top: 20px;
  display: grid;
  gap: 12px;
}

.factor-card {
  padding: 17px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 14px;
  background: #fbfcfd;
  border: 1px solid #dce2ea;
  border-radius: 10px;
}

.factor-order {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: #174f87;
  background: #edf5fc;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
}

.factor-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.factor-title strong {
  font-size: 15px;
}

.factor-title code {
  color: #667286;
  font-size: 11px;
}

.factor-card p {
  margin: 7px 0 0;
  color: #647083;
  font-size: 13px;
  line-height: 1.55;
}

.alert-error {
  max-width: 1180px;
  margin: 0 auto 20px;
  padding: 13px 15px;
  color: #8d1f27;
  background: #fff0f1;
  border: 1px solid #f2c8cc;
  border-radius: 9px;
}

.loading-card {
  max-width: 1180px;
  margin: 0 auto;
  padding: 60px;
  color: #697588;
  background: #ffffff;
  border: 1px solid #dce2ea;
  border-radius: 14px;
  text-align: center;
}

@media (max-width: 850px) {
  .factor-page {
    padding: 24px;
  }

  .factor-layout {
    grid-template-columns: 1fr;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>