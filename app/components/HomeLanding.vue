<script setup lang="ts">
import site from '#content-data/site.json'

const props = defineProps<{
  currentPage: number
}>()

const PAGE_SIZE = 12
const pagePosts = computed(() => {
  const start = (props.currentPage - 1) * PAGE_SIZE
  return site.posts.slice(start, start + PAGE_SIZE)
})
</script>

<template>
  <div>
    <UPageHero
      :headline="site.subtitle"
      :title="site.title"
      class="home-hero"
      :ui="{
        container: 'home-hero-container',
        wrapper: 'text-left',
        headline: 'justify-start',
        title: 'text-balance max-w-4xl'
      }"
    />

    <USeparator />

    <UContainer>
      <UPageSection
        :title="currentPage === 1 ? '最新文章' : `最新文章 · 第 ${currentPage} 页`"
        :ui="{
          container: 'home-section-container',
          headline: 'justify-start',
          title: 'text-left',
          description: 'text-left'
        }"
      >
        <ArticleList :posts="pagePosts" />

        <ArticlePagination
          :current-page="currentPage"
          :total="site.posts.length"
          :page-size="PAGE_SIZE"
          base-path="/"
        />
      </UPageSection>
    </UContainer>
  </div>
</template>
