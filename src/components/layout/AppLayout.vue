<script setup lang="ts">
import { computed } from 'vue'

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

const contentClass = computed(() => [
  `hv-embedded-layout--${props.maxWidth}`,
  { 'hv-embedded-layout--compact': props.compact },
])
</script>

<template>
  <main class="hv-embedded-layout" :class="contentClass">
    <header v-if="!props.hideHeader" class="hv-embedded-layout__header no-print">
      <div class="hv-embedded-layout__heading">
        <slot name="breadcrumb" />
        <span class="hv-eyebrow">Instrumento de calificación</span>
        <h1>{{ props.title }}</h1>
        <p v-if="props.subtitle">{{ props.subtitle }}</p>
      </div>

      <div v-if="$slots.actions" class="hv-embedded-layout__actions">
        <slot name="actions" />
      </div>
    </header>

    <section v-if="$slots.summary" class="hv-embedded-layout__summary">
      <slot name="summary" />
    </section>

    <section v-if="$slots.notice" class="hv-embedded-layout__notice">
      <slot name="notice" />
    </section>

    <section class="hv-embedded-layout__body">
      <slot />
    </section>

    <footer v-if="$slots.footer" class="hv-embedded-layout__footer">
      <slot name="footer" />
    </footer>
  </main>
</template>

<style scoped>
.hv-embedded-layout {
  width: 100%;
  min-height: 100%;
  padding: 1.4rem 1.5rem 4rem;
  color: var(--hv-text, #172033);
  background: var(--hv-page, #f5f7fb);
}

.hv-embedded-layout--normal {
  max-width: 1040px;
  margin-inline: auto;
}

.hv-embedded-layout--wide {
  max-width: 1380px;
  margin-inline: auto;
}

.hv-embedded-layout--full {
  max-width: none;
}

.hv-embedded-layout--compact {
  padding-top: .8rem;
}

.hv-embedded-layout__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
}

.hv-embedded-layout__heading {
  min-width: 0;
}

.hv-embedded-layout__heading h1 {
  margin: .25rem 0 .3rem;
  color: #0f2748;
  font-size: clamp(1.55rem, 2vw, 2rem);
  line-height: 1.1;
}

.hv-embedded-layout__heading p {
  margin: 0;
  color: #667085;
}

.hv-embedded-layout__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: .65rem;
}

.hv-embedded-layout__summary,
.hv-embedded-layout__notice {
  margin-bottom: 1rem;
}

.hv-embedded-layout__body {
  min-width: 0;
}

.hv-embedded-layout__footer {
  margin-top: 1.25rem;
}

@media (max-width: 760px) {
  .hv-embedded-layout {
    padding: 1rem 1rem 5rem;
  }

  .hv-embedded-layout__header {
    flex-direction: column;
  }

  .hv-embedded-layout__actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media print {
  .hv-embedded-layout {
    max-width: none;
    min-height: auto;
    padding: 0;
    background: #fff;
  }

  .hv-embedded-layout__summary,
  .hv-embedded-layout__notice {
    margin: 0;
  }
}
</style>
