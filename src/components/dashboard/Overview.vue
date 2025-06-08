<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="overview">
    <p-toast />
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
        <template #title>
          <div class="chart-header">
            <div>Login Activity (Last {{ displayDayRange }} Days)</div>
            <div class="date-range-selector">
              <div class="p-buttonset">
                <p-button
                  :class="{ 'p-button-outlined': selectedRange !== '7days' }"
                  @click="changeRange('7days')"
                  size="small"
                >
                  7 Days
                </p-button>
                <p-button
                  :class="{ 'p-button-outlined': selectedRange !== '30days' }"
                  @click="changeRange('30days')"
                  size="small"
                >
                  30 Days
                </p-button>
                <p-button
                  :class="{ 'p-button-outlined': selectedRange !== '90days' }"
                  @click="changeRange('90days')"
                  size="small"
                >
                  90 Days
                </p-button>
              </div>
            </div>
          </div>
        </template>
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
import { computed, defineComponent, onMounted, ref } from 'vue'

export default defineComponent({
  setup() {
    const loadingStats = ref(true)
    const loadingLogins = ref(true)
    const selectedRange = ref('30days')

    // Computed property to display the selected day range
    const displayDayRange = computed(() => {
      switch (selectedRange.value) {
        case '7days':
          return '7'
        case '30days':
          return '30'
        case '90days':
          return '90'
        default:
          return '30'
      }
    })

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
            maxTicksLimit: 15,
            maxRotation: 45,
            minRotation: 45
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

    // Function to change the date range
    const changeRange = (range: string) => {
      selectedRange.value = range
      fetchLoginHistory()
    }

    // Convert selectedRange to the appropriate number of days
    const getDaysFromSelectedRange = (): number => {
      switch (selectedRange.value) {
        case '7days':
          return 7
        case '90days':
          return 90
        case '30days':
        default:
          return 30
      }
    }

    // Update fetchLoginHistory in the script section:
    const fetchLoginHistory = async () => {
      try {
        loadingLogins.value = true

        // Pass the days parameter to the service method
        const loginHistoryData = await DashboardService.getLoginHistory(getDaysFromSelectedRange())

        if (loginHistoryData && loginHistoryData.entries && loginHistoryData.entries.length > 0) {
          // Since backend already returns the exact number of days we requested,
          // we don't need to generate empty days, but we'll still process the data consistently
          const processedEntries = prepareLoginDataFromResponse(loginHistoryData.entries)
          updateChartWithData(processedEntries)
        } else {
          // No login data available, generate empty data for the selected range
          const emptyData = generateEmptyData(getDaysFromSelectedRange())
          updateChartWithData(emptyData)
        }
      } catch (error) {
        console.error('Failed to fetch login history:', error)
        // Even on error, show empty chart with date ranges
        const emptyData = generateEmptyData(getDaysFromSelectedRange())
        updateChartWithData(emptyData)
      } finally {
        loadingLogins.value = false
      }
    }

    // Update the data preparation method to work with the backend response
    const prepareLoginDataFromResponse = (loginHistory: any[]): any[] => {
      const days = getDaysFromSelectedRange()

      // Create a map for the selected days (including today)
      const dateMap = new Map<string, { count: number; failedCount: number }>()

      // Generate all days in the range to ensure we have a complete dataset
      for (let i = days - 1; i >= 0; i--) {
        const date = moment().subtract(i, 'days').format('YYYY-MM-DD')
        dateMap.set(date, {
          count: 0,
          failedCount: 0
        })
      }

      // Fill in actual data from the response
      loginHistory.forEach((entry) => {
        const date = entry.date || entry.loginDate || entry.timestamp || new Date().toISOString()
        // Format to YYYY-MM-DD for consistent grouping
        const formattedDate = date.split('T')[0]

        if (dateMap.has(formattedDate)) {
          const current = dateMap.get(formattedDate)!
          current.count += entry.count || entry.loginCount || 1
          current.failedCount += entry.failedCount || 0
        }
      })

      // Convert map to array and sort by date
      return Array.from(dateMap.entries())
        .map(([date, data]) => ({
          date,
          count: data.count,
          failedCount: data.failedCount
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    // Add a method to generate empty data when needed
    const generateEmptyData = (days: number): any[] => {
      const emptyData = []

      for (let i = days - 1; i >= 0; i--) {
        const date = moment().subtract(i, 'days').format('YYYY-MM-DD')
        emptyData.push({
          date,
          count: 0,
          failedCount: 0
        })
      }

      return emptyData
    }

    const updateChartWithData = (entries: any[]) => {
      // Format dates for display (MM-DD format)
      const labels = entries.map((entry) => {
        const date = new Date(entry.date)
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
          .getDate()
          .toString()
          .padStart(2, '0')}`
      })

      const loginCounts = entries.map((entry) => entry.count)
      const failedCounts = entries.map((entry) => entry.failedCount)

      // Update chart data
      loginChartData.value.labels = labels
      loginChartData.value.datasets[0].data = loginCounts

      // Handle failed logins if they exist
      if (entries.some((entry) => entry.failedCount > 0)) {
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

      // Adjust Y-axis max value based on the highest count
      const maxValue = Math.max(...loginCounts, ...failedCounts)
      loginChartOptions.value.scales.y.suggestedMax = Math.max(5, Math.ceil(maxValue * 1.2))
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
      loadingLogins,
      selectedRange,
      displayDayRange,
      changeRange
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

/* Header with range selector */
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.date-range-selector {
  display: flex;
  gap: 0.5rem;

  .p-buttonset .p-button {
    flex: 1;
    margin: 0 0.25rem;
  }
}

@media (max-width: 768px) {
  .chart-container {
    height: 250px;
  }

  .login-chart {
    height: 350px;
  }

  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .date-range-selector {
    width: 100%;
  }

  .date-range-selector .p-buttonset {
    display: flex;
    width: 100%;
  }

  .date-range-selector .p-buttonset .p-button {
    flex: 1;
  }
}
</style>
