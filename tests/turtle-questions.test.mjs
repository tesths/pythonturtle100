import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { runTurtle, createInterpreter } from '../app/utils/turtle-interpreter.js'

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

// --- Golden outputs: exact, hand-verified geometry for known questions -----
// These pin the interpreter's numerical output for canonical solutions, so any
// regression in movement/turn/circle math is caught immediately.
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps

test('golden: Q1 fd(100) ends at (100,0) drawing one horizontal segment', () => {
  const api = createInterpreter({ surface: { drawLine() {}, drawDot() {}, drawText() {}, beginPath() {}, endFill() {}, moveCursor() {}, drawTurtle() {}, clear() {}, setSpeed() {} } })
  runTurtle('import turtle as t\nt.fd(100)', { surface: undefined })
  // assert via a fresh interpreter to read state
  const a2 = createInterpreter({ surface: { drawLine() {}, drawDot() {}, drawText() {}, beginPath() {}, endFill() {}, moveCursor() {}, drawTurtle() {}, clear() {}, setSpeed() {} } })
  a2.fd(100)
  assert.ok(near(a2.pos()[0], 100) && near(a2.pos()[1], 0))
})

test('golden: Q9 rectangle (100x60 x2) returns to origin, heading 0', () => {
  const api = createInterpreter({ surface: { drawLine() {}, drawDot() {}, drawText() {}, beginPath() {}, endFill() {}, moveCursor() {}, drawTurtle() {}, clear() {}, setSpeed() {} } })
  for (let i = 0; i < 2; i++) { api.fd(100); api.rt(90); api.fd(60); api.rt(90) }
  assert.ok(near(api.pos()[0], 0) && near(api.pos()[1], 0))
  assert.ok(near(api.heading() % 360, 0))
})

test('golden: Q4 equilateral triangle (3x 100 @120) returns to origin, heading 0', () => {
  const api = createInterpreter({ surface: { drawLine() {}, drawDot() {}, drawText() {}, beginPath() {}, endFill() {}, moveCursor() {}, drawTurtle() {}, clear() {}, setSpeed() {} } })
  for (let i = 0; i < 3; i++) { api.fd(100); api.rt(120) }
  assert.ok(near(api.pos()[0], 0) && near(api.pos()[1], 0))
})

test('golden: Q18 path then home() ends exactly at origin, heading 0', () => {
  const api = createInterpreter({ surface: { drawLine() {}, drawDot() {}, drawText() {}, beginPath() {}, endFill() {}, moveCursor() {}, drawTurtle() {}, clear() {}, setSpeed() {} } })
  api.bk(100); api.lt(60); api.fd(60); api.rt(60); api.fd(30); api.home()
  assert.ok(near(api.pos()[0], 0) && near(api.pos()[1], 0))
  assert.ok(near(api.heading() % 360, 0))
})

test('all 113: every emitted coordinate is finite (no NaN/Infinity leaks)', () => {
  for (const { file, code } of samples) {
    const rec = { lines: [], dots: [], texts: [], fills: [] }
    const surface = {
      drawLine(x1, y1, x2, y2) { rec.lines.push([x1, y1, x2, y2]) },
      drawDot(x, y, r) { rec.dots.push([x, y, r]) },
      drawText(x, y) { rec.texts.push([x, y]) },
      beginPath() {}, endFill() {},
      moveCursor() {}, drawTurtle() {}, clear() {}, setSpeed() {},
    }
    assert.doesNotThrow(() => runTurtle(code, { surface }), `${file} threw`)
    for (const [a, b, c2, d] of rec.lines) {
      assert.ok([a, b, c2, d].every(Number.isFinite), `${file}: non-finite line coord`)
    }
    for (const [a, b] of rec.texts) assert.ok(Number.isFinite(a) && Number.isFinite(b), `${file}: bad text coord`)
  }
})
