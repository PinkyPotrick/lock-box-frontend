<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="header">
    <div class="darmkode-container" v-if="isLoggedIn()">
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
import { defineComponent, ref } from 'vue'
import { isLoggedIn } from '@/utils/auth'

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

    return {
      checked,
      isLoggedIn,
      toggleDarkMode
    }
  }
})
</script>

<style>
.darmkode-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

.pi {
  font-size: 1rem;
}
</style>
