<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="audit">
    <p-toast />
    <h2>Audit Logs</h2>

    <div class="filter-container">
      <p-select
        v-model="selectedOperationType"
        :options="operationTypeOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Filter by Operation"
        class="filter-item"
      ></p-select>

      <p-select
        v-model="selectedLogLevel"
        :options="logLevelOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Filter by Level"
        class="filter-item"
      ></p-select>

      <p-date-picker
        v-model="startDate"
        placeholder="Start Date"
        dateFormat="yy-mm-dd"
        class="filter-item"
        :showTime="true"
        hourFormat="24"
      ></p-date-picker>

      <p-date-picker
        v-model="endDate"
        placeholder="End Date"
        dateFormat="yy-mm-dd"
        class="filter-item"
        :showTime="true"
        hourFormat="24"
      ></p-date-picker>

      <div class="filter-actions">
        <p-button label="Filter" icon="pi pi-filter" @click="applyFilters"></p-button>
        <p-button
          label="Reset"
          icon="pi pi-refresh"
          class="p-button-secondary"
          @click="resetFilters"
        ></p-button>
      </div>
    </div>

    <p-data-table
      :value="auditLogs"
      :paginator="true"
      :rows="pageSize"
      v-model:first="first"
      :rowsPerPageOptions="[10, 20, 50]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      :currentPageReportTemplate="'{first} to {last} of {totalRecords} logs'"
      :loading="loading"
      :emptyMessage="loading ? 'Loading audit logs...' : 'No audit logs found'"
      dataKey="id"
      :totalRecords="totalRecords"
      @page="onPageChange"
      sortField="timestamp"
      :sortOrder="-1"
    >
      <p-column field="timestamp" header="Timestamp" sortable>
        <template #body="slotProps">
          {{ formatDateTime(slotProps.data.timestamp) }}
        </template>
      </p-column>
      <p-column field="actionType" header="Action Type"></p-column>
      <p-column field="operationType" header="Operation Type" sortable>
        <template #body="slotProps">
          <p-tag
            :value="slotProps.data.operationType"
            :severity="getOperationTypeSeverity(slotProps.data.operationType)"
          />
        </template>
      </p-column>
      <p-column field="logLevel" header="Log Level" sortable>
        <template #body="slotProps">
          <p-tag
            :value="slotProps.data.logLevel"
            :severity="getLogLevelSeverity(slotProps.data.logLevel)"
          />
        </template>
      </p-column>
      <p-column field="resourceName" header="Resource Name">
        <template #body="slotProps">
          <span :title="slotProps.data.resourceName">{{
            getShortResourceName(slotProps.data.resourceName)
          }}</span>
        </template>
      </p-column>
      <p-column field="actionStatus" header="Status"></p-column>
      <p-column header="Details">
        <template #body="slotProps">
          <p-button
            icon="pi pi-eye"
            class="p-button-sm p-button-info"
            @click="viewLogDetails(slotProps.data)"
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
            <div class="detail-value">{{ selectedLog.actionType }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Operation Type:</div>
            <div class="detail-value">
              <p-tag
                :value="selectedLog.operationType"
                :severity="getOperationTypeSeverity(selectedLog.operationType)"
              />
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Log Level:</div>
            <div class="detail-value">
              <p-tag
                :value="selectedLog.logLevel"
                :severity="getLogLevelSeverity(selectedLog.logLevel)"
              />
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
import { AUDIT_ERROR_MESSAGES } from '@/constants/appConstants'
import { logLevelOptions } from '@/constants/logLevelOptions'
import { operationTypeOptions } from '@/constants/operationTypeOptions'
import { AuditLogService } from '@/services/auditLogService'
import type { AuditLog } from '@/services/encryption/auditLogEncryptionService'
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

    // Pagination
    const currentPage = ref(0)
    const pageSize = ref(10)
    const first = ref(0)

    // Filters
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
    const formatDateTime = (date: Date | string): string => {
      return moment(date).format('YYYY-MM-DD HH:mm:ss')
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
      if (!name) return 'N/A'
      return name.length > 30 ? `${name.substring(0, 30)}...` : name
    }

    // Load audit logs with current filters and pagination
    const loadAuditLogs = async () => {
      loading.value = true

      try {
        // Validate date range if both dates are provided
        if (startDate.value && endDate.value && startDate.value > endDate.value) {
          handleError(AUDIT_ERROR_MESSAGES.INVALID_DATE_RANGE)
          loading.value = false
          return
        }

        const result = await AuditLogService.getAuditLogs({
          page: currentPage.value,
          size: pageSize.value,
          operationType: selectedOperationType.value,
          level: selectedLogLevel.value,
          startDate: formatDateForApi(startDate.value),
          endDate: formatDateForApi(endDate.value)
        })

        auditLogs.value = result.auditLogs
        totalRecords.value = result.totalCount
      } catch (error) {
        handleError(error, AUDIT_ERROR_MESSAGES.FETCH_LOGS_FAILED)
        auditLogs.value = []
        totalRecords.value = 0
      } finally {
        loading.value = false
      }
    }

    // Apply filters and reload data
    const applyFilters = () => {
      currentPage.value = 0
      first.value = 0
      loadAuditLogs()
    }

    // Reset all filters
    const resetFilters = () => {
      selectedOperationType.value = 'ALL'
      selectedLogLevel.value = 'ALL'
      startDate.value = null
      endDate.value = null
      currentPage.value = 0
      first.value = 0
      loadAuditLogs()
    }

    // Handle page change
    const onPageChange = (event: any) => {
      first.value = event.first
      pageSize.value = event.rows
      currentPage.value = Math.floor(event.first / event.rows)
      loadAuditLogs()
    }

    // View log details
    const viewLogDetails = (log: AuditLog) => {
      selectedLog.value = log
      showDetailsDialog.value = true
    }

    // Load initial data
    onMounted(() => {
      loadAuditLogs()
    })

    return {
      auditLogs,
      totalRecords,
      loading,
      operationTypeOptions,
      logLevelOptions,
      selectedOperationType,
      selectedLogLevel,
      startDate,
      endDate,
      currentPage,
      pageSize,
      first,
      selectedLog,
      showDetailsDialog,
      formatDateTime,
      getOperationTypeSeverity,
      getLogLevelSeverity,
      getShortResourceName,
      loadAuditLogs,
      applyFilters,
      resetFilters,
      onPageChange,
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
  margin-bottom: 2rem;
  align-items: flex-start;
}

.filter-item {
  min-width: 200px;
  flex: 1;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}

:deep(.p-dropdown) {
  width: 100%;
}

:deep(.p-date-picker) {
  width: 100%;
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

/* Audit details dialog */
.audit-details-dialog {
  max-width: 700px;
  width: 90vw;
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

/* Mobile responsiveness */
@media (max-width: 768px) {
  .filter-container {
    flex-direction: column;
  }

  .filter-item {
    width: 100%;
  }

  .filter-actions {
    width: 100%;
    justify-content: space-between;
  }

  .detail-row {
    flex-direction: column;
  }

  .detail-label {
    width: 100%;
    margin-bottom: 0.25rem;
  }
}
</style>
