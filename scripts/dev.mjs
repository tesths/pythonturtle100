import { existsSync, mkdirSync, watch } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const POSTS_DIR = join(ROOT, 'content', 'posts')
const NUXT_BIN = join(ROOT, 'node_modules', '.bin', 'nuxt')

mkdirSync(POSTS_DIR, { recursive: true })

function buildContent() {
  return spawnSync(process.execPath, [join(ROOT, 'scripts', 'build-content.mjs')], {
    cwd: ROOT,
    stdio: 'inherit'
  }).status === 0
}

if (!buildContent()) {
  process.exit(1)
}

let timer
let building = false
let queued = false

function scheduleBuild() {
  clearTimeout(timer)
  timer = setTimeout(runBuild, 120)
}

function runBuild() {
  if (building) {
    queued = true
    return
  }

  building = true
  console.log('\n[content] Markdown changed, rebuilding article data...')
  buildContent()
  building = false

  if (queued) {
    queued = false
    scheduleBuild()
  }
}

const contentWatcher = watch(POSTS_DIR, { recursive: true }, (_event, filename) => {
  if (!filename || !filename.endsWith('.md')) return
  scheduleBuild()
})

const nuxt = spawn(NUXT_BIN, ['dev', ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit'
})

function shutdown(signal) {
  clearTimeout(timer)
  contentWatcher.close()
  if (!nuxt.killed) nuxt.kill(signal)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
nuxt.on('exit', (code) => {
  contentWatcher.close()
  process.exit(code ?? 0)
})
