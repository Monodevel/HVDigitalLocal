import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'

import NewApp from './NewApp.vue'
import { habilitarNotificacionesDeInterfaz } from './services/notificacionesNativas'
import { habilitarMenuNativo } from './services/menuNativo'
import { habilitarFotografiasEnExpediente } from './services/fotografiaExpedienteUi'
import { habilitarGestionPeriodos } from './services/periodosUi'
import { habilitarSeriesResoluciones } from './services/seriesResolucionesUi'
import { habilitarResolucionesExternas } from './services/resolucionesExternasUi'
import { habilitarCambioPasswordConfiguracion } from './services/cambioPasswordUi'

import 'primeicons/primeicons.css'
import './styles/hvdigital-theme.css'
import './styles/integration-overrides.css'
import './styles/resolution-layout-overrides.css'
import './styles/evint-layout-overrides.css'
import './styles/annotation-layout-overrides.css'
import './styles/fotografias-calificados.css'
import './styles/hc2-floating-actions.css'
import './styles/periodos-gestion.css'
import './styles/notas-tareas.css'
import './styles/notas-integracion.css'
import './styles/resolution-series.css'
import './styles/resoluciones-externas.css'
import './styles/cambio-password.css'
import './styles/ham-hapsem-container.css'
import './styles/ux-normalization.css'
import './styles/profile-and-login.css'
import './styles/hvdigital-design-system.css'
import './styles/hvdigital-responsive-refactor.css'

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
void habilitarGestionPeriodos()
void habilitarSeriesResoluciones()
void habilitarResolucionesExternas()
habilitarCambioPasswordConfiguracion()
habilitarNotificacionesDeInterfaz()
habilitarFotografiasEnExpediente()
