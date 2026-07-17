<script setup lang="ts">
const props = defineProps<{
  html: string
}>()

const root = ref<HTMLElement | null>(null)
let controller: AbortController | undefined

onMounted(() => {
  controller = new AbortController()

  root.value?.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest('[data-copy-code]') as HTMLButtonElement | null
    if (!button) return

    const panel = button.closest('[data-code-panel]')
    const code = panel?.querySelector('pre')?.textContent || ''
    await navigator.clipboard.writeText(code)
    const previous = button.textContent || '复制'
    button.textContent = '已复制'
    window.setTimeout(() => {
      button.textContent = previous
    }, 1400)
  }, { signal: controller.signal })
})

onBeforeUnmount(() => {
  controller?.abort()
})
</script>

<template>
  <section ref="root" class="post-content" v-html="props.html" />
</template>
