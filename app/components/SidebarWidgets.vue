<script setup lang="ts">
import site from '#content-data/site.json'
</script>

<template>
  <aside class="sidebar-widgets" aria-label="站点索引">
    <UPageLinks
      title="分类目录"
      :links="site.categories.map((category: any) => ({
        label: category.name,
        to: category.url,
        icon: category.slug === 'turtle100' ? 'i-lucide-book-open' : 'i-lucide-folder',
        badge: String(category.count)
      }))"
    />

    <USeparator type="dashed" />

    <UPageLinks
      title="文章归档"
      :links="site.archives.map((archive: any) => ({
        label: archive.year,
        to: `/archives/#${archive.year}`,
        icon: 'i-lucide-calendar-days',
        badge: String(archive.count)
      }))"
    />
  </aside>
</template>
