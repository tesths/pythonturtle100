<script setup lang="ts">
import site from '#content-data/site.json'
</script>

<template>
  <span class="app-logo">
    <span class="app-logo-mark" aria-hidden="true">Py</span>
    <span class="app-logo-copy">
      <span class="app-logo-title">{{ site.title }}</span>
      <span class="app-logo-subtitle">{{ site.subtitle }}</span>
    </span>
  </span>
</template>
