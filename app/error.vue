<script setup lang="ts">
import type { NuxtError } from '#app'
import { zh_cn } from '@nuxt/ui/locale'

const props = defineProps<{
  error: NuxtError
}>()

useSeoMeta({
  title: '页面未找到',
  description: '这个页面不存在或已被移动。'
})

useSeoMeta({
  robots: 'noindex, nofollow',
  ogTitle: '页面未找到',
  ogDescription: '这个页面不存在或已被移动。',
  ogType: 'website',
  twitterCard: 'summary',
  twitterTitle: '页面未找到',
  twitterDescription: '这个页面不存在或已被移动。'
})

const errorForDisplay = computed(() => ({
  ...props.error,
  statusMessage: props.error.statusMessage || '页面未找到',
  message: props.error.message || '这个页面不存在或已被移动。'
}))
</script>

<template>
  <UApp :locale="zh_cn">
    <AppHeader />
    <UError :error="errorForDisplay" />
    <AppFooter />
  </UApp>
</template>
