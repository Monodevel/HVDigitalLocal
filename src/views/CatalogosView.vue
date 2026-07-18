<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  listarCategoriasPersonal,
  listarConceptosPorCategoria,
} from '../services/catalogos'

import {
  listarCalidadesPersonal,
  listarGrados,
} from '../services/grados'

import type {
  CalidadPersonal,
  Grado,
} from '../types/grados'

import type {
  CategoriaPersonal,
  ConceptoCategoria,
} from '../types/catalogos'

const cargando = ref(true)
const error = ref('')

const categorias = ref<CategoriaPersonal[]>([])
const conceptos = ref<ConceptoCategoria[]>([])
const grados = ref<Grado[]>([])
const calidades = ref<CalidadPersonal[]>([])

const categoriaSeleccionadaId = ref<number | null>(null)

const categoriaSeleccionada = computed(() =>
  categorias.value.find(
    categoria =>
      categoria.id === categoriaSeleccionadaId.value,
  ) ?? null,
)

async function inicializar(): Promise<void> {
  cargando.value = true
  error.value = ''

  try {
    const [
      categoriasResultado,
      gradosResultado,
      calidadesResultado,
    ] = await Promise.all([
      listarCategoriasPersonal(),
      listarGrados(),
      listarCalidadesPersonal(),
    ])

    categorias.value = categoriasResultado
    grados.value = gradosResultado
    calidades.value = calidadesResultado

    const primeraCategoria = categorias.value[0]

    if (primeraCategoria) {
      categoriaSeleccionadaId.value = primeraCategoria.id
      await cargarConceptos(primeraCategoria.id)
    }
  } catch (excepcion) {
    error.value = obtenerMensajeError(excepcion)
  } finally {
    cargando.value = false
  }
}

async function cargarConceptos(
  categoriaId: number,
): Promise<void> {
  categoriaSeleccionadaId.value = categoriaId
  error.value = ''

  try {
    conceptos.value =
      await listarConceptosPorCategoria(categoriaId)
  } catch (excepcion) {
    conceptos.value = []
    error.value = obtenerMensajeError(excepcion)
  }
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
  <main class="catalog-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">CAP-01001</span>
        <h1>Catálogos normativos</h1>
        <p>
          Categorías y conceptos de calificación aplicables.
        </p>
      </div>

      <span class="normative-badge">
        Catálogo protegido
      </span>
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
      Cargando catálogos…
    </section>

    <div
      v-else
      class="catalog-layout"
    >
      <aside class="category-panel">
        <div class="panel-heading">
          <h2>Categorías</h2>
          <span>{{ categorias.length }}</span>
        </div>

        <button
          v-for="categoria in categorias"
          :key="categoria.id"
          type="button"
          class="category-button"
          :class="{
            selected:
              categoriaSeleccionadaId === categoria.id,
          }"
          @click="cargarConceptos(categoria.id)"
        >
          <span>{{ categoria.nombre }}</span>

          <small>
            {{ categoria.cantidad_conceptos }}
            conceptos
          </small>
        </button>
      </aside>

      <section class="concept-panel">
        <div class="panel-heading">
          <div>
            <h2>
              {{ categoriaSeleccionada?.nombre }}
            </h2>

            <p>
              Conceptos asignados automáticamente
              según la CAP-01001.
            </p>
          </div>

          <span class="count-badge">
            {{ conceptos.length }}
          </span>
        </div>

        <div class="concept-list">
          <article
            v-for="concepto in conceptos"
            :key="concepto.concepto_id"
            class="concept-card"
          >
            <span class="concept-number">
              {{ concepto.concepto_numero }}
            </span>

            <div>
              <strong>
                {{ concepto.concepto_nombre }}
              </strong>

              <span>
                {{ concepto.area_nombre }}
              </span>
            </div>
          </article>
        </div>

        <div
          v-if="
            categoriaSeleccionada &&
            conceptos.length !==
              categoriaSeleccionada.cantidad_conceptos
          "
          class="integrity-error"
        >
          La cantidad de conceptos no coincide con
          la definida para esta categoría.
        </div>
      </section>
      <section class="institutional-catalogs">
  <article class="catalog-table-card">
    <div class="panel-heading">
      <div>
        <h2>Grados militares</h2>
        <p>
          Relación jerárquica y categoría calificatoria.
        </p>
      </div>

      <span class="count-badge">
        {{ grados.length }}
      </span>
    </div>

    <div class="table-wrapper">
      <table class="catalog-table">
        <thead>
          <tr>
            <th>Orden</th>
            <th>Grado</th>
            <th>Abreviatura</th>
            <th>Categoría</th>
            <th>Condición</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="grado in grados"
            :key="grado.id"
          >
            <td>{{ grado.orden_jerarquico }}</td>

            <td>
              <strong>{{ grado.nombre }}</strong>
            </td>

            <td>
              <span class="abbreviation">
                {{ grado.abreviatura }}
              </span>
            </td>

            <td>
              {{ grado.categoria_nombre ?? 'Sin categoría' }}
            </td>

            <td>
              <span
                class="status-badge"
                :class="{
                  exempt: grado.sujeto_calificacion === 0,
                  enabled: grado.sujeto_calificacion === 1,
                }"
              >
                {{
                  grado.sujeto_calificacion === 1
                    ? 'Calificable'
                    : 'Exento'
                }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>

  <article class="catalog-table-card">
    <div class="panel-heading">
      <div>
        <h2>Calidades funcionarias</h2>
        <p>
          Personal civil incluido en la categoría correspondiente.
        </p>
      </div>

      <span class="count-badge">
        {{ calidades.length }}
      </span>
    </div>

    <div class="quality-list">
      <div
        v-for="calidad in calidades"
        :key="calidad.id"
        class="quality-card"
      >
        <span class="abbreviation large">
          {{ calidad.abreviatura }}
        </span>

        <div>
          <strong>{{ calidad.nombre }}</strong>
          <small>{{ calidad.categoria_nombre }}</small>
        </div>
      </div>
    </div>
  </article>
</section>
    </div>
  </main>
</template>

<style scoped>
.catalog-page {
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
}

.normative-badge,
.count-badge {
  padding: 8px 12px;
  color: #245b94;
  background: #edf5fc;
  border: 1px solid #c4dbef;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.catalog-layout {
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 22px;
}

.category-panel,
.concept-panel {
  padding: 22px;
  background: white;
  border: 1px solid #dce2ea;
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(25, 42, 70, 0.05);
}

.category-panel {
  display: grid;
  align-content: start;
  gap: 8px;
}

.panel-heading {
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.panel-heading h2 {
  margin: 0;
  font-size: 19px;
}

.panel-heading p {
  margin: 5px 0 0;
  color: #778294;
  font-size: 13px;
}

.category-button {
  width: 100%;
  padding: 13px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #334055;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  text-align: left;
}

.category-button:hover {
  background: #f4f7fa;
}

.category-button.selected {
  color: #174f87;
  background: #edf5fc;
  border-color: #b7d1e8;
}

.category-button span {
  font-weight: 650;
}

.category-button small {
  color: #7c8797;
}

.concept-list {
  display: grid;
  gap: 10px;
}

.concept-card {
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fbfcfd;
  border: 1px solid #dde3eb;
  border-radius: 10px;
}

.concept-number {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: white;
  background: #245b94;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 800;
}

.concept-card > div {
  display: grid;
  gap: 4px;
}

.concept-card strong {
  font-size: 14px;
}

.concept-card div span {
  color: #778294;
  font-size: 12px;
}

.alert-error,
.integrity-error {
  max-width: 1180px;
  margin: 0 auto 20px;
  padding: 13px 15px;
  color: #8d1f27;
  background: #fff0f1;
  border: 1px solid #f2c8cc;
  border-radius: 9px;
}

.integrity-error {
  margin-top: 18px;
}

.loading-card {
  max-width: 1180px;
  margin: 0 auto;
  padding: 60px;
  color: #697588;
  background: white;
  border: 1px solid #dce2ea;
  border-radius: 14px;
  text-align: center;
}
.institutional-catalogs {
  max-width: 1180px;
  margin: 24px auto 0;
  display: grid;
  gap: 22px;
}

.catalog-table-card {
  padding: 22px;
  background: #ffffff;
  border: 1px solid #dce2ea;
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(25, 42, 70, 0.05);
}

.table-wrapper {
  overflow-x: auto;
}

.catalog-table {
  width: 100%;
  border-collapse: collapse;
}

.catalog-table th,
.catalog-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #e3e8ef;
  text-align: left;
  white-space: nowrap;
}

.catalog-table th {
  color: #687487;
  background: #f7f9fb;
  font-size: 12px;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.catalog-table td {
  color: #344055;
  font-size: 13px;
}

.abbreviation {
  display: inline-flex;
  min-width: 45px;
  justify-content: center;
  padding: 5px 8px;
  color: #174f87;
  background: #edf5fc;
  border: 1px solid #c5dcef;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 800;
}

.abbreviation.large {
  min-width: 58px;
  min-height: 42px;
  align-items: center;
}

.status-badge {
  display: inline-flex;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 750;
}

.status-badge.enabled {
  color: #17613b;
  background: #edf9f2;
  border: 1px solid #bce2cb;
}

.status-badge.exempt {
  color: #755514;
  background: #fff8e5;
  border: 1px solid #ead69b;
}

.quality-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.quality-card {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 13px;
  background: #fbfcfd;
  border: 1px solid #dde3eb;
  border-radius: 10px;
}

.quality-card > div {
  display: grid;
  gap: 4px;
}

.quality-card strong {
  font-size: 14px;
}

.quality-card small {
  color: #778294;
}

@media (max-width: 820px) {
  .quality-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .catalog-page {
    padding: 24px;
  }

  .catalog-layout {
    grid-template-columns: 1fr;
  }
}
</style>