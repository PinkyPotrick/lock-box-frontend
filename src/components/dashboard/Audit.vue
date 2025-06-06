<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="audit">
    <h2>Audit Logs</h2>

    <div class="filter-container">
      <!-- Operation Type Filter with Label -->
      <div class="filter-item-with-label">
        <label class="filter-label">Operation Type</label>
        <p-select
          v-model="selectedOperationType"
          :options="operationTypeOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All"
          class="filter-item"
        ></p-select>
      </div>

      <!-- Log Level Filter with Label -->
      <div class="filter-item-with-label">
        <label class="filter-label">Log Level</label>
        <p-select
          v-model="selectedLogLevel"
          :options="logLevelOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All"
          class="filter-item"
        ></p-select>
      </div>

      <!-- Start Date Filter with Label -->
      <div class="filter-item-with-label">
        <label class="filter-label">Start Date</label>
        <p-date-picker
          v-model="startDate"
          placeholder="Start Date"
          dateFormat="yy-mm-dd"
          class="filter-item"
        ></p-date-picker>
      </div>

      <!-- End Date Filter with Label -->
      <div class="filter-item-with-label">
        <label class="filter-label">End Date</label>
        <p-date-picker
          v-model="endDate"
          placeholder="End Date"
          dateFormat="yy-mm-dd"
          class="filter-item"
        ></p-date-picker>
      </div>
    </div>

    <!-- Filter and Reset buttons moved to left side -->
    <div class="button-container">
      <div class="filter-actions">
        <p-button class="p-button-sm" @click="applyFilters">
          <i class="pi pi-filter mr-2"></i>
          Filter
        </p-button>
        <p-button class="p-button-sm p-button-secondary" @click="resetFilters">
          <i class="pi pi-refresh mr-2"></i>
          Reset
        </p-button>
      </div>
    </div>

    <p-data-table
      :value="auditLogs"
      :paginator="true"
      :rows="rows"
      v-model:first="first"
      :rowsPerPageOptions="[5, 10, 20, 50]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      :currentPageReportTemplate="'{first} to {last} of {totalRecords} logs'"
      :loading="loading"
      :emptyMessage="loading ? 'Loading audit logs...' : 'No audit logs found'"
      dataKey="id"
      :totalRecords="totalRecords"
      @page="onPageChange"
      v-model:sortField="sortField"
      v-model:sortOrder="sortOrder"
      :lazy="false"
      @sort="onSortChange"
      class="audit-table"
      stripedRows
      responsiveLayout="scroll"
    >
      <p-column field="timestamp" header="Timestamp" :sortable="true">
        <template #body="{ data }">
          {{ formatDateTime(data.timestamp) }}
        </template>
      </p-column>
      <p-column field="actionType" header="Action Type">
        <template #body="{ data }">
          {{ formatActionType(data.actionType) }}
        </template>
      </p-column>
      <p-column field="operationType" header="Operation Type" :sortable="true">
        <template #body="{ data }">
          <p-tag
            v-if="data.operationType"
            :value="data.operationType"
            :severity="getOperationTypeSeverity(data.operationType)"
          />
          <span v-else>-</span>
        </template>
      </p-column>
      <p-column field="logLevel" header="Log Level" :sortable="true">
        <template #body="{ data }">
          <p-tag
            v-if="data.logLevel && data.logLevel !== 'null'"
            :value="data.logLevel"
            :severity="getLogLevelSeverity(data.logLevel)"
          />
          <span v-else>-</span>
        </template>
      </p-column>
      <p-column field="resourceName" header="Resource Name">
        <template #body="{ data }">
          <span :title="data.resourceName">{{ getShortResourceName(data.resourceName) }}</span>
        </template>
      </p-column>
      <p-column field="actionStatus" header="Status">
        <template #body="{ data }">
          {{ data.actionStatus }}
        </template>
      </p-column>
      <p-column header="Details">
        <template #body="{ data }">
          <p-button
            icon="pi pi-eye"
            class="p-button-sm p-button-info"
            @click="viewLogDetails(data)"
            v-tooltip.top="'View details'"
          />
        </template>
      </p-column>
    </p-data-table>

    <!-- Audit Log Details Dialog -->
    <p-dialog
      header="Audit Log Details"
      v-model:visible="showDetailsDialog"
      :modal="true"
      :closable="true"
      class="audit-details-dialog"
      :style="{ width: '700px' }"
    >
      <div v-if="selectedLog" class="details-content">
        <div class="detail-section">
          <h3>General Information</h3>
          <div class="detail-row">
            <div class="detail-label">Timestamp:</div>
            <div class="detail-value">{{ formatDateTime(selectedLog.timestamp) }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Action Type:</div>
            <div class="detail-value">{{ formatActionType(selectedLog.actionType) }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Operation Type:</div>
            <div class="detail-value">
              <p-tag
                v-if="selectedLog.operationType"
                :value="selectedLog.operationType"
                :severity="getOperationTypeSeverity(selectedLog.operationType)"
              />
              <span v-else>-</span>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Log Level:</div>
            <div class="detail-value">
              <p-tag
                v-if="selectedLog.logLevel && selectedLog.logLevel !== null"
                :value="selectedLog.logLevel"
                :severity="getLogLevelSeverity(selectedLog.logLevel)"
              />
              <span v-else>-</span>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Status:</div>
            <div class="detail-value">{{ selectedLog.actionStatus }}</div>
          </div>
        </div>

        <div class="detail-section">
          <h3>Resource Information</h3>
          <div class="detail-row">
            <div class="detail-label">Resource ID:</div>
            <div class="detail-value">{{ selectedLog.resourceId || 'N/A' }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Resource Name:</div>
            <div class="detail-value">{{ selectedLog.resourceName || 'N/A' }}</div>
          </div>
          <div class="detail-row" v-if="selectedLog.additionalInfo">
            <div class="detail-label">Additional Info:</div>
            <div class="detail-value">{{ selectedLog.additionalInfo }}</div>
          </div>
        </div>

        <div class="detail-section">
          <h3>Client Information</h3>
          <div class="detail-row">
            <div class="detail-label">IP Address:</div>
            <div class="detail-value">{{ selectedLog.ipAddress }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Client:</div>
            <div class="detail-value">{{ selectedLog.clientInfo }}</div>
          </div>
          <div class="detail-row" v-if="selectedLog.failureReason">
            <div class="detail-label">Failure Reason:</div>
            <div class="detail-value">{{ selectedLog.failureReason }}</div>
          </div>
        </div>
      </div>
      <div v-else class="details-content">
        <p>Loading log details...</p>
      </div>

      <template #footer>
        <p-button
          label="Close"
          icon="pi pi-times"
          @click="showDetailsDialog = false"
          class="p-button-text"
        />
      </template>
    </p-dialog>
  </div>
</template>

<script lang="ts">
import { AUDIT_ERROR_MESSAGES, DEFAULTS } from '@/constants/appConstants'
import { logLevelOptions } from '@/constants/logLevelOptions'
import { operationTypeOptions } from '@/constants/operationTypeOptions'
import type { AuditLog } from '@/models/auditLog'
import { AuditLogService } from '@/services/auditLogService'
import { useToastService } from '@/services/toastService'
import moment from 'moment'
import Tooltip from 'primevue/tooltip'
import { defineComponent, onMounted, ref } from 'vue'

export default defineComponent({
  directives: {
    tooltip: Tooltip
  },
  setup() {
    const { handleError } = useToastService()

    // Data
    const auditLogs = ref<AuditLog[]>([])
    const totalRecords = ref(0)
    const loading = ref(false)
    const selectedLog = ref<AuditLog | null>(null)
    const showDetailsDialog = ref(false)
    const initialLoadComplete = ref(false)

    // Pagination & Sorting
    const first = ref(0)
    const rows = ref(10)
    const sortField = ref('timestamp')
    const sortOrder = ref(-1) // descending by default
    const currentPage = ref(0)

    // Filters - These are sent directly to backend
    const selectedOperationType = ref('ALL')
    const selectedLogLevel = ref('ALL')
    const startDate = ref<Date | null>(null)
    const endDate = ref<Date | null>(null)

    // Format ISO date string for API
    const formatDateForApi = (date: Date | null): string | undefined => {
      if (!date) return undefined
      return moment(date).format('YYYY-MM-DDTHH:mm:ss')
    }

    // Format date for display
    const formatDateTime = (date: Date | string | any[] | null): string => {
      if (!date) return 'N/A'

      try {
        // If it's already a Date object
        if (date instanceof Date) {
          return moment(date).format('YYYY-MM-DD HH:mm:ss')
        }

        // If it's an array format [year, month, day, hour, minute, second, nanosecond]
        if (Array.isArray(date) && date.length >= 6) {
          const [year, month, day, hour, minute, second] = date
          // JavaScript months are 0-indexed (0=January, 11=December)
          const jsDate = new Date(year, month - 1, day, hour, minute, second)
          return moment(jsDate).format('YYYY-MM-DD HH:mm:ss')
        }

        // If it's a string, parse it
        if (typeof date === 'string') {
          return moment(date).format('YYYY-MM-DD HH:mm:ss')
        }

        console.warn('Unhandled date format:', date)
        return 'Invalid date'
      } catch (error) {
        console.warn('Error formatting date:', date, error)
        return 'Invalid date'
      }
    }

    // Format action type to be more readable
    const formatActionType = (actionType: string): string => {
      if (!actionType || actionType === 'null') return 'N/A'

      // Convert USER_LOGIN to "User Login"
      return actionType
        .split('_')
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ')
    }

    // Get severity class for operation type
    const getOperationTypeSeverity = (operationType: string): string => {
      const severityMap: Record<string, string> = {
        READ: 'info',
        WRITE: 'success',
        UPDATE: 'warning',
        DELETE: 'danger'
      }
      return severityMap[operationType] || 'secondary'
    }

    // Get severity class for log level
    const getLogLevelSeverity = (logLevel: string): string => {
      const severityMap: Record<string, string> = {
        DEBUG: 'secondary',
        INFO: 'info',
        WARNING: 'warning',
        ERROR: 'danger',
        CRITICAL: 'danger'
      }
      return severityMap[logLevel] || 'secondary'
    }

    // Truncate long resource names
    const getShortResourceName = (name: string): string => {
      if (!name || name === 'null') return 'N/A'
      return name.length > 30 ? `${name.substring(0, 30)}...` : name
    }

    // Log debug info about a single audit log entry
    const debugAuditLog = (log: AuditLog): void => {
      console.debug('Audit log entry:', {
        id: log.id,
        timestamp: log.timestamp,
        formattedTimestamp: formatDateTime(log.timestamp),
        operationType: log.operationType,
        logLevel: log.logLevel,
        actionType: log.actionType
      })
    }

    // Load audit logs from backend with filters applied
    const fetchAuditLogs = async () => {
      loading.value = true
      initialLoadComplete.value = false

      try {
        const result = await AuditLogService.getAuditLogs({
          page: 0,
          size: DEFAULTS.LARGE_PAGE_SIZE,
          operationType: selectedOperationType.value,
          level: selectedLogLevel.value,
          startDate: formatDateForApi(startDate.value),
          endDate: formatDateForApi(endDate.value)
        })

        if (result.auditLogs.length > 0) {
          // Debug the first few entries to see if timestamps and other fields are correct
          debugAuditLog(result.auditLogs[0])
        }

        auditLogs.value = result.auditLogs
        totalRecords.value = result.totalCount
        initialLoadComplete.value = true
      } catch (error) {
        handleError(error, AUDIT_ERROR_MESSAGES.FETCH_LOGS_FAILED)
        auditLogs.value = []
        totalRecords.value = 0
      } finally {
        loading.value = false
      }
    }

    // Apply filters by fetching from API
    const applyFilters = () => {
      // Validate date range
      if (startDate.value && endDate.value && startDate.value > endDate.value) {
        handleError(AUDIT_ERROR_MESSAGES.INVALID_DATE_RANGE)
        return
      }

      // Reset pagination when applying filters
      first.value = 0
      currentPage.value = 0

      // Fetch with filters
      fetchAuditLogs()
    }

    // Reset all filters
    const resetFilters = () => {
      selectedOperationType.value = 'ALL'
      selectedLogLevel.value = 'ALL'
      startDate.value = null
      endDate.value = null
      first.value = 0
      currentPage.value = 0

      // Re-fetch with no filters
      fetchAuditLogs()
    }

    // Handle page change - refetch from backend
    const onPageChange = (event: any) => {
      first.value = event.first
      rows.value = event.rows
      currentPage.value = Math.floor(event.first / event.rows)
      fetchAuditLogs()
    }

    // Handle sort change (client-side only for displayed data)
    const onSortChange = (event: any) => {
      sortField.value = event.sortField
      sortOrder.value = event.sortOrder
    }

    // View log details
    const viewLogDetails = (log: AuditLog) => {
      selectedLog.value = log
      showDetailsDialog.value = true
    }

    // Load initial data
    onMounted(() => {
      fetchAuditLogs()
    })

    return {
      // Data
      auditLogs,
      totalRecords,
      loading,
      initialLoadComplete,
      operationTypeOptions,
      logLevelOptions,

      // Filters
      selectedOperationType,
      selectedLogLevel,
      startDate,
      endDate,

      // Pagination & Sorting
      first,
      rows,
      sortField,
      sortOrder,
      currentPage,

      // Dialog
      selectedLog,
      showDetailsDialog,

      // Methods
      formatDateTime,
      formatActionType,
      getOperationTypeSeverity,
      getLogLevelSeverity,
      getShortResourceName,
      fetchAuditLogs,
      applyFilters,
      resetFilters,
      onPageChange,
      onSortChange,
      viewLogDetails
    }
  }
})
</script>

<style scoped>
.audit {
  padding: 2rem;
}

.filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
  background-color: var(--surface-section);
  border-radius: 8px;
}

.button-container {
  display: flex;
  margin-bottom: 1rem;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.filter-item {
  min-width: 200px;
  width: 100%;
}

.filter-item-with-label {
  min-width: 200px;
  width: calc(25% - 0.75rem);
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  margin-left: 0.25rem;
  color: var(--text-color-secondary);
}

:deep(.p-select) {
  width: 100%;
  height: 38px;
}

:deep(.p-date-picker) {
  width: 100%;
}

:deep(.p-paginator-content .p-select) {
  width: 5rem;
  min-width: unset;
}

:deep(.p-select .p-select-label),
:deep(.p-inputtext) {
  padding: 0.5rem 1rem;
  height: 38px;
  display: flex;
  align-items: center;
}

.audit-table {
  background-color: var(--surface-section);
  border-radius: 8px;
}

:deep(.p-datatable-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
}

:deep(.p-tag) {
  font-size: 0.75rem;
}

:deep(.p-datatable thead th) {
  background-color: var(--surface-ground);
  padding: 0.75rem 1rem;
}

:deep(.p-datatable-tbody td) {
  padding: 0.75rem 1rem;
}

.audit-details-dialog {
  max-width: 700px;
}

.details-content {
  padding: 0 1rem;
}

.detail-section {
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--surface-300);
  padding-bottom: 1rem;
}

.detail-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0;
}

.detail-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: var(--text-color);
}

.detail-row {
  display: flex;
  margin-bottom: 0.75rem;
}

.detail-label {
  width: 30%;
  min-width: 120px;
  font-weight: bold;
  color: var(--text-color-secondary);
}

.detail-value {
  flex: 1;
  word-break: break-word;
}

@media (max-width: 768px) {
  .filter-container {
    flex-direction: column;
  }

  .filter-item-with-label {
    width: 100%;
    margin-bottom: 0.5rem;
  }
}
</style>
