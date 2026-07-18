<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    maxWidth?: 'normal' | 'wide' | 'full'
    compact?: boolean
    hideHeader?: boolean
  }>(),
  {
    subtitle: '',
    maxWidth: 'wide',
    compact: false,
    hideHeader: false,
  },
)

const sidebarCollapsed = ref(false)

const contentClass = computed(() => ({
  'app-layout__content--normal':
    props.maxWidth === 'normal',
  'app-layout__content--wide':
    props.maxWidth === 'wide',
  'app-layout__content--full':
    props.maxWidth === 'full',
  'app-layout__content--compact':
    props.compact,
}))

function toggleSidebar(): void {
  sidebarCollapsed.value =
    !sidebarCollapsed.value

  localStorage.setItem(
    'hvdigital.expediente.sidebar.collapsed',
    sidebarCollapsed.value ? '1' : '0',
  )
}

function emitirMenu(
  menuId: string,
): void {
  window.dispatchEvent(
    new CustomEvent(
      'hvdigital-sidebar-menu',
      {
        detail: menuId,
      },
    ),
  )
}

onMounted(() => {
  sidebarCollapsed.value =
    localStorage.getItem(
      'hvdigital.expediente.sidebar.collapsed',
    ) === '1'
})
</script>

<template>
  <main
    class="exp-layout"
    :class="{
      'exp-layout--collapsed':
        sidebarCollapsed,
    }"
  >
    <aside class="exp-sidebar">
      <section class="exp-brand">
        <div class="exp-brand__mark">
          HV
        </div>

        <div class="exp-brand__text">
          <strong>HVDigital</strong>
          <span>Expediente calificado</span>
        </div>
      </section>

      <button
        class="exp-sidebar__toggle"
        type="button"
        :title="
          sidebarCollapsed
            ? 'Mostrar menú lateral'
            : 'Ocultar menú lateral'
        "
        @click="toggleSidebar"
      >
        <span>‹</span>
      </button>

      <nav class="exp-nav">
        <div class="exp-nav__group">
          <span class="exp-nav__group-title">
            Principal
          </span>

          <button
            class="exp-nav__item exp-nav__item--home"
            type="button"
            @click="emitirMenu('menu_panel')"
          >
            <span class="exp-nav__icon">⌂</span>
            <span class="exp-nav__label">Inicio</span>
          </button>
        </div>

        <div class="exp-nav__separator" />

        <div class="exp-nav__group">
          <span class="exp-nav__group-title">
            Instrumentos
          </span>

          <button
            class="exp-nav__item"
            type="button"
            @click="emitirMenu('menu_hc1')"
          >
            <span class="exp-nav__icon">1</span>
            <span class="exp-nav__label">HC1</span>
          </button>

          <button
            class="exp-nav__item"
            type="button"
            @click="emitirMenu('menu_hoja_vida')"
          >
            <span class="exp-nav__icon">▤</span>
            <span class="exp-nav__label">Hoja de Vida</span>
          </button>

          <div class="exp-nav__evints">
            <button
              class="exp-nav__item"
              type="button"
              @click="emitirMenu('menu_evint_1')"
            >
              <span class="exp-nav__icon">E</span>
              <span class="exp-nav__label">
                EVINTS
              </span>
            </button>

            <div class="exp-nav__subitems">
              <button
                type="button"
                @click="emitirMenu('menu_evint_1')"
              >
                EVINT 1
              </button>

              <button
                type="button"
                @click="emitirMenu('menu_evint_2')"
              >
                EVINT 2
              </button>
            </div>
          </div>

          <button
            class="exp-nav__item"
            type="button"
            @click="emitirMenu('menu_hc2')"
          >
            <span class="exp-nav__icon">2</span>
            <span class="exp-nav__label">HC2</span>
          </button>

          <button
            class="exp-nav__item"
            type="button"
            @click="emitirMenu('menu_ham')"
          >
            <span class="exp-nav__icon">M</span>
            <span class="exp-nav__label">HAM</span>
          </button>

          <button
            class="exp-nav__item"
            type="button"
            @click="emitirMenu('menu_hapsem')"
          >
            <span class="exp-nav__icon">P</span>
            <span class="exp-nav__label">HAPSEM</span>
          </button>
        </div>

        <div class="exp-nav__group exp-nav__group--bottom">
          <span class="exp-nav__group-title">
            Sistema
          </span>

          <button
            class="exp-nav__item"
            type="button"
            @click="emitirMenu('menu_configuracion')"
          >
            <span class="exp-nav__icon">⚙</span>
            <span class="exp-nav__label">Configuración</span>
          </button>

          <button
            class="exp-nav__item"
            type="button"
            @click="emitirMenu('menu_manual')"
          >
            <span class="exp-nav__icon">?</span>
            <span class="exp-nav__label">Ayuda</span>
          </button>

        </div>
      </nav>
    </aside>

    <section class="exp-main">
      <header class="exp-topbar">
        <div class="exp-topbar__left">
          <button
            class="exp-mobile-menu"
            type="button"
            @click="toggleSidebar"
          >
            ☰
          </button>

          <div>
            <span class="exp-kicker">
              Expediente
            </span>

            <strong>
              {{ props.title }}
            </strong>

            <small v-if="props.subtitle">
              {{ props.subtitle }}
            </small>
          </div>
        </div>

        <div class="exp-topbar__right">
          <span class="exp-period-chip">
            Período activo
          </span>

          <span class="exp-status-chip">
            En evaluación
          </span>
        </div>
      </header>

      <section
        class="app-layout__content"
        :class="contentClass"
      >
        <header
          v-if="!props.hideHeader"
          class="app-layout__header"
        >
          <div class="app-layout__heading">
            <slot name="breadcrumb" />

            <h1>{{ props.title }}</h1>

            <p v-if="props.subtitle">
              {{ props.subtitle }}
            </p>
          </div>

          <div
            v-if="$slots.actions"
            class="app-layout__actions"
          >
            <slot name="actions" />
          </div>
        </header>

        <section
          v-if="$slots.summary"
          class="app-layout__summary"
        >
          <slot name="summary" />
        </section>

        <section
          v-if="$slots.notice"
          class="app-layout__notice"
        >
          <slot name="notice" />
        </section>

        <section class="app-layout__body">
          <slot />
        </section>

        <footer
          v-if="$slots.footer"
          class="app-layout__footer"
        >
          <slot name="footer" />
        </footer>
      </section>
    </section>
  </main>
</template>

<style scoped>
.exp-layout {
  min-height: 100vh;
  color: #0f172a;
  background: #f6f8fc;
}

.exp-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 40;
  width: 272px;
  height: 100vh;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
  border-right: 1px solid #dfe6f1;
  box-shadow: 8px 0 24px rgba(15, 23, 42, 0.025);
  transition: width 0.2s ease;
}

.exp-layout--collapsed .exp-sidebar {
  width: 78px;
}

.exp-brand {
  min-height: 74px;
  padding: 0 18px;
  display: flex;
  gap: 12px;
  align-items: center;
  border-bottom: 1px solid #e8edf5;
}

.exp-brand__mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22);
}

.exp-brand__text {
  min-width: 0;
  transition: opacity 0.16s ease;
}

.exp-brand__text strong {
  display: block;
  color: #0f172a;
  font-size: 18px;
  font-weight: 850;
  letter-spacing: -0.035em;
}

.exp-brand__text span {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.exp-sidebar__toggle {
  position: absolute;
  top: 88px;
  right: -14px;
  z-index: 5;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: #64748b;
  background: #ffffff;
  border: 1px solid #dce4ef;
  border-radius: 999px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
  cursor: pointer;
}

.exp-sidebar__toggle span {
  display: block;
  font-size: 22px;
  line-height: 1;
  transition: transform 0.18s ease;
}

.exp-layout--collapsed .exp-sidebar__toggle span {
  transform: rotate(180deg);
}

.exp-nav {
  flex: 1;
  min-height: 0;
  padding: 18px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.exp-nav__group {
  display: grid;
  gap: 6px;
}

.exp-nav__group--bottom {
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid #edf1f6;
}

.exp-nav__group-title {
  padding: 0 10px 5px;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: opacity 0.16s ease;
}

.exp-nav__item,
.exp-nav__subitems button,
.exp-mobile-menu {
  font: inherit;
  cursor: pointer;
}

.exp-nav__item {
  min-height: 42px;
  padding: 0 12px;
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 9px;
  align-items: center;
  color: #334155;
  background: transparent;
  border: 0;
  border-radius: 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 720;
  transition:
    background 0.16s ease,
    color 0.16s ease,
    box-shadow 0.16s ease;
}

.exp-nav__item:hover {
  color: #1d4ed8;
  background: #eef4ff;
}

.exp-nav__icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: inherit;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 850;
}

.exp-nav__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.16s ease;
}

.exp-nav__evints {
  display: grid;
  gap: 2px;
}

.exp-nav__subitems {
  margin-left: 51px;
  display: grid;
  gap: 2px;
  transition:
    opacity 0.16s ease,
    margin 0.16s ease;
}

.exp-nav__subitems button {
  min-height: 28px;
  padding: 0 9px;
  color: #64748b;
  background: transparent;
  border: 0;
  border-radius: 8px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
}

.exp-nav__subitems button:hover {
  color: #1d4ed8;
  background: #f3f7ff;
}

.exp-nav__item--exit {
  color: #b4232d;
}

.exp-nav__item--exit:hover {
  color: #b4232d;
  background: #fff0f1;
}

.exp-layout--collapsed .exp-brand {
  justify-content: center;
  padding: 0 10px;
}

.exp-layout--collapsed .exp-brand__text,
.exp-layout--collapsed .exp-nav__label,
.exp-layout--collapsed .exp-nav__group-title,
.exp-layout--collapsed .exp-nav__subitems {
  width: 0;
  height: 0;
  margin: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
}

.exp-layout--collapsed .exp-nav {
  padding-right: 10px;
  padding-left: 10px;
}

.exp-layout--collapsed .exp-nav__item {
  grid-template-columns: 1fr;
  justify-items: center;
  padding: 0;
}

.exp-layout--collapsed .exp-nav__icon {
  width: 36px;
  height: 36px;
}

.exp-main {
  min-width: 0;
  min-height: 100vh;
  margin-left: 272px;
  transition: margin-left 0.2s ease;
}

.exp-layout--collapsed .exp-main {
  margin-left: 78px;
}

.exp-topbar {
  position: sticky;
  top: 0;
  z-index: 4;
  min-height: 70px;
  padding: 0 26px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  background: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid #dfe6f1;
  backdrop-filter: blur(16px);
}

.exp-topbar__left,
.exp-topbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.exp-topbar__left strong {
  display: block;
  color: #0f172a;
  font-size: 15px;
  line-height: 1.2;
  font-weight: 850;
}

.exp-topbar__left small {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.exp-kicker {
  display: block;
  color: #2563eb;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.exp-mobile-menu {
  width: 38px;
  height: 38px;
  display: none;
  place-items: center;
  color: #334155;
  background: #ffffff;
  border: 1px solid #dfe6f1;
  border-radius: 10px;
}

.exp-period-chip,
.exp-status-chip {
  min-height: 34px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.exp-period-chip {
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.exp-status-chip {
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
}

.app-layout__content {
  width: 100%;
  margin: 0 auto;
  padding: 24px 28px 44px;
  box-sizing: border-box;
}

.app-layout__content--normal {
  max-width: 1080px;
}

.app-layout__content--wide {
  max-width: 1480px;
}

.app-layout__content--full {
  max-width: none;
}

.app-layout__content--compact {
  padding-top: 14px;
}

.app-layout__header {
  min-height: 56px;
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
}

.app-layout__heading {
  min-width: 0;
}

.app-layout__heading h1 {
  margin: 0;
  color: #0f172a;
  font-size: 27px;
  line-height: 1.14;
  font-weight: 850;
  letter-spacing: -0.04em;
}

.app-layout__heading p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.app-layout__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  align-items: center;
}

.app-layout__summary,
.app-layout__notice {
  margin-bottom: 16px;
}

.app-layout__body {
  min-width: 0;
}

.app-layout__footer {
  margin-top: 24px;
}

@media (max-width: 980px) {
  .exp-sidebar {
    z-index: 50;
    width: 272px;
    transform: translateX(-100%);
    transition:
      transform 0.2s ease,
      width 0.2s ease;
  }

  .exp-layout--collapsed .exp-sidebar {
    width: 272px;
    transform: translateX(0);
  }

  .exp-main,
  .exp-layout--collapsed .exp-main {
    margin-left: 0;
  }

  .exp-layout--collapsed .exp-brand__text,
  .exp-layout--collapsed .exp-nav__label,
  .exp-layout--collapsed .exp-nav__group-title,
  .exp-layout--collapsed .exp-nav__subitems {
    width: auto;
    height: auto;
    opacity: 1;
    pointer-events: auto;
  }

  .exp-layout--collapsed .exp-nav__item {
    grid-template-columns: 30px 1fr;
    justify-items: start;
    padding: 0 12px;
  }

  .exp-sidebar__toggle {
    display: none;
  }

  .exp-mobile-menu {
    display: grid;
  }

  .app-layout__content {
    padding: 20px 18px 34px;
  }

  .exp-topbar {
    padding: 0 18px;
  }

  .exp-topbar__right {
    display: none;
  }
}

@media print {
  .exp-layout {
    display: block;
    min-height: 0;
    background: #fff;
  }

  .exp-main,
  .exp-layout--collapsed .exp-main {
    margin-left: 0;
  }

  .exp-sidebar,
  .exp-topbar,
  .app-layout__header,
  .app-layout__summary,
  .app-layout__notice,
  .app-layout__footer {
    display: none !important;
  }

  .app-layout__content {
    max-width: none;
    padding: 0;
  }
}

.exp-nav__separator {
  height: 1px;
  margin: 2px 4px 0;
  background: #edf1f6;
}

.exp-nav__item--home {
  color: #1d4ed8;
  background: #eff6ff;
}

.exp-nav__item--home:hover {
  color: #1e40af;
  background: #dbeafe;
}

</style>
