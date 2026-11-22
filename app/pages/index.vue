<script setup lang="ts">
import site from '#content-data/site.json'

const siteUrl = site.url
const canonicalUrl = siteUrl + '/'
const defaultOgImage = `${siteUrl}/og-default.png`

const HOME_TITLE = 'Python 海龟绘图教程与 100 题图解（可在线运行）| 玩转Python海龟绘图'
const HOME_DESCRIPTION = '100 道 Python 海龟绘图真题，每题附完整代码与图解，并可在浏览器内直接运行、改参数看效果，无需安装环境。附画圆、正多边形、多角星等方法总结与常用工具。'

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: HOME_TITLE,
        url: canonicalUrl,
        description: HOME_DESCRIPTION,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: site.homePosts.length
        }
      })
    }
  ]
})

useSeoMeta({
  titleTemplate: '',
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  ogTitle: HOME_TITLE,
  ogDescription: HOME_DESCRIPTION,
  ogType: 'website',
  ogUrl: canonicalUrl,
  ogImage: defaultOgImage,
  twitterCard: 'summary_large_image',
  twitterTitle: HOME_TITLE,
  twitterDescription: HOME_DESCRIPTION,
  twitterImage: defaultOgImage
})
</script>

<template>
  <HomeLanding :current-page="1" />
</template>
