<script setup lang="ts">
defineProps<{
  posts: any[]
}>()
</script>

<template>
  <div class="article-list" role="list">
    <ArticleCard v-for="post in posts" :key="post.url" :post="post" />
  </div>
</template>
