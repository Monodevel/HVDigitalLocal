<script setup lang="ts">
import { computed } from 'vue'

export type SeccionHVDigital =
  | 'panel'
  | 'personas'
  | 'expedientes'
  | 'anotaciones'
  | 'hoja-vida'
  | 'evint'
  | 'configuracion'

const props = defineProps<{
  seccionActiva: SeccionHVDigital
  titulo?: string
  subtitulo?: string
}>()

const emit = defineEmits<{
  navegar: [seccion: SeccionHVDigital]
}>()

const navegacion = computed(() => [
  {
    seccion: 'panel' as const,
    etiqueta: 'Panel principal',
    icono: '⌂',
  },
  {
    seccion: 'personas' as const,
    etiqueta: 'Personal',
    icono: '◎',
  },
  {
    seccion: 'expedientes' as const,
    etiqueta: 'Expedientes',
    icono: '▤',
  },
  {
    seccion: 'anotaciones' as const,
    etiqueta: 'Anotaciones',
    icono: '✎',
  },
  {
    seccion: 'hoja-vida' as const,
    etiqueta: 'Hoja de Vida',
    icono: '▧',
  },
  {
    seccion: 'evint' as const,
    etiqueta: 'EVINT',
    icono: '✓',
  },
  {
    seccion: 'configuracion' as const,
    etiqueta: 'Configuración',
    icono: '⚙',
  },
])
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <header class="brand">
        <div class="brand-mark">HV</div>

        <div>
          <strong>HVDigital</strong>
          <span>Sistema de Calificaciones</span>
        </div>
      </header>

      <nav class="navigation">
        <button
          v-for="item in navegacion"
          :key="item.seccion"
          type="button"
          class="nav-item"
          :class="{
            active:
              item.seccion ===
              props.seccionActiva,
          }"
          @click="emit('navegar', item.seccion)"
        >
          <span class="nav-icon">
            {{ item.icono }}
          </span>

          <span>{{ item.etiqueta }}</span>
        </button>
      </nav>

      <footer class="sidebar-footer">
        <span>Aplicación local</span>
        <strong>Base de datos protegida</strong>
      </footer>
    </aside>

    <main class="workspace">
      <header class="workspace-header">
        <div>
          <span class="workspace-kicker">
            HVDigital
          </span>

          <h1>{{ props.titulo }}</h1>

          <p v-if="props.subtitulo">
            {{ props.subtitulo }}
          </p>
        </div>

        <slot name="actions" />
      </header>

      <section class="workspace-content">
        <slot />
      </section>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  background: var(--ui-page, #f3f5f8);
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 20px 14px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  color: #dbe7f3;
  background:
    linear-gradient(
      180deg,
      #123f6c 0%,
      #102f50 100%
    );
}

.brand {
  padding: 4px 8px 22px;
  display: flex;
  align-items: center;
  gap: 11px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  color: #123f6c;
  background: #fff;
  border-radius: 11px;
  font-weight: 900;
}

.brand > div:last-child {
  display: grid;
  gap: 2px;
}

.brand strong {
  color: #fff;
  font-size: 17px;
}

.brand span {
  color: #b9cde0;
  font-size: 10px;
}

.navigation {
  display: grid;
  align-content: start;
  gap: 5px;
}

.nav-item {
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 11px;
  color: #d2e0ed;
  background: transparent;
  border: 0;
  border-radius: 9px;
  text-align: left;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.nav-item.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
  box-shadow:
    inset 3px 0 0 #fff;
}

.nav-icon {
  width: 22px;
  text-align: center;
  font-size: 17px;
}

.sidebar-footer {
  padding: 14px 10px 4px;
  display: grid;
  gap: 3px;
  color: #a9bdd0;
  font-size: 10px;
}

.sidebar-footer strong {
  color: #d7e3ef;
  font-size: 11px;
}

.workspace {
  min-width: 0;
}

.workspace-header {
  min-height: 94px;
  padding: 22px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid var(--ui-border, #dbe1e9);
  backdrop-filter: blur(12px);
}

.workspace-header h1 {
  margin: 3px 0 0;
  color: var(--ui-text, #172033);
  font-size: 23px;
  letter-spacing: -0.02em;
}

.workspace-header p {
  margin: 4px 0 0;
  color: var(--ui-text-muted, #667284);
  font-size: 13px;
}

.workspace-kicker {
  color: var(--ui-primary, #174f87);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.workspace-content {
  min-width: 0;
}

@media (max-width: 850px) {
  .app-shell {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .sidebar {
    padding: 16px 8px;
  }

  .brand {
    padding-right: 0;
    padding-left: 0;
    justify-content: center;
  }

  .brand > div:last-child,
  .nav-item > span:last-child,
  .sidebar-footer {
    display: none;
  }

  .nav-item {
    justify-content: center;
  }
}
</style>
