<script setup lang="ts">
import site from '#content-data/site.json'

type SearchItem = {
  id: number | string
  title: string
  url: string
  summary: string
  categories: string[]
  tags: string[]
  score: number
}

const open = ref(false)
const query = ref('')
const inputRef = ref<any>(null)
const isMac = process.client ? /Mac|iPhone|iPad|iPod/.test(navigator.platform) : false

const posts = site.posts as Array<{
  id: number | string
  title: string
  url: string
  summary?: string
  categories?: string[]
  tags?: string[]
}>

const normalize = (value: string) => value.toLowerCase().trim()
const matches = (value: string, needle: string) => normalize(value).includes(needle)

const results = computed<SearchItem[]>(() => {
  const needle = normalize(query.value)

  if (!needle)
    return []

  return posts
    .map((post) => {
      const title = post.title || ''
      const summary = post.summary || ''
      const categories = post.categories || []
      const tags = post.tags || []
      let score = 0

      if (matches(title, needle)) score += 8
      if (matches(summary, needle)) score += 5
      if (categories.some(item => matches(item, needle))) score += 3
      if (tags.some(item => matches(item, needle))) score += 2

      if (!score)
        return null

      return { id: post.id, title, url: post.url, summary, categories, tags, score }
    })
    .filter((item): item is SearchItem => Boolean(item))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, 'zh-Hans-CN'))
    .slice(0, 8)
})

const hasResults = computed(() => results.value.length > 0)

const focusInput = async () => {
  await nextTick()
  inputRef.value?.inputRef?.focus()
}

const openSearch = async () => {
  open.value = true
  await focusInput()
}

const closeSearch = () => {
  open.value = false
  query.value = ''
}

const toggleSearch = () => {
  if (open.value)
    closeSearch()
  else
    openSearch()
}

const handleShortcut = (event: KeyboardEvent) => {
  if ((isMac ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    toggleSearch()
  }

  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    closeSearch()
  }
}

watch(open, async (value) => {
  if (value) {
    await focusInput()
    return
  }

  query.value = ''
})

onMounted(() => window.addEventListener('keydown', handleShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut))
</script>

<template>
  <div>
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-search"
      aria-label="搜索文章"
      class="app-search-trigger"
      @click="toggleSearch"
    >
      <span class="hidden xl:inline">搜索</span>
      <UKbd value="K" class="ml-2 hidden xl:inline-flex" />
    </UButton>

    <UModal v-model:open="open" :ui="{ content: 'app-search-modal' }">
      <template #content="{ close }">
        <UCard class="app-search-panel">
          <template #header>
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-(--ui-text-highlighted)">全站搜索</h2>
                <p class="mt-1 text-sm text-(--ui-text-muted)">搜索标题、摘要、分类和标签</p>
              </div>
              <UButton color="neutral" variant="ghost" icon="i-lucide-x" aria-label="关闭搜索" @click="() => { closeSearch(); close() }" />
            </div>
          </template>

          <UInput
            ref="inputRef"
            v-model="query"
            icon="i-lucide-search"
            size="xl"
            placeholder="输入关键词，例如 海龟绘图"
            aria-label="搜索文章"
            autocomplete="off"
            autofocus
          />

          <div class="mt-5 space-y-3">
            <template v-if="query.trim()">
              <p class="text-sm text-(--ui-text-muted)">
                <span v-if="hasResults">找到 {{ results.length }} 条结果</span>
                <span v-else>没有找到匹配的文章</span>
              </p>

              <div v-if="hasResults" class="space-y-2">
                <UButton
                  v-for="item in results"
                  :key="item.id"
                  :to="item.url"
                  block
                  color="neutral"
                  variant="soft"
                  class="app-search-result"
                  @click="() => { closeSearch(); close() }"
                >
                  <div class="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
                    <div class="flex w-full items-center justify-between gap-3">
                      <span class="truncate font-medium">{{ item.title }}</span>
                      <UIcon name="i-lucide-arrow-right" class="size-4 shrink-0 text-(--ui-text-dimmed)" />
                    </div>
                    <p class="line-clamp-2 text-sm text-(--ui-text-muted)">{{ item.summary }}</p>
                    <div class="flex flex-wrap gap-1.5 pt-1">
                      <UBadge v-for="category in item.categories.slice(0, 2)" :key="`${item.id}-c-${category}`" color="neutral" variant="subtle" size="sm">{{ category }}</UBadge>
                      <UBadge v-for="tag in item.tags.slice(0, 2)" :key="`${item.id}-t-${tag}`" color="primary" variant="subtle" size="sm">{{ tag }}</UBadge>
                    </div>
                  </div>
                </UButton>
              </div>
            </template>

            <div v-else class="rounded-2xl border border-dashed border-(--ui-border) px-4 py-6 text-sm text-(--ui-text-muted)">
              输入关键词后即可搜索文章。
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
