export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate'
    },
    footer: {
      slots: {
        root: 'border-t border-default',
        left: 'text-sm text-muted'
      }
    }
  },
  seo: {
    siteName: '玩转Python海龟绘图'
  },
  header: {
    title: '玩转Python海龟绘图',
    to: '/',
    search: false,
    colorMode: false
  },
  footer: {
    credits: `© ${new Date().getFullYear()} 玩转Python海龟绘图`,
    colorMode: false
  },
  toc: {
    title: '本页目录'
  }
})
