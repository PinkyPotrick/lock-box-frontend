<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="vaults">
    <p-toast />
    <h2>Manage Your Vaults</h2>

    <div class="actions-container">
      <div class="actions">
        <p-button
          label="Add Vault"
          icon="pi pi-plus"
          @click="showCreateVaultDialog = true"
        ></p-button>
      </div>

      <div class="table-header">
        <p-input-text
          v-model="filters.global.value"
          placeholder="Search vaults..."
          class="search-input"
          @input="onFilterChange"
        />

        <div class="data-controls">
          <div class="data-status">
            <span v-if="initialLoadComplete">{{ totalRecords }} vaults loaded</span>
            <span v-else>Loading vaults...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Add this new tooltip component that appears after the table loads -->
    <div class="credentials-tooltip" v-if="showCredentialsTooltip">
      <div class="tooltip-content">
        <i class="pi pi-info-circle" style="margin-right: 0.5rem"></i>
        <span
          >Click the <i class="pi pi-eye" style="margin: 0 0.3rem"></i> icon to view your
          credentials</span
        >
        <p-button
          icon="pi pi-times"
          class="p-button-text p-button-sm p-button-rounded tooltip-close"
          @click="dismissTooltip"
          aria-label="Close tooltip"
        />
      </div>
    </div>

    <p-data-table
      :class="['data-table-container', { 'tooltip-active': showCredentialsTooltip }]"
      :value="filteredVaults"
      :paginator="true"
      :rows="rows"
      v-model:first="first"
      :rowsPerPageOptions="[5, 10, 20, 50]"
      :totalRecords="filteredVaults.length"
      :loading="loading"
      :emptyMessage="loading ? 'Loading vaults...' : 'No vaults found'"
      dataKey="id"
      @page="onPageChange"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      :currentPageReportTemplate="'{first} to {last} of {totalRecords} vaults'"
    >
      <p-column field="icon" header="">
        <template #body="slotProps">
          <i :class="slotProps.data.icon || 'pi pi-lock'"></i>
        </template>
      </p-column>
      <p-column field="name" header="Name" sortable></p-column>
      <p-column field="description" header="Description" sortable></p-column>
      <p-column field="credentialCount" header="Credentials" sortable></p-column>
      <p-column field="updatedAt" header="Last Updated" sortable>
        <template #body="slotProps">
          {{ formatDate(slotProps.data.updatedAt) }}
        </template>
      </p-column>
      <p-column header="Actions">
        <template #body="slotProps">
          <p-button
            icon="pi pi-pencil"
            class="p-button-sm"
            @click="startEditVault(slotProps.data)"
            v-tooltip.top="'Edit'"
          />
          <p-button
            icon="pi pi-eye"
            class="p-button-sm p-button-info credentials-view-btn"
            @click="goToVaultCredentials(slotProps.data.id)"
            v-tooltip.top="'View credentials'"
          />
          <p-button
            icon="pi pi-trash"
            class="p-button-sm p-button-danger"
            @click="confirmDelete(slotProps.data)"
            v-tooltip.left="'Delete'"
          />
        </template>
      </p-column>
    </p-data-table>

    <!-- Create Vault Dialog -->
    <p-dialog
      class="vault-dialog"
      header="Create Vault"
      v-model:visible="showCreateVaultDialog"
      :modal="true"
      :closable="true"
    >
      <div class="dialog-content">
        <div class="form-field">
          <label for="create-vault-name">Vault Name*</label>
          <p-input-text
            id="create-vault-name"
            v-model="newVault.name"
            :class="{ 'p-invalid': v$.newVault.name.$invalid && v$.newVault.name.$dirty }"
            @blur="v$.newVault.name.$touch()"
          />
          <small class="form-error" v-if="v$.newVault.name.$invalid && v$.newVault.name.$dirty">
            {{ v$.newVault.name.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="create-vault-icon">Icon</label>
          <p-select
            id="create-vault-icon"
            v-model="newVault.icon"
            :options="iconOptions"
            optionLabel="name"
            optionValue="value"
          >
            <template #value="">
              <div class="icon-option">
                <i :class="newVault.icon" style="margin-right: 8px"></i>
                <span>{{ getIconName(newVault.icon || 'pi pi-lock') }}</span>
              </div>
            </template>
            <template #option="slotProps">
              <div class="icon-option">
                <i :class="slotProps.option.value"></i>
                <span>{{ slotProps.option.name }}</span>
              </div>
            </template>
          </p-select>
        </div>

        <div class="form-field">
          <label for="create-vault-description">Description</label>
          <p-textarea
            id="create-vault-description"
            v-model="newVault.description"
            autoResize
            rows="5"
            :class="{
              'p-invalid': v$.newVault.description.$invalid && v$.newVault.description.$dirty
            }"
            @blur="v$.newVault.description.$touch()"
          />
          <small
            class="form-error"
            v-if="v$.newVault.description.$invalid && v$.newVault.description.$dirty"
          >
            {{ v$.newVault.description.$errors[0].$message }}
          </small>
        </div>
      </div>

      <template #footer>
        <p-button label="Cancel" icon="pi pi-times" @click="cancelCreate" class="p-button-text" />
        <p-button
          label="Create"
          icon="pi pi-check"
          @click="createVault"
          :disabled="!isFormValid"
          :loading="submitting"
        />
      </template>
    </p-dialog>

    <!-- Edit Vault Dialog -->
    <p-dialog
      class="vault-dialog"
      header="Edit Vault"
      v-model:visible="showEditVaultDialog"
      :modal="true"
      :closable="true"
    >
      <div class="dialog-content">
        <div class="form-field">
          <label for="edit-vault-name">Vault Name*</label>
          <p-input-text
            id="edit-vault-name"
            v-model="editVault.name"
            :class="{ 'p-invalid': v$.editVault.name.$invalid && v$.editVault.name.$dirty }"
            @blur="v$.editVault.name.$touch()"
          />
          <small class="form-error" v-if="v$.editVault.name.$invalid && v$.editVault.name.$dirty">
            {{ v$.editVault.name.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="edit-vault-icon">Icon</label>
          <p-select
            id="edit-vault-icon"
            v-model="editVault.icon"
            :options="iconOptions"
            optionLabel="name"
            optionValue="value"
          >
            <template #value="">
              <div class="icon-option">
                <i :class="editVault.icon" style="margin-right: 8px"></i>
                <span>{{ getIconName(editVault.icon || 'pi pi-lock') }}</span>
              </div>
            </template>
            <template #option="slotProps">
              <div class="icon-option">
                <i :class="slotProps.option.value"></i>
                <span>{{ slotProps.option.name }}</span>
              </div>
            </template>
          </p-select>
        </div>

        <div class="form-field">
          <label for="edit-vault-description">Description</label>
          <p-textarea
            id="edit-vault-description"
            v-model="editVault.description"
            autoResize
            rows="5"
            :class="{
              'p-invalid': v$.editVault.description.$invalid && v$.editVault.description.$dirty
            }"
            @blur="v$.editVault.description.$touch()"
          />
          <small
            class="form-error"
            v-if="v$.editVault.description.$invalid && v$.editVault.description.$dirty"
          >
            {{ v$.editVault.description.$errors[0].$message }}
          </small>
        </div>
      </div>

      <template #footer>
        <p-button label="Cancel" icon="pi pi-times" @click="cancelEdit" class="p-button-text" />
        <p-button
          label="Save"
          icon="pi pi-save"
          @click="updateVault"
          :disabled="!isEditFormValid"
          :loading="submitting"
        />
      </template>
    </p-dialog>

    <!-- Delete Confirmation Dialog -->
    <p-confirm-dialog></p-confirm-dialog>

    <!-- TOTP Verification Dialog -->
    <TOTPOperationDialog
      v-model="showTOTPDialog"
      @verified="handleTOTPVerified"
      @canceled="handleTOTPCancelled"
    />
  </div>
</template>

<script lang="ts">
import TOTPOperationDialog from '@/components/common/TOTPOperationDialog.vue'
import { useTOTPOperation } from '@/composables/useTOTPOperation'
import { DEFAULTS, VAULT_ERROR_MESSAGES, VAULT_SUCCESS_MESSAGES } from '@/constants/appConstants'
import { type Vault } from '@/services/encryption/vaultEncryptionService'
import { useToastService } from '@/services/toastService'
import { VaultService } from '@/services/vaultService'
import { useVuelidate } from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import moment from 'moment'
import Tooltip from 'primevue/tooltip'
import { useConfirm } from 'primevue/useconfirm'
import { computed, defineComponent, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

// Define filter match modes
const FILTER_MATCH_MODES = {
  CONTAINS: 'contains',
  EQUALS: 'equals',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith'
}

interface VaultData {
  name: string
  description?: string
  icon?: string
}

export default defineComponent({
  directives: {
    tooltip: Tooltip
  },
  components: {
    TOTPOperationDialog
  },
  setup() {
    const router = useRouter()
    const confirm = useConfirm()
    const { handleError, handleSuccess } = useToastService()
    const { showTOTPDialog, withTOTPVerification, handleTOTPVerified, handleTOTPCancelled } =
      useTOTPOperation()

    // Vault data
    const vaults = ref<Vault[]>([])
    const totalRecords = ref(0)

    // UI state
    const loading = ref(false)
    const submitting = ref(false)
    const initialLoadComplete = ref(false)
    const showCreateVaultDialog = ref(false)
    const showEditVaultDialog = ref(false)

    // Tooltip state
    const showCredentialsTooltip = ref(false)

    // Pagination
    const first = ref(0)
    const rows = ref(DEFAULTS.PAGE_SIZE)

    // Filtering
    const filters = ref({
      global: { value: null, matchMode: FILTER_MATCH_MODES.CONTAINS }
    })

    // Form data
    const newVault = reactive<VaultData>({
      name: '',
      description: '',
      icon: 'pi pi-lock'
    })

    const editVault = reactive<VaultData & { id?: string }>({
      id: '',
      name: '',
      description: '',
      icon: 'pi pi-lock'
    })

    // Computed property for filtered vaults
    const filteredVaults = computed(() => {
      const filterValue = filters.value.global.value
      if (!filterValue) {
        return vaults.value
      }

      const searchLower = String(filterValue).toLowerCase()
      return vaults.value.filter(
        (vault) =>
          vault.name.toLowerCase().includes(searchLower) ||
          (vault.description && vault.description.toLowerCase().includes(searchLower))
      )
    })

    // Validation rules
    const requiredMsg = 'This field is required'
    const maxLengthMsg = (max: number) => `Maximum ${max} characters allowed`

    const rules = {
      newVault: {
        name: {
          required: helpers.withMessage(requiredMsg, required),
          maxLength: helpers.withMessage(maxLengthMsg(50), maxLength(50))
        },
        description: {
          maxLength: helpers.withMessage(maxLengthMsg(200), maxLength(200)),
          $autoDirty: true
        }
      },
      editVault: {
        name: {
          required: helpers.withMessage(requiredMsg, required),
          maxLength: helpers.withMessage(maxLengthMsg(50), maxLength(50))
        },
        description: {
          maxLength: helpers.withMessage(maxLengthMsg(200), maxLength(200)),
          $autoDirty: true
        }
      }
    }

    const v$ = useVuelidate(rules, { newVault, editVault })

    // Icon options
    const iconOptions = [
      { name: 'Lock', value: 'pi pi-lock' },
      { name: 'Shield', value: 'pi pi-shield' },
      { name: 'Key', value: 'pi pi-key' },
      { name: 'Wallet', value: 'pi pi-wallet' },
      { name: 'Credit Card', value: 'pi pi-credit-card' },
      { name: 'Briefcase', value: 'pi pi-briefcase' },
      { name: 'Database', value: 'pi pi-database' }
    ]

    // Computed properties for form validation
    const isFormValid = computed(() => {
      return !v$.value.newVault.$invalid && newVault.name
    })

    const isEditFormValid = computed(() => {
      return !v$.value.editVault.$invalid && editVault.name
    })

    // Load vaults
    const fetchVaults = async () => {
      loading.value = true
      initialLoadComplete.value = false

      try {
        const result = await VaultService.getVaults(0, DEFAULTS.LARGE_PAGE_SIZE)
        vaults.value = result.vaults
        totalRecords.value = result.totalCount
        initialLoadComplete.value = true
      } catch (error) {
        console.error('Failed to fetch vaults:', error)
        handleError(error, VAULT_ERROR_MESSAGES.FETCH_VAULTS_FAILED)
        vaults.value = []
        totalRecords.value = 0
      } finally {
        loading.value = false
      }
    }

    // Tooltip methods
    const checkTooltipState = () => {
      const tooltipDismissed = localStorage.getItem('credentialsTooltipDismissed') === 'true'
      showCredentialsTooltip.value = !tooltipDismissed && initialLoadComplete.value
    }

    const dismissTooltip = () => {
      showCredentialsTooltip.value = false
      localStorage.setItem('credentialsTooltipDismissed', 'true')
    }

    // Event handlers
    const onPageChange = (event: any) => {
      first.value = event.first
      rows.value = event.rows
    }

    const onFilterChange = (event: any) => {
      filters.value.global.value = event.target.value
      first.value = 0 // Reset to first page when filter changes
    }

    // CRUD operations
    const createVault = async () => {
      v$.value.newVault.$touch()
      if (v$.value.newVault.$invalid) return

      submitting.value = true
      try {
        const newVaultData = await VaultService.createNewVault(newVault)
        vaults.value.unshift(newVaultData)
        totalRecords.value++
        resetNewVault()
        showCreateVaultDialog.value = false
        handleSuccess(VAULT_SUCCESS_MESSAGES.CREATE_VAULT_SUCCESS)
      } catch (error) {
        console.error('Failed to create vault:', error)
        handleError(error, VAULT_ERROR_MESSAGES.CREATE_VAULT_FAILED)
      } finally {
        submitting.value = false
      }
    }

    const startEditVault = (vault: Vault) => {
      editVault.id = vault.id
      editVault.name = vault.name
      editVault.description = vault.description
      editVault.icon = vault.icon
      showEditVaultDialog.value = true
    }

    const updateVault = async () => {
      v$.value.editVault.$touch()
      if (v$.value.editVault.$invalid || !editVault.id) return

      submitting.value = true
      try {
        const updatedVault = await VaultService.updateExistingVault(editVault.id, {
          name: editVault.name,
          description: editVault.description,
          icon: editVault.icon
        })

        const index = vaults.value.findIndex((v) => v.id === updatedVault.id)
        if (index !== -1) {
          vaults.value[index] = updatedVault
        }

        showEditVaultDialog.value = false
        handleSuccess(VAULT_SUCCESS_MESSAGES.UPDATE_VAULT_SUCCESS)
      } catch (error) {
        console.error('Failed to update vault:', error)
        handleError(error, VAULT_ERROR_MESSAGES.UPDATE_VAULT_FAILED)
      } finally {
        submitting.value = false
      }
    }

    const confirmDelete = (vault: Vault) => {
      withTOTPVerification('DELETE_VAULT', () => {
        confirm.require({
          message: `Are you sure you want to delete "${vault.name}"? ${
            vault.credentialCount > 0
              ? `This vault contains ${vault.credentialCount} credential(s).`
              : ''
          }`,
          header: 'Delete Vault',
          icon: 'pi pi-exclamation-triangle',
          acceptClass: 'p-button-danger',
          accept: () => deleteVault(vault.id)
        })
      })
    }

    const deleteVault = async (id: string) => {
      try {
        await VaultService.deleteVault(id)
        vaults.value = vaults.value.filter((v) => v.id !== id)
        totalRecords.value--
        handleSuccess(VAULT_SUCCESS_MESSAGES.DELETE_VAULT_SUCCESS)
      } catch (error) {
        console.error('Failed to delete vault:', error)
        handleError(error, VAULT_ERROR_MESSAGES.DELETE_VAULT_FAILED)
      }
    }

    // Navigation
    const goToVaultCredentials = (vaultId: string) => {
      router.push(`/vaults/${vaultId}/credentials`)
    }

    // Helper methods
    const resetNewVault = () => {
      newVault.name = ''
      newVault.description = ''
      newVault.icon = 'pi pi-lock'
      v$.value.newVault.$reset()
    }

    const cancelCreate = () => {
      resetNewVault()
      showCreateVaultDialog.value = false
    }

    const cancelEdit = () => {
      showEditVaultDialog.value = false
      v$.value.editVault.$reset()
    }

    const formatDate = (dateString: string | Date) => {
      return moment(dateString).format('MMM D, YYYY')
    }

    const getIconName = (iconValue: string) => {
      const option = iconOptions.find((opt) => opt.value === iconValue)
      return option ? option.name : 'Icon'
    }

    // Watch for filter changes to reset pagination
    watch(
      () => filters.value.global.value,
      () => {
        first.value = 0
      }
    )

    // Watch for initial data load to show tooltip
    watch(
      () => initialLoadComplete.value,
      (newVal) => {
        if (newVal && vaults.value.length > 0) {
          setTimeout(checkTooltipState, 500)
        }
      }
    )

    // Initialize data when component mounts
    onMounted(() => {
      fetchVaults()
      if (initialLoadComplete.value) {
        checkTooltipState()
      }
    })

    return {
      // Data
      vaults,
      filteredVaults,
      totalRecords,

      // UI state
      loading,
      submitting,
      initialLoadComplete,
      showCreateVaultDialog,
      showEditVaultDialog,
      showCredentialsTooltip,

      // Pagination and filtering
      first,
      rows,
      filters,

      // Form data
      newVault,
      editVault,
      iconOptions,

      // Validation
      v$,
      isFormValid,
      isEditFormValid,

      // Event handlers
      onPageChange,
      onFilterChange,

      // CRUD operations
      createVault,
      startEditVault,
      updateVault,
      confirmDelete,
      deleteVault,

      // Navigation
      goToVaultCredentials,

      // Tooltip methods
      dismissTooltip,

      // Helper methods
      cancelCreate,
      cancelEdit,
      formatDate,
      getIconName,

      // TOTP dialog
      showTOTPDialog,
      handleTOTPVerified,
      handleTOTPCancelled
    }
  }
})
</script>

<style scoped>
.vaults {
  padding: 1rem 2rem;
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
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  max-width: 300px;
}

.data-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.data-status {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
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

:deep(.p-inputtext),
:deep(.p-textarea) {
  width: 100%;
}

:deep(.p-dialog .p-select) {
  width: 100%;
}

:deep(.form-field .p-select) {
  width: 100%;
}

:deep(.p-textarea) {
  width: 100%;
}

:deep(.p-textarea textarea) {
  width: 100%;
  min-height: 100px;
}

.icon-option {
  display: inline-flex;
  align-items: center;
}

.icon-option i {
  margin-right: 12px;
  font-size: 1.1rem;
}

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

:deep(.p-dialog-content) {
  padding: 1.5rem;
}

:deep(.p-dialog-footer) {
  padding: 1rem 1.5rem;
}

:deep(.p-select-label) {
  display: flex !important;
  align-items: center !important;
}

:deep(.p-select-label i) {
  margin-right: 12px;
}

:deep(.p-select-items .p-select-item) {
  padding: 0.75rem 1rem;
}

:deep(.p-select-item) {
  display: flex;
  align-items: center;
}

:deep(.p-select-panel) {
  min-width: 100%;
}

:deep(.p-select-items-wrapper) {
  padding: 0.25rem 0;
}

:deep(.p-select-item:hover) {
  background-color: rgba(80, 80, 80, 0.2) !important;
}

:deep(.p-select-item:not(:last-child)) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.form-error {
  color: var(--red-500, #f44336) !important;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

:deep(.p-invalid) {
  border-color: var(--red-500, #f44336) !important;
}

/* Add these new styles for the tooltip */
.credentials-tooltip {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
  max-width: 320px;
  animation: fadeIn 0.5s;
}

.tooltip-content {
  display: flex;
  align-items: center;
  background-color: var(--primary-color, #2196f3);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
}

.tooltip-close {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  color: white;
  background-color: var(--primary-color, #2196f3);
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.credentials-view-btn {
  position: relative;
}

.p-datatable-tbody tr:first-child .credentials-view-btn::after {
  content: '';
  position: absolute;
  inset: -4px;
  border: 2px solid var(--primary-color, #2196f3);
  border-radius: 4px;
  animation: pulse 1.5s infinite;
  pointer-events: none;
  opacity: 0.8;
  display: none;
}

.tooltip-active.p-datatable-tbody tr:first-child .credentials-view-btn::after {
  display: block;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(33, 150, 243, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0);
  }
}
</style>
