<script setup lang="ts">
import site from '#content-data/site.json'

const props = withDefaults(defineProps<{
  mobile?: boolean
}>(), {
  mobile: false
})

const route = useRoute()

function normalize(path: string) {
  if (!path || path === '/') return '/'
  return path.endsWith('/') ? path : `${path}/`
}

const currentPath = computed(() => normalize(route.path))

const primaryItems = computed(() => [
  {
    label: '首页',
    icon: 'i-lucide-house',
    to: '/',
    active: currentPath.value === '/'
  },
  {
    label: '全部文章',
    icon: 'i-lucide-files',
    to: '/posts/',
    badge: String(site.posts.length),
    active: currentPath.value === '/posts/'
  }
])

const categoryItems = computed(() => site.categories.map((category: any) => ({
  label: category.name,
  icon: category.slug === 'turtle100' ? 'i-lucide-book-open' : 'i-lucide-folder',
  to: category.url,
  badge: String(category.count),
  active: currentPath.value === normalize(category.url)
    || Boolean(category.posts?.some((post: any) => normalize(post.url) === currentPath.value))
})))

const indexItems = computed(() => [
  {
    label: '文章归档',
    icon: 'i-lucide-archive',
    to: '/archives/',
    badge: String(site.archives.length),
    active: currentPath.value === '/archives/'
  },
  {
    label: '标签索引',
    icon: 'i-lucide-tags',
    to: '/tag/',
    badge: String(site.tags.length),
    active: currentPath.value.startsWith('/tag/')
  }
])

const recentItems = computed(() => site.posts.slice(0, 6).map((post: any) => ({
  label: post.title.replace('Python 海龟绘图 100 题——', ''),
  icon: 'i-lucide-file-text',
  to: post.url,
  active: currentPath.value === normalize(post.url)
})))
</script>

<template>
  <nav class="docs-navigation" aria-label="文档导航">
    <div class="docs-navigation-group">
      <p class="docs-navigation-label">开始</p>
      <UNavigationMenu
        :items="primaryItems"
        orientation="vertical"
        color="neutral"
        variant="link"
        highlight
        class="w-full"
      />
    </div>

    <div class="docs-navigation-group">
      <p class="docs-navigation-label">分类目录</p>
      <UNavigationMenu
        :items="categoryItems"
        orientation="vertical"
        color="neutral"
        variant="link"
        highlight
        class="w-full"
      />
    </div>

    <div class="docs-navigation-group">
      <p class="docs-navigation-label">索引</p>
      <UNavigationMenu
        :items="indexItems"
        orientation="vertical"
        color="neutral"
        variant="link"
        highlight
        class="w-full"
      />
    </div>

    <div v-if="!props.mobile" class="docs-navigation-group">
      <p class="docs-navigation-label">最近更新</p>
      <UNavigationMenu
        :items="recentItems"
        orientation="vertical"
        color="neutral"
        variant="link"
        class="w-full docs-navigation-recent"
      />
    </div>
  </nav>
</template>
