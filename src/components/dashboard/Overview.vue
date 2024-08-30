<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="overview">
    <h2>Dashboard Overview</h2>
    <!-- <div class="stats p-grid">
      <div class="stat-item p-col">
        <p-card>
          <template #title>{{ vaultCount }}</template>
          <template #subtitle>Vaults</template>
        </p-card>
      </div>
      <div class="stat-item p-col">
        <p-card>
          <template #title>{{ domainCount }}</template>
          <template #subtitle>Domains</template>
        </p-card>
      </div>
      <div class="stat-item p-col">
        <p-card>
          <template #title>{{ passwordCount }}</template>
          <template #subtitle>Passwords</template>
        </p-card>
      </div>
    </div> -->
    <div class="overview-diagram p-grid">
      <div class="stat-card p-col-12 p-md-4">
        <p-card>
          <template #title>Current Records</template>
          <p-chart type="doughnut" :data="chartData" :options="chartOptions"></p-chart>
        </p-card>
      </div>
    </div>

    <div class="overview-diagram p-grid">
      <div class="login-chart p-col-12">
        <p-card>
          <template #title>Last logins</template>
          <p-chart type="line" :data="loginChartData" :options="loginChartOptions"></p-chart>
        </p-card>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import axios from 'axios'

export default defineComponent({
  setup() {
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

    const loginChartData = ref({
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
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Number of Logins'
          }
        }
      }
    })

    const fetchDashboardData = async () => {
      try {
        const response = await axios.get('/api/dashboard/overview')
        chartData.value.datasets[0].data = [
          response.data.vaultCount,
          response.data.domainCount,
          response.data.credentialCount
        ]

        // Fetch login data
        const loginResponse = await axios.get('/api/dashboard/last-logins')
        loginChartData.value.labels = loginResponse.data.map((log: any) => log.date)
        loginChartData.value.datasets[0].data = loginResponse.data.map((log: any) => log.count)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      }
    }

    onMounted(() => {
      fetchDashboardData()
    })

    return {
      chartData,
      chartOptions,
      loginChartData,
      loginChartOptions
    }
  }
})
</script>

<style scoped>
.overview-diagram {
  padding: 1rem;
}

.dashboard-stats {
  margin-bottom: 2rem;
}

.stat-card {
  margin-bottom: 1rem;
}

.dashboard-logins {
  margin-bottom: 2rem;
}

.login-chart {
  margin-top: 2rem;
}
</style>
