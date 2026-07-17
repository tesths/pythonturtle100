import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { basename, join, relative } from 'node:path'
import { marked } from 'marked'
import { parse as parseYaml } from 'yaml'
import siteConfig from '../site.config.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const POSTS_DIR = join(ROOT, 'content', 'posts')
const TAXONOMY_FILE = join(ROOT, 'content', 'taxonomy_terms.json')
const OUT_DIR = join(ROOT, 'content-data')

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function listMarkdown(dir) {
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter((file) => file.endsWith('.md') && !file.startsWith('_'))
    .map((file) => join(dir, file))
}

function parseFrontMatter(text) {
  const yamlMatch = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (yamlMatch) {
    return {
      data: parseYaml(yamlMatch[1]) || {},
      body: yamlMatch[2].trim()
    }
  }

  const tomlMatch = text.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n?([\s\S]*)$/)
  if (!tomlMatch) {
    return { data: {}, body: text }
  }

  const data = {}
  for (const line of tomlMatch[1].split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const split = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*(.*)$/)
    if (!split) continue
    const [, key, rawValue] = split
    data[key] = parseTomlValue(rawValue.trim())
  }

  return { data, body: tomlMatch[2].trim() }
}

function renderMarkdown(body) {
  return marked.parse(String(body || ''), {
    gfm: true,
    breaks: false,
    async: false
  })
}

function parseTomlValue(raw) {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
  if (raw.startsWith('[')) {
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw)
    } catch {
      return raw.slice(1, -1)
    }
  }
  return raw
}

function stripHtml(html) {
  return html
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function extractFirstImageSrc(html) {
  const match = String(html || '').match(/<img\b[^>]*\bsrc=(['"])(.*?)\1[^>]*>/i)
  if (!match) return ''

  const src = decodeEntities(match[2]).trim()
  if (!src) return ''
  if (src.startsWith('data:')) return ''
  return src
}

function resolveThumbnail(data, body) {
  return data.thumbnail || extractFirstImageSrc(body) || ''
}

function makeSummary(html) {
  const text = stripHtml(html)
  return text.length > 120 ? `${text.slice(0, 120)}...` : text
}

function normalizePath(url) {
  if (!url || url === '/') return '/'
  const noHash = String(url).split('#')[0].split('?')[0]
  return noHash.startsWith('/') ? noHash : `/${noHash}`
}

function siteUrl(pathname) {
  const normalized = normalizePath(pathname)
  return normalized === '/' ? `${siteConfig.url}/` : `${siteConfig.url}${normalized}`
}

function xmlEscape(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toRfc2822(value) {
  if (!value) return new Date().toUTCString()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString()
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function buildSitemapXml(entries) {
  const body = entries
    .map(({ loc, lastmod }) => {
      const lines = ['  <url>', `    <loc>${xmlEscape(loc)}</loc>`]
      if (lastmod) lines.push(`    <lastmod>${xmlEscape(lastmod)}</lastmod>`)
      lines.push('  </url>')
      return lines.join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

function buildRssXml(posts) {
  const items = posts
    .map((post) => {
      const categoriesXml = [...post.categories, ...post.tags]
        .map((value) => `    <category>${xmlEscape(value)}</category>`)
        .join('\n')
      return [
        '  <item>',
        `    <title>${xmlEscape(post.title)}</title>`,
        `    <link>${xmlEscape(siteUrl(post.url))}</link>`,
        `    <guid isPermaLink="true">${xmlEscape(siteUrl(post.url))}</guid>`,
        `    <pubDate>${xmlEscape(toRfc2822(post.date || post.lastmod))}</pubDate>`,
        `    <description>${xmlEscape(post.summary)}</description>`,
        categoriesXml,
        '  </item>'
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>${xmlEscape(siteConfig.title)}</title>\n  <link>${xmlEscape(`${siteConfig.url}/`)}</link>\n  <description>${xmlEscape(siteConfig.description)}</description>\n  <language>zh-CN</language>\n  <lastBuildDate>${xmlEscape(toRfc2822(posts[0]?.date || posts[0]?.lastmod))}</lastBuildDate>\n${items}\n</channel>\n</rss>\n`
}

function slugFromUrl(url) {
  return normalizePath(url).replace(/^\/|\/$/g, '')
}

function slugifyHeading(text, fallback) {
  const normalized = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || fallback
}

function enhanceHtml(html) {
  const toc = []
  const usedIds = new Map()
  let headingIndex = 0

  const withCodePanels = html
    .replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/gi, (_, attrs, code) => {
      return `<div class="nuxt-code-panel" data-code-panel><div class="nuxt-code-toolbar"><span>Python</span><button type="button" data-copy-code>复制</button></div><pre${attrs}>${code}</pre></div>`
    })
    .replace(/\sclass="wp-caption([^"]*)"/g, ' class="wp-caption$1 nuxt-content-figure"')

  const content = withCodePanels.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
    headingIndex += 1
    const label = decodeEntities(stripHtml(inner)).replace(/^#+\s*/, '').trim()
    const baseId = slugifyHeading(label, `section-${headingIndex}`)
    const count = usedIds.get(baseId) || 0
    usedIds.set(baseId, count + 1)
    const id = count ? `${baseId}-${count + 1}` : baseId
    const cleanAttrs = attrs.replace(/\s+id=(["']).*?\1/i, '')

    toc.push({
      label,
      id,
      to: `#${id}`,
      depth: Number(level) - 2
    })

    return `<h${level}${cleanAttrs} id="${id}"><a class="heading-anchor" href="#${id}" aria-hidden="true">#</a>${inner}</h${level}>`
  })

  return { content, toc }
}

function termKey(name) {
  return String(name || '').trim()
}

function readTaxonomy() {
  if (!existsSync(TAXONOMY_FILE)) {
    throw new Error(`Missing taxonomy file: ${TAXONOMY_FILE}`)
  }

  const taxonomy = JSON.parse(readFileSync(TAXONOMY_FILE, 'utf8'))
  if (!Array.isArray(taxonomy.categories) || !Array.isArray(taxonomy.tags)) {
    throw new Error('Taxonomy must contain categories and tags arrays')
  }
  return taxonomy
}

function toListPost(post) {
  const { content: _content, toc: _toc, ...summary } = post
  return summary
}

function groupByYear(posts) {
  const map = new Map()
  for (const post of posts) {
    const year = post.date ? String(post.date).slice(0, 4) : '未注明'
    if (!map.has(year)) map.set(year, [])
    map.get(year).push(post)
  }
  return [...map.entries()]
    .sort(([a], [b]) => String(b).localeCompare(String(a)))
    .map(([year, items]) => ({ year, count: items.length, posts: items }))
}

function paginateRoutes(baseUrl, totalItems, pageSize = 12) {
  const totalPages = Math.ceil(totalItems / pageSize)
  const routes = []
  for (let page = 2; page <= totalPages; page += 1) {
    routes.push(normalizePath(`${baseUrl}page/${page}/`))
  }
  return routes
}

ensureDir(OUT_DIR)

const taxonomy = readTaxonomy()
const categoriesByName = new Map(taxonomy.categories.map((item) => [termKey(item.name), item]))
const tagsByName = new Map(taxonomy.tags.map((item) => [termKey(item.name), item]))

const postsByUrl = new Map()
const postFiles = listMarkdown(POSTS_DIR)
if (!postFiles.length) {
  throw new Error(`No publishable Markdown sources found in ${POSTS_DIR}`)
}

for (const file of postFiles) {
  const { data, body } = parseFrontMatter(readFileSync(file, 'utf8'))
  if (data.draft === true) continue

  const fallbackSlug = basename(file, '.md')
  const url = normalizePath(data.url || `/${data.slug || fallbackSlug}/`)
  const slug = data.slug || slugFromUrl(url)
  const categories = Array.isArray(data.categories) ? data.categories : []
  const tags = Array.isArray(data.tags) ? data.tags : []
  const unknownCategories = categories.filter((name) => !categoriesByName.has(termKey(name)))
  const unknownTags = tags.filter((name) => !tagsByName.has(termKey(name)))
  if (unknownCategories.length || unknownTags.length) {
    throw new Error(`Unknown taxonomy in ${relative(ROOT, file)}: categories=[${unknownCategories.join(', ')}], tags=[${unknownTags.join(', ')}]`)
  }

  const renderedBody = renderMarkdown(body)
  const { content, toc } = enhanceHtml(renderedBody)
  if (postsByUrl.has(url)) {
    throw new Error(`Duplicate post URL ${url}: ${postsByUrl.get(url).sourceFile} and ${relative(ROOT, file)}`)
  }

  postsByUrl.set(url, {
    id: data.wordpress_id || data.id || slug,
    title: data.title || slug || fallbackSlug,
    date: data.date || '',
    lastmod: data.lastmod || data.date || '',
    url,
    slug,
    sourceFile: relative(ROOT, file),
    categories,
    tags,
    thumbnail: resolveThumbnail(data, renderedBody),
    content,
    toc,
    summary: data.description || data.summary || makeSummary(renderedBody)
  })
}

const posts = [...postsByUrl.values()]
  .sort((a, b) => String(b.date).localeCompare(String(a.date)))

const postsByCategory = new Map()
const postsByTag = new Map()
for (const post of posts) {
  for (const category of post.categories) {
    const key = termKey(category)
    if (!postsByCategory.has(key)) postsByCategory.set(key, [])
    postsByCategory.get(key).push(toListPost(post))
  }
  for (const tag of post.tags) {
    const key = termKey(tag)
    if (!postsByTag.has(key)) postsByTag.set(key, [])
    postsByTag.get(key).push(toListPost(post))
  }
}

const categoryOrder = new Map([
  ['海龟绘图 100 题', 0],
  ['海龟绘图详解', 1],
  ['常用方法索引', 2],
  ['常用工具', 3]
])

const categories = taxonomy.categories
  .map((item) => {
    const categoryPosts = postsByCategory.get(termKey(item.name)) || []
    return {
      ...item,
      count: categoryPosts.length,
      posts: categoryPosts
    }
  })
  .sort((left, right) => (categoryOrder.get(left.name) ?? 99) - (categoryOrder.get(right.name) ?? 99))

const tags = taxonomy.tags.map((item) => {
  const tagPosts = postsByTag.get(termKey(item.name)) || []
  return {
    ...item,
    count: tagPosts.length,
    posts: tagPosts
  }
})

const paginationSize = 12
const paginationRoutes = [
  ...paginateRoutes('/', posts.length, paginationSize),
  ...paginateRoutes('/posts/', posts.length, paginationSize),
  ...paginateRoutes('/archives/', posts.length, paginationSize),
  ...categories.flatMap((item) => paginateRoutes(item.url, item.posts.length, paginationSize)),
  ...tags.flatMap((item) => paginateRoutes(item.url, item.posts.length, paginationSize))
]

const routes = [
  '/',
  '/posts/',
  '/category/',
  '/tag/',
  '/archives/',
  ...posts.map((post) => post.url),
  ...categories.map((item) => item.url),
  ...tags.map((item) => item.url),
  ...paginationRoutes
].map(normalizePath)

const duplicateRoutes = routes.filter((route, index) => routes.indexOf(route) !== index)
if (duplicateRoutes.length) {
  throw new Error(`Duplicate generated routes: ${[...new Set(duplicateRoutes)].join(', ')}`)
}

const sitemapEntries = [...new Map(routes.map((route) => [route, { loc: siteUrl(route), lastmod: '' }])).values()]
for (const entry of sitemapEntries) {
  const routePath = normalizePath(new URL(entry.loc).pathname)
  const post = posts.find((item) => item.url === routePath)
  if (post) entry.lastmod = formatDate(post.lastmod || post.date)
}
const sitemapXml = buildSitemapXml(sitemapEntries)
const rssXml = buildRssXml(posts.slice(0, 20))

const site = {
  ...siteConfig,
  posts,
  categories,
  tags,
  archives: groupByYear(posts.map(toListPost)),
  routes
}

writeFileSync(join(OUT_DIR, 'site.json'), `${JSON.stringify(site, null, 2)}\n`)
writeFileSync(join(OUT_DIR, 'routes.json'), `${JSON.stringify(routes, null, 2)}\n`)
writeFileSync(join(ROOT, 'public', 'sitemap.xml'), sitemapXml)
writeFileSync(join(ROOT, 'public', 'rss.xml'), rssXml)

console.log(JSON.stringify({
  posts: posts.length,
  categories: categories.length,
  tags: tags.length,
  routes: routes.length,
  out: join(OUT_DIR, 'site.json'),
  sitemap: join(ROOT, 'public', 'sitemap.xml'),
  rss: join(ROOT, 'public', 'rss.xml')
}, null, 2))
