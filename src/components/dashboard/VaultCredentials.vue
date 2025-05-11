<template>
  <div class="vault-credentials">
    <p-toast />
    <div class="title-section">
      <p-button
        icon="pi pi-arrow-left"
        class="p-button-text p-button-sm back-button"
        @click="goBackToVaults"
      />
      <h2>{{ vaultName }} Credentials</h2>
    </div>

    <div class="actions-container">
      <div class="actions">
        <p-button
          label="Add Credential"
          icon="pi pi-plus"
          @click="openCreateCredentialDialog"
        ></p-button>
      </div>

      <div class="table-header">
        <p-input-text
          v-model="filters.global.value"
          placeholder="Search credentials..."
          class="search-input"
          @input="onFilterChange"
        />
        <div class="filter-controls">
          <p-select
            v-model="categoryFilter"
            :options="categoryOptions"
            placeholder="Filter by category"
            optionLabel="name"
            optionValue="value"
            class="category-filter"
            :showClear="true"
            @change="onCategoryFilterChange"
          />
          <p-button
            icon="pi pi-star"
            :class="{
              'p-button-outlined': !showFavoritesOnly,
              'p-button-warning': showFavoritesOnly
            }"
            @click="toggleFavoritesFilter"
            v-tooltip.bottom="'Show favorites only'"
          />
        </div>
      </div>
    </div>

    <p-data-table
      class="data-table-container"
      :value="filteredCredentials"
      :paginator="true"
      :rows="rows"
      v-model:first="first"
      :rowsPerPageOptions="[5, 10, 20, 50]"
      :loading="loading"
      :emptyMessage="loading ? 'Loading credentials...' : 'No credentials found in this vault'"
      v-model:sortField="sortField"
      v-model:sortOrder="sortOrder"
      @sort="onSortChange"
      @page="onPageChange"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      :currentPageReportTemplate="'{first} to {last} of {totalRecords} credentials'"
      dataKey="id"
    >
      <p-column field="favorite" header="">
        <template #body="slotProps">
          <i
            :class="`pi ${slotProps.data.favorite ? 'pi-star-fill' : 'pi-star'}`"
            :style="{ color: slotProps.data.favorite ? 'var(--yellow-500)' : 'grey' }"
            @click="toggleFavorite(slotProps.data)"
            class="favorite-icon"
          ></i>
        </template>
      </p-column>
      <p-column field="domain" header="Domain" :sortable="true">
        <template #body="slotProps">
          {{
            getDomainName(slotProps.data.domainId) ||
            slotProps.data.domainName ||
            slotProps.data.website ||
            '-'
          }}
        </template>
      </p-column>
      <p-column field="username" header="Username" sortable></p-column>
      <p-column field="category" header="Category" sortable></p-column>
      <p-column field="updatedAt" header="Last Updated" sortable>
        <template #body="slotProps">
          {{ formatDate(slotProps.data.updatedAt) }}
        </template>
      </p-column>
      <p-column field="lastUsed" header="Last Used" sortable>
        <template #body="slotProps">
          {{ slotProps.data.lastUsed ? formatDate(slotProps.data.lastUsed) : 'Never' }}
        </template>
      </p-column>
      <p-column header="Actions">
        <template #body="slotProps">
          <div class="action-buttons">
            <p-button
              icon="pi pi-pencil"
              class="p-button-sm"
              @click="startEditCredential(slotProps.data)"
              v-tooltip.top="'Edit'"
            />
            <p-button
              icon="pi pi-eye"
              class="p-button-sm p-button-info"
              @click="viewCredential(slotProps.data)"
              v-tooltip.top="'View details'"
            />
            <p-button
              icon="pi pi-trash"
              class="p-button-sm p-button-danger"
              @click="confirmDelete(slotProps.data)"
              v-tooltip.left="'Delete'"
            />
          </div>
        </template>
      </p-column>
    </p-data-table>

    <!-- Create Credential Dialog -->
    <p-dialog
      class="credential-dialog"
      header="Create Credential"
      v-model:visible="showCreateCredentialDialog"
      :modal="true"
      :closable="true"
      @hide="resetCredentialForm"
    >
      <div class="dialog-content">
        <div class="form-field">
          <label for="create-credential-domain">Domain*</label>
          <p-select
            id="create-credential-domain"
            v-model="newCredential.domainId"
            :options="availableDomains"
            optionLabel="name"
            optionValue="id"
            placeholder="Select a domain"
            :filter="true"
            class="domain-select"
            :class="{
              'p-invalid': v$.newCredential.domainId.$invalid && v$.newCredential.domainId.$dirty
            }"
            @blur="v$.newCredential.domainId.$touch()"
          >
            <template #value="slotProps">
              <div class="domain-option" v-if="slotProps.value">
                <i :class="getDomainLogo(slotProps.value)" class="domain-icon"></i>
                <span>{{ getDomainName(slotProps.value) }}</span>
              </div>
              <div v-else>Select a domain</div>
            </template>
            <template #option="slotProps">
              <div class="domain-option">
                <i :class="slotProps.option.logo || 'pi pi-globe'" class="domain-icon"></i>
                <span>{{ slotProps.option.name }}</span>
              </div>
            </template>
          </p-select>
          <small
            class="form-error"
            v-if="v$.newCredential.domainId.$invalid && v$.newCredential.domainId.$dirty"
          >
            {{ v$.newCredential.domainId.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="create-credential-username">Username*</label>
          <p-input-text
            id="create-credential-username"
            v-model="newCredential.username"
            placeholder="Username or email"
            :class="{
              'p-invalid': v$.newCredential.username.$invalid && v$.newCredential.username.$dirty
            }"
            @blur="v$.newCredential.username.$touch()"
          />
          <small
            class="form-error"
            v-if="v$.newCredential.username.$invalid && v$.newCredential.username.$dirty"
          >
            {{ v$.newCredential.username.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="create-credential-email">Email</label>
          <p-input-text
            id="create-credential-email"
            v-model="newCredential.email"
            placeholder="user@example.com"
            :class="{
              'p-invalid': v$.newCredential.email.$invalid && v$.newCredential.email.$dirty
            }"
            @blur="v$.newCredential.email.$touch()"
          />
          <small
            class="form-error"
            v-if="v$.newCredential.email.$invalid && v$.newCredential.email.$dirty"
          >
            {{ v$.newCredential.email.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="create-credential-password">Password*</label>
          <div class="password-field">
            <p-password
              id="create-credential-password"
              v-model="newCredential.password"
              placeholder="Password"
              toggleMask
              :feedback="true"
              :class="{
                'p-invalid': v$.newCredential.password.$invalid && v$.newCredential.password.$dirty
              }"
              @blur="v$.newCredential.password.$touch()"
            />
            <p-button
              icon="pi pi-refresh"
              class="p-button-outlined p-button-secondary"
              @click="generatePassword"
              v-tooltip.bottom="'Generate password'"
            />
          </div>
          <small
            class="form-error"
            v-if="v$.newCredential.password.$invalid && v$.newCredential.password.$dirty"
          >
            {{ v$.newCredential.password.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="create-credential-category">Category</label>
          <p-select
            id="create-credential-category"
            v-model="newCredential.category"
            :options="categoryOptions"
            optionLabel="name"
            optionValue="value"
            placeholder="Select a category"
          />
        </div>

        <div class="form-field">
          <label for="create-credential-notes">Notes</label>
          <p-textarea
            id="create-credential-notes"
            v-model="newCredential.notes"
            placeholder="Additional information"
            autoResize
            rows="3"
            :class="{
              'p-invalid': v$.newCredential.notes.$invalid && v$.newCredential.notes.$dirty
            }"
            @blur="v$.newCredential.notes.$touch()"
          />
          <small
            class="form-error"
            v-if="v$.newCredential.notes.$invalid && v$.newCredential.notes.$dirty"
          >
            {{ v$.newCredential.notes.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field checkbox-field">
          <p-checkbox
            id="create-credential-favorite"
            v-model="newCredential.favorite"
            :binary="true"
          />
          <label for="create-credential-favorite" class="checkbox-label">Mark as favorite</label>
        </div>
      </div>

      <template #footer>
        <p-button label="Cancel" icon="pi pi-times" @click="cancelCreate" class="p-button-text" />
        <p-button
          label="Create"
          icon="pi pi-check"
          @click="createCredential"
          :disabled="!isFormValid"
          :loading="submitting"
        />
      </template>
    </p-dialog>

    <!-- Edit Credential Dialog -->
    <p-dialog
      class="credential-dialog"
      header="Edit Credential"
      v-model:visible="showEditCredentialDialog"
      :modal="true"
      :closable="true"
      @hide="resetEditForm"
    >
      <div class="dialog-content">
        <div class="form-field">
          <label for="edit-credential-domain">Domain*</label>
          <p-select
            id="edit-credential-domain"
            v-model="editCredential.domainId"
            :options="availableDomains"
            optionLabel="name"
            optionValue="id"
            placeholder="Select a domain"
            :filter="true"
            class="domain-select"
            :class="{
              'p-invalid': v$.editCredential.domainId.$invalid && v$.editCredential.domainId.$dirty
            }"
            @blur="v$.editCredential.domainId.$touch()"
          >
            <template #value="slotProps">
              <div class="domain-option" v-if="slotProps.value">
                <i :class="getDomainLogo(slotProps.value)" class="domain-icon"></i>
                <span>{{ getDomainName(slotProps.value) }}</span>
              </div>
              <div v-else>Select a domain</div>
            </template>
            <template #option="slotProps">
              <div class="domain-option">
                <i :class="slotProps.option.logo || 'pi pi-globe'" class="domain-icon"></i>
                <span>{{ slotProps.option.name }}</span>
              </div>
            </template>
          </p-select>
          <small
            class="form-error"
            v-if="v$.editCredential.domainId.$invalid && v$.editCredential.domainId.$dirty"
          >
            {{ v$.editCredential.domainId.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="edit-credential-username">Username*</label>
          <p-input-text
            id="edit-credential-username"
            v-model="editCredential.username"
            placeholder="Username or email"
            :class="{
              'p-invalid': v$.editCredential.username.$invalid && v$.editCredential.username.$dirty
            }"
            @blur="v$.editCredential.username.$touch()"
          />
          <small
            class="form-error"
            v-if="v$.editCredential.username.$invalid && v$.editCredential.username.$dirty"
          >
            {{ v$.editCredential.username.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="edit-credential-email">Email</label>
          <p-input-text
            id="edit-credential-email"
            v-model="editCredential.email"
            placeholder="user@example.com"
            :class="{
              'p-invalid': v$.editCredential.email.$invalid && v$.editCredential.email.$dirty
            }"
            @blur="v$.editCredential.email.$touch()"
          />
          <small
            class="form-error"
            v-if="v$.editCredential.email.$invalid && v$.editCredential.email.$dirty"
          >
            {{ v$.editCredential.email.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="edit-credential-password">Password*</label>
          <div class="password-field">
            <p-password
              id="edit-credential-password"
              v-model="editCredential.password"
              placeholder="Password"
              toggleMask
              :feedback="true"
              :class="{
                'p-invalid':
                  v$.editCredential.password.$invalid && v$.editCredential.password.$dirty
              }"
              @blur="v$.editCredential.password.$touch()"
            />
            <p-button
              icon="pi pi-refresh"
              class="p-button-outlined p-button-secondary"
              @click="generateEditPassword"
              v-tooltip.bottom="'Generate password'"
            />
          </div>
          <small
            class="form-error"
            v-if="v$.editCredential.password.$invalid && v$.editCredential.password.$dirty"
          >
            {{ v$.editCredential.password.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="edit-credential-category">Category</label>
          <p-select
            id="edit-credential-category"
            v-model="editCredential.category"
            :options="categoryOptions"
            optionLabel="name"
            optionValue="value"
            placeholder="Select a category"
            @blur="v$.editCredential.category.$touch()"
          />
        </div>

        <div class="form-field">
          <label for="edit-credential-notes">Notes</label>
          <p-textarea
            id="edit-credential-notes"
            v-model="editCredential.notes"
            placeholder="Additional information"
            autoResize
            rows="3"
            :class="{
              'p-invalid': v$.editCredential.notes.$invalid && v$.editCredential.notes.$dirty
            }"
            @blur="v$.editCredential.notes.$touch()"
          />
          <small
            class="form-error"
            v-if="v$.editCredential.notes.$invalid && v$.editCredential.notes.$dirty"
          >
            {{ v$.editCredential.notes.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field checkbox-field">
          <p-checkbox
            id="edit-credential-favorite"
            v-model="editCredential.favorite"
            :binary="true"
          />
          <label for="edit-credential-favorite" class="checkbox-label">Mark as favorite</label>
        </div>
      </div>

      <template #footer>
        <p-button label="Cancel" icon="pi pi-times" @click="cancelEdit" class="p-button-text" />
        <p-button
          label="Save"
          icon="pi pi-save"
          @click="updateCredential"
          :disabled="!isEditFormValid"
          :loading="submitting"
        />
      </template>
    </p-dialog>

    <!-- View Credential Dialog -->
    <p-dialog
      class="credential-dialog view-dialog"
      header="View Credential"
      v-model:visible="showViewCredentialDialog"
      :modal="true"
      :closable="true"
    >
      <div class="dialog-content">
        <div class="credential-detail">
          <div class="detail-label">Domain:</div>
          <div class="detail-value">{{ viewingCredential.website }}</div>
        </div>

        <div class="credential-detail" v-if="getDomainUrlById(viewingCredential.domainId)">
          <div class="detail-label">URL:</div>
          <div class="detail-value">
            {{ getDomainUrlById(viewingCredential.domainId) }}
            <p-button
              icon="pi pi-external-link"
              class="p-button-text p-button-sm"
              @click="openDomainUrl(getDomainUrlById(viewingCredential.domainId))"
              v-tooltip.bottom="'Open in new tab'"
            />
          </div>
        </div>

        <div class="credential-detail">
          <div class="detail-label">Username:</div>
          <div class="detail-value">
            {{ viewingCredential.username }}
            <p-button
              icon="pi pi-copy"
              class="p-button-text p-button-sm copy-button"
              @click="copyToClipboard(viewingCredential.username)"
              v-tooltip.bottom="'Copy to clipboard'"
            />
          </div>
        </div>

        <div class="credential-detail" v-if="viewingCredential.email">
          <div class="detail-label">Email:</div>
          <div class="detail-value">
            {{ viewingCredential.email }}
            <p-button
              icon="pi pi-copy"
              class="p-button-text p-button-sm copy-button"
              @click="copyToClipboard(viewingCredential.email)"
              v-tooltip.bottom="'Copy to clipboard'"
            />
          </div>
        </div>

        <div class="credential-detail">
          <div class="detail-label">Password:</div>
          <div class="detail-value">
            <span v-if="passwordVisible">{{ viewingCredential.password }}</span>
            <span v-else>••••••••••••</span>
            <p-button
              :icon="passwordVisible ? 'pi pi-eye-slash' : 'pi pi-eye'"
              class="p-button-text p-button-sm"
              @click="togglePasswordVisibility"
              v-tooltip.bottom="passwordVisible ? 'Hide password' : 'Show password'"
            />
            <p-button
              icon="pi pi-copy"
              class="p-button-text p-button-sm copy-button"
              @click="copyAndMarkUsed(viewingCredential.password, viewingCredential.id)"
              v-tooltip.bottom="'Copy to clipboard'"
            />
          </div>
        </div>

        <div class="credential-detail" v-if="viewingCredential.category">
          <div class="detail-label">Category:</div>
          <div class="detail-value">{{ viewingCredential.category }}</div>
        </div>

        <div class="credential-detail" v-if="viewingCredential.notes">
          <div class="detail-label">Notes:</div>
          <div class="detail-value notes-value">{{ viewingCredential.notes }}</div>
        </div>

        <div class="credential-detail">
          <div class="detail-label">Last Updated:</div>
          <div class="detail-value">{{ formatDate(viewingCredential.updatedAt) }}</div>
        </div>

        <div class="credential-detail" v-if="viewingCredential.lastUsed">
          <div class="detail-label">Last Used:</div>
          <div class="detail-value">{{ formatDate(viewingCredential.lastUsed) }}</div>
        </div>
      </div>

      <template #footer>
        <p-button label="Close" icon="pi pi-times" @click="closeViewDialog" class="p-button-text" />
        <p-button
          :label="viewingCredential.favorite ? 'Remove Favorite' : 'Add Favorite'"
          :icon="viewingCredential.favorite ? 'pi pi-star-fill' : 'pi pi-star'"
          :class="{ 'p-button-warning': viewingCredential.favorite }"
          @click="toggleFavoriteFromView"
        />
        <p-button label="Edit" icon="pi pi-pencil" @click="editFromViewDialog" />
      </template>
    </p-dialog>

    <!-- Delete Confirmation -->
    <p-confirm-dialog></p-confirm-dialog>
  </div>
</template>

<script lang="ts">
import {
  CREDENTIAL_ERROR_MESSAGES,
  CREDENTIAL_SUCCESS_MESSAGES,
  DEFAULTS,
  PASSWORD_SETTINGS
} from '@/constants/appConstants'
import { CredentialService } from '@/services/credentialService'
import { DomainService } from '@/services/domainService'
import type { Credential } from '@/services/encryption/credentialEncryptionService'
import type { Domain } from '@/services/encryption/domainEncryptionService'
import { useToastService } from '@/services/toastService'
import { useVuelidate } from '@vuelidate/core'
import { email, helpers, maxLength, required } from '@vuelidate/validators'
import moment from 'moment'
import Tooltip from 'primevue/tooltip'
import { useConfirm } from 'primevue/useconfirm'
import { computed, defineComponent, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Define filter match modes
const FILTER_MATCH_MODES = {
  CONTAINS: 'contains',
  EQUALS: 'equals',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith'
}

export default defineComponent({
  directives: {
    tooltip: Tooltip
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const confirm = useConfirm()
    const { handleError, handleSuccess, handleInfo } = useToastService()

    // Core data
    const vaultId = ref(route.params.vaultId as string)
    const vaultName = ref('')
    const credentials = ref<Credential[]>([])
    const totalLoaded = ref(0)
    const availableDomains = ref<Domain[]>([])

    // UI state
    const loading = ref(false)
    const submitting = ref(false)
    const initialLoadComplete = ref(false)
    const showCreateCredentialDialog = ref(false)
    const showEditCredentialDialog = ref(false)
    const showViewCredentialDialog = ref(false)
    const passwordVisible = ref(false)

    // Pagination
    const first = ref(0)
    const rows = ref(DEFAULTS.PAGE_SIZE)

    // Sorting
    const sortField = ref('updatedAt')
    const sortOrder = ref(-1) // Descending

    // Filtering
    const showFavoritesOnly = ref(false)
    const categoryFilter = ref(null)
    const availableCategories = ref<{ name: string; value: string }[]>([])
    const filters = ref({
      global: { value: null, matchMode: FILTER_MATCH_MODES.CONTAINS }
    })

    // Form validation
    const requiredMsg = 'This field is required'
    const emailValidator = helpers.withMessage('Please enter a valid email address', email)
    const maxLengthMsg = (max: number) => `Maximum ${max} characters allowed`

    // Form data
    const newCredential = reactive({
      username: '',
      email: '',
      password: '',
      notes: '',
      category: '',
      favorite: false,
      domainId: null as string | null
    })

    const editCredential = reactive({
      id: '',
      username: '',
      email: '',
      password: '',
      notes: '',
      category: '',
      favorite: false,
      domainId: null as string | null
    })

    const viewingCredential = reactive({
      id: '',
      website: '',
      domainId: '',
      username: '',
      email: '',
      password: '',
      notes: '',
      category: '',
      favorite: false,
      updatedAt: new Date(),
      lastUsed: undefined as Date | undefined
    })

    // Validation rules
    const rules = {
      newCredential: {
        domainId: {
          required: helpers.withMessage(requiredMsg, required)
        },
        username: {
          required: helpers.withMessage(requiredMsg, required),
          maxLength: helpers.withMessage(maxLengthMsg(100), maxLength(100))
        },
        email: {
          email: emailValidator,
          maxLength: helpers.withMessage(maxLengthMsg(100), maxLength(100))
        },
        password: { required: helpers.withMessage(requiredMsg, required) },
        notes: { maxLength: helpers.withMessage(maxLengthMsg(1000), maxLength(1000)) }
      },
      editCredential: {
        domainId: {
          required: helpers.withMessage(requiredMsg, required)
        },
        username: {
          required: helpers.withMessage(requiredMsg, required),
          maxLength: helpers.withMessage(maxLengthMsg(100), maxLength(100))
        },
        email: {
          email: emailValidator,
          maxLength: helpers.withMessage(maxLengthMsg(100), maxLength(100))
        },
        password: { required: helpers.withMessage(requiredMsg, required) },
        notes: { maxLength: helpers.withMessage(maxLengthMsg(1000), maxLength(1000)) }
      }
    }

    const v$ = useVuelidate(rules, { newCredential, editCredential })

    // Category options
    const categoryOptions = [
      { name: 'Social Media', value: 'Social Media' },
      { name: 'Banking', value: 'Banking' },
      { name: 'Email', value: 'Email' },
      { name: 'Shopping', value: 'Shopping' },
      { name: 'Work', value: 'Work' },
      { name: 'Entertainment', value: 'Entertainment' },
      { name: 'Development', value: 'Development' },
      { name: 'Personal', value: 'Personal' },
      { name: 'Education', value: 'Education' },
      { name: 'Finance', value: 'Finance' },
      { name: 'Travel', value: 'Travel' },
      { name: 'Health', value: 'Health' },
      { name: 'Gaming', value: 'Gaming' },
      { name: 'Communication', value: 'Communication' },
      { name: 'Productivity', value: 'Productivity' },
      { name: 'Cloud Storage', value: 'Cloud Storage' },
      { name: 'Security', value: 'Security' },
      { name: 'Other', value: 'Other' }
    ]

    // Computed properties
    const isFormValid = computed(() => {
      return (
        !v$.value.newCredential.$invalid &&
        newCredential.username &&
        newCredential.password &&
        newCredential.domainId
      )
    })

    const isEditFormValid = computed(() => {
      return (
        !v$.value.editCredential.$invalid &&
        editCredential.username &&
        editCredential.password &&
        editCredential.domainId
      )
    })

    // Filter credentials in the front-end
    const filteredCredentials = computed(() => {
      if (credentials.value.length === 0) {
        return []
      }

      let result = [...credentials.value]

      // Apply global search filter
      const globalFilterValue = filters.value.global.value
      if (globalFilterValue) {
        const search = String(globalFilterValue).toLowerCase()
        result = result.filter(
          (cred) =>
            cred.username?.toLowerCase().includes(search) ||
            cred.email?.toLowerCase().includes(search) ||
            cred.category?.toLowerCase().includes(search) ||
            getDomainName(cred.domainId)?.toLowerCase().includes(search)
        )
      }

      // Apply category filter
      if (categoryFilter.value) {
        result = result.filter((cred) => cred.category === categoryFilter.value)
      }

      // Apply favorites filter
      if (showFavoritesOnly.value) {
        result = result.filter((cred) => cred.favorite)
      }

      return result
    })

    // Load all credentials
    const fetchCredentials = async () => {
      loading.value = true
      initialLoadComplete.value = false

      try {
        const response = await CredentialService.getAllCredentialsForVault(vaultId.value)
        credentials.value = response.credentials || []
        vaultName.value = response.vaultName || 'Vault'
        totalLoaded.value = credentials.value.length

        // Extract unique categories
        const categories = new Set<string>()
        credentials.value.forEach((cred) => {
          if (cred.category) {
            categories.add(cred.category)
          }
        })

        availableCategories.value = Array.from(categories).map((cat) => ({
          name: cat,
          value: cat
        }))

        initialLoadComplete.value = true
      } catch (error) {
        console.error('Failed to fetch credentials:', error)
        handleError(error, CREDENTIAL_ERROR_MESSAGES.FETCH_CREDENTIALS_FAILED)
      } finally {
        loading.value = false
      }
    }

    // Load all domains
    const fetchDomains = async () => {
      try {
        const result = await DomainService.getDomains(0, DEFAULTS.LARGE_PAGE_SIZE)
        availableDomains.value = result.domains || []
      } catch (error) {
        console.error('Failed to fetch domains:', error)
        handleError(error, 'Failed to fetch domains')
      }
    }

    // Event handlers
    const onSortChange = (event: any) => {
      if (event.sortField === 'domain') {
        const sorted = [...credentials.value].sort((a, b) => {
          const domainA = getDomainName(a.domainId) || a.domainName || a.website || ''
          const domainB = getDomainName(b.domainId) || b.domainName || b.website || ''

          return event.sortOrder === 1
            ? domainA.localeCompare(domainB)
            : domainB.localeCompare(domainA)
        })

        credentials.value = sorted
      } else {
        sortField.value = event.sortField
        sortOrder.value = event.sortOrder
      }
    }

    const onPageChange = (event: any) => {
      first.value = event.first
      rows.value = event.rows
    }

    const onFilterChange = (event: any) => {
      filters.value.global.value = event.target.value
      first.value = 0 // Reset to first page when filter changes
    }

    const toggleFavoritesFilter = () => {
      showFavoritesOnly.value = !showFavoritesOnly.value
      first.value = 0 // Reset to first page
    }

    const onCategoryFilterChange = () => {
      first.value = 0 // Reset to first page
    }

    // CRUD operations
    const openCreateCredentialDialog = () => {
      resetCredentialForm()
      showCreateCredentialDialog.value = true
    }

    const createCredential = async () => {
      v$.value.newCredential.$touch()
      if (v$.value.newCredential.$invalid) return

      submitting.value = true
      try {
        const createdCredential = await CredentialService.createNewCredential(vaultId.value, {
          username: newCredential.username,
          email: newCredential.email || undefined,
          password: newCredential.password,
          notes: newCredential.notes || undefined,
          category: newCredential.category || undefined,
          favorite: newCredential.favorite,
          domainId: newCredential.domainId || undefined
        })

        // Add domain information to the newly created credential
        if (createdCredential.domainId) {
          const domain = availableDomains.value.find((d) => d.id === createdCredential.domainId)
          if (domain) {
            createdCredential.domainName = domain.name
            createdCredential.website = domain.name
          }
        }

        credentials.value.unshift(createdCredential)
        totalLoaded.value = credentials.value.length
        showCreateCredentialDialog.value = false
        handleSuccess(CREDENTIAL_SUCCESS_MESSAGES.CREATE_CREDENTIAL_SUCCESS)
      } catch (error) {
        console.error('Failed to create credential:', error)
        handleError(error, CREDENTIAL_ERROR_MESSAGES.CREATE_CREDENTIAL_FAILED)
      } finally {
        submitting.value = false
      }
    }

    const startEditCredential = (credential: Credential) => {
      editCredential.id = credential.id
      editCredential.username = credential.username
      editCredential.email = credential.email || ''
      editCredential.password = credential.password
      editCredential.notes = credential.notes || ''
      editCredential.category = credential.category || ''
      editCredential.favorite = credential.favorite
      editCredential.domainId = credential.domainId || null

      showEditCredentialDialog.value = true
    }

    const updateCredential = async () => {
      v$.value.editCredential.$touch()
      if (v$.value.editCredential.$invalid) return

      submitting.value = true
      try {
        const updatedCredential = await CredentialService.updateExistingCredential(
          vaultId.value,
          editCredential.id,
          {
            username: editCredential.username,
            email: editCredential.email || undefined,
            password: editCredential.password,
            notes: editCredential.notes || undefined,
            category: editCredential.category || undefined,
            favorite: editCredential.favorite,
            domainId: editCredential.domainId || undefined
          }
        )

        // Add domain information to the updated credential
        if (updatedCredential.domainId) {
          const domain = availableDomains.value.find((d) => d.id === updatedCredential.domainId)
          if (domain) {
            updatedCredential.domainName = domain.name
            updatedCredential.website = domain.name
          }
        }

        const index = credentials.value.findIndex((c) => c.id === editCredential.id)
        if (index !== -1) {
          credentials.value[index] = updatedCredential
        }

        // If credential is currently being viewed, update the view as well
        if (viewingCredential.id === updatedCredential.id) {
          Object.assign(viewingCredential, {
            website:
              getDomainName(updatedCredential.domainId) ||
              updatedCredential.website ||
              updatedCredential.domainName ||
              '',
            username: updatedCredential.username,
            email: updatedCredential.email || '',
            password: updatedCredential.password,
            notes: updatedCredential.notes || '',
            category: updatedCredential.category || '',
            favorite: updatedCredential.favorite,
            updatedAt: updatedCredential.updatedAt,
            lastUsed: updatedCredential.lastUsed
          })
        }

        showEditCredentialDialog.value = false
        handleSuccess(CREDENTIAL_SUCCESS_MESSAGES.UPDATE_CREDENTIAL_SUCCESS)
      } catch (error) {
        console.error('Failed to update credential:', error)
        handleError(error, CREDENTIAL_ERROR_MESSAGES.UPDATE_CREDENTIAL_FAILED)
      } finally {
        submitting.value = false
      }
    }

    const viewCredential = (credential: Credential) => {
      viewingCredential.id = credential.id
      viewingCredential.domainId = credential.domainId || ''
      viewingCredential.website =
        getDomainName(credential.domainId) || credential.website || credential.domainName || ''
      viewingCredential.username = credential.username
      viewingCredential.email = credential.email || ''
      viewingCredential.password = credential.password
      viewingCredential.notes = credential.notes || ''
      viewingCredential.category = credential.category || ''
      viewingCredential.favorite = credential.favorite
      viewingCredential.updatedAt = credential.updatedAt
      viewingCredential.lastUsed = credential.lastUsed

      passwordVisible.value = false
      showViewCredentialDialog.value = true
    }

    const togglePasswordVisibility = () => {
      passwordVisible.value = !passwordVisible.value
    }

    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text)
      handleInfo(CREDENTIAL_SUCCESS_MESSAGES.COPY_SUCCESS, 'Copied')
    }

    const copyAndMarkUsed = async (text: string, id: string) => {
      copyToClipboard(text)

      try {
        const updatedCredential = await CredentialService.updateCredentialLastUsed(
          vaultId.value,
          id
        )

        // Update the credential in our list
        const index = credentials.value.findIndex((c) => c.id === id)
        if (index !== -1) {
          credentials.value[index].lastUsed = updatedCredential.lastUsed
        }

        // Update viewing credential if it's the same one
        if (viewingCredential.id === id) {
          viewingCredential.lastUsed = updatedCredential.lastUsed
        }
      } catch (error) {
        console.error('Failed to update last used timestamp:', error)
        handleError(error, CREDENTIAL_ERROR_MESSAGES.UPDATE_LAST_USED_FAILED)
      }
    }

    const toggleFavorite = async (credential: Credential) => {
      try {
        const updatedCredential = await CredentialService.toggleCredentialFavorite(
          vaultId.value,
          credential.id
        )

        // Update the credential in our list
        const index = credentials.value.findIndex((c) => c.id === credential.id)
        if (index !== -1) {
          credentials.value[index].favorite = updatedCredential.favorite
        }

        // Update viewing credential if it's the same one
        if (viewingCredential.id === credential.id) {
          viewingCredential.favorite = updatedCredential.favorite
        }

        handleSuccess(CREDENTIAL_SUCCESS_MESSAGES.TOGGLE_FAVORITE_SUCCESS)
      } catch (error) {
        console.error('Failed to toggle favorite status:', error)
        handleError(error, CREDENTIAL_ERROR_MESSAGES.TOGGLE_FAVORITE_FAILED)
      }
    }

    const toggleFavoriteFromView = async () => {
      await toggleFavorite({ id: viewingCredential.id } as Credential)
    }

    const confirmDelete = (credential: Credential) => {
      confirm.require({
        message: `Are you sure you want to delete credential for "${getDomainName(credential.domainId) || credential.website || credential.domainName || 'this website'}"?`,
        header: 'Delete Credential',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: () => deleteCredential(credential.id)
      })
    }

    const deleteCredential = async (id: string) => {
      try {
        await CredentialService.deleteCredential(vaultId.value, id)
        credentials.value = credentials.value.filter((c) => c.id !== id)
        totalLoaded.value = credentials.value.length

        // Close view dialog if the deleted credential is currently being viewed
        if (viewingCredential.id === id) {
          showViewCredentialDialog.value = false
        }

        handleSuccess(CREDENTIAL_SUCCESS_MESSAGES.DELETE_CREDENTIAL_SUCCESS)
      } catch (error) {
        console.error('Failed to delete credential:', error)
        handleError(error, CREDENTIAL_ERROR_MESSAGES.DELETE_CREDENTIAL_FAILED)
      }
    }

    // Dialog and form management
    const editFromViewDialog = () => {
      showViewCredentialDialog.value = false
      startEditCredential({
        id: viewingCredential.id,
        website: viewingCredential.website,
        username: viewingCredential.username,
        email: viewingCredential.email,
        password: viewingCredential.password,
        notes: viewingCredential.notes,
        category: viewingCredential.category,
        favorite: viewingCredential.favorite,
        domainId: viewingCredential.domainId
      } as Credential)
    }

    const closeViewDialog = () => {
      showViewCredentialDialog.value = false
    }

    const resetCredentialForm = () => {
      newCredential.username = ''
      newCredential.email = ''
      newCredential.password = ''
      newCredential.notes = ''
      newCredential.category = ''
      newCredential.favorite = false
      newCredential.domainId = null
      v$.value.newCredential.$reset()
    }

    const resetEditForm = () => {
      v$.value.editCredential.$reset()
    }

    const cancelCreate = () => {
      resetCredentialForm()
      showCreateCredentialDialog.value = false
    }

    const cancelEdit = () => {
      showEditCredentialDialog.value = false
    }

    const goBackToVaults = () => {
      router.push('/vaults')
    }

    // Password management
    const generatePassword = () => {
      const length = PASSWORD_SETTINGS.DEFAULT_LENGTH
      const charset = PASSWORD_SETTINGS.DEFAULT_CHARSET
      let password = ''

      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length)
        password += charset[randomIndex]
      }

      newCredential.password = password
    }

    const generateEditPassword = () => {
      const length = PASSWORD_SETTINGS.DEFAULT_LENGTH
      const charset = PASSWORD_SETTINGS.DEFAULT_CHARSET
      let password = ''

      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length)
        password += charset[randomIndex]
      }

      editCredential.password = password
    }

    // Helper methods
    const formatDate = (dateString: string | Date) => {
      return moment(dateString).format('MMM D, YYYY')
    }

    const getDomainName = (id: string | null | undefined) => {
      if (!id) return ''
      const domain = availableDomains.value.find((d) => d.id === id)
      return domain?.name || ''
    }

    const getDomainLogo = (id: string) => {
      const domain = availableDomains.value.find((d) => d.id === id)
      return domain?.logo || 'pi pi-globe'
    }

    const getDomainUrlById = (id: string | null) => {
      if (!id) return null
      const domain = availableDomains.value.find((d) => d.id === id)
      return domain?.url || null
    }

    const openDomainUrl = (url: string | null) => {
      if (url) {
        let fullUrl = url
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          fullUrl = 'https://' + url
        }
        window.open(fullUrl, '_blank')
      }
    }

    // Initialize data
    onMounted(async () => {
      await fetchDomains()
      fetchCredentials()
    })

    return {
      // Vault and credential data
      vaultName,
      credentials,
      filteredCredentials,
      totalLoaded,

      // UI state
      loading,
      submitting,
      initialLoadComplete,
      showCreateCredentialDialog,
      showEditCredentialDialog,
      showViewCredentialDialog,
      passwordVisible,

      // Pagination and filtering
      first,
      rows,
      showFavoritesOnly,
      sortField,
      sortOrder,
      filters,
      categoryFilter,
      availableCategories,
      categoryOptions,

      // Form data
      newCredential,
      editCredential,
      viewingCredential,

      // Validation
      v$,
      isFormValid,
      isEditFormValid,

      // CRUD operations
      openCreateCredentialDialog,
      createCredential,
      startEditCredential,
      updateCredential,
      viewCredential,
      confirmDelete,
      deleteCredential,

      // Password management
      togglePasswordVisibility,
      copyToClipboard,
      copyAndMarkUsed,
      generatePassword,
      generateEditPassword,

      // Favorite handling
      toggleFavorite,
      toggleFavoriteFromView,

      // Dialog management
      editFromViewDialog,
      closeViewDialog,
      cancelCreate,
      cancelEdit,

      // Navigation
      goBackToVaults,

      // Helper methods
      formatDate,
      resetCredentialForm,
      resetEditForm,

      // Filter actions
      toggleFavoritesFilter,
      onCategoryFilterChange,
      onFilterChange,

      // Table events
      onSortChange,
      onPageChange,

      // Domain-related helpers
      availableDomains,
      getDomainName,
      getDomainLogo,
      getDomainUrlById,
      openDomainUrl
    }
  }
})
</script>

<style scoped>
.vault-credentials {
  padding: 1rem 2rem;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.back-button {
  color: var(--primary-color);
  padding: 0.25rem;
}

.actions-container {
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 1rem 0 1rem 0;
}

.search-input {
  width: 100%;
  max-width: 300px;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.data-table-container {
  margin-top: 1rem;
}

.dialog-content {
  min-width: 450px;
  padding: 0 1rem;
}

.form-field {
  margin-bottom: 1.5rem;
  width: 100%;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.checkbox-label {
  margin-bottom: 0;
}

.password-field {
  display: flex;
  gap: 0.5rem;
}

.password-field :deep(.p-password) {
  flex-grow: 1;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.favorite-icon {
  cursor: pointer;
  font-size: 1.1rem;
}

/* View credential dialog styling */
.credential-detail {
  margin-bottom: 1rem;
}

.detail-label {
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: var(--text-color-secondary);
}

.detail-value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.notes-value {
  white-space: pre-line;
  align-items: flex-start;
}

.copy-button {
  padding: 0.25rem;
}

/* Table styling */
:deep(.p-column-header-content) {
  justify-content: flex-start;
  padding-left: 1rem;
}

:deep(.p-datatable-tbody > tr > td) {
  text-align: left;
  padding-left: 1rem;
}

:deep(.p-datatable-tbody > tr > td:first-child) {
  text-align: center;
}

:deep(.p-datatable-tbody > tr > td:last-child) {
  text-align: left;
  display: flex;
  gap: 0.5rem;
}

:deep(.p-datatable-tbody > tr) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

/* Additional styles */
.p-inputtext,
.p-select,
.p-textarea,
.domain-select {
  width: 100%;
}

.domain-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.domain-icon {
  font-size: 1.1rem;
}

.form-error {
  color: var(--red-500, #f44336) !important;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

/* Ensure invalid inputs have red border */
:deep(.p-invalid) {
  border-color: var(--red-500, #f44336) !important;
}

.table-header .p-button {
  width: 4.5rem;
  height: 2.5rem;
  padding: 0.5rem;
}
</style>
