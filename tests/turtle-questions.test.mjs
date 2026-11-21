import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { runTurtle } from '../app/utils/turtle-interpreter.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const POSTS_DIR = join(ROOT, 'content', 'posts')

// Extract every turtle100 question's last ```python code block (the solution).
function loadSamples() {
  const samples = []
  for (const file of readdirSync(POSTS_DIR).filter((f) => /turtle100-\d+\.md$/.test(f))) {
    const md = readFileSync(join(POSTS_DIR, file), 'utf8')
    const blocks = [...md.matchAll(/```python\s*\n([\s\S]*?)```/g)].map((m) => m[1])
    if (blocks.length === 0) continue
    samples.push({ file, code: blocks[blocks.length - 1] })
  }
  return samples
}

function makeSurface() {
  const rec = { lines: 0, dots: 0, texts: 0, fills: 0 }
  return {
    rec,
    surface: {
      drawLine() { rec.lines += 1 },
      drawDot() { rec.dots += 1 },
      drawText() { rec.texts += 1 },
      beginPath() {},
      endFill() { rec.fills += 1 },
      drawTurtle() {},
      clear() {}
    }
  }
}

const samples = loadSamples()

test('there are 113 turtle question samples with code', () => {
  assert.equal(samples.length, 113, `expected 113 samples, found ${samples.length}`)
})

test('every question sample runs and produces drawing output', () => {
  for (const { file, code } of samples) {
    const { rec, surface } = makeSurface()
    assert.doesNotThrow(() => runTurtle(code, { surface }), `sample ${file} threw`)
    const drew = rec.lines + rec.dots + rec.texts + rec.fills
    assert.ok(drew > 0, `sample ${file} produced no drawing output`)
  }
})
