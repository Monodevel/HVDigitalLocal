<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from 'vue'

import {
  listarCategoriasAnotacion,
  listarPlantillasAnotacion,
  validarCatalogoAnotaciones,
} from '../../services/anotaciones'

import type {
  CategoriaAnotacion,
  PlantillaAnotacion,
} from '../../types/anotaciones'

const cargando = ref(true)
const error = ref('')
const categorias = ref<CategoriaAnotacion[]>([])
const plantillas = ref<PlantillaAnotacion[]>([])

const categoriaSeleccionadaId =
  ref<number | null>(null)

const plantillaSeleccionadaId =
  ref<number | null>(null)

const busqueda = ref('')

const totalMerito = computed(() =>
  plantillas.value.filter(
    (item: PlantillaAnotacion) => item.tipo_efecto_codigo === 'MERITO',
  ).length,
)

const totalDemerito = computed(() =>
  plantillas.value.filter(
    (item: PlantillaAnotacion) => item.tipo_efecto_codigo === 'DEMERITO',
  ).length,
)

const totalConPuntaje = computed(() =>
  plantillas.value.filter(
    (item: PlantillaAnotacion) => item.requiere_puntaje === 1,
  ).length,
)

const plantillasFiltradas = computed(() => {
  const texto =
    busqueda.value
      .trim()
      .toLowerCase()

  return plantillas.value.filter((item: PlantillaAnotacion) => {
    const coincideCategoria =
      categoriaSeleccionadaId.value === null ||
      item.categoria_id === categoriaSeleccionadaId.value

    const coincideTexto =
      !texto ||
      [
        item.nombre,
        item.titulo_fuente,
        item.cuerpo_fuente,
        item.categoria_nombre,
        item.color_semantico,
      ]
        .filter(Boolean)
        .some(valor =>
          String(valor)
            .toLowerCase()
            .includes(texto),
        )

    return coincideCategoria && coincideTexto
  })
})

const plantillaSeleccionada = computed(
  () =>
    plantillas.value.find(
      item =>
        item.id ===
        plantillaSeleccionadaId.value,
    ) ?? null,
)

const categoriaSeleccionada = computed(
  () =>
    categorias.value.find(
      item =>
        item.id ===
        categoriaSeleccionadaId.value,
    ) ?? null,
)

async function inicializar(): Promise<void> {
  cargando.value = true
  error.value = ''

  try {
    await validarCatalogoAnotaciones()

    const [
      categoriasResultado,
      plantillasResultado,
    ] =
      await Promise.all([
        listarCategoriasAnotacion(),
        listarPlantillasAnotacion(),
      ])

    categorias.value = categoriasResultado
    plantillas.value = plantillasResultado

    const primeraCategoria =
      categorias.value[0]

    if (primeraCategoria) {
      seleccionarCategoria(primeraCategoria.id)
    } else {
      plantillaSeleccionadaId.value =
        plantillas.value[0]?.id ?? null
    }
  } catch (excepcion) {
    error.value =
      excepcion instanceof Error
        ? excepcion.message
        : String(excepcion)
  } finally {
    cargando.value = false
  }
}

function seleccionarCategoria(
  categoriaId: number | null,
): void {
  categoriaSeleccionadaId.value = categoriaId

  const primera =
    plantillas.value.find((item: PlantillaAnotacion) =>
      categoriaId === null ||
      item.categoria_id === categoriaId,
    )

  plantillaSeleccionadaId.value =
    primera?.id ?? null
}

function seleccionarPlantilla(
  plantilla: PlantillaAnotacion,
): void {
  plantillaSeleccionadaId.value =
    plantilla.id
}

function estadoDocumental(
  plantilla: PlantillaAnotacion,
): string {
  if (
    plantilla.tipo_efecto_codigo === 'MERITO' ||
    plantilla.tipo_efecto_codigo === 'DEMERITO'
  ) {
    return 'Requiere resolución'
  }

  if (plantilla.requiere_puntaje === 1) {
    return 'Con puntaje'
  }

  return 'Sin resolución'
}

onMounted(inicializar)
</script>

<template>
  <main class="annotations-page">
    <section class="content-shell">
      <header class="page-header">
        <div>
          <span class="eyebrow">
            HVDigital · Catálogo normativo
          </span>

          <h1>Catálogo de anotaciones</h1>

          <p>
            Consulte, filtre y revise los textos base usados para crear
            anotaciones en las Hojas de Vida.
          </p>
        </div>

        <div class="header-actions">
          <button
            class="secondary-action"
            type="button"
            @click="inicializar"
          >
            ↻ Actualizar
          </button>
        </div>
      </header>

      <div
        v-if="error"
        class="notice notice-error"
      >
        {{ error }}
      </div>

      <div
        v-if="cargando"
        class="loading-panel"
      >
        Cargando catálogo de anotaciones…
      </div>

      <template v-else>
        <section class="kpi-strip">
          <article class="kpi-card kpi-blue">
            <span class="kpi-icon">▤</span>

            <div>
              <small>Plantillas vigentes</small>
              <strong>{{ plantillas.length }}</strong>
              <em>Catálogo disponible</em>
            </div>
          </article>

          <article class="kpi-card kpi-green">
            <span class="kpi-icon">＋</span>

            <div>
              <small>Anotaciones de mérito</small>
              <strong>{{ totalMerito }}</strong>
              <em>Favorecen calificación</em>
            </div>
          </article>

          <article class="kpi-card kpi-red">
            <span class="kpi-icon">−</span>

            <div>
              <small>Anotaciones de demérito</small>
              <strong>{{ totalDemerito }}</strong>
              <em>Afectan calificación</em>
            </div>
          </article>

          <article class="kpi-card kpi-amber">
            <span class="kpi-icon">◆</span>

            <div>
              <small>Con puntaje</small>
              <strong>{{ totalConPuntaje }}</strong>
              <em>Requieren revisión</em>
            </div>
          </article>
        </section>

        <section class="catalog-layout">
          <aside class="panel category-panel">
            <header class="panel-title">
              <h2>Categorías</h2>
            </header>

            <div class="category-list">
              <button
                type="button"
                :class="{
                  active:
                    categoriaSeleccionadaId === null,
                }"
                @click="seleccionarCategoria(null)"
              >
                <span>Todas</span>
                <strong>{{ plantillas.length }}</strong>
              </button>

              <button
                v-for="categoria in categorias"
                :key="categoria.id"
                type="button"
                :class="{
                  active:
                    categoriaSeleccionadaId ===
                    categoria.id,
                }"
                @click="seleccionarCategoria(categoria.id)"
              >
                <span>{{ categoria.nombre }}</span>

                <strong>
                  {{
                    plantillas.filter(
                      (item: PlantillaAnotacion) =>
                        item.categoria_id ===
                        categoria.id,
                    ).length
                  }}
                </strong>
              </button>
            </div>
          </aside>

          <section class="panel templates-panel">
            <header class="panel-title panel-title-search">
              <div>
                <h2>
                  {{
                    categoriaSeleccionada
                      ?.nombre ?? 'Todas las anotaciones'
                  }}
                </h2>

                <span>
                  {{ plantillasFiltradas.length }}
                  resultado(s)
                </span>
              </div>

              <label class="search-box">
                <span>⌕</span>

                <input
                  v-model="busqueda"
                  type="search"
                  placeholder="Buscar texto, concepto o color..."
                >
              </label>
            </header>

            <div class="templates-list">
              <button
                v-for="plantilla in plantillasFiltradas"
                :key="plantilla.id"
                type="button"
                class="template-row"
                :class="{
                  active:
                    plantillaSeleccionadaId ===
                    plantilla.id,
                }"
                @click="seleccionarPlantilla(plantilla)"
              >
                <span
                  class="color-dot"
                  :style="{
                    backgroundColor:
                      plantilla.color_hex,
                  }"
                />

                <span class="template-main">
                  <strong>{{ plantilla.nombre }}</strong>

                  <small>
                    {{ plantilla.categoria_nombre }}
                    · Pág. {{ plantilla.pagina_fuente }}
                  </small>
                </span>

                <em>
                  {{ estadoDocumental(plantilla) }}
                </em>
              </button>

              <div
                v-if="plantillasFiltradas.length === 0"
                class="empty-panel"
              >
                No existen plantillas para el filtro aplicado.
              </div>
            </div>
          </section>

          <article
            v-if="plantillaSeleccionada"
            class="panel preview-panel"
          >
            <header class="preview-header">
              <div>
                <span class="eyebrow">
                  Vista previa normativa
                </span>

                <h2
                  :style="{
                    color:
                      plantillaSeleccionada.color_hex,
                  }"
                >
                  {{
                    plantillaSeleccionada
                      .titulo_fuente
                  }}
                </h2>
              </div>

              <span class="color-badge">
                {{
                  plantillaSeleccionada
                    .color_semantico
                }}
              </span>
            </header>

            <section class="preview-meta">
              <span>
                Categoría
                <strong>
                  {{
                    plantillaSeleccionada
                      .categoria_nombre
                  }}
                </strong>
              </span>

              <span>
                Página
                <strong>
                  {{
                    plantillaSeleccionada
                      .pagina_fuente
                  }}
                </strong>
              </span>

              <span>
                Estado
                <strong>
                  {{
                    estadoDocumental(
                      plantillaSeleccionada,
                    )
                  }}
                </strong>
              </span>
            </section>

            <pre
              class="preview-text"
              :style="{
                color:
                  plantillaSeleccionada.color_hex,
              }"
            >{{ plantillaSeleccionada.cuerpo_fuente }}</pre>

            <div class="metadata">
              <span
                v-if="
                  plantillaSeleccionada
                    .requiere_resolucion
                "
              >
                Requiere resolución
              </span>

              <span
                v-if="
                  plantillaSeleccionada
                    .requiere_concepto
                "
              >
                Requiere concepto
              </span>

              <span
                v-if="
                  plantillaSeleccionada
                    .requiere_puntaje
                "
              >
                Requiere puntaje
              </span>

              <span
                v-if="
                  plantillaSeleccionada
                    .abre_hoja_vida
                "
              >
                Abre Hoja de Vida
              </span>

              <span
                v-if="
                  plantillaSeleccionada
                    .cierra_hoja_vida
                "
              >
                Cierra Hoja de Vida
              </span>
            </div>

            <p
              v-if="
                plantillaSeleccionada
                  .observacion_uso
              "
              class="note"
            >
              {{
                plantillaSeleccionada
                  .observacion_uso
              }}
            </p>
          </article>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.annotations-page {
  min-height: 100vh;
  padding: 26px 32px 40px;
  box-sizing: border-box;
  color: #111827;
  background:
    radial-gradient(
      circle at 12% 0%,
      rgba(37, 99, 235, 0.025),
      transparent 26%
    ),
    linear-gradient(
      180deg,
      #f8fafc 0%,
      #f4f7fb 100%
    );
}

.content-shell {
  max-width: 1460px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  gap: 22px;
  align-items: flex-start;
}

.eyebrow {
  display: block;
  color: #155bd6;
  font-size: 11px;
  font-weight: 760;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 5px 0 0;
  color: #111827;
  font-size: 29px;
  line-height: 1.12;
  letter-spacing: -0.03em;
  font-weight: 760;
}

.page-header p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.4;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.secondary-action,
.category-list button,
.template-row {
  font: inherit;
  cursor: pointer;
}

.secondary-action {
  min-height: 34px;
  padding: 0 12px;
  color: #155bd6;
  background: #ffffff;
  border: 1px solid #b9c9e7;
  border-radius: 7px;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.025);
  font-size: 12px;
  font-weight: 700;
}

.secondary-action:hover {
  background: #f8fbff;
  border-color: #9fb4d8;
}

.kpi-strip {
  margin-bottom: 14px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.025);
  overflow: hidden;
}

.kpi-card {
  min-height: 78px;
  padding: 12px 14px;
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 10px;
  align-items: center;
  border-right: 1px solid #e4e9f2;
}

.kpi-card:last-child {
  border-right: 0;
}

.kpi-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 16px;
}

.kpi-card small {
  display: block;
  color: #334155;
  font-size: 11px;
  line-height: 1.25;
  font-weight: 650;
}

.kpi-card strong {
  display: block;
  color: #111827;
  font-size: 22px;
  line-height: 1.08;
  font-weight: 780;
}

.kpi-card em {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-style: normal;
  font-size: 10.5px;
}

.kpi-blue .kpi-icon {
  color: #155bd6;
  background: #eef4ff;
}

.kpi-green .kpi-icon {
  color: #0f8f5a;
  background: #eaf7f0;
}

.kpi-red .kpi-icon {
  color: #b4232d;
  background: #fff0f1;
}

.kpi-amber .kpi-icon {
  color: #a36700;
  background: #fff6df;
}

.catalog-layout {
  display: grid;
  grid-template-columns:
    230px
    390px
    minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.panel {
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.025);
}

.panel-title {
  min-height: 42px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #edf1f6;
}

.panel-title h2 {
  margin: 0;
  color: #111827;
  font-size: 14px;
  font-weight: 760;
}

.panel-title-search {
  justify-content: space-between;
  gap: 12px;
}

.panel-title-search span {
  color: #64748b;
  font-size: 11px;
}

.search-box {
  width: 220px;
  height: 32px;
  display: grid;
  grid-template-columns: 28px 1fr;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #d7deea;
  border-radius: 7px;
}

.search-box span {
  display: grid;
  place-items: center;
  color: #64748b;
}

.search-box input {
  width: 100%;
  height: 30px;
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 12px;
}

.category-list,
.templates-list {
  padding: 10px;
  display: grid;
  gap: 6px;
}

.category-list button {
  min-height: 34px;
  padding: 0 10px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  color: #334155;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  text-align: left;
  font-size: 12px;
  font-weight: 650;
}

.category-list button:hover,
.category-list button.active {
  color: #155bd6;
  background: #eef4ff;
  border-color: #d9e6ff;
}

.category-list strong {
  color: inherit;
  font-size: 11px;
}

.template-row {
  min-height: 54px;
  padding: 8px 9px;
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  color: #111827;
  background: transparent;
  border: 1px solid #edf1f6;
  border-radius: 8px;
  text-align: left;
}

.template-row:hover,
.template-row.active {
  background: #f8fbff;
  border-color: #a9c4ef;
}

.color-dot {
  width: 8px;
  height: 32px;
  border-radius: 999px;
}

.template-main {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.template-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 740;
}

.template-main small {
  overflow: hidden;
  color: #64748b;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10.5px;
}

.template-row em {
  padding: 3px 7px;
  color: #475569;
  background: #eef2f7;
  border-radius: 999px;
  font-style: normal;
  font-size: 10.5px;
  font-weight: 700;
}

.preview-panel {
  min-height: 520px;
  padding: 18px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  padding-bottom: 14px;
  border-bottom: 1px solid #edf1f6;
}

.preview-header h2 {
  margin: 7px 0 0;
  font-size: 18px;
  line-height: 1.35;
  letter-spacing: -0.01em;
  text-decoration: underline;
}

.color-badge {
  padding: 5px 9px;
  color: #334155;
  background: #eef2f7;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 750;
}

.preview-meta {
  margin: 14px 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.preview-meta span {
  padding: 9px;
  display: grid;
  gap: 3px;
  color: #64748b;
  background: #fbfdff;
  border: 1px solid #edf1f6;
  border-radius: 8px;
  font-size: 10.5px;
}

.preview-meta strong {
  overflow: hidden;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.preview-text {
  min-height: 250px;
  margin: 0;
  padding: 16px;
  white-space: pre-wrap;
  background: #fff;
  border: 1px solid #edf1f6;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  line-height: 1.72;
}

.metadata {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.metadata span {
  padding: 4px 8px;
  color: #334155;
  background: #eef2f7;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
}

.note {
  margin: 14px 0 0;
  padding: 10px 12px;
  color: #7a5200;
  background: #fff8e1;
  border: 1px solid #f1dda3;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
}

.notice,
.loading-panel,
.empty-panel {
  padding: 14px;
  color: #64748b;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  font-size: 13px;
}

.notice {
  margin-bottom: 14px;
}

.notice-error {
  color: #b4232d;
  background: #fff0f1;
  border-color: #facdd0;
}

.loading-panel,
.empty-panel {
  min-height: 180px;
  display: grid;
  place-items: center;
}

@media (max-width: 1200px) {
  .catalog-layout {
    grid-template-columns: 220px 1fr;
  }

  .preview-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 860px) {
  .annotations-page {
    padding: 22px;
  }

  .page-header,
  .panel-title-search {
    flex-direction: column;
    align-items: stretch;
  }

  .kpi-strip,
  .catalog-layout,
  .preview-meta {
    grid-template-columns: 1fr;
  }

  .search-box {
    width: 100%;
  }
}
</style>
