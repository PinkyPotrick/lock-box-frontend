<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="domains">
    <h2>Manage Your Domains</h2>
    <div class="actions">
      <p-button
        label="Add Domain"
        icon="pi pi-plus"
        @click="showCreateDomainDialog = true"
      ></p-button>
    </div>

    <p-data-table
      class="data-table-container"
      :value="domains"
      :filters="filters"
      paginator
      :rows="rows"
      :rowsPerPageOptions="[5, 10, 20]"
      :totalRecords="totalRecords"
      :loading="loading"
      :emptyMessage="'No domains found'"
      v-model:sortField="sortField"
      v-model:sortOrder="sortOrder"
      @sort="onSort"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      @page="onRowsPerPageChange"
    >
      <template #header>
        <div class="table-header">
          <p-input-text
            v-model="filters.global.value"
            placeholder="Search domains..."
            class="search-input"
          />
        </div>
      </template>

      <p-column field="logo" header="">
        <template #body="slotProps">
          <i :class="slotProps.data.logo || 'pi pi-globe'"></i>
        </template>
      </p-column>
      <p-column field="name" header="Name" sortable></p-column>
      <p-column field="url" header="URL" sortable></p-column>
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
            @click="startEditDomain(slotProps.data)"
            v-tooltip.top="'Edit'"
          />
          <p-button
            icon="pi pi-eye"
            class="p-button-sm p-button-info"
            @click="viewDomain(slotProps.data)"
            v-tooltip.top="'View details'"
          />
          <p-button
            v-if="slotProps.data.credentialCount === 0"
            icon="pi pi-trash"
            class="p-button-sm p-button-danger"
            @click="confirmDelete(slotProps.data)"
            v-tooltip.left="'Delete'"
          />
          <p-button
            v-else
            icon="pi pi-lock"
            class="p-button-sm p-button-secondary"
            disabled
            v-tooltip.left="'Cannot delete - has credentials'"
          />
        </template>
      </p-column>
    </p-data-table>

    <!-- Create Domain Dialog -->
    <p-dialog
      class="domain-dialog"
      header="Create Domain"
      v-model:visible="showCreateDomainDialog"
      :modal="true"
      :closable="true"
    >
      <div class="dialog-content">
        <div class="form-field">
          <label for="create-domain-name">Domain Name*</label>
          <p-input-text
            id="create-domain-name"
            v-model="newDomain.name"
            :class="{ 'p-invalid': v$.newDomain.name.$invalid && v$.newDomain.name.$dirty }"
            @blur="v$.newDomain.name.$touch()"
          />
          <small class="form-error" v-if="v$.newDomain.name.$invalid && v$.newDomain.name.$dirty">
            {{ v$.newDomain.name.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="create-domain-url">Domain URL*</label>
          <p-input-text
            id="create-domain-url"
            v-model="newDomain.url"
            :class="{ 'p-invalid': v$.newDomain.url.$invalid && v$.newDomain.url.$dirty }"
            @blur="v$.newDomain.url.$touch()"
          />
          <small class="form-error" v-if="v$.newDomain.url.$invalid && v$.newDomain.url.$dirty">
            {{ v$.newDomain.url.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="create-domain-logo">Logo</label>
          <p-select
            id="create-domain-logo"
            v-model="newDomain.logo"
            :options="logoOptions"
            optionLabel="name"
            optionValue="value"
          >
            <template #value="">
              <div class="icon-option">
                <i :class="newDomain.logo" style="margin-right: 8px"></i>
                <span>{{ getLogoName(newDomain.logo || 'pi pi-globe') }}</span>
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
          <label for="create-domain-notes">Notes</label>
          <p-textarea
            id="create-domain-notes"
            v-model="newDomain.notes"
            autoResize
            rows="5"
            :class="{
              'p-invalid': v$.newDomain.notes.$invalid && v$.newDomain.notes.$dirty
            }"
            @blur="v$.newDomain.notes.$touch()"
          />
          <small class="form-error" v-if="v$.newDomain.notes.$invalid && v$.newDomain.notes.$dirty">
            {{ v$.newDomain.notes.$errors[0].$message }}
          </small>
        </div>
      </div>

      <template #footer>
        <p-button label="Cancel" icon="pi pi-times" @click="cancelCreate" class="p-button-text" />
        <p-button
          label="Create"
          icon="pi pi-check"
          @click="createDomain"
          :disabled="!isFormValid"
          :loading="submitting"
        />
      </template>
    </p-dialog>

    <!-- Edit Domain Dialog -->
    <p-dialog
      class="domain-dialog"
      header="Edit Domain"
      v-model:visible="showEditDomainDialog"
      :modal="true"
      :closable="true"
    >
      <div class="dialog-content">
        <div class="form-field">
          <label for="edit-domain-name">Domain Name*</label>
          <p-input-text
            id="edit-domain-name"
            v-model="editDomain.name"
            :class="{ 'p-invalid': v$.editDomain.name.$invalid && v$.editDomain.name.$dirty }"
            @blur="v$.editDomain.name.$touch()"
          />
          <small class="form-error" v-if="v$.editDomain.name.$invalid && v$.editDomain.name.$dirty">
            {{ v$.editDomain.name.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="edit-domain-url">Domain URL*</label>
          <p-input-text
            id="edit-domain-url"
            v-model="editDomain.url"
            :class="{ 'p-invalid': v$.editDomain.url.$invalid && v$.editDomain.url.$dirty }"
            @blur="v$.editDomain.url.$touch()"
          />
          <small class="form-error" v-if="v$.editDomain.url.$invalid && v$.editDomain.url.$dirty">
            {{ v$.editDomain.url.$errors[0].$message }}
          </small>
        </div>

        <div class="form-field">
          <label for="edit-domain-logo">Logo</label>
          <p-select
            id="edit-domain-logo"
            v-model="editDomain.logo"
            :options="logoOptions"
            optionLabel="name"
            optionValue="value"
          >
            <template #value="">
              <div class="icon-option">
                <i :class="editDomain.logo" style="margin-right: 8px"></i>
                <span>{{ getLogoName(editDomain.logo || 'pi pi-globe') }}</span>
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
          <label for="edit-domain-notes">Notes</label>
          <p-textarea
            id="edit-domain-notes"
            v-model="editDomain.notes"
            autoResize
            rows="5"
            :class="{
              'p-invalid': v$.editDomain.notes.$invalid && v$.editDomain.notes.$dirty
            }"
            @blur="v$.editDomain.notes.$touch()"
          />
          <small
            class="form-error"
            v-if="v$.editDomain.notes.$invalid && v$.editDomain.notes.$dirty"
          >
            {{ v$.editDomain.notes.$errors[0].$message }}
          </small>
        </div>
      </div>

      <template #footer>
        <p-button label="Cancel" icon="pi pi-times" @click="cancelEdit" class="p-button-text" />
        <p-button
          label="Save"
          icon="pi pi-save"
          @click="updateDomain"
          :disabled="!isEditFormValid"
          :loading="submitting"
        />
      </template>
    </p-dialog>

    <!-- View Domain Dialog -->
    <p-dialog
      class="domain-dialog view-dialog"
      header="View Domain"
      v-model:visible="showViewDomainDialog"
      :modal="true"
      :closable="true"
    >
      <div class="dialog-content">
        <div class="domain-detail">
          <div class="detail-label">Name:</div>
          <div class="detail-value">{{ viewingDomain.name }}</div>
        </div>

        <div class="domain-detail">
          <div class="detail-label">URL:</div>
          <div class="detail-value flex-align-center">
            {{ viewingDomain.url }}
            <p-button
              icon="pi pi-external-link"
              class="p-button-text p-button-sm"
              @click="openUrl(viewingDomain.url)"
              v-tooltip.bottom="'Open in new tab'"
            />
            <p-button
              icon="pi pi-copy"
              class="p-button-text p-button-sm copy-button"
              @click="copyToClipboard(viewingDomain.url)"
              v-tooltip.bottom="'Copy to clipboard'"
            />
          </div>
        </div>

        <div class="domain-detail" v-if="viewingDomain.notes">
          <div class="detail-label">Notes:</div>
          <div class="detail-value notes-value">{{ viewingDomain.notes }}</div>
        </div>

        <div class="domain-detail">
          <div class="detail-label">Created:</div>
          <div class="detail-value">{{ formatDate(viewingDomain.createdAt) }}</div>
        </div>

        <div class="domain-detail">
          <div class="detail-label">Last Updated:</div>
          <div class="detail-value">{{ formatDate(viewingDomain.updatedAt) }}</div>
        </div>

        <div class="domain-detail">
          <div class="detail-label">Credentials:</div>
          <div class="detail-value">{{ viewingDomain.credentialCount }}</div>
        </div>
      </div>

      <template #footer>
        <p-button label="Close" icon="pi pi-times" @click="closeViewDialog" class="p-button-text" />
        <p-button label="Edit" icon="pi pi-pencil" @click="editFromViewDialog" />
      </template>
    </p-dialog>

    <!-- Delete Confirmation -->
    <p-confirm-dialog></p-confirm-dialog>
  </div>
</template>

<script lang="ts">
import { DomainService } from '@/services/domainService'
import { type Domain } from '@/services/encryption/domainEncryptionService'
import { useVuelidate } from '@vuelidate/core'
import { helpers, maxLength, required, url } from '@vuelidate/validators'
import moment from 'moment'
import Tooltip from 'primevue/tooltip'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { computed, defineComponent, onMounted, reactive, ref } from 'vue'

// Define our own filter match modes
const FILTER_MATCH_MODES = {
  CONTAINS: 'contains',
  EQUALS: 'equals',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith'
}

interface DomainData {
  name: string
  url?: string
  notes?: string
  logo?: string
}

export default defineComponent({
  directives: {
    tooltip: Tooltip
  },
  setup() {
    const confirm = useConfirm()
    const toast = useToast()

    // State
    const domains = ref<Domain[]>([])
    const totalRecords = ref(0)
    const loading = ref(false)
    const submitting = ref(false)
    const showCreateDomainDialog = ref(false)
    const showEditDomainDialog = ref(false)
    const showViewDomainDialog = ref(false)

    // Sort and filter
    const sortField = ref('name')
    const sortOrder = ref(1) // Ascending
    const filters = ref({
      global: { value: null, matchMode: FILTER_MATCH_MODES.CONTAINS }
    })

    // Add a reactive reference for rows per page
    const rows = ref(10)

    // Form data
    const newDomain = reactive<DomainData>({
      name: '',
      url: '',
      notes: '',
      logo: 'pi pi-globe'
    })

    const editDomain = reactive<DomainData & { id?: string }>({
      id: '',
      name: '',
      url: '',
      notes: '',
      logo: 'pi pi-globe'
    })

    const viewingDomain = reactive({
      id: '',
      name: '',
      url: '',
      notes: '',
      logo: 'pi pi-globe',
      credentialCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Validation rules
    const urlValidator = helpers.withMessage('Please enter a valid URL', url)

    const rules = {
      newDomain: {
        name: {
          required: helpers.withMessage('Domain name is required', required),
          maxLength: helpers.withMessage('Name cannot exceed 50 characters', maxLength(50))
        },
        url: {
          required: helpers.withMessage('URL is required', required),
          url: urlValidator,
          maxLength: helpers.withMessage('URL cannot exceed 255 characters', maxLength(255))
        },
        notes: {
          maxLength: helpers.withMessage('Notes cannot exceed 1000 characters', maxLength(1000)),
          $autoDirty: true
        }
      },
      editDomain: {
        name: {
          required: helpers.withMessage('Domain name is required', required),
          maxLength: helpers.withMessage('Name cannot exceed 50 characters', maxLength(50))
        },
        url: {
          required: helpers.withMessage('URL is required', required),
          url: urlValidator,
          maxLength: helpers.withMessage('URL cannot exceed 255 characters', maxLength(255))
        },
        notes: {
          maxLength: helpers.withMessage('Notes cannot exceed 1000 characters', maxLength(1000)),
          $autoDirty: true
        }
      }
    }

    const v$ = useVuelidate(rules, { newDomain, editDomain })

    // Logo options
    const logoOptions = [
      { name: 'Globe', value: 'pi pi-globe' },
      { name: 'Desktop', value: 'pi pi-desktop' },
      { name: 'Wallet', value: 'pi pi-wallet' },
      { name: 'Shopping Bag', value: 'pi pi-shopping-bag' },
      { name: 'Briefcase', value: 'pi pi-briefcase' },
      { name: 'Cloud', value: 'pi pi-cloud' },
      { name: 'Server', value: 'pi pi-server' },
      { name: 'Database', value: 'pi pi-database' }
    ]

    const isFormValid = computed(() => {
      return (
        newDomain.name &&
        newDomain.name.length <= 50 &&
        newDomain.url &&
        (!newDomain.notes || newDomain.notes.length <= 1000)
      )
    })

    const isEditFormValid = computed(() => {
      return (
        editDomain.name &&
        editDomain.name.length <= 50 &&
        editDomain.url &&
        (!editDomain.notes || editDomain.notes.length <= 1000)
      )
    })

    // Methods
    const fetchDomains = async (page = 0) => {
      loading.value = true
      try {
        const result = await DomainService.getDomains(
          page,
          rows.value, // Use the reactive rows value
          sortField.value,
          sortOrder.value === 1 ? 'asc' : 'desc'
        )
        domains.value = result.domains
        totalRecords.value = result.totalCount
      } catch (error) {
        console.error('Failed to fetch domains:', error)
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load domains',
          life: 3000
        })
        domains.value = []
        totalRecords.value = 0
      } finally {
        loading.value = false
      }
    }

    const onSort = () => {
      fetchDomains()
    }

    // Add handler for rows per page change
    const onRowsPerPageChange = (event: { rows: number }) => {
      rows.value = event.rows
      fetchDomains(0) // Reset to first page when changing page size
    }

    const createDomain = async () => {
      v$.value.newDomain.$touch()
      if (v$.value.newDomain.$invalid) return

      submitting.value = true
      try {
        const newDomainData = await DomainService.createNewDomain(newDomain)
        domains.value.unshift(newDomainData)
        totalRecords.value++
        resetNewDomain()
        showCreateDomainDialog.value = false
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Domain created successfully',
          life: 3000
        })
      } catch (error) {
        console.error('Failed to create domain:', error)
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create domain',
          life: 3000
        })
      } finally {
        submitting.value = false
      }
    }

    const startEditDomain = (domain: Domain) => {
      editDomain.id = domain.id
      editDomain.name = domain.name
      editDomain.url = domain.url || ''
      editDomain.notes = domain.notes || ''
      editDomain.logo = domain.logo || 'pi pi-globe'
      showEditDomainDialog.value = true
    }

    const updateDomain = async () => {
      v$.value.editDomain.$touch()
      if (v$.value.editDomain.$invalid || !editDomain.id) return

      submitting.value = true
      try {
        const updatedDomain = await DomainService.updateExistingDomain(editDomain.id, {
          name: editDomain.name,
          url: editDomain.url,
          notes: editDomain.notes,
          logo: editDomain.logo
        })

        const index = domains.value.findIndex((d) => d.id === updatedDomain.id)
        if (index !== -1) {
          domains.value[index] = updatedDomain
        }

        // If domain is currently being viewed, update the view as well
        if (viewingDomain.id === updatedDomain.id) {
          Object.assign(viewingDomain, {
            name: updatedDomain.name,
            url: updatedDomain.url || '',
            notes: updatedDomain.notes || '',
            logo: updatedDomain.logo || 'pi pi-globe',
            updatedAt: updatedDomain.updatedAt
          })
        }

        showEditDomainDialog.value = false
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Domain updated successfully',
          life: 3000
        })
      } catch (error) {
        console.error('Failed to update domain:', error)
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update domain',
          life: 3000
        })
      } finally {
        submitting.value = false
      }
    }

    const viewDomain = (domain: Domain) => {
      viewingDomain.id = domain.id
      viewingDomain.name = domain.name
      viewingDomain.url = domain.url || ''
      viewingDomain.notes = domain.notes || ''
      viewingDomain.logo = domain.logo || 'pi pi-globe'
      viewingDomain.credentialCount = domain.credentialCount
      viewingDomain.createdAt = domain.createdAt
      viewingDomain.updatedAt = domain.updatedAt

      showViewDomainDialog.value = true
    }

    const confirmDelete = (domain: Domain) => {
      if (domain.credentialCount > 0) {
        toast.add({
          severity: 'warn',
          summary: 'Cannot Delete',
          detail: `Domain "${domain.name}" has ${domain.credentialCount} credentials and cannot be deleted.`,
          life: 3000
        })
        return
      }

      confirm.require({
        message: `Are you sure you want to delete the domain "${domain.name}"?`,
        header: 'Delete Domain',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: () => deleteDomain(domain.id)
      })
    }

    const deleteDomain = async (id: string) => {
      try {
        await DomainService.deleteDomain(id)
        domains.value = domains.value.filter((d) => d.id !== id)
        totalRecords.value--

        // Close view dialog if the deleted domain is currently being viewed
        if (viewingDomain.id === id) {
          showViewDomainDialog.value = false
        }

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Domain deleted successfully',
          life: 3000
        })
      } catch (error) {
        console.error('Failed to delete domain:', error)
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete domain',
          life: 3000
        })
      }
    }

    const openUrl = (urlStr: string) => {
      if (!urlStr) return

      // Add protocol if not present
      const url = urlStr.startsWith('http') ? urlStr : `https://${urlStr}`
      window.open(url, '_blank')
    }

    const copyToClipboard = (text: string) => {
      if (!text) return

      navigator.clipboard.writeText(text)
      toast.add({
        severity: 'info',
        summary: 'Copied',
        detail: 'Copied to clipboard',
        life: 1500
      })
    }

    const resetNewDomain = () => {
      newDomain.name = ''
      newDomain.url = ''
      newDomain.notes = ''
      newDomain.logo = 'pi pi-globe'
      v$.value.newDomain.$reset()
    }

    const cancelCreate = () => {
      resetNewDomain()
      showCreateDomainDialog.value = false
    }

    const cancelEdit = () => {
      showEditDomainDialog.value = false
      v$.value.editDomain.$reset()
    }

    const editFromViewDialog = () => {
      showViewDomainDialog.value = false
      startEditDomain({
        id: viewingDomain.id,
        userId: '',
        name: viewingDomain.name,
        url: viewingDomain.url,
        notes: viewingDomain.notes,
        logo: viewingDomain.logo,
        credentialCount: viewingDomain.credentialCount,
        createdAt: viewingDomain.createdAt,
        updatedAt: viewingDomain.updatedAt
      })
    }

    const closeViewDialog = () => {
      showViewDomainDialog.value = false
    }

    const formatDate = (dateString: string | Date) => {
      return moment(dateString).format('MMM D, YYYY')
    }

    const getLogoName = (logoValue: string) => {
      const option = logoOptions.find((opt) => opt.value === logoValue)
      return option ? option.name : 'Logo'
    }

    onMounted(() => {
      fetchDomains()
    })

    return {
      domains,
      totalRecords,
      loading,
      submitting,
      showCreateDomainDialog,
      showEditDomainDialog,
      showViewDomainDialog,
      sortField,
      sortOrder,
      filters,
      rows,
      newDomain,
      editDomain,
      viewingDomain,
      logoOptions,
      v$,
      isFormValid,
      isEditFormValid,
      fetchDomains,
      createDomain,
      startEditDomain,
      updateDomain,
      viewDomain,
      confirmDelete,
      deleteDomain,
      onSort,
      onRowsPerPageChange,
      openUrl,
      copyToClipboard,
      cancelCreate,
      cancelEdit,
      editFromViewDialog,
      closeViewDialog,
      formatDate,
      getLogoName
    }
  }
})
</script>

<style scoped>
.domains {
  padding: 1rem 2rem;
}

.actions {
  margin-bottom: 1rem;
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

/* Ensure inputs expand properly */
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

/* Domain detail view styling */
.domain-detail {
  margin-bottom: 1rem;
}

.detail-label {
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: var(--text-color-secondary);
}

.detail-value {
  display: flex;
  word-break: break-all;
}

.flex-align-center {
  align-items: center;
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

/* Add specific styling for form error messages */
.form-error {
  color: var(--red-500, #f44336) !important;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

/* Add a style to highlight invalid inputs */
:deep(.p-invalid) {
  border-color: var(--red-500, #f44336) !important;
}

/* Ensure error messages transition smoothly */
.form-error {
  transition: all 0.2s ease;
  opacity: 1;
}
</style>
```
