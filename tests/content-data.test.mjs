import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SITE_FILE = join(ROOT, 'content-data', 'site.json')
const ROUTES_FILE = join(ROOT, 'content-data', 'routes.json')
const POST_DETAILS_DIR = join(ROOT, 'content-data', 'posts')
const POSTS_DIR = join(ROOT, 'content', 'posts')

function readJson(path) {
  assert.equal(existsSync(path), true, `Expected generated file to exist: ${path}`)
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readPostDetails(post) {
  assert.ok(post.contentFile, `${post.title} should reference a generated content file`)
  return readJson(join(POST_DETAILS_DIR, post.contentFile))
}

test('generated route indexes stay in sync', () => {
  const site = readJson(SITE_FILE)
  const routes = readJson(ROUTES_FILE)

  assert.ok(Array.isArray(site.routes), 'site.routes should be an array')
  assert.ok(Array.isArray(routes), 'routes.json should contain an array')
  assert.equal(site.routes.length, routes.length)
  assert.equal(new Set(routes).size, routes.length, 'routes should be unique')
  assert.deepEqual(site.routes, routes)
})

test('published posts have normalized routes and local source files', () => {
  const site = readJson(SITE_FILE)
  const routes = new Set(readJson(ROUTES_FILE))

  assert.ok(site.posts.length > 0, 'expected at least one published post')

  for (const post of site.posts) {
    assert.match(post.url, /^\/.+\/$/, `${post.title} should use a normalized route`)
    assert.equal(routes.has(post.url), true, `${post.url} should be prerendered`)
    assert.match(post.contentFile, /^[^/]+\.json$/, `${post.title} should reference local post content JSON`)
    assert.match(post.sourceFile, /^content\/posts\/[^/]+\.md$/, `${post.title} should come from content/posts`)
    assert.equal(existsSync(join(ROOT, post.sourceFile)), true, `${post.sourceFile} should exist`)
    assert.equal(existsSync(join(POST_DETAILS_DIR, post.contentFile)), true, `${post.contentFile} should exist`)
  }
})

test('taxonomy and index routes are present', () => {
  const site = readJson(SITE_FILE)
  const routes = new Set(readJson(ROUTES_FILE))

  for (const route of ['/', '/posts/', '/category/', '/tag/', '/archives/']) {
    assert.equal(routes.has(route), true, `${route} should be prerendered`)
  }

  for (const group of [site.categories, site.tags]) {
    assert.ok(Array.isArray(group), 'taxonomy groups should be arrays')
    for (const term of group) {
      assert.equal(routes.has(term.url), true, `${term.url} should be prerendered`)
      assert.ok(term.count > 0, `${term.name} should have posts`)
    }
  }
})

test('post sources use Nuxt-native Markdown and assets', () => {
  const postFiles = readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith('.md') && file !== '_template.md')
    .map((file) => join(POSTS_DIR, file))

  assert.ok(postFiles.length > 0, 'expected Markdown source files')

  const legacyPattern = /(\+\+\+|wordpress_|wp_meta_|wp-content|wp-caption|wp-image)/i
  const htmlPattern = /<\/?(figure|figcaption|img|pre|h[1-6]|div|span|ul|li|strong|em|b|a)\b/i
  const imagePattern = /!\[([^\]]*)]\((\/images\/posts\/[^)]+)\)/g

  for (const file of postFiles) {
    const source = readFileSync(file, 'utf8')
    assert.match(source, /^---\n/, `${file} should use YAML front matter`)
    assert.doesNotMatch(source, legacyPattern, `${file} should not contain legacy migration markers`)
    assert.doesNotMatch(source, htmlPattern, `${file} should use Markdown instead of source HTML tags`)

    let inFence = false
    for (const line of source.split('\n')) {
      if (!line.startsWith('```')) continue
      if (!inFence) assert.equal(line.trim(), '```python', `${file} code fences should be tagged as python`)
      else assert.equal(line.trim(), '```', `${file} code fences should close plainly`)
      inFence = !inFence
    }
    assert.equal(inFence, false, `${file} should not leave a code fence open`)

    for (const match of source.matchAll(imagePattern)) {
      const [, alt, path] = match
      assert.notEqual(alt.trim(), '', `${file} image should have readable alt text`)
      assert.equal(existsSync(join(ROOT, 'public', path.replace(/^\//, ''))), true, `${file} image asset should exist: ${path}`)
    }
  }
})

test('generated posts reference Nuxt-native thumbnails and content assets', () => {
  const site = readJson(SITE_FILE)

  for (const post of site.posts) {
    const details = readPostDetails(post)
    assert.doesNotMatch(details.content, /wp-content|wp-caption|wp-image/i, `${post.url} should not render legacy asset markup`)
    if (post.thumbnail) {
      assert.match(post.thumbnail, /^\/images\/posts\//, `${post.url} thumbnail should use the Nuxt image directory`)
      assert.equal(existsSync(join(ROOT, 'public', post.thumbnail.replace(/^\//, ''))), true, `${post.url} thumbnail should exist`)
    }
  }
})

test('draw-polygon math renders as KaTeX', () => {
  const site = readJson(SITE_FILE)
  const post = site.posts.find((item) => item.url === '/draw-polygon/')
  assert.ok(post, 'draw-polygon post should exist')

  const details = readPostDetails(post)
  assert.match(details.content, /class="katex"/, '/draw-polygon/ should render math with KaTeX markup')
  assert.doesNotMatch(details.content, /\$[^<]*\\frac|\$\(n|\$d\s*=/, '/draw-polygon/ should not leave raw inline TeX in HTML')
  assert.doesNotMatch(details.content, /3<em>120=4<\/em>90/, '/draw-polygon/ should not parse multiplication signs as emphasis')
})
