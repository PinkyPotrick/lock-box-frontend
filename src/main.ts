import Lara from '@primevue/themes/lara'
import axios from 'axios'
import { createPinia } from 'pinia'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Chart from 'primevue/chart'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import ColumnGroup from 'primevue/columngroup'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ConfirmDialog from 'primevue/confirmdialog'
import DataTable from 'primevue/datatable'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import Divider from 'primevue/divider'
import FloatLabel from 'primevue/floatlabel'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Menu from 'primevue/menu'
import MultiSelect from 'primevue/multiselect'
import OverlayBadge from 'primevue/overlaybadge'
import Panel from 'primevue/panel'
import Password from 'primevue/password'
import ProgressSpinner from 'primevue/progressspinner'
import Row from 'primevue/row'
import Select from 'primevue/select'
import Step from 'primevue/step'
import StepList from 'primevue/steplist'
import StepPanel from 'primevue/steppanel'
import StepPanels from 'primevue/steppanels'
import Stepper from 'primevue/stepper'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import Toast from 'primevue/toast'
import ToastService from 'primevue/toastservice'
import ToggleButton from 'primevue/togglebutton'
import ToggleSwitch from 'primevue/toggleswitch'
import { createApp } from 'vue'
import VueCookies from 'vue-cookies'
import App from './App.vue'
import router from './router'
import { initializeCookies } from './utils/cookiesUtils'
import { SensitiveOperationService } from '@/services/sensitiveOperationService'

import 'primeicons/primeicons.css'
import './assets/main.css'

const pinia = createPinia()
const app = createApp(App)

axios.defaults.baseURL = 'http://localhost:8080' // LockBox server

app.use(PrimeVue, {
  theme: {
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
app.use(ConfirmationService)
app.use(router)
app.use(pinia)

// Initialize the cookie utility
initializeCookies(app)

// Initialize the TOTP validation state
SensitiveOperationService.initializeTOTPValidation()

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
  .component('p-checkbox', Checkbox)
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
  .component('p-stepper', Stepper)
  .component('p-step-list', StepList)
  .component('p-step-panels', StepPanels)
  .component('p-step', Step)
  .component('p-step-panel', StepPanel)

app.mount('#app')
