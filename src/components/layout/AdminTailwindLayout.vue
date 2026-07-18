<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
  watch,
} from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    maxWidth?: 'normal' | 'wide' | 'full'
  }>(),
  {
    title: '',
    subtitle: '',
    maxWidth: 'full',
  },
)

const sidebarCollapsed = ref(false)

const mainMaxWidth = computed(() => {
  if (props.maxWidth === 'normal') {
    return 'max-w-7xl'
  }

  if (props.maxWidth === 'wide') {
    return 'max-w-[1480px]'
  }

  return 'max-w-none'
})

function toggleSidebar(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem(
    'hvdigital.sidebar.collapsed',
    sidebarCollapsed.value ? '1' : '0',
  )
}

onMounted(() => {
  sidebarCollapsed.value =
    localStorage.getItem(
      'hvdigital.sidebar.collapsed',
    ) === '1'
})

watch(sidebarCollapsed, value => {
  document.documentElement.classList.toggle(
    'hvdigital-sidebar-collapsed',
    value,
  )
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <aside
      class="fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white/95 shadow-sm transition-all duration-200 lg:flex lg:flex-col"
      :class="
        sidebarCollapsed
          ? 'w-[76px]'
          : 'w-[276px]'
      "
    >
      <div class="flex h-20 items-center gap-3 border-b border-slate-200 px-5">
        <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-sm font-black text-blue-700">
          HV
        </div>

        <div
          class="min-w-0 transition-opacity duration-150"
          :class="
            sidebarCollapsed
              ? 'pointer-events-none opacity-0'
              : 'opacity-100'
          "
        >
          <strong class="block truncate text-lg font-extrabold tracking-tight text-slate-900">
            HVDigital
          </strong>

          <span class="block truncate text-xs text-slate-500">
            Sistema de Calificaciones
          </span>
        </div>
      </div>

      <button
        type="button"
        class="absolute -right-3 top-11 grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
        :title="
          sidebarCollapsed
            ? 'Mostrar barra lateral'
            : 'Ocultar barra lateral'
        "
        @click="toggleSidebar"
      >
        <span
          class="text-lg leading-none transition-transform"
          :class="
            sidebarCollapsed
              ? 'rotate-180'
              : ''
          "
        >
          ‹
        </span>
      </button>

      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <slot name="sidebar">
          <a class="flex h-11 items-center gap-3 rounded-xl bg-blue-50 px-3 text-sm font-semibold text-blue-700">
            <span class="grid h-8 w-8 place-items-center rounded-lg text-base">
              ▦
            </span>
            <span
              class="truncate"
              :class="
                sidebarCollapsed
                  ? 'hidden'
                  : ''
              "
            >
              Panel
            </span>
          </a>

          <a class="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <span class="grid h-8 w-8 place-items-center rounded-lg text-base">
              □
            </span>
            <span
              class="truncate"
              :class="
                sidebarCollapsed
                  ? 'hidden'
                  : ''
              "
            >
              Expedientes
            </span>
          </a>

          <a class="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <span class="grid h-8 w-8 place-items-center rounded-lg text-base">
              ✎
            </span>
            <span
              class="truncate"
              :class="
                sidebarCollapsed
                  ? 'hidden'
                  : ''
              "
            >
              Anotaciones
            </span>
          </a>

          <a class="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <span class="grid h-8 w-8 place-items-center rounded-lg text-base">
              ⚙
            </span>
            <span
              class="truncate"
              :class="
                sidebarCollapsed
                  ? 'hidden'
                  : ''
              "
            >
              Configuración
            </span>
          </a>
        </slot>
      </nav>

      <div class="border-t border-slate-200 p-3">
        <button
          type="button"
          class="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          @click="toggleSidebar"
        >
          <span class="grid h-7 w-7 place-items-center">
            ⇤
          </span>

          <span
            :class="
              sidebarCollapsed
                ? 'hidden'
                : ''
            "
          >
            Contraer menú
          </span>
        </button>
      </div>
    </aside>

    <section
      class="min-h-screen transition-all duration-200"
      :class="
        sidebarCollapsed
          ? 'lg:pl-[76px]'
          : 'lg:pl-[276px]'
      "
    >
      <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div class="flex h-16 items-center justify-between gap-4 px-5 lg:px-7">
          <div class="flex min-w-0 items-center gap-3">
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-blue-300 hover:text-blue-700 lg:hidden"
              @click="toggleSidebar"
            >
              ☰
            </button>

            <slot name="topbar-left">
              <label class="hidden h-10 w-[360px] max-w-[42vw] grid-cols-[34px_1fr] items-center rounded-xl border border-slate-200 bg-white px-1 text-sm text-slate-500 shadow-sm md:grid">
                <span class="grid place-items-center">
                  ⌕
                </span>
                <input
                  class="h-9 w-full bg-transparent outline-none placeholder:text-slate-400"
                  placeholder="Buscar expediente, persona o RUN..."
                  type="search"
                >
              </label>
            </slot>
          </div>

          <div class="flex items-center gap-3">
            <slot name="topbar-right">
              <span class="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                Período 2026–2027
              </span>

              <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                Activo
              </span>
            </slot>
          </div>
        </div>
      </header>

      <main class="px-5 py-6 lg:px-7">
        <div
          class="mx-auto"
          :class="mainMaxWidth"
        >
          <div
            v-if="title || subtitle || $slots.actions"
            class="mb-5 flex items-start justify-between gap-4"
          >
            <div>
              <h1
                v-if="title"
                class="text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950"
              >
                {{ title }}
              </h1>

              <p
                v-if="subtitle"
                class="mt-1 text-sm text-slate-500"
              >
                {{ subtitle }}
              </p>
            </div>

            <div
              v-if="$slots.actions"
              class="flex shrink-0 items-center gap-2"
            >
              <slot name="actions" />
            </div>
          </div>

          <slot />
        </div>
      </main>
    </section>
  </div>
</template>
