<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="header">
    <div class="title-container" v-if="isLoggedIn">
      <h1 class="app-title">LockBox</h1>
    </div>
    <div class="darmkode-container" v-if="isLoggedIn">
      <p-toggle-button
        class="darkmode-button"
        v-model="checked"
        onLabel="Dark Mode"
        offLabel="Light Mode"
        onIcon="pi pi-moon"
        offIcon="pi pi-sun"
        @click="toggleDarkMode()"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'

export default defineComponent({
  setup() {
    // Set the color mode to dark mode by default
    const checked = ref(true)
    const element = document.querySelector('html')
    element?.classList.add('lock-box-dark')

    // The toggle function between the dark and light mode
    const toggleDarkMode = function () {
      const element = document.querySelector('html')
      element?.classList.toggle('lock-box-dark')
    }

    const authStore = useAuthStore()
    const isLoggedIn = computed(() => authStore.isLoggedIn)

    return {
      checked,
      isLoggedIn,
      toggleDarkMode
    }
  }
})
</script>

<style>
.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
  padding: 10px;
}

.title-container {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  height: auto;
}

.app-title {
  font-size: 1.5rem;
}

.darmkode-container {
  margin-right: auto;
}

.pi {
  font-size: 1rem;
}
</style>
