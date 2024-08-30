<!-- eslint-disable vue/no-export-in-script-setup -->
<script setup lang="ts">
import Header from './components/shared/Header.vue'
import Footer from './components/shared/Footer.vue'
</script>

<template>
  <Header></Header>
  <RouterView />
  <Footer></Footer>
</template>

<style>
html * {
  font-family: Lato, sans-serif;
}
</style>
