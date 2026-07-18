<script setup lang="ts">
const emit = defineEmits<{
  volver: []
}>()
</script>

<template>
  <main class="config-system-page">
    <section class="config-shell">
      <header class="config-hero">
        <div>
          <span>HVDigital · Sistema</span>
          <h1>Configuración del sistema</h1>
          <p>
            Administración general de la aplicación, parámetros del período,
            catálogos y opciones locales.
          </p>
        </div>

        <button
          class="config-button"
          type="button"
          @click="emit('volver')"
        >
          Volver al inicio
        </button>
      </header>

      <section class="config-grid">
        <article class="config-card">
          <strong>Períodos</strong>
          <p>Gestión de períodos de calificación y cierres.</p>
        </article>

        <article class="config-card">
          <strong>Catálogos</strong>
          <p>Grados, categorías, conceptos, puntajes y anotaciones base.</p>
        </article>

        <article class="config-card">
          <strong>Respaldos</strong>
          <p>Opciones de respaldo y restauración de la base local.</p>
        </article>
      </section>
    </section>
  </main>
</template>

<style scoped>
.config-system-page {
  min-height: 100vh;
  padding: 34px;
  box-sizing: border-box;
  color: #0f172a;
  background:
    radial-gradient(
      circle at 12% 0%,
      rgba(37, 99, 235, 0.05),
      transparent 28%
    ),
    linear-gradient(180deg, #f8fafc 0%, #f4f7fb 100%);
}

.config-shell {
  max-width: 1280px;
  margin: 0 auto;
}

.config-hero {
  margin-bottom: 22px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  background: #fff;
  border: 1px solid #dfe6f1;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
}

.config-hero span {
  color: #2563eb;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.config-hero h1 {
  margin: 6px 0 0;
  font-size: 30px;
  letter-spacing: -0.04em;
}

.config-hero p {
  max-width: 720px;
  margin: 7px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}

.config-button {
  min-height: 38px;
  padding: 0 14px;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.config-card {
  min-height: 130px;
  padding: 18px;
  background: #fff;
  border: 1px solid #dfe6f1;
  border-radius: 16px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.035);
}

.config-card strong {
  display: block;
  color: #0f172a;
  font-size: 17px;
}

.config-card p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

@media (max-width: 900px) {
  .config-grid {
    grid-template-columns: 1fr;
  }

  .config-hero {
    flex-direction: column;
  }
}
</style>
