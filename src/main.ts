import { createApp } from 'vue'
import { initializeCookies } from './utils/cookies'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import VueCookies from 'vue-cookies'
import PrimeVue from 'primevue/config'
import Lara from '@primevue/themes/lara'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputIcon from 'primevue/inputicon'
import IconField from 'primevue/iconfield'
import Password from 'primevue/password'
import FloatLabel from 'primevue/floatlabel'
import ToggleSwitch from 'primevue/toggleswitch'
import ToggleButton from 'primevue/togglebutton'
import Divider from 'primevue/divider'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Menu from 'primevue/menu'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ColumnGroup from 'primevue/columngroup'
import Row from 'primevue/row'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import ConfirmDialog from 'primevue/confirmdialog'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import DatePicker from 'primevue/datepicker'
import Badge from 'primevue/badge'
import OverlayBadge from 'primevue/overlaybadge'
import Chart from 'primevue/chart'
import Toast from 'primevue/toast'
import ToastService from 'primevue/toastservice'
import ProgressSpinner from 'primevue/progressspinner'
// import { definePreset } from '@primevue/themes'
import './assets/main.css'
import 'primeicons/primeicons.css'

const pinia = createPinia()
const app = createApp(App)

// const LockBoxColors = definePreset(Lara, {
//   semantic: {
//     colorScheme: {
//       light: {
//         surface: {
//           0: '#ffffff',
//           50: '{zinc.50}',
//           100: '{zinc.100}',
//           200: '{zinc.200}',
//           300: '{zinc.300}',
//           400: '{zinc.400}',
//           500: '{zinc.500}',
//           600: '{zinc.600}',
//           700: '{zinc.700}',
//           800: '{zinc.800}',
//           900: '{zinc.900}',
//           950: '{zinc.950}'
//         }
//       },
//       dark: {
//         surface: {
//           0: '#ffffff',
//           50: '{slate.50}',
//           100: '{slate.100}',
//           200: '{slate.200}',
//           300: '{slate.300}',
//           400: '{slate.400}',
//           500: '{slate.500}',
//           600: '{slate.600}',
//           700: '{slate.700}',
//           800: '{slate.800}',
//           900: '{slate.900}',
//           950: '{slate.950}'
//         }
//       }
//     }
//   }
// })

axios.defaults.baseURL = 'http://localhost:8080' // LockBox server

app.use(PrimeVue, {
  theme: {
    // preset: LockBoxColors,
    preset: Lara,
    options: {
      prefix: 'p',
      darkModeSelector: '.lock-box-dark',
      cssLayer: false
    }
  }
})
app.use(VueCookies)
app.use(ToastService)
app.use(router)
app.use(pinia)

// Initialize the cookie utility
initializeCookies(app)

app
  .component('p-button', Button)
  .component('p-input-text', InputText)
  .component('p-password', Password)
  .component('p-float-label', FloatLabel)
  .component('p-toggle-switch', ToggleSwitch)
  .component('p-toggle-button', ToggleButton)
  .component('p-input-icon', InputIcon)
  .component('p-icon-field', IconField)
  .component('p-divider', Divider)
  .component('p-card', Card)
  .component('p-panel', Panel)
  .component('p-menu', Menu)
  .component('p-data-table', DataTable)
  .component('p-column', Column)
  .component('p-column-group', ColumnGroup)
  .component('p-row', Row)
  .component('p-dialog', Dialog)
  .component('p-textarea', Textarea)
  .component('p-confirm-dialog', ConfirmDialog)
  .component('p-tag', Tag)
  .component('p-select', Select)
  .component('p-multi-select', MultiSelect)
  .component('p-date-picker', DatePicker)
  .component('p-badge', Badge)
  .component('p-overlay-badge', OverlayBadge)
  .component('p-chart', Chart)
  .component('p-toast', Toast)
  .component('p-progress-spinner', ProgressSpinner)

app.mount('#app')
