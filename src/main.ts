import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'

import NewApp from './NewApp.vue'
import { habilitarNotificacionesDeInterfaz } from './services/notificacionesNativas'
import { habilitarMenuNativo } from './services/menuNativo'

import 'primeicons/primeicons.css'
import './styles/hvdigital-theme.css'
import './styles/integration-overrides.css'
import './styles/resolution-layout-overrides.css'
import './styles/evint-layout-overrides.css'
import './styles/annotation-layout-overrides.css'

const app = createApp(NewApp)

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.hv-dark-mode',
      cssLayer: false,
    },
  },
  ripple: true,
  locale: {
    accept: 'Aceptar',
    reject: 'Cancelar',
    choose: 'Seleccionar',
    upload: 'Subir',
    cancel: 'Cancelar',
    today: 'Hoy',
    clear: 'Limpiar',
    firstDayOfWeek: 1,
    dateFormat: 'dd/mm/yy',
    emptyMessage: 'No existen registros disponibles',
    emptyFilterMessage: 'No se encontraron resultados',
  },
})

app.mount('#app')
void habilitarMenuNativo()
habilitarNotificacionesDeInterfaz()
