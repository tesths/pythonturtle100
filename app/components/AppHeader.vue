<script setup lang="ts">
import site from '#content-data/site.json'

const route = useRoute()
const { header } = useAppConfig()

const items = computed(() => site.menu.map((item: any) => ({
  ...item,
  active: route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to))
})))
</script>

<template>
  <UHeader
    :title="site.title"
    :to="header?.to || '/'"
    mode="modal"
    :menu="{ title: '站点导航', description: '浏览分类与文章索引' }"
    :ui="{
      root: 'app-header',
      container: 'app-header-container',
      center: 'hidden lg:flex flex-1 justify-center',
      right: 'gap-1'
    }"
  >
    <template #title>
      <AppLogo />
    </template>

    <UNavigationMenu
      :items="items"
      color="neutral"
      variant="link"
      highlight
      class="app-header-nav"
    />

    <template #right>
      <AppSearch />
      <UButton
        to="/posts/"
        label="全部文章"
        icon="i-lucide-files"
        color="neutral"
        variant="ghost"
        class="hidden xl:inline-flex"
      />
      <UButton
        to="/category/turtle100/"
        label="100 题"
        icon="i-lucide-book-open"
        color="primary"
        variant="soft"
        class="hidden xl:inline-flex"
      />
    </template>

    <template #body>
      <DocsNavigation mobile />
    </template>
  </UHeader>
</template>
