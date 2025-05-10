<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="vaults">
    <h2>Manage Your Vaults</h2>
    <div class="actions">
      <p-button
        label="Add Vault"
        icon="pi pi-plus"
        @click="showCreateVaultDialog = true"
      ></p-button>
    </div>

    <p-data-table
      class="data-table-container"
      :value="vaults"
      paginator
      :rows="10"
      :rowsPerPageOptions="[5, 10, 20]"
      :totalRecords="totalRecords"
      :loading="loading"
      :emptyMessage="'No vaults found'"
    >
      <p-column field="icon" header="">
        <template #body="slotProps">
          <i :class="slotProps.data.icon || 'pi pi-lock'"></i>
        </template>
      </p-column>
      <p-column field="name" header="Name"></p-column>
      <p-column field="description" header="Description"></p-column>
      <p-column field="credentialCount" header="Credentials"></p-column>
      <p-column field="updatedAt" header="Last Updated">
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
          />
          <p-button
            icon="pi pi-eye"
            class="p-button-sm p-button-info"
            @click="goToVaultCredentials(slotProps.data.id)"
          />
          <p-button
            icon="pi pi-trash"
            class="p-button-sm p-button-danger"
            @click="confirmDelete(slotProps.data)"
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
          />
          <small class="p-error" v-if="v$.newVault.name.$invalid && v$.newVault.name.$dirty">
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
          />
          <small
            class="p-error"
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
          />
          <small class="p-error" v-if="v$.editVault.name.$invalid && v$.editVault.name.$dirty">
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
          />
          <small
            class="p-error"
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

    <!-- Delete Confirmation -->
    <p-confirm-dialog></p-confirm-dialog>
  </div>
</template>

<script lang="ts">
import { type Vault } from '@/services/encryption/vaultEncryptionService'
import { VaultService } from '@/services/vaultService'
import { useVuelidate } from '@vuelidate/core'
import { maxLength, required } from '@vuelidate/validators'
import moment from 'moment'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { defineComponent, onMounted, reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'

interface VaultData {
  name: string
  description?: string
  icon?: string
}

export default defineComponent({
  setup() {
    const router = useRouter()
    const confirm = useConfirm()
    const toast = useToast()

    // State
    const vaults = ref<Vault[]>([])
    const totalRecords = ref(0)
    const loading = ref(false)
    const submitting = ref(false)
    const showCreateVaultDialog = ref(false)
    const showEditVaultDialog = ref(false)

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

    // Validation rules
    const rules = {
      newVault: {
        name: { required, maxLength: maxLength(50) },
        description: {
          maxLength: maxLength(200),
          $autoDirty: true
        }
      },
      editVault: {
        name: { required, maxLength: maxLength(50) },
        description: {
          maxLength: maxLength(200),
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

    const isFormValid = computed(() => {
      return (
        newVault.name &&
        newVault.name.length <= 50 &&
        (!newVault.description || newVault.description.length <= 200)
      )
    })

    const isEditFormValid = computed(() => {
      return (
        editVault.name &&
        editVault.name.length <= 50 &&
        (!editVault.description || editVault.description.length <= 200)
      )
    })

    // Methods
    const fetchVaults = async (page = 0, size = 10) => {
      loading.value = true
      try {
        const result = await VaultService.getVaults(page, size)
        vaults.value = result.vaults
        totalRecords.value = result.totalCount
      } catch (error) {
        console.error('Failed to fetch vaults:', error)
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load vaults',
          life: 3000
        })
        vaults.value = []
        totalRecords.value = 0
      } finally {
        loading.value = false
      }
    }

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
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Vault created successfully',
          life: 3000
        })
      } catch (error) {
        console.error('Failed to create vault:', error)
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create vault',
          life: 3000
        })
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
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Vault updated successfully',
          life: 3000
        })
      } catch (error) {
        console.error('Failed to update vault:', error)
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update vault',
          life: 3000
        })
      } finally {
        submitting.value = false
      }
    }

    const confirmDelete = (vault: Vault) => {
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
    }

    const deleteVault = async (id: string) => {
      try {
        await VaultService.deleteVault(id)
        vaults.value = vaults.value.filter((v) => v.id !== id)
        totalRecords.value--
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Vault deleted successfully',
          life: 3000
        })
      } catch (error) {
        console.error('Failed to delete vault:', error)
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete vault',
          life: 3000
        })
      }
    }

    const goToVaultCredentials = (vaultId: string) => {
      router.push(`/vaults/${vaultId}/credentials`)
    }

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

    onMounted(() => {
      fetchVaults()
    })

    return {
      vaults,
      totalRecords,
      loading,
      submitting,
      showCreateVaultDialog,
      showEditVaultDialog,
      newVault,
      editVault,
      iconOptions,
      v$,
      isFormValid,
      isEditFormValid,
      createVault,
      startEditVault,
      updateVault,
      confirmDelete,
      deleteVault,
      goToVaultCredentials,
      cancelCreate,
      cancelEdit,
      formatDate,
      getIconName
    }
  }
})
</script>

<style scoped>
.vaults {
  padding: 1rem 2rem;
}

.actions {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-end;
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

.p-inputtext,
.p-select,
.p-textarea {
  width: 100%;
}

/* Ensure textarea expands properly */
:deep(.p-textarea) {
  width: 100%;
}

:deep(.p-textarea textarea) {
  width: 100%;
  min-height: 100px;
}

.p-button {
  margin-right: 0.5rem;
}

/* Fix icon display in dropdown */
.icon-option {
  display: inline-flex;
  align-items: center;
}

/* Add spacing between icon and text in dropdown options */
.icon-option i {
  margin-right: 12px;
  font-size: 1.1rem;
}

:deep(.p-datatable-wrapper) {
  margin-top: 1rem;
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

/* Dialog styling */
:deep(.p-dialog-content) {
  padding: 1.5rem;
}

:deep(.p-dialog-footer) {
  padding: 1rem 1.5rem;
}

/* Select component styling */
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
</style>
```
