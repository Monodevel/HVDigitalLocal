<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean
  }>(),
  {
    open: false,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

<template>
  <div class="page-actions">
    <slot name="primary" />

    <div class="page-actions__more">
      <button
        class="hv-button hv-button-ghost page-actions__trigger"
        type="button"
        aria-label="Más acciones"
        @click="
          emit('update:open', !open)
        "
      >
        •••
      </button>

      <div
        v-if="open"
        class="page-actions__menu"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-actions__more {
  position: relative;
}

.page-actions__trigger {
  width: 42px;
  padding: 0;
}

.page-actions__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  width: 220px;
  padding: 6px;
  display: grid;
  background: var(--hv-surface);
  border: 1px solid var(--hv-border);
  border-radius: 10px;
  box-shadow: var(--hv-shadow-md);
}

.page-actions__menu :deep(button) {
  min-height: 40px;
  padding: 0 11px;
  color: var(--hv-text);
  background: transparent;
  border: 0;
  border-radius: 7px;
  text-align: left;
}

.page-actions__menu :deep(button:hover) {
  background: var(--hv-surface-soft);
}
</style>
