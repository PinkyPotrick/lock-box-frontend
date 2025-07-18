<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="domains">
    <p-toast />
    <h2>Manage Your Domains</h2>

    <div class="actions-container">
      <div class="actions">
        <p-button
          label="Add Domain"
          icon="pi pi-plus"
          @click="showCreateDomainDialog = true"
        ></p-button>
      </div>

      <div class="table-header">
        <p-input-text
          v-model="filters.global.value"
          placeholder="Search domains..."
          class="search-input"
          @input="onFilterChange"
        />

        <div class="data-controls">
          <div class="data-status">
            <span v-if="initialLoadComplete">{{ totalLoaded }} domains loaded</span>
            <span v-else>Loading domains...</span>
          </div>
        </div>
      </div>
    </div>

    <p-data-table
      :value="filteredDomains"
      :paginator="true"
      :rows="rows"
      v-model:first="first"
      :rowsPerPageOptions="[5, 10, 20, 50]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      :currentPageReportTemplate="'{first} to {last} of {totalRecords} domains'"
      :loading="loading"
      :emptyMessage="loading ? 'Loading domains...' : 'No domains found'"
      dataKey="id"
    >
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
import { DOMAIN_ERROR_MESSAGES, DOMAIN_SUCCESS_MESSAGES, DEFAULTS } from '@/constants/appConstants'
import { DomainService } from '@/services/domainService'
import { type Domain } from '@/services/encryption/domainEncryptionService'
import { useToastService } from '@/services/toastService'
import { useVuelidate } from '@vuelidate/core'
import { helpers, maxLength, required, url } from '@vuelidate/validators'
import moment from 'moment'
import Tooltip from 'primevue/tooltip'
import { useConfirm } from 'primevue/useconfirm'
import { computed, defineComponent, onMounted, reactive, ref, watch } from 'vue'

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
    const confirm = useConfirm()
    const { handleError, handleSuccess, handleWarning, handleInfo } = useToastService()

    // Domain data
    const allDomains = ref<Domain[]>([])
    const totalLoaded = ref(0)

    // UI state
    const loading = ref(false)
    const submitting = ref(false)
    const initialLoadComplete = ref(false)
    const hasMoreData = ref(true)
    const showCreateDomainDialog = ref(false)
    const showEditDomainDialog = ref(false)
    const showViewDomainDialog = ref(false)

    // Pagination
    const first = ref(0)
    const rows = ref(DEFAULTS.PAGE_SIZE)

    // Filtering
    const filters = ref({
      global: { value: null, matchMode: FILTER_MATCH_MODES.CONTAINS }
    })

    // Computed property for filtered domains
    const filteredDomains = computed(() => {
      const filterValue = filters.value.global.value
      if (!filterValue) {
        return allDomains.value
      }

      const searchLower = String(filterValue).toLowerCase()
      return allDomains.value.filter(
        (domain) =>
          domain.name.toLowerCase().includes(searchLower) ||
          (domain.url && domain.url.toLowerCase().includes(searchLower))
      )
    })

    // Form data
    const newDomain = reactive({
      name: '',
      url: '',
      notes: '',
      logo: 'pi pi-globe'
    })

    const editDomain = reactive({
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
    const requiredMsg = 'This field is required'
    const maxLengthMsg = (max: number) => `Maximum ${max} characters allowed`
    const urlValidator = helpers.withMessage('Please enter a valid URL', url)

    const rules = {
      newDomain: {
        name: {
          required: helpers.withMessage(requiredMsg, required),
          maxLength: helpers.withMessage(maxLengthMsg(50), maxLength(50))
        },
        url: {
          required: helpers.withMessage(requiredMsg, required),
          url: urlValidator,
          maxLength: helpers.withMessage(maxLengthMsg(255), maxLength(255))
        },
        notes: {
          maxLength: helpers.withMessage(maxLengthMsg(1000), maxLength(1000)),
          $autoDirty: true
        }
      },
      editDomain: {
        name: {
          required: helpers.withMessage(requiredMsg, required),
          maxLength: helpers.withMessage(maxLengthMsg(50), maxLength(50))
        },
        url: {
          required: helpers.withMessage(requiredMsg, required),
          url: urlValidator,
          maxLength: helpers.withMessage(maxLengthMsg(255), maxLength(255))
        },
        notes: {
          maxLength: helpers.withMessage(maxLengthMsg(1000), maxLength(1000)),
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

    // Computed properties for form validation
    const isFormValid = computed(() => {
      return !v$.value.newDomain.$invalid && newDomain.name && newDomain.url
    })

    const isEditFormValid = computed(() => {
      return !v$.value.editDomain.$invalid && editDomain.name && editDomain.url
    })

    // Load domains in a single request
    const fetchDomains = async () => {
      loading.value = true
      initialLoadComplete.value = false

      try {
        const result = await DomainService.getDomains(0, DEFAULTS.LARGE_PAGE_SIZE)
        allDomains.value = result.domains
        totalLoaded.value = allDomains.value.length
        hasMoreData.value = false
        initialLoadComplete.value = true
      } catch (error) {
        console.error('Failed to fetch domains:', error)
        handleError(error, DOMAIN_ERROR_MESSAGES.FETCH_DOMAINS_FAILED)
      } finally {
        loading.value = false
      }
    }

    // Event handlers
    const onPageChange = (event: any) => {
      first.value = event.first
      rows.value = event.rows
    }

    const onFilterChange = (event: any) => {
      filters.value.global.value = event.target.value
      first.value = 0
    }

    // CRUD operations
    const createDomain = async () => {
      v$.value.newDomain.$touch()
      if (v$.value.newDomain.$invalid) return

      submitting.value = true
      try {
        const newDomainData = await DomainService.createNewDomain(newDomain)
        allDomains.value.unshift(newDomainData)
        totalLoaded.value = allDomains.value.length
        showCreateDomainDialog.value = false
        handleSuccess(DOMAIN_SUCCESS_MESSAGES.CREATE_DOMAIN_SUCCESS)
      } catch (error) {
        console.error('Failed to create domain:', error)
        handleError(error, DOMAIN_ERROR_MESSAGES.CREATE_DOMAIN_FAILED)
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

        // Update in our loaded arrays
        const index = allDomains.value.findIndex((d) => d.id === updatedDomain.id)
        if (index !== -1) {
          allDomains.value[index] = updatedDomain
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
        handleSuccess(DOMAIN_SUCCESS_MESSAGES.UPDATE_DOMAIN_SUCCESS)
      } catch (error) {
        console.error('Failed to update domain:', error)
        handleError(error, DOMAIN_ERROR_MESSAGES.UPDATE_DOMAIN_FAILED)
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
      viewingDomain.credentialCount = domain.credentialCount || 0
      viewingDomain.createdAt = domain.createdAt
      viewingDomain.updatedAt = domain.updatedAt

      showViewDomainDialog.value = true
    }

    const confirmDelete = (domain: Domain) => {
      if (domain.credentialCount && domain.credentialCount > 0) {
        handleWarning(
          `Domain "${domain.name}" has ${domain.credentialCount} credentials and cannot be deleted.`,
          'Cannot Delete'
        )
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

        // Remove from our loaded arrays
        allDomains.value = allDomains.value.filter((d) => d.id !== id)
        totalLoaded.value = allDomains.value.length

        // Close view dialog if the deleted domain is currently being viewed
        if (viewingDomain.id === id) {
          showViewDomainDialog.value = false
        }

        handleSuccess(DOMAIN_SUCCESS_MESSAGES.DELETE_DOMAIN_SUCCESS)
      } catch (error) {
        console.error('Failed to delete domain:', error)
        handleError(error, DOMAIN_ERROR_MESSAGES.DELETE_DOMAIN_FAILED)
      }
    }

    // Helper functions
    const openUrl = (urlStr: string) => {
      if (!urlStr) return

      // Add protocol if not present
      const url = urlStr.startsWith('http') ? urlStr : `https://${urlStr}`
      window.open(url, '_blank')
    }

    const copyToClipboard = (text: string) => {
      if (!text) return

      navigator.clipboard.writeText(text)
      handleInfo(DOMAIN_SUCCESS_MESSAGES.COPY_SUCCESS, 'Copied')
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

    // Watch for filter changes to reset pagination
    watch(
      () => filters.value.global.value,
      () => {
        first.value = 0
      }
    )

    // Initialize data when component mounts
    onMounted(() => {
      fetchDomains()
    })

    return {
      // Data
      filteredDomains,
      allDomains,
      totalLoaded,

      // UI state
      loading,
      submitting,
      initialLoadComplete,
      hasMoreData,
      showCreateDomainDialog,
      showEditDomainDialog,
      showViewDomainDialog,

      // Pagination and filtering
      first,
      rows,
      filters,

      // Form data
      newDomain,
      editDomain,
      viewingDomain,
      logoOptions,

      // Validation
      v$,
      isFormValid,
      isEditFormValid,

      // Event handlers
      onPageChange,
      onFilterChange,

      // CRUD operations
      createDomain,
      startEditDomain,
      updateDomain,
      viewDomain,
      confirmDelete,
      deleteDomain,

      // Helper methods
      openUrl,
      copyToClipboard,
      cancelCreate,
      cancelEdit,
      editFromViewDialog,
      closeViewDialog,
      formatDate,
      getLogoName,

      // Toast services
      handleError,
      handleSuccess,
      handleWarning,
      handleInfo
    }
  }
})
</script>

<style scoped>
.domains {
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
</style>
