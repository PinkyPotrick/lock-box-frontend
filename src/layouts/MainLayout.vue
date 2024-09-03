<template>
  <div class="layout-wrapper">
    <SidePanel />
    <div class="layout-main-container">
      <div class="layout-main">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue'
import SidePanel from '@/layouts/SidePanel.vue'
import { useAuthStore } from '@/stores/auth'

export default defineComponent({
  components: {
    SidePanel
  },
  setup() {
    const authStore = useAuthStore()
    const isLoggedIn = ref(false)

    onMounted(() => {
      isLoggedIn.value = authStore.isLoggedIn
    })

    return {
      isLoggedIn
    }
  }
})
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  height: 92vh;
}

.layout-main-container {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}
</style>
