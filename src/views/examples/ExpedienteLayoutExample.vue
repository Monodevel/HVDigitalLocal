<script setup lang="ts">
import { ref } from 'vue'

import AppLayout from '../../components/layout/AppLayout.vue'
import AppCard from '../../components/ui/AppCard.vue'
import PageActions from '../../components/ui/PageActions.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'

const menuOpen = ref(false)

function nuevaAnotacion(): void {
  // navegación a la vista de anotaciones
}

function actualizar(): void {
  // recargar datos
}

function imprimir(): void {
  window.print()
}
</script>

<template>
  <AppLayout
    title="Expediente del calificado"
    subtitle="Gestión local de instrumentos y antecedentes del calificado"
    max-width="full"
  >
    <template #actions>
      <PageActions v-model:open="menuOpen">
        <template #primary>
          <button
            class="hv-button hv-button-primary"
            type="button"
            @click="nuevaAnotacion"
          >
            Nueva anotación
          </button>
        </template>

        <button type="button" @click="actualizar">
          Actualizar
        </button>

        <button type="button" @click="imprimir">
          Imprimir
        </button>
      </PageActions>
    </template>

    <template #summary>
      <AppCard padding="lg">
        <div class="profile-grid">
          <div class="photo">
            Fotografía
          </div>

          <div>
            <h2>SG2 Juan Pérez Araya</h2>
            <StatusBadge
              status="success"
              label="Activo"
            />
          </div>
        </div>
      </AppCard>
    </template>

    <AppCard
      title="Instrumentos del expediente"
      padding="lg"
    >
      <div class="instrument-grid">
        <button class="instrument success">
          Hoja de Vida
        </button>

        <button class="instrument warning">
          HC1
        </button>

        <button class="instrument danger">
          HC2
        </button>
      </div>
    </AppCard>
  </AppLayout>
</template>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 22px;
  align-items: center;
}

.photo {
  aspect-ratio: 4 / 5;
  display: grid;
  place-items: center;
  color: var(--hv-muted);
  background: var(--hv-surface-soft);
  border-radius: 14px;
}

.instrument-grid {
  display: grid;
  grid-template-columns:
    repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
}

.instrument {
  min-height: 150px;
  border-radius: 14px;
  font-weight: 760;
}

.instrument.success {
  color: #167447;
  background: #f1fbf5;
  border: 1px solid #bfe7cf;
}

.instrument.warning {
  color: #9a6500;
  background: #fffaf0;
  border: 1px solid #f0dda4;
}

.instrument.danger {
  color: #b4232d;
  background: #fff5f5;
  border: 1px solid #f2c8cc;
}
</style>
