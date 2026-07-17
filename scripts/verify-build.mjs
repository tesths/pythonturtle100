import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const LOCAL_OUTPUT = join(ROOT, '.output', 'public')
const CLOUDFLARE_OUTPUT = join(ROOT, 'dist')
const outputCandidates = process.env.CF_PAGES
  ? [CLOUDFLARE_OUTPUT, LOCAL_OUTPUT]
  : [LOCAL_OUTPUT, CLOUDFLARE_OUTPUT]
const OUTPUT = outputCandidates.find(existsSync) || outputCandidates[0]
const SITE_FILE = join(ROOT, 'content-data', 'site.json')
const ROUTES_FILE = join(ROOT, 'content-data', 'routes.json')

const errors = []
const warnings = []

function check(condition, message) {
  if (!condition) errors.push(message)
}

function readJson(path) {
  check(existsSync(path), `Missing JSON file: ${path}`)
  if (!existsSync(path)) return null

  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    errors.push(`Invalid JSON ${path}: ${error.message}`)
    return null
  }
}

function outputFileForRoute(route) {
  if (route === '/') return join(OUTPUT, 'index.html')
  return join(OUTPUT, localPath(route).replace(/^\//, ''), 'index.html')
}

function localPath(url) {
  try {
    return decodeURIComponent(url.split('#')[0].split('?')[0])
  } catch {
    return url.split('#')[0].split('?')[0]
  }
}

const site = readJson(SITE_FILE)
const routes = readJson(ROUTES_FILE)

if (site && routes) {
  check(site.url?.startsWith('https://'), 'site.url must use HTTPS')
  check(Array.isArray(site.posts) && site.posts.length > 0, 'No published posts found')
  check(Array.isArray(routes) && routes.length > 0, 'No generated routes found')
  check(site.routes?.length === routes.length, 'site.json and routes.json route counts differ')

  const uniqueRoutes = new Set(routes)
  check(uniqueRoutes.size === routes.length, `Duplicate routes found (${routes.length - uniqueRoutes.size})`)

  for (const route of routes) {
    check(route === '/' || (route.startsWith('/') && route.endsWith('/')), `Route is not normalized: ${route}`)
    check(existsSync(outputFileForRoute(route)), `Missing prerendered route: ${route}`)
  }

  for (const post of site.posts) {
    check(post.url && uniqueRoutes.has(post.url), `Post route missing from route index: ${post.url || post.title}`)
    check(post.sourceFile?.startsWith('content/posts/'), `Post source is outside local content: ${post.sourceFile || post.title}`)
    check(existsSync(join(ROOT, post.sourceFile || '')), `Post source file missing: ${post.sourceFile || post.title}`)
  }

  const missingAssets = new Set()
  const missingInternalLinks = new Set()
  const tagPattern = /<(a|img|source)\b[^>]*?\b(href|src)=(['"])(.*?)\3/gi

  for (const post of site.posts) {
    for (const match of String(post.content || '').matchAll(tagPattern)) {
      const [, tagName, attribute, , rawUrl] = match
      if (!rawUrl.startsWith('/') || rawUrl.startsWith('//')) continue

      const pathname = localPath(rawUrl)
      if (!pathname || pathname === '/') continue

      if (attribute.toLowerCase() === 'href' && uniqueRoutes.has(pathname.endsWith('/') ? pathname : `${pathname}/`)) {
        continue
      }

      const filePath = join(ROOT, 'public', pathname.replace(/^\//, ''))
      if (existsSync(filePath)) continue

      if (tagName.toLowerCase() === 'a') missingInternalLinks.add(`${post.url} -> ${pathname}`)
      else missingAssets.add(`${post.url} -> ${pathname}`)
    }
  }

  check(missingAssets.size === 0, `Missing local assets:\n${[...missingAssets].join('\n')}`)
  check(missingInternalLinks.size === 0, `Missing internal links:\n${[...missingInternalLinks].join('\n')}`)

  const sitemapPath = join(OUTPUT, 'sitemap.xml')
  const rssPath = join(OUTPUT, 'rss.xml')
  const robotsPath = join(OUTPUT, 'robots.txt')
  check(existsSync(sitemapPath), 'Missing sitemap.xml in deploy output')
  check(existsSync(rssPath), 'Missing rss.xml in deploy output')
  check(existsSync(robotsPath), 'Missing robots.txt in deploy output')
  check(existsSync(join(OUTPUT, '404.html')), 'Missing 404.html in deploy output')

  if (existsSync(sitemapPath)) {
    const sitemap = readFileSync(sitemapPath, 'utf8')
    const urlCount = (sitemap.match(/<url>/g) || []).length
    const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
    check(urlCount === routes.length, `Sitemap URL count ${urlCount} does not match route count ${routes.length}`)
    check(sitemapUrls.length === routes.length, `Sitemap loc count ${sitemapUrls.length} does not match route count ${routes.length}`)
    check(sitemapUrls.every((url) => url === site.url || url.startsWith(`${site.url}/`)), `Sitemap contains URLs outside ${site.url}`)
  }

  if (existsSync(robotsPath)) {
    const robots = readFileSync(robotsPath, 'utf8')
    check(robots.includes(`Sitemap: ${site.url}/sitemap.xml`), 'robots.txt sitemap URL does not match site.url')
  }

  if (existsSync(rssPath)) {
    const rss = readFileSync(rssPath, 'utf8')
    const itemCount = (rss.match(/<item>/g) || []).length
    check(itemCount > 0 && itemCount <= 20, `Unexpected RSS item count: ${itemCount}`)
    check(rss.includes(`<link>${site.url}/</link>`), 'RSS site URL does not match site.url')
  }

  const siteDataBytes = statSync(SITE_FILE).size
  console.log(JSON.stringify({
    posts: site.posts.length,
    categories: site.categories.length,
    tags: site.tags.length,
    routes: routes.length,
    siteUrl: site.url,
    siteDataBytes,
    output: OUTPUT,
    warnings
  }, null, 2))
}

if (errors.length) {
  console.error('\nDeployment verification failed:')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log('\nDeployment verification passed.')
