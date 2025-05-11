<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="overview">
    <h2>Dashboard Overview</h2>

    <!-- Records chart -->
    <div class="overview-card">
      <p-card>
        <template #title>Current Records</template>
        <template #content>
          <div class="chart-container">
            <p-progress-spinner v-if="loadingStats" style="width: 50px" strokeWidth="4" />
            <p-chart v-else type="doughnut" :data="chartData" :options="chartOptions"></p-chart>
          </div>
        </template>
      </p-card>
    </div>

    <!-- Login history chart -->
    <div class="overview-card login-chart-card">
      <p-card>
        <template #title>Last Logins</template>
        <template #content>
          <div class="chart-container login-chart">
            <p-progress-spinner v-if="loadingLogins" style="width: 50px" strokeWidth="4" />
            <div v-else-if="loginChartData.datasets[0].data.length === 0" class="empty-chart">
              No login history available
            </div>
            <p-chart
              v-else
              type="line"
              :data="loginChartData"
              :options="loginChartOptions"
            ></p-chart>
          </div>
        </template>
      </p-card>
    </div>
  </div>
</template>

<script lang="ts">
import { DashboardService } from '@/services/dashboardService'
import moment from 'moment'
import { defineComponent, onMounted, ref } from 'vue'

export default defineComponent({
  setup() {
    const loadingStats = ref(true)
    const loadingLogins = ref(true)

    const chartData = ref({
      labels: ['Vaults', 'Domains', 'Credentials'],
      datasets: [
        {
          data: [0, 0, 0],
          backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726'],
          hoverBackgroundColor: ['#64B5F6', '#81C784', '#FFB74D']
        }
      ]
    })

    const chartOptions = ref({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function (tooltipItem: any) {
              return `${tooltipItem.label}: ${tooltipItem.raw}`
            }
          }
        }
      }
    })

    const loginChartData = ref<{
      labels: string[]
      datasets: Array<{
        label: string
        data: number[]
        fill: boolean
        borderColor: string
        tension: number
      }>
    }>({
      labels: [],
      datasets: [
        {
          label: 'Logins',
          data: [],
          fill: false,
          borderColor: '#42A5F5',
          tension: 0.4
        }
      ]
    })

    const loginChartOptions = ref({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Date'
          },
          ticks: {
            maxTicksLimit: 10
          }
        },
        y: {
          display: true,
          beginAtZero: true,
          min: 0,
          suggestedMax: 5,
          ticks: {
            stepSize: 1,
            precision: 0
          },
          title: {
            display: true,
            text: 'Number of Logins'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: function (tooltipItems: any[]) {
              const date = tooltipItems[0].label
              if (date && date.length === 5 && date.includes('-')) {
                const currentYear = new Date().getFullYear()
                const [month, day] = date.split('-')
                const fullDateStr = `${currentYear}-${month}-${day}`
                return moment(fullDateStr).format('MMMM D, YYYY')
              }
              return date
            }
          }
        },
        legend: {
          position: 'bottom'
        }
      }
    })

    const fetchOverviewStats = async () => {
      try {
        loadingStats.value = true
        const stats = await DashboardService.getOverviewStats()

        chartData.value.datasets[0].data = [
          stats.vaultCount || 0,
          stats.domainCount || 0,
          stats.credentialCount || 0
        ]
      } catch (error) {
        console.error('Failed to fetch dashboard statistics:', error)
      } finally {
        loadingStats.value = false
      }
    }

    const prepareLoginData = (entries: any[]): any[] => {
      if (!entries || entries.length === 0) return []

      // Group entries by date and sum the counts
      const dateMap = new Map<string, { count: number; failedCount: number }>()

      entries.forEach((entry) => {
        const date = entry.date || entry.loginDate || entry.timestamp || new Date().toISOString()
        // Format to YYYY-MM-DD for consistent grouping
        const formattedDate = date.split('T')[0]

        if (!dateMap.has(formattedDate)) {
          dateMap.set(formattedDate, {
            count: 0,
            failedCount: 0
          })
        }

        const current = dateMap.get(formattedDate)!
        current.count += entry.count || entry.loginCount || 1
        current.failedCount += entry.failedCount || 0
      })

      // Convert map back to array and sort by date
      const aggregatedEntries = Array.from(dateMap.entries()).map(([date, data]) => ({
        date,
        count: data.count,
        failedCount: data.failedCount
      }))

      // Sort by date ascending
      return aggregatedEntries.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    }

    const ensureDateContext = (entries: any[]): any[] => {
      if (entries.length === 0) return []

      // Get the earliest and latest dates
      const sortedEntries = [...entries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      const firstDate = new Date(sortedEntries[0].date)
      const lastDate = new Date(sortedEntries[sortedEntries.length - 1].date)

      // Add 2 days before and 2 days after to ensure surrounding context
      const startDate = new Date(firstDate)
      startDate.setDate(firstDate.getDate() - 2)

      const endDate = new Date(lastDate)
      endDate.setDate(lastDate.getDate() + 2)

      // Create the full date range with zeros for missing dates
      const result = []
      const existingDates = new Map(entries.map((entry) => [entry.date, entry]))

      for (
        let currentDate = new Date(startDate);
        currentDate <= endDate;
        currentDate.setDate(currentDate.getDate() + 1)
      ) {
        const dateStr = currentDate.toISOString().split('T')[0]

        if (existingDates.has(dateStr)) {
          // Use existing data
          result.push(existingDates.get(dateStr))
        } else {
          // Add a zero-data entry for this date
          result.push({
            date: dateStr,
            count: 0,
            failedCount: 0
          })
        }
      }

      return result
    }

    const updateChartWithData = (entries: any[]) => {
      // Add surrounding context dates
      const entriesWithContext = ensureDateContext(entries)

      // Format dates for display
      const labels = entriesWithContext.map((entry) => {
        const date = new Date(entry.date)
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
      })

      const loginCounts = entriesWithContext.map((entry) => entry.count)
      const failedCounts = entriesWithContext.map((entry) => entry.failedCount)

      // Update chart data
      loginChartData.value.labels = labels
      loginChartData.value.datasets[0].data = loginCounts

      // Handle failed logins if they exist
      if (entriesWithContext.some((entry) => entry.failedCount > 0)) {
        if (loginChartData.value.datasets.length === 1) {
          loginChartData.value.datasets.push({
            label: 'Failed Logins',
            data: failedCounts,
            fill: false,
            borderColor: '#FF6384',
            tension: 0.4
          })
        } else {
          loginChartData.value.datasets[1].data = failedCounts
        }
      } else if (loginChartData.value.datasets.length > 1) {
        // Remove failed logins dataset if no failed logins
        loginChartData.value.datasets.pop()
      }
    }

    const fetchLoginHistory = async () => {
      try {
        loadingLogins.value = true
        const loginHistoryData = await DashboardService.getLoginHistory()

        if (loginHistoryData && loginHistoryData.entries && loginHistoryData.entries.length > 0) {
          // Properly aggregate login entries by date
          const processedEntries = prepareLoginData(loginHistoryData.entries)

          // Adjust Y-axis max value based on the highest count
          const maxValue = Math.max(...processedEntries.map((e) => e.count))
          loginChartOptions.value.scales.y.suggestedMax = Math.max(5, Math.ceil(maxValue * 1.2))

          // Use the updated chart data method for all cases, no special handling for single date
          updateChartWithData(processedEntries)
        } else {
          loginChartData.value.labels = []
          loginChartData.value.datasets[0].data = []
        }
      } catch (error) {
        console.error('Failed to fetch login history:', error)
      } finally {
        loadingLogins.value = false
      }
    }

    onMounted(() => {
      fetchOverviewStats()
      fetchLoginHistory()
    })

    return {
      chartData,
      chartOptions,
      loginChartData,
      loginChartOptions,
      loadingStats,
      loadingLogins
    }
  }
})
</script>

<style scoped>
.overview {
  padding: 1rem;
}

.overview-card {
  margin-bottom: 2rem;
}

/* Make the login chart card larger */
.login-chart-card {
  margin-top: 3rem;
}

.chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  position: relative;
}

/* Make login chart taller */
.login-chart {
  height: 400px;
}

.empty-chart {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #666;
  font-style: italic;
}

.p-chart {
  width: 100%;
  height: 100%;
}

@media (max-width: 768px) {
  .chart-container {
    height: 250px;
  }

  .login-chart {
    height: 350px;
  }
}
</style>
