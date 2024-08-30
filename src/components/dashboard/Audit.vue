<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="audit">
    <h2>Audit Logs</h2>

    <div class="filter-container">
      <p-select
        v-model="selectedOperation"
        :options="operationOptions"
        optionLabel="label"
        placeholder="Filter by Operation"
        @change="filterLogs"
        style="width: 200px"
      ></p-select>

      <p-select
        v-model="selectedLevel"
        :options="levelOptions"
        optionLabel="label"
        placeholder="Filter by Level"
        @change="filterLogs"
        style="width: 200px"
      ></p-select>

      <p-date-picker
        v-model="startDate"
        placeholder="Start Date"
        dateFormat="yy-mm-dd"
        @change="filterLogs"
        style="width: 200px"
      ></p-date-picker>

      <p-date-picker
        v-model="endDate"
        placeholder="End Date"
        dateFormat="yy-mm-dd"
        @change="filterLogs"
        style="width: 200px"
      ></p-date-picker>
    </div>

    <p-data-table :value="filteredLogs" paginator :rows="10" :emptyMessage="'No audit logs found'">
      <p-column field="operation" header="Operation">
        <template #body="slotProps">
          <p-tag
            :value="slotProps.data.operation"
            :severity="getOperationColor(slotProps.data.operation)"
          />
        </template>
      </p-column>
      <p-column field="description" header="Description"></p-column>
      <p-column field="level" header="Level">
        <template #body="slotProps">
          <p-tag :value="slotProps.data.level" :severity="getLevelColor(slotProps.data.level)" />
        </template>
      </p-column>
      <p-column field="date" header="Date">
        <template #body="slotProps">
          {{ formatDate(slotProps.data.date) }}
        </template>
      </p-column>
    </p-data-table>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import type { AuditLog } from '@/models/auditLog'
import { operationOptions } from '@/constants/operationOptions'
import { levelOptions } from '@/constants/levelOptions'
import axios from '@/axios-config'
import moment from 'moment'

export default defineComponent({
  setup() {
    const logs = ref<AuditLog[]>([])
    const filteredLogs = ref<AuditLog[]>([])

    const selectedOperation = ref(null)
    const selectedLevel = ref(null)
    const startDate = ref<Date | null>(null)
    const endDate = ref<Date | null>(null)

    const fetchAuditLogs = async () => {
      try {
        const response = await axios.get<AuditLog[]>('/api/audit/logs')
        logs.value = response.data
        filteredLogs.value = response.data // Initialize filtered logs with all logs
      } catch (error) {
        console.error('Failed to fetch audit logs:', error)
      }
    }

    const filterLogs = () => {
      filteredLogs.value = logs.value.filter((log) => {
        const matchesOperation = selectedOperation.value
          ? log.operation === selectedOperation.value
          : true
        const matchesLevel = selectedLevel.value ? log.level === selectedLevel.value : true
        const matchesDate =
          (!startDate.value || new Date(log.date) >= startDate.value) &&
          (!endDate.value || new Date(log.date) <= endDate.value)
        return matchesOperation && matchesLevel && matchesDate
      })
    }

    const getOperationColor = (operation: string) => {
      const colorMap: Record<string, string> = {
        READ: 'blue',
        WRITE: 'green',
        UPDATE: 'orange',
        DELETE: 'red'
      }
      return colorMap[operation] || 'gray'
    }

    const getLevelColor = (level: string) => {
      const colorMap: Record<string, string> = {
        DEBUG: 'gray',
        INFO: 'blue',
        WARNING: 'orange',
        ERROR: 'red',
        CRITICAL: 'purple'
      }
      return colorMap[level] || 'gray'
    }

    const formatDate = (dateString: string) => {
      return moment(dateString).format('yyyy-MM-dd HH:mm:ss')
    }

    watch([selectedOperation, selectedLevel, startDate, endDate], filterLogs)

    fetchAuditLogs()

    return {
      filteredLogs,
      operationOptions,
      levelOptions,
      selectedOperation,
      selectedLevel,
      startDate,
      endDate,
      filterLogs,
      getOperationColor,
      getLevelColor,
      formatDate
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
  gap: 1rem;
  margin-bottom: 1rem;
}
</style>
