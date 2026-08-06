import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const LOCAL_OUTPUT = join(ROOT, '.output', 'public')
const CLOUDFLARE_OUTPUT = join(ROOT, 'dist')
const outputCandidates = process.env.CF_PAGES
  ? [CLOUDFLARE_OUTPUT, LOCAL_OUTPUT]
  : [LOCAL_OUTPUT, CLOUDFLARE_OUTPUT]
const OUTPUT = outputCandidates.find(existsSync) || outputCandidates[0]

function upsertMeta(html, name, content) {
  const escaped = content.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  const tag = `<meta name="${name}" content="${escaped}">`
  const pattern = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, 'i')

  if (pattern.test(html)) return html.replace(pattern, tag)
  return html.replace('</head>', `${tag}</head>`)
}

function upsertTitle(html, title) {
  const escaped = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const tag = `<title>${escaped}</title>`

  if (/<title[^>]*>.*?<\/title>/i.test(html)) {
    return html.replace(/<title[^>]*>.*?<\/title>/i, tag)
  }

  return html.replace('</head>', `${tag}</head>`)
}

function patch404() {
  const path = join(OUTPUT, '404.html')
  if (!existsSync(path)) {
    throw new Error(`Missing 404.html in ${OUTPUT}`)
  }

  let html = readFileSync(path, 'utf8')
  html = upsertTitle(html, '页面未找到')
  html = upsertMeta(html, 'description', '这个页面不存在或已被移动。')
  html = upsertMeta(html, 'robots', 'noindex, nofollow')
  writeFileSync(path, html)
}

function patchCloudflareHeaders() {
  const path = join(OUTPUT, '_headers')
  const entry = '/404.html\n  X-Robots-Tag: noindex, nofollow\n'
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : ''
  if (existing.includes('/404.html') && existing.includes('X-Robots-Tag: noindex, nofollow')) return

  const next = existing.trim()
    ? `${existing.replace(/\s*$/, '\n\n')}${entry}`
    : entry
  writeFileSync(path, next)
}

patch404()
patchCloudflareHeaders()

console.log(JSON.stringify({ output: OUTPUT, patched: ['404.html', '_headers'] }, null, 2))
