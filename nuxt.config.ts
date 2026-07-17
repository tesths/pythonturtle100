import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const routesFile = './content-data/routes.json'
const prerenderRoutes = existsSync(routesFile)
  ? JSON.parse(readFileSync(routesFile, 'utf8'))
  : ['/']

export default defineNuxtConfig({
  ssr: true,

  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  alias: {
    '#content-data': fileURLToPath(new URL('./content-data', import.meta.url))
  },

  compatibilityDate: '2026-07-17',

  devtools: {
    enabled: false
  },

  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: '玩转Python海龟绘图',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Python 海龟绘图教程、题解、分类与标签归档。' },
        { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' }
      ]
    }
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: prerenderRoutes
    }
  },

  ui: {
    colorMode: false,
    fonts: false,
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error'],
      defaultVariants: {
        color: 'primary'
      }
    }
  },

  icon: {
    provider: 'none',
    fallbackToApi: false,
    clientBundle: {
      scan: true
    }
  },

  experimental: {
    asyncContext: true
  },

  future: {
    compatibilityVersion: 4
  }
})
