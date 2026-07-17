<script setup lang="ts">
const props = withDefaults(defineProps<{
  currentPage: number
  total: number
  pageSize?: number
  basePath: string
}>(), {
  pageSize: 12
})

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

function normalizeBasePath(path: string) {
  if (!path || path === '/') return '/'
  return path.endsWith('/') ? path : `${path}/`
}

function pageLink(page: number) {
  const basePath = normalizeBasePath(props.basePath)
  if (page <= 1) return basePath
  return `${basePath}page/${page}/`
}
</script>

<template>
  <nav v-if="totalPages > 1" class="article-pagination" aria-label="文章分页">
    <UPagination
      :page="currentPage"
      :total="total"
      :items-per-page="pageSize"
      :to="pageLink"
      :show-edges="false"
      :sibling-count="1"
      color="neutral"
      variant="outline"
      active-color="primary"
      active-variant="solid"
    />
    <p>第 {{ currentPage }} / {{ totalPages }} 页</p>
  </nav>
</template>
