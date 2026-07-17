<script setup lang="ts">
const props = defineProps<{
  links?: Array<{
    label: string
    id: string
    to: string
    depth?: number
  }>
  tags?: string[]
}>()

const { toc } = useAppConfig()
const tocLinks = computed(() => (props.links || []).filter(link => link.label && link.id && link.to))
const activeId = ref('')
const isBrowser = import.meta.client
const observedIds = new Set<string>()
let observer: IntersectionObserver | null = null
let rafId: number | null = null
let fallbackTimer: number | null = null

const sectionTargets = () => tocLinks.value
  .map(link => document.getElementById(link.id))
  .filter((element): element is HTMLElement => Boolean(element))

const setActiveFromScroll = () => {
  if (!isBrowser) {
    return
  }

  const headerOffset = 16 + Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--docs-header-height')) || 64
  const sections = sectionTargets()

  if (!sections.length) {
    activeId.value = ''
    return
  }

  const candidate = [...sections]
    .map(section => ({ section, top: Math.abs(section.getBoundingClientRect().top - headerOffset) }))
    .sort((left, right) => left.top - right.top)[0]

  activeId.value = candidate?.section.id || ''
}

const scheduleFallback = () => {
  if (!isBrowser) {
    return
  }

  if (fallbackTimer !== null) {
    window.clearTimeout(fallbackTimer)
  }

  fallbackTimer = window.setTimeout(() => {
    setActiveFromScroll()
  }, 120)
}

const setupObserver = () => {
  if (!isBrowser || typeof IntersectionObserver === 'undefined') {
    setActiveFromScroll()
    return
  }

  observer?.disconnect()
  observer = new IntersectionObserver((entries) => {
    const visibleEntries = entries.filter(entry => entry.isIntersecting)

    if (visibleEntries.length) {
      visibleEntries.sort((left, right) => {
        if (right.intersectionRatio !== left.intersectionRatio) {
          return right.intersectionRatio - left.intersectionRatio
        }

        return left.boundingClientRect.top - right.boundingClientRect.top
      })

      activeId.value = visibleEntries[0]?.target.id || activeId.value
      return
    }

    if (rafId !== null) {
      cancelAnimationFrame(rafId)
    }

    rafId = requestAnimationFrame(setActiveFromScroll)
  }, {
    rootMargin: `-${Math.round(Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--docs-header-height')) || 64)}px 0px -60% 0px`,
    threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
  })

  sectionTargets().forEach((section) => {
    if (observedIds.has(section.id)) {
      return
    }

    observer?.observe(section)
    observedIds.add(section.id)
  })

  setActiveFromScroll()
}

onMounted(() => {
  if (!isBrowser) {
    return
  }

  setupObserver()
  window.addEventListener('scroll', scheduleFallback, { passive: true })
  window.addEventListener('resize', scheduleFallback, { passive: true })
})

watch(tocLinks, () => {
  if (!isBrowser) {
    return
  }

  nextTick(() => {
    activeId.value = ''
    observedIds.clear()
    setupObserver()
  })
}, { flush: 'post' })

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null

  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  if (fallbackTimer !== null) {
    window.clearTimeout(fallbackTimer)
    fallbackTimer = null
  }

  if (isBrowser) {
    window.removeEventListener('scroll', scheduleFallback)
    window.removeEventListener('resize', scheduleFallback)
  }
})
</script>

<template>
  <aside class="docs-toc-shell" aria-label="文章目录">
    <details class="docs-toc-mobile lg:hidden">
      <summary>
        <span>{{ toc?.title || '本页目录' }}</span>
        <UIcon name="i-lucide-chevron-down" />
      </summary>
      <nav class="docs-toc-links">
        <NuxtLink
          v-for="link in tocLinks"
          :key="link.id"
          :to="link.to"
          :class="{ 'docs-toc-link-nested': link.depth, 'is-active': activeId === link.id }"
          :aria-current="activeId === link.id ? 'location' : undefined"
          @click="activeId = link.id"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </details>

    <div class="hidden lg:block">
      <p class="docs-toc-title">{{ toc?.title || '本页目录' }}</p>
      <nav class="docs-toc-links">
        <NuxtLink
          v-for="link in tocLinks"
          :key="link.id"
          :to="link.to"
          :class="{ 'docs-toc-link-nested': link.depth, 'is-active': activeId === link.id }"
          :aria-current="activeId === link.id ? 'location' : undefined"
          @click="activeId = link.id"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div v-if="tags?.length" class="docs-toc-bottom">
        <USeparator type="dashed" />
        <p class="docs-toc-label">标签</p>
        <div class="docs-toc-tags">
          <UBadge
            v-for="tag in tags"
            :key="tag"
            color="neutral"
            variant="outline"
            size="sm"
          >
            {{ tag }}
          </UBadge>
        </div>
      </div>
    </div>
  </aside>
</template>
