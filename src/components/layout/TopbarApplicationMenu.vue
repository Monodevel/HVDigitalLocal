<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type MenuSection = 'archivo' | 'expediente' | 'herramientas' | 'ayuda' | null

const abierto = ref<MenuSection>(null)
const disponible = ref(new Set<string>())
let observador: MutationObserver | null = null

const dentroExpediente = computed(() => disponible.value.has('Resumen'))

function actualizarDisponibilidad(): void {
  const etiquetas = Array.from(document.querySelectorAll<HTMLButtonElement>('.hv-sidebar-item'))
    .map(boton => boton.textContent?.trim() ?? '')
    .filter(Boolean)
  disponible.value = new Set(etiquetas)
}

function alternar(seccion: Exclude<MenuSection, null>): void {
  abierto.value = abierto.value === seccion ? null : seccion
}

function cerrar(): void {
  abierto.value = null
}

function ejecutar(etiqueta: string): void {
  const boton = Array.from(document.querySelectorAll<HTMLButtonElement>('.hv-sidebar-item'))
    .find(elemento => elemento.textContent?.trim() === etiqueta)

  if (!boton || boton.disabled) return
  boton.click()
  cerrar()
}

function accionDisponible(etiqueta: string): boolean {
  return disponible.value.has(etiqueta)
}

function mostrarAcerca(): void {
  window.alert('HVDigital\nVersión 0.1.0\nSistema local de gestión de hojas de vida y procesos de calificación.')
  cerrar()
}

function manejarDocumento(evento: MouseEvent): void {
  const raiz = document.querySelector('.hv-topbar-menu')
  if (raiz && !raiz.contains(evento.target as Node)) cerrar()
}

onMounted(() => {
  actualizarDisponibilidad()
  observador = new MutationObserver(actualizarDisponibilidad)
  const lateral = document.querySelector('.hv-sidebar')
  if (lateral) observador.observe(lateral, { childList: true, subtree: true, characterData: true })
  document.addEventListener('click', manejarDocumento)
})

onBeforeUnmount(() => {
  observador?.disconnect()
  document.removeEventListener('click', manejarDocumento)
})
</script>

<template>
  <nav class="hv-topbar-menu" aria-label="Menú principal">
    <div class="hv-topbar-menu-group">
      <button type="button" :class="{ active: abierto === 'archivo' }" @click.stop="alternar('archivo')">
        Archivo <i class="pi pi-angle-down" />
      </button>
      <div v-if="abierto === 'archivo'" class="hv-topbar-dropdown">
        <button type="button" :disabled="!accionDisponible('Calificados') && !accionDisponible('Volver a calificados')" @click="ejecutar(accionDisponible('Calificados') ? 'Calificados' : 'Volver a calificados')">
          <i class="pi pi-home" /><span>Panel principal</span>
        </button>
        <button type="button" :disabled="!accionDisponible('Períodos')" @click="ejecutar('Períodos')">
          <i class="pi pi-calendar" /><span>Cambiar período</span>
        </button>
      </div>
    </div>

    <div class="hv-topbar-menu-group">
      <button type="button" :class="{ active: abierto === 'expediente' }" :disabled="!dentroExpediente" @click.stop="alternar('expediente')">
        Expediente <i class="pi pi-angle-down" />
      </button>
      <div v-if="abierto === 'expediente'" class="hv-topbar-dropdown hv-topbar-dropdown-wide">
        <button v-for="item in [
          ['Resumen', 'pi pi-user'],
          ['Hoja de Vida', 'pi pi-book'],
          ['Anotaciones', 'pi pi-file-edit'],
          ['EVINT 1', 'pi pi-chart-bar'],
          ['EVINT 2', 'pi pi-chart-line'],
          ['HC1', 'pi pi-clipboard'],
          ['HC2', 'pi pi-clipboard'],
          ['HAM', 'pi pi-star'],
          ['HAPSEM', 'pi pi-heart'],
          ['Resoluciones', 'pi pi-file'],
        ]" :key="item[0]" type="button" :disabled="!accionDisponible(item[0])" @click="ejecutar(item[0])">
          <i :class="item[1]" /><span>{{ item[0] }}</span>
        </button>
      </div>
    </div>

    <div class="hv-topbar-menu-group">
      <button type="button" :class="{ active: abierto === 'herramientas' }" @click.stop="alternar('herramientas')">
        Herramientas <i class="pi pi-angle-down" />
      </button>
      <div v-if="abierto === 'herramientas'" class="hv-topbar-dropdown">
        <button type="button" :disabled="!accionDisponible('Agregar calificado')" @click="ejecutar('Agregar calificado')">
          <i class="pi pi-user-plus" /><span>Agregar calificado</span>
        </button>
        <button type="button" :disabled="!accionDisponible('Configuración')" @click="ejecutar('Configuración')">
          <i class="pi pi-cog" /><span>Configuración</span>
        </button>
      </div>
    </div>

    <div class="hv-topbar-menu-group">
      <button type="button" :class="{ active: abierto === 'ayuda' }" @click.stop="alternar('ayuda')">
        Ayuda <i class="pi pi-angle-down" />
      </button>
      <div v-if="abierto === 'ayuda'" class="hv-topbar-dropdown hv-topbar-dropdown-right">
        <button type="button" @click="mostrarAcerca">
          <i class="pi pi-info-circle" /><span>Acerca de HVDigital</span>
        </button>
      </div>
    </div>
  </nav>
</template>
