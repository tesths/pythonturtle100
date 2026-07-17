const FALLBACK_SITE_URL = 'https://pythonturtle100.pages.dev'

function normalizeSiteUrl(value) {
  const candidate = String(value || '').trim() || FALLBACK_SITE_URL
  const url = new URL(candidate)

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`SITE_URL must use HTTP or HTTPS: ${candidate}`)
  }

  return url.origin
}

const siteConfig = Object.freeze({
  url: normalizeSiteUrl(process.env.SITE_URL),
  title: '玩转Python海龟绘图',
  subtitle: '带你玩转编程',
  description: 'Python 海龟绘图教程、题解、分类与标签归档。',
  menu: [
    { label: '首页', to: '/' },
    { label: '海龟绘图 100 题', to: '/category/turtle100/' },
    { label: '海龟绘图详解', to: '/category/turtle-detailed/' },
    { label: '常用方法索引', to: '/category/widely-used-functions/' },
    { label: '常用工具', to: '/category/common-tools/' },
    { label: '标签', to: '/tag/' }
  ]
})

export default siteConfig
