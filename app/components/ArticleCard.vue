<script setup lang="ts">
const props = defineProps<{
  post: {
    title: string
    url: string
    date: string
    thumbnail?: string
    summary?: string
    categories?: string[]
  }
}>()

const primaryCategory = computed(() => props.post.categories?.[0] || 'Python 教程')
const placeholderIcon = computed(() => {
  if (primaryCategory.value.includes('工具')) return 'i-lucide-wrench'
  if (primaryCategory.value.includes('详解')) return 'i-lucide-compass'
  if (primaryCategory.value.includes('方法')) return 'i-lucide-list-tree'
  return 'i-lucide-code-2'
})
</script>

<template>
  <article role="listitem">
    <NuxtLink :to="post.url" class="article-card" :aria-label="post.title">
      <div class="article-card-layout">
        <div class="article-card-media">
          <img
            v-if="post.thumbnail"
            :src="post.thumbnail"
            :alt="post.title"
            loading="lazy"
            width="240"
            height="160"
          >
          <div v-else class="article-card-placeholder" aria-hidden="true">
            <UIcon :name="placeholderIcon" />
            <span>{{ primaryCategory }}</span>
          </div>
        </div>

        <div class="article-card-content">
          <div class="article-card-meta">
            <UBadge v-if="post.categories?.length" color="primary" variant="subtle" size="sm">
              {{ post.categories[0] }}
            </UBadge>
            <span>
              <UIcon name="i-lucide-calendar-days" />
              {{ post.date?.slice(0, 10) }}
            </span>
          </div>

          <h2>{{ post.title }}</h2>
          <p v-if="post.summary">{{ post.summary }}</p>

          <span class="article-card-link">
            阅读文章
            <UIcon name="i-lucide-arrow-right" />
          </span>
        </div>
      </div>
    </NuxtLink>
  </article>
</template>
