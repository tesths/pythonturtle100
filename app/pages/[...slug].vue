<script setup lang="ts">
import site from '#content-data/site.json'

const postDetailModules = import.meta.glob('../../content-data/posts/*.json')

definePageMeta({
  layout: 'docs',
  key: route => route.fullPath
})

const route = useRoute()
const PAGE_SIZE = 12
const siteUrl = site.url
const defaultOgImage = `${siteUrl}/og-default.png`

function normalize(path: string) {
  if (!path || path === '/') return '/'
  const normalized = path.endsWith('/') ? path : `${path}/`

  try {
    return decodeURI(normalized)
  } catch {
    return normalized
  }
}

function groupPostsByYear(posts: any[]) {
  const groups = new Map<string, any[]>()

  for (const item of posts) {
    const year = item.date ? String(item.date).slice(0, 4) : '未注明'
    if (!groups.has(year)) groups.set(year, [])
    groups.get(year)?.push(item)
  }

  return [...groups.entries()].map(([year, items]) => ({
    year,
    count: items.length,
    posts: items
  }))
}

const currentPath = computed(() => normalize(route.path))
const paginationMatch = computed(() => currentPath.value.match(/^(.*\/)page\/(\d+)\/$/))
const contentPath = computed(() => {
  const basePath = paginationMatch.value?.[1]
  return basePath ? normalize(basePath) : currentPath.value
})
const currentPage = computed(() => Number(paginationMatch.value?.[2] || 1))

const postSummary = computed(() => site.posts.find((item: any) => normalize(item.url) === contentPath.value))
const category = computed(() => site.categories.find((item: any) => normalize(item.url) === contentPath.value))
const tag = computed(() => site.tags.find((item: any) => normalize(item.url) === contentPath.value))

const postDetails = shallowRef<any | null>(null)
if (postSummary.value) {
  const detailPath = `../../content-data/posts/${postSummary.value.contentFile}`
  const loadDetails = postDetailModules[detailPath]
  if (!loadDetails) {
    throw createError({
      statusCode: 404,
      message: '文章内容未找到',
      fatal: true
    })
  }

  const module = await loadDetails() as { default: any }
  postDetails.value = module.default
}

const post = computed(() => postSummary.value && postDetails.value
  ? { ...postSummary.value, ...postDetails.value }
  : undefined)

// B1: 「在线运行」——题目页（/turtle100-N/）从正文最后一个代码块取可运行参考答案；
// 高意图「专题落地页」则用 frontmatter 里手写的 runnerCode（完整可运行片段）。
const problemMatch = computed(() => contentPath.value.match(/^\/turtle100-(\d+)\/$/))
const isProblemPage = computed(() => Boolean(problemMatch.value))
const problemNumber = computed(() => (problemMatch.value ? Number(problemMatch.value[1]) : 0))

// 需要展示「在线运行」的专题页（URL 路径）。这些是搜索意图最强的绘图/下载落地页。
const TOPIC_RUNNER_PATHS = new Set([
  '/draw-polygon/',
  '/draw-circle/',
  '/draw-multi-angle-star/',
  '/explain-draw-circle/'
])
const isTopicRunnerPage = computed(() => TOPIC_RUNNER_PATHS.has(contentPath.value))
// 是否展示运行器：题目页 或 配了 runnerCode 的白名单专题页。
const showRunner = computed(() => isProblemPage.value || isTopicRunnerPage.value)

function decodeHtmlEntities(text: string): string {
  return String(text || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
}

// 可运行代码：题目页取正文「最后一个 python 代码块」；专题页取 frontmatter 的 runnerCode。
const runnableCode = computed(() => {
  if (!post.value) return ''
  if (isTopicRunnerPage.value) {
    return String(post.value.runnerCode || '').trim()
  }
  if (!isProblemPage.value) return ''
  const html = String(post.value.content || '')
  const blocks = [...html.matchAll(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g)]
  if (!blocks.length) return ''
  const lastBlock = blocks[blocks.length - 1]
  const raw = lastBlock ? lastBlock[1] : undefined
  if (!raw) return ''
  return decodeHtmlEntities(raw).replace(/<\/?[^>]+>/g, '').trimEnd()
})

// 运行器标题：题目页「第 N 题」，专题页用文章标题。
const runnerTitle = computed(() => (isProblemPage.value ? `第 ${problemNumber.value} 题` : (post.value?.title || '')))

// 运行器引言里可读的知识点关键词：取题目标签里的具体项（去掉泛化标签）。
const runnerKeywords = computed(() => {
  const generic = new Set(['turtle graphics 100 exercises', '少儿编程', '海龟绘图 100 题'])
  return (post.value?.tags || []).filter((t: string) => !generic.has(t))
})

const isPostsIndex = computed(() => contentPath.value === '/posts/')
const isCategoryIndex = computed(() => contentPath.value === '/category/')
const isTagIndex = computed(() => contentPath.value === '/tag/')
const isArchives = computed(() => contentPath.value === '/archives/')

const listPosts = computed<any[]>(() => {
  const selectedCategory = category.value
  if (selectedCategory) return site.posts.filter((item: any) => item.categories?.includes(selectedCategory.name))

  const selectedTag = tag.value
  if (selectedTag) return site.posts.filter((item: any) => item.tags?.includes(selectedTag.name))

  if (isPostsIndex.value) return site.posts
  return []
})

const paginationTotal = computed(() => isArchives.value ? site.posts.length : listPosts.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(paginationTotal.value / PAGE_SIZE)))
const hasValidPage = computed(() => Number.isInteger(currentPage.value) && currentPage.value >= 1 && currentPage.value <= totalPages.value)
const hasCanonicalPagination = computed(() => currentPage.value === 1
  ? !paginationMatch.value
  : Boolean(paginationMatch.value))
const isValidRoute = computed(() => {
  if (postSummary.value || isCategoryIndex.value || isTagIndex.value) {
    return !paginationMatch.value
  }

  if (category.value || tag.value || isPostsIndex.value || isArchives.value) {
    return hasValidPage.value && hasCanonicalPagination.value
  }

  return false
})

if (!isValidRoute.value) {
  throw createError({
    statusCode: 404,
    message: '页面未找到',
    fatal: true
  })
}

const basePageTitle = computed(() => {
  if (post.value) return post.value.title
  if (category.value) return `分类：${category.value.name}`
  if (tag.value) return `标签：${tag.value.name}`
  if (isPostsIndex.value) return '全部文章'
  if (isCategoryIndex.value) return '分类目录'
  if (isTagIndex.value) return '标签索引'
  if (isArchives.value) return '文章归档'
  return '页面未找到'
})

const pageTitle = computed(() => currentPage.value > 1 && !post.value
  ? `${basePageTitle.value} · 第 ${currentPage.value} 页`
  : basePageTitle.value)

const basePageDescription = computed(() => {
  if (post.value) return post.value.summary || site.description
  if (category.value) return category.value.description || `${category.value.count} 篇相关文章`
  if (tag.value) return tag.value.description || `${tag.value.count} 篇相关文章`
  if (isPostsIndex.value) return `按发布时间浏览 ${site.posts.length} 篇 Python Turtle 海龟绘图教程、题解、分类和工具文章。`
  if (isCategoryIndex.value) return '按主题浏览全部文章。'
  if (isTagIndex.value) return '按标签浏览 Python Turtle 和少儿编程相关文章；标签页用于站内导航。'
  if (isArchives.value) return '按年份整理 Python Turtle 海龟绘图文章，方便回看历史发布内容。'
  return '这个路径没有对应的内容。'
})

const pageDescription = computed(() => {
  if (currentPage.value <= 1 || post.value) return basePageDescription.value
  return `${basePageDescription.value}第 ${currentPage.value} 页，继续浏览相关条目。`
})

const isNoindexPage = computed(() => {
  if (isTagIndex.value || tag.value || isArchives.value) return true
  return currentPage.value > 1 && !post.value
})

const robotsContent = computed(() => isNoindexPage.value
  ? 'noindex, follow'
  : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')

const canonicalPath = computed(() => post.value ? contentPath.value : currentPath.value)
const canonicalUrl = computed(() => new URL(canonicalPath.value, siteUrl).toString())
const socialImage = computed(() => post.value?.thumbnail
  ? new URL(post.value.thumbnail, siteUrl).toString()
  : defaultOgImage)

const breadcrumbs = computed(() => {
  const items = [
    { name: '首页', item: siteUrl + '/' }
  ]

  if (post.value) {
    items.push({ name: '文章', item: siteUrl + '/posts/' })
    items.push({ name: post.value.title, item: canonicalUrl.value })
    return items
  }

  if (category.value) {
    items.push({ name: '分类', item: siteUrl + '/category/' })
    items.push({ name: category.value.name, item: canonicalUrl.value })
    return items
  }

  if (tag.value) {
    items.push({ name: '标签', item: siteUrl + '/tag/' })
    items.push({ name: tag.value.name, item: canonicalUrl.value })
    return items
  }

  if (isPostsIndex.value) {
    items.push({ name: '全部文章', item: canonicalUrl.value })
    return items
  }

  if (isCategoryIndex.value) {
    items.push({ name: '分类目录', item: canonicalUrl.value })
    return items
  }

  if (isTagIndex.value) {
    items.push({ name: '标签索引', item: canonicalUrl.value })
    return items
  }

  if (isArchives.value) {
    items.push({ name: '文章归档', item: canonicalUrl.value })
    return items
  }

  items.push({ name: '页面未找到', item: canonicalUrl.value })
  return items
})

useSeoMeta({
  title: pageTitle.value,
  description: pageDescription.value,
  robots: robotsContent.value,
  ogTitle: pageTitle.value,
  ogDescription: pageDescription.value,
  ogType: post.value ? 'article' : 'website',
  ogUrl: canonicalUrl.value,
  ogImage: socialImage.value,
  articlePublishedTime: post.value?.date || undefined,
  articleModifiedTime: post.value?.lastmod || post.value?.date || undefined,
  articleSection: post.value?.categories?.[0],
  articleTag: post.value?.tags,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle.value,
  twitterDescription: pageDescription.value,
  twitterImage: socialImage.value
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify([
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbs.value.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.item
          }))
        },
        post.value
          ? {
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.value.title,
              description: post.value.summary || site.description,
              url: canonicalUrl.value,
              datePublished: post.value.date,
              dateModified: post.value.lastmod || post.value.date,
              inLanguage: 'zh-CN',
              mainEntityOfPage: canonicalUrl.value,
              author: {
                '@type': 'Organization',
                name: site.title,
                url: siteUrl
              },
              publisher: {
                '@type': 'Organization',
                name: site.title,
                url: siteUrl,
                logo: {
                  '@type': 'ImageObject',
                  url: defaultOgImage
                }
              },
              image: socialImage.value
            }
          : {
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: pageTitle.value,
              url: canonicalUrl.value,
              description: pageDescription.value,
              isPartOf: {
                '@type': 'WebSite',
                name: site.title,
                url: siteUrl
              }
            }
      ])
    }
  ]
})

const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return listPosts.value.slice(start, start + PAGE_SIZE)
})

const paginatedArchives = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return groupPostsByYear(site.posts.slice(start, start + PAGE_SIZE))
})

const termCards = computed(() => (isCategoryIndex.value ? site.categories : site.tags).map((term: any) => ({
  title: term.name,
  description: term.description || `${term.count} 篇文章`,
  to: term.url,
  icon: isCategoryIndex.value ? 'i-lucide-folder-tree' : 'i-lucide-tag'
})))

const postIndex = computed(() => {
  const currentPost = post.value
  if (!currentPost) return -1

  return site.posts.findIndex((item: any) => item.url === currentPost.url)
})

type SurroundingPost = {
  title: string
  description: string
  to: string
  icon: string
}

const surroundingPosts = computed<SurroundingPost[]>(() => {
  if (postIndex.value < 0) return []

  const items: SurroundingPost[] = []
  const previousPost = site.posts[postIndex.value + 1]
  const nextPost = site.posts[postIndex.value - 1]

  if (previousPost) {
    items.push({
      title: previousPost.title,
      description: '上一篇',
      to: previousPost.url,
      icon: 'i-lucide-arrow-left'
    })
  }

  if (nextPost) {
    items.push({
      title: nextPost.title,
      description: '下一篇',
      to: nextPost.url,
      icon: 'i-lucide-arrow-right'
    })
  }

  return items
})
</script>

<template>
  <UPage>
    <template v-if="post" #right>
      <DocsToc :links="post.toc" :tags="post.tags" />
    </template>


    <div v-if="post">
      <UPageHeader
        :headline="post.categories?.[0]"
        :title="post.title"
        :description="post.summary"
        class="docs-post-header"
      >
        <template #links>
          <UBadge color="neutral" variant="subtle" icon="i-lucide-calendar-days">
            {{ post.date?.slice(0, 10) }}
          </UBadge>
          <UBadge v-if="post.tags?.length" color="neutral" variant="outline" icon="i-lucide-tags">
            {{ post.tags.length }} 个标签
          </UBadge>
        </template>
      </UPageHeader>

      <UPageBody class="docs-post-body">
        <PostContent :html="post.content" />

        <TurtleRunner
          v-if="showRunner && runnableCode"
          :code="runnableCode"
          :title="runnerTitle"
          :keywords="runnerKeywords"
        />

        <div v-if="post.tags?.length" class="post-tags">
          <UBadge
            v-for="tagName in post.tags"
            :key="tagName"
            color="primary"
            variant="subtle"
            icon="i-lucide-tag"
          >
            {{ tagName }}
          </UBadge>
        </div>

        <template v-if="surroundingPosts.length">
          <USeparator />
          <UPageGrid class="post-surround">
            <UPageCard
              v-for="item in surroundingPosts"
              :key="item.to"
              v-bind="item"
              variant="outline"
            />
          </UPageGrid>
        </template>
      </UPageBody>
    </div>

    <div v-else-if="isCategoryIndex || isTagIndex">
      <UPageHeader :title="pageTitle" :description="pageDescription" />
      <UPageBody>
        <UPageGrid class="term-grid">
          <UPageCard
            v-for="term in termCards"
            :key="term.to"
            v-bind="term"
            variant="outline"
          />
        </UPageGrid>
      </UPageBody>
    </div>

    <div v-else-if="isArchives && hasValidPage">
      <UPageHeader :title="pageTitle" :description="pageDescription" />
      <UPageBody>
        <section
          v-for="archive in paginatedArchives"
          :id="archive.year"
          :key="archive.year"
          class="archive-section"
        >
          <div class="archive-heading">
            <h2>{{ archive.year }}</h2>
            <UBadge color="neutral" variant="subtle">{{ archive.count }} 篇</UBadge>
          </div>
          <ArticleList :posts="archive.posts" />
        </section>

        <ArticlePagination
          :current-page="currentPage"
          :total="site.posts.length"
          :page-size="PAGE_SIZE"
          base-path="/archives/"
        />
      </UPageBody>
    </div>

    <div v-else-if="hasValidPage">
      <UPageHeader :title="pageTitle" :description="pageDescription" />
      <UPageBody>
        <ArticleList :posts="paginatedPosts" />

        <ArticlePagination
          :current-page="currentPage"
          :total="listPosts.length"
          :page-size="PAGE_SIZE"
          :base-path="contentPath"
        />
      </UPageBody>
    </div>
  </UPage>
</template>
