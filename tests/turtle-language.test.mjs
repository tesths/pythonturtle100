// Language-feature coverage for the Python-subset interpreter.
// Each test drives runTurtle with a small program and asserts on the recording
// surface, so the *semantics* (state + emitted ops) are pinned, not just "no throw".
import assert from 'node:assert/strict'
import test from 'node:test'
import { runTurtle, tokenizeLines } from '../app/utils/turtle-interpreter.js'

function recorder() {
  const rec = { lines: [], dots: [], texts: [], fills: [], moves: [] }
  const surface = {
    drawLine(x1, y1, x2, y2) { rec.lines.push({ x1, y1, x2, y2 }) },
    drawDot(x, y, r, c) { rec.dots.push({ x, y, r, c }) },
    drawText(x, y, t) { rec.texts.push({ x, y, t }) },
    beginPath() {}, endFill(c) { rec.fills.push(c) },
    moveCursor(x, y) { rec.moves.push({ x, y }) },
    drawTurtle() {}, setSpeed() {}, clear() {},
  }
  return { rec, surface }
}
const run = (src) => { const { rec, surface } = recorder(); runTurtle(src, { surface }); return rec }
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps

// --- loops ----------------------------------------------------------------
test('for/range: 1-, 2-, 3-arg range drive the loop body the right number of times', () => {
  assert.equal(run('import turtle as t\nfor i in range(4):\n  t.fd(1)').lines.length, 4)
  assert.equal(run('import turtle as t\nfor i in range(2,5):\n  t.fd(1)').lines.length, 3)
  assert.equal(run('import turtle as t\nfor i in range(0,10,3):\n  t.fd(1)').lines.length, 4) // 0,3,6,9
  assert.equal(run('import turtle as t\nfor i in range(10,0,-2):\n  t.fd(1)').lines.length, 5) // 10,8,6,4,2
})

test('while loop with accumulating counter', () => {
  const rec = run('import turtle as t\nx = 0\nwhile x < 50:\n  t.fd(1)\n  x += 10')
  assert.equal(rec.lines.length, 5)
})

test('break and continue control loop flow', () => {
  assert.equal(run('import turtle as t\nfor i in range(10):\n  if i == 3: break\n  t.fd(1)').lines.length, 3)
  const rec = run('import turtle as t\nfor i in range(5):\n  if i == 2: continue\n  t.fd(1)')
  assert.equal(rec.lines.length, 4)
})

test('nested loops multiply iteration count', () => {
  assert.equal(run('import turtle as t\nfor i in range(3):\n  for j in range(2):\n    t.fd(1)').lines.length, 6)
})

// --- functions ------------------------------------------------------------
test('def with parameters returns a value usable in an expression', () => {
  const rec = run('import turtle as t\ndef add(a, b):\n  return a + b\nt.fd(add(30, 20))')
  assert.ok(near(rec.lines[0].x2, 50))
})

test('def called multiple times, parameters are local', () => {
  const rec = run('import turtle as t\ndef sq(n):\n  for i in range(4):\n    t.fd(n)\n    t.rt(90)\nsq(50)\nsq(30)')
  assert.equal(rec.lines.length, 8)
})

test('recursive def computes correctly (factorial via turtle distance)', () => {
  const rec = run('import turtle as t\ndef fact(n):\n  if n <= 1:\n    return 1\n  return n * fact(n - 1)\nt.fd(fact(4))') // 24
  assert.ok(near(rec.lines[0].x2, 24))
})

// --- conditionals ---------------------------------------------------------
test('if / elif / else selects exactly one branch', () => {
  assert.equal(run('import turtle as t\nx = 5\nif x < 0:\n  t.fd(1)\nelif x == 5:\n  t.fd(2)\nelse:\n  t.fd(3)').lines.length, 1)
  const rec = run('import turtle as t\nx = 5\nif x < 0:\n  t.fd(1)\nelif x == 5:\n  t.fd(2)\nelse:\n  t.fd(3)')
  assert.ok(near(rec.lines[0].x2, 2))
})

// --- operators ------------------------------------------------------------
test('arithmetic precedence: + - * / // % ** and unary minus', () => {
  const rec = run('import turtle as t\n' +
    't.fd(2 + 3 * 4)\n' +      // 14
    't.fd((2 + 3) * 4)\n' +    // 20 (delta)
    't.fd(2 ** 3)\n' +         // 8
    't.fd(17 // 5)\n' +        // 3
    't.fd(17 % 5)\n' +         // 2
    't.fd(-3)\n')
  const deltas = rec.lines.map((l, i, arr) => {
    const px = i === 0 ? 0 : arr[i - 1].x2
    return l.x2 - px
  })
  assert.ok(near(deltas[0], 14))
  assert.ok(near(deltas[1], 20))
  assert.ok(near(deltas[2], 8))
  assert.ok(near(deltas[3], 3))
  assert.ok(near(deltas[4], 2))
  assert.ok(near(deltas[5], -3))
})

test('comparison and boolean operators (and/or/not) with short-circuit', () => {
  assert.equal(run('import turtle as t\nif 1 < 2 and 3 > 2:\n  t.fd(1)').lines.length, 1)
  assert.equal(run('import turtle as t\nif 1 > 2 or 3 > 2:\n  t.fd(1)').lines.length, 1)
  assert.equal(run('import turtle as t\nif not False:\n  t.fd(1)').lines.length, 1)
  assert.equal(run('import turtle as t\nif 1 > 2 and (1/0):\n  t.fd(1)').lines.length, 0) // short-circuit avoids div0
})

test('augmented assignment operators update in place', () => {
  const rec = run('import turtle as t\nx = 10\nx += 5\nx -= 3\nx *= 2\nx //= 4\nt.fd(x)') // ((10+5-3)*2)//4 = 6
  assert.ok(near(rec.lines[0].x2, 6))
})

// --- data -----------------------------------------------------------------
test('list literals, indexing, len, and iteration', () => {
  assert.equal(run('import turtle as t\nxs = [10, 20, 30]\nt.fd(len(xs))').lines.length, 1)
  const rec = run('import turtle as t\nxs = [10, 20, 30]\nfor x in xs:\n  t.fd(x)')
  assert.equal(rec.lines.length, 3)
  const r2 = run('import turtle as t\nxs = [10, 20]\nt.fd(xs[0] + xs[1])')
  assert.ok(near(r2.lines[0].x2, 30))
})

test('builtins: abs/min/max/int/float/round/len/range', () => {
  const rec = run('import turtle as t\n' +
    't.fd(abs(-7))\n' + 't.fd(min(3, 5))\n' + 't.fd(max(3, 5))\n' +
    't.fd(int(2.9))\n' + 't.fd(round(2.5))\n')
  assert.ok(near(rec.lines[0].x2, 7))
})

// --- strings / print / comments ------------------------------------------
test('string literals concatenate and can be written', () => {
  const rec = run('import turtle as t\ns = "ab" + "cd"\nt.write(s)')
  assert.equal(rec.texts[0].t, 'abcd')
})

test('print accepts multiple args without throwing', () => {
  assert.doesNotThrow(() => run('import turtle as t\nprint("a", 1, 2.5, True)'))
})

test('comments and blank lines are ignored; # inside a string is not a comment', () => {
  const lines = tokenizeLines('x = "#notcomment"  # real comment\n\n# only comment\n')
  assert.equal(lines.length, 1)
})

test('semicolons separate statements on one line', () => {
  assert.equal(run('import turtle as t\nt.fd(1); t.fd(1); t.fd(1)').lines.length, 3)
})

// --- scoping --------------------------------------------------------------
test('loop/if body assignments rebind the enclosing variable (Python scope)', () => {
  const rec = run('import turtle as t\ns = 0\nfor i in range(4):\n  s = s + 10\nt.fd(s)')
  assert.ok(near(rec.lines[0].x2, 40))
})

// --- error handling -------------------------------------------------------
test('using an undefined name raises a helpful error', () => {
  assert.throws(() => run('import turtle as t\nt.fd(q)'), /未定义|undefined/)
})

test('unknown character raises a syntax error with line info', () => {
  assert.throws(() => run('import turtle as t\nt.fd(1) $ 2'), /行|line/)
})

// --- import forms ---------------------------------------------------------
test('import turtle / import turtle as t / from turtle import * / from turtle import fd', () => {
  assert.equal(run('import turtle\nturtle.fd(10)').lines.length, 1)
  assert.equal(run('import turtle as t\nt.fd(10)').lines.length, 1)
  assert.equal(run('from turtle import *\nfd(10)').lines.length, 1)
  assert.equal(run('from turtle import fd, rt\nfd(10)\nrt(90)').lines.length, 1)
})
