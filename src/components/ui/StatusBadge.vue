<script setup lang="ts">
const props = defineProps<{
  status:
    | 'success'
    | 'warning'
    | 'danger'
    | 'neutral'
  label: string
}>()
</script>

<template>
  <span
    class="status-badge"
    :class="`status-badge--${props.status}`"
  >
    {{ props.label }}
  </span>
</template>

<style scoped>
.status-badge {
  width: fit-content;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 760;
}

.status-badge--success {
  color: #167447;
  background: #eaf8f0;
}

.status-badge--warning {
  color: #9a6500;
  background: #fff6d8;
}

.status-badge--danger {
  color: #b4232d;
  background: #fff0f1;
}

.status-badge--neutral {
  color: #4f5d70;
  background: #eef1f5;
}
</style>
