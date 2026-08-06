<script setup lang="ts">
import site from '#content-data/site.json'

const siteUrl = site.url
const defaultOgImage = `${siteUrl}/og-default.png`

const route = useRoute()
const PAGE_SIZE = 12
const totalPages = Math.ceil(site.posts.length / PAGE_SIZE)
const currentPage = Number(route.params.page)
const canonicalUrl = currentPage === 1 ? `${siteUrl}/` : `${siteUrl}/page/${currentPage}/`
const pageTitle = `最新文章 · 第 ${currentPage} 页`
const pageDescription = `按发布时间浏览 Python Turtle 海龟绘图教程和题解第 ${currentPage} 页，继续查看历史文章。`

if (!Number.isInteger(currentPage) || currentPage < 2 || currentPage > totalPages) {
  throw createError({
    statusCode: 404,
    message: '页面未找到',
    fatal: true
  })
}

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  robots: 'noindex, follow',
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: 'website',
  ogUrl: canonicalUrl,
  ogImage: defaultOgImage,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: defaultOgImage
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: pageTitle,
        url: canonicalUrl,
        description: pageDescription,
        isPartOf: {
          '@type': 'WebSite',
          name: site.title,
          url: siteUrl
        }
      })
    }
  ]
})
</script>

<template>
  <HomeLanding :current-page="currentPage" />
</template>
