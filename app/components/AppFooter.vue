<script setup lang="ts">
const { footer } = useAppConfig()
</script>

<template>
  <UFooter>
    <template #left>
      <span>{{ footer?.credits }}</span>
    </template>

    <template #right>
      <UButton to="/category/" color="neutral" variant="ghost" size="sm" icon="i-lucide-folder-tree" label="分类" />
      <UButton to="/archives/" color="neutral" variant="ghost" size="sm" icon="i-lucide-archive" label="归档" />
      <UButton to="/tag/" color="neutral" variant="ghost" size="sm" icon="i-lucide-tags" label="标签" />
    </template>
  </UFooter>
</template>
