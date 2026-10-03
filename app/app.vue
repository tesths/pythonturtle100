<script setup lang="ts">
import { zh_cn } from '@nuxt/ui/locale'
import site from '#content-data/site.json'

const siteUrl = site.url
const defaultOgImage = `${siteUrl}/og-default.png`
const route = useRoute()

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void
}

const trackPageView = () => {
  if (!import.meta.client) return

  const gtag = (window as AnalyticsWindow).gtag
  if (typeof gtag !== 'function') return

  gtag('event', 'page_view', {
    page_location: window.location.href,
    page_path: route.fullPath,
    page_title: document.title
  })
}

watch(() => route.fullPath, async () => {
  await nextTick()
  trackPageView()
})

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'alternate', type: 'application/rss+xml', title: `${site.title} RSS`, href: `${siteUrl}/rss.xml` }
  ],
  script: [
    {
      async: true,
      src: 'https://www.googletagmanager.com/gtag/js?id=G-PEMB434B76'
    },
    {
      innerHTML: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-PEMB434B76');
      `
    }
  ],
  htmlAttrs: {
    lang: 'zh-CN'
  }
})

useSeoMeta({
  titleTemplate: `%s - ${site.title}`,
  title: site.title,
  ogSiteName: site.title,
  description: site.description,
  ogDescription: site.description,
  ogTitle: site.title,
  ogType: 'website',
  ogUrl: siteUrl,
  ogImage: defaultOgImage,
  twitterCard: 'summary_large_image',
  twitterTitle: site.title,
  twitterDescription: site.description,
  twitterImage: defaultOgImage
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: site.title,
        url: siteUrl,
        description: site.description,
        inLanguage: 'zh-CN'
      })
    }
  ]
})
</script>

<template>
  <UApp :locale="zh_cn">
    <NuxtLoadingIndicator color="var(--ui-primary)" />

    <AppHeader />

    <UMain>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>

    <AppFooter />
  </UApp>
</template>
