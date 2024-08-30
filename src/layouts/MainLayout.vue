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
import { defineComponent } from 'vue'
import SidePanel from '@/layouts/SidePanel.vue'

export default defineComponent({
  components: {
    SidePanel
  }
})
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  height: 90vh;
}

.layout-main-container {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}
</style>
