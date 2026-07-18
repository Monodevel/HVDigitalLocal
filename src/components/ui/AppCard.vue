<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    padding?: 'none' | 'sm' | 'md' | 'lg'
    interactive?: boolean
  }>(),
  {
    title: '',
    subtitle: '',
    padding: 'md',
    interactive: false,
  },
)
</script>

<template>
  <section
    class="app-card"
    :class="[
      `app-card--${padding}`,
      {
        'app-card--interactive':
          interactive,
      },
    ]"
  >
    <header
      v-if="
        title ||
        subtitle ||
        $slots.header ||
        $slots.actions
      "
      class="app-card__header"
    >
      <div>
        <slot name="header">
          <h2 v-if="title">
            {{ title }}
          </h2>

          <p v-if="subtitle">
            {{ subtitle }}
          </p>
        </slot>
      </div>

      <div
        v-if="$slots.actions"
        class="app-card__actions"
      >
        <slot name="actions" />
      </div>
    </header>

    <div class="app-card__body">
      <slot />
    </div>

    <footer
      v-if="$slots.footer"
      class="app-card__footer"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.app-card {
  background: var(--hv-surface);
  border: 1px solid var(--hv-border);
  border-radius: var(--hv-radius-lg);
  box-shadow: var(--hv-shadow-sm);
}

.app-card--interactive {
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;
}

.app-card--interactive:hover {
  transform: translateY(-1px);
  border-color: #cfd7e1;
  box-shadow: var(--hv-shadow-md);
}

.app-card--none {
  padding: 0;
}

.app-card--sm {
  padding: 14px;
}

.app-card--md {
  padding: 20px;
}

.app-card--lg {
  padding: 26px;
}

.app-card__header {
  margin-bottom: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.app-card__header h2 {
  margin: 0;
  color: var(--hv-text);
  font-size: 17px;
  font-weight: 740;
}

.app-card__header p {
  margin: 5px 0 0;
  color: var(--hv-muted);
  font-size: 13px;
}

.app-card__actions {
  display: flex;
  gap: 8px;
}

.app-card__footer {
  margin-top: 18px;
}
</style>
