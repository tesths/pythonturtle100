<script setup lang="ts">
import site from '#content-data/site.json'

const siteUrl = site.url
const canonicalUrl = siteUrl + '/'
const defaultOgImage = `${siteUrl}/og-default.png`

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: site.title,
        url: canonicalUrl,
        description: site.description,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: site.posts.length
        }
      })
    }
  ]
})

useSeoMeta({
  titleTemplate: '',
  title: site.title,
  description: site.description,
  ogTitle: site.title,
  ogDescription: site.description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  ogImage: defaultOgImage,
  twitterCard: 'summary_large_image',
  twitterTitle: site.title,
  twitterDescription: site.description,
  twitterImage: defaultOgImage
})
</script>

<template>
  <HomeLanding :current-page="1" />
</template>
