<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from 'vue'

withDefaults(
  defineProps<{
    titulo?: string
    subtitulo?: string
    calificado?: string
    grado?: string
    unidad?: string
    estado?: string
    periodo?: string
    instrumentoActivo?: string
    modoLectura?: boolean
  }>(),
  {
    titulo: 'Expediente de calificación',
    subtitulo: 'Gestión de instrumentos del proceso calificatorio',
    calificado: 'Calificado',
    grado: '',
    unidad: '',
    estado: 'Abierto',
    periodo: 'Período activo',
    instrumentoActivo: 'resumen',
    modoLectura: false,
  },
)

const emit = defineEmits<{
  volver: []
  seleccionarInstrumento: [instrumento: string]
}>()

const sidebarColapsada = ref(false)

const instrumentos = computed(() => [
  {
    id: 'hc1',
    titulo: 'HC1',
    descripcion: 'Hoja de calificación N.º 1',
    icono: '1',
  },
  {
    id: 'hoja-vida',
    titulo: 'Hoja de Vida',
    descripcion: 'Anotaciones y antecedentes',
    icono: 'HV',
  },
  {
    id: 'evints',
    titulo: 'EVINTS',
    descripcion: 'Entrevistas de evaluación',
    icono: 'E',
  },
  {
    id: 'hc2',
    titulo: 'HC2',
    descripcion: 'Opinión del calificador superior',
    icono: '2',
  },
  {
    id: 'ham',
    titulo: 'HAM',
    descripcion: 'Antecedentes militares',
    icono: 'H',
  },
  {
    id: 'hapsem',
    titulo: 'HAPSEM',
    descripcion: 'Aptitud psicofísica',
    icono: 'P',
  },
])

function alternarSidebar(): void {
  sidebarColapsada.value = !sidebarColapsada.value

  localStorage.setItem(
    'hvdigital.expediente.sidebar.collapsed',
    sidebarColapsada.value ? '1' : '0',
  )
}

function seleccionar(
  instrumento: string,
): void {
  emit('seleccionarInstrumento', instrumento)
}

onMounted(() => {
  sidebarColapsada.value =
    localStorage.getItem(
      'hvdigital.expediente.sidebar.collapsed',
    ) === '1'
})
</script>

<template>
  <main
    class="exp-shell"
    :class="{
      'exp-shell--collapsed':
        sidebarColapsada,
    }"
  >
    <aside class="exp-sidebar">
      <section class="exp-brand">
        <div class="exp-brand__mark">
          HV
        </div>

        <div class="exp-brand__text">
          <strong>HVDigital</strong>
          <span>Expediente</span>
        </div>
      </section>

      <button
        class="exp-collapse"
        type="button"
        :title="
          sidebarColapsada
            ? 'Mostrar menú del expediente'
            : 'Ocultar menú del expediente'
        "
        @click="alternarSidebar"
      >
        <span>‹</span>
      </button>

      <section class="exp-person">
        <div class="exp-person__avatar">
          {{
            calificado
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((parte) => parte[0])
              .join('')
              .toUpperCase() || 'C'
          }}
        </div>

        <div class="exp-person__text">
          <strong>{{ calificado }}</strong>
          <span>{{ grado }}</span>
          <small>{{ unidad }}</small>
        </div>
      </section>

      <nav class="exp-nav">
        <button
          v-for="item in instrumentos"
          :key="item.id"
          type="button"
          class="exp-nav__item"
          :class="{
            'exp-nav__item--active':
              instrumentoActivo === item.id,
          }"
          @click="seleccionar(item.id)"
        >
          <span class="exp-nav__icon">
            {{ item.icono }}
          </span>

          <span class="exp-nav__text">
            <strong>{{ item.titulo }}</strong>
            <small>{{ item.descripcion }}</small>
          </span>
        </button>
      </nav>

      <section class="exp-sidebar__footer">
        <button
          class="exp-back"
          type="button"
          @click="emit('volver')"
        >
          <span>←</span>
          <strong>Volver al panel</strong>
        </button>
      </section>
    </aside>

    <section class="exp-main">
      <header class="exp-topbar">
        <div>
          <span class="exp-kicker">
            {{ periodo }}
          </span>

          <h1>{{ titulo }}</h1>

          <p>{{ subtitulo }}</p>
        </div>

        <div class="exp-topbar__actions">
          <span
            v-if="modoLectura"
            class="exp-badge exp-badge--readonly"
          >
            Solo lectura
          </span>

          <span
            v-else
            class="exp-badge exp-badge--active"
          >
            {{ estado }}
          </span>

          <slot name="actions" />
        </div>
      </header>

      <section class="exp-summary">
        <slot name="summary">
          <article>
            <span>Instrumento activo</span>
            <strong>{{ instrumentoActivo.toUpperCase() }}</strong>
          </article>

          <article>
            <span>Estado expediente</span>
            <strong>{{ estado }}</strong>
          </article>

          <article>
            <span>Modo</span>
            <strong>
              {{
                modoLectura
                  ? 'Consulta'
                  : 'Edición'
              }}
            </strong>
          </article>
        </slot>
      </section>

      <section class="exp-content">
        <slot />
      </section>
    </section>
  </main>
</template>

<style scoped>
.exp-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  color: #101828;
  background:
    radial-gradient(
      circle at 18% 0%,
      rgba(59, 130, 246, 0.08),
      transparent 24%
    ),
    linear-gradient(
      180deg,
      #f7f9fc 0%,
      #eef2f7 100%
    );
}

.exp-sidebar {
  position: sticky;
  top: 0;
  min-height: 100vh;
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  background: #111827;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 8px 0 24px rgba(15, 23, 42, 0.08);
  transition:
    width 180ms ease,
    padding 180ms ease;
}

.exp-brand {
  min-height: 54px;
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 11px;
  align-items: center;
}

.exp-brand__mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 900;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.22);
}

.exp-brand__text strong {
  display: block;
  color: #ffffff;
  font-size: 17px;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.exp-brand__text span {
  display: block;
  margin-top: 2px;
  color: #9ca3af;
  font-size: 11px;
  font-weight: 600;
}

.exp-collapse {
  position: absolute;
  top: 72px;
  right: -13px;
  width: 27px;
  height: 27px;
  display: grid;
  place-items: center;
  color: #667085;
  background: #ffffff;
  border: 1px solid #d6dde8;
  border-radius: 999px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.14);
  cursor: pointer;
}

.exp-collapse span {
  display: block;
  font-size: 21px;
  line-height: 1;
  transition: transform 180ms ease;
}

.exp-person {
  margin: 18px 0 16px;
  padding: 13px;
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 10px;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}

.exp-person__avatar {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  color: #ffffff;
  background: rgba(37, 99, 235, 0.95);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
}

.exp-person__text {
  min-width: 0;
}

.exp-person__text strong,
.exp-person__text span,
.exp-person__text small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exp-person__text strong {
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
}

.exp-person__text span {
  margin-top: 2px;
  color: #bfdbfe;
  font-size: 11px;
  font-weight: 700;
}

.exp-person__text small {
  margin-top: 1px;
  color: #9ca3af;
  font-size: 10.5px;
}

.exp-nav {
  display: grid;
  gap: 6px;
}

.exp-nav__item {
  min-height: 52px;
  padding: 7px 9px;
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 10px;
  align-items: center;
  color: #d1d5db;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.exp-nav__item:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.06);
}

.exp-nav__item--active {
  color: #ffffff;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.92), rgba(14, 165, 233, 0.85));
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.18);
}

.exp-nav__icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: currentColor;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 900;
}

.exp-nav__text {
  min-width: 0;
}

.exp-nav__text strong,
.exp-nav__text small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exp-nav__text strong {
  font-size: 12.5px;
  font-weight: 800;
}

.exp-nav__text small {
  margin-top: 1px;
  color: inherit;
  opacity: 0.72;
  font-size: 10.5px;
}

.exp-sidebar__footer {
  margin-top: auto;
  padding-top: 14px;
}

.exp-back {
  width: 100%;
  min-height: 38px;
  padding: 0 10px;
  display: flex;
  gap: 8px;
  align-items: center;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 11px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.exp-back:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.exp-main {
  min-width: 0;
  padding: 24px 28px 34px;
}

.exp-topbar {
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.exp-kicker {
  display: block;
  color: #2563eb;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.exp-topbar h1 {
  margin: 4px 0 0;
  color: #0f172a;
  font-size: 28px;
  line-height: 1.12;
  letter-spacing: -0.035em;
  font-weight: 850;
}

.exp-topbar p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.exp-topbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.exp-badge {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  padding: 0 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 850;
}

.exp-badge--active {
  color: #047857;
  background: #dff8ec;
}

.exp-badge--readonly {
  color: #92400e;
  background: #fff4d8;
}

.exp-summary {
  margin-bottom: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.exp-summary article {
  min-height: 72px;
  padding: 13px 14px;
  display: grid;
  align-content: center;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 14px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.035);
}

.exp-summary span {
  color: #64748b;
  font-size: 11.5px;
  font-weight: 700;
}

.exp-summary strong {
  margin-top: 3px;
  color: #0f172a;
  font-size: 20px;
  line-height: 1.1;
  font-weight: 850;
  letter-spacing: -0.03em;
}

.exp-content {
  min-height: calc(100vh - 184px);
}

/* Colapsado */
.exp-shell--collapsed {
  grid-template-columns: 82px minmax(0, 1fr);
}

.exp-shell--collapsed .exp-sidebar {
  padding-right: 10px;
  padding-left: 10px;
}

.exp-shell--collapsed .exp-brand {
  grid-template-columns: 42px;
  justify-content: center;
}

.exp-shell--collapsed .exp-brand__text,
.exp-shell--collapsed .exp-person__text,
.exp-shell--collapsed .exp-nav__text,
.exp-shell--collapsed .exp-back strong {
  width: 0;
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
}

.exp-shell--collapsed .exp-person {
  padding-right: 6px;
  padding-left: 6px;
  grid-template-columns: 1fr;
  justify-items: center;
}

.exp-shell--collapsed .exp-nav__item {
  grid-template-columns: 1fr;
  justify-items: center;
  padding-right: 0;
  padding-left: 0;
}

.exp-shell--collapsed .exp-back {
  justify-content: center;
  padding: 0;
}

.exp-shell--collapsed .exp-collapse span {
  transform: rotate(180deg);
}

@media (max-width: 980px) {
  .exp-shell,
  .exp-shell--collapsed {
    grid-template-columns: 1fr;
  }

  .exp-sidebar {
    position: relative;
    min-height: auto;
  }

  .exp-collapse {
    display: none;
  }

  .exp-main {
    padding: 22px;
  }

  .exp-summary {
    grid-template-columns: 1fr;
  }

  .exp-topbar {
    flex-direction: column;
  }
}
</style>
