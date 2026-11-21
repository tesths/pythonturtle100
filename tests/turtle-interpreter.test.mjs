import assert from 'node:assert/strict'
import test from 'node:test'
import { createInterpreter, runTurtle, tokenizeLines, TurtleSyntaxError } from '../app/utils/turtle-interpreter.js'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

// A recording surface that captures every primitive the interpreter emits,
// so tests can assert both turtle STATE (via api.__state) and drawing OUTPUT.
function makeSurface() {
  const rec = {
    lines: [], dots: [], texts: [], fills: [], moves: [], speeds: [], begins: 0, clears: 0, turtle: null
  }
  const surface = {
    drawLine(x1, y1, x2, y2, color, width) { rec.lines.push({ x1, y1, x2, y2, color, width }) },
    drawDot(x, y, r, color) { rec.dots.push({ x, y, r, color }) },
    drawText(x, y, text, color) { rec.texts.push({ x, y, text, color }) },
    beginPath() { rec.begins += 1 },
    endFill(color) { rec.fills.push({ color }) },
    moveCursor(x, y, heading, penDown) { rec.moves.push({ x, y, heading, penDown }) },
    setSpeed(sp) { rec.speeds.push(sp) },
    drawTurtle(x, y, heading, visible) { rec.turtle = { x, y, heading, visible } },
    clear() { rec.clears += 1 }
  }
  return { rec, surface }
}

// Build an interpreter with a recording surface; returns { api, rec }.
function tt() {
  const { rec, surface } = makeSurface()
  const api = createInterpreter({ surface })
  return { api, rec }
}

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps
function assertPoint(actual, expX, expY, eps = 1e-6, msg = '') {
  assert.ok(near(actual[0], expX, eps) && near(actual[1], expY, eps),
    `${msg} expected (${expX}, ${expY}), got (${actual[0]}, ${actual[1]})`)
}
function assertHeading(api, expected, msg = '') {
  const h = api.heading()
  // compare modulo 360
  const d = ((h - expected) % 360 + 540) % 360 - 180
  assert.ok(Math.abs(d) < 1e-6, `${msg} expected heading ${expected}, got ${h}`)
}

// ---------------------------------------------------------------------------
// Initial state / orientation
// ---------------------------------------------------------------------------

test('initial state: at origin, heading 0 (east), pen down, visible', () => {
  const { api } = tt()
  assertPoint(api.pos(), 0, 0)
  assertHeading(api, 0)
  assert.equal(api.isdown(), true)
  assert.equal(api.isvisible(), true)
  assert.equal(api.pensize(), 1)
})

// ---------------------------------------------------------------------------
// Movement: fd / forward / bk / back / backward
// ---------------------------------------------------------------------------

test('fd draws east from origin by default heading', () => {
  const { api, rec } = tt()
  api.fd(100)
  assertPoint(api.pos(), 100, 0)
  assert.equal(rec.lines.length, 1)
  assert.deepEqual([rec.lines[0].x1, rec.lines[0].y1, rec.lines[0].x2, rec.lines[0].y2], [0, 0, 100, 0])
})

test('forward alias equals fd', () => {
  const { api } = tt()
  api.forward(50)
  assertPoint(api.pos(), 50, 0)
})

test('fd respects heading (turn then move)', () => {
  const { api } = tt()
  api.rt(90)          // heading -90 => pointing south (y down)
  api.fd(10)
  assertPoint(api.pos(), 0, -10)
})

test('bk / back / backward move opposite the heading', () => {
  for (const name of ['bk', 'back', 'backward']) {
    const { api } = tt()
    api[name](80)
    assertPoint(api.pos(), -80, 0, 1e-6, `${name}:`)
  }
})

test('fd with negative distance moves backward', () => {
  const { api } = tt()
  api.fd(-25)
  assertPoint(api.pos(), -25, 0)
})

// ---------------------------------------------------------------------------
// Turning: rt / right / lt / left / seth / setheading / heading / home
// ---------------------------------------------------------------------------

test('rt decreases heading, lt increases heading', () => {
  const { api } = tt()
  api.rt(90); assertHeading(api, -90)
  api.lt(30); assertHeading(api, -60)
})

test('right / left aliases', () => {
  const { api } = tt()
  api.right(45); assertHeading(api, -45)
  api.left(45); assertHeading(api, 0)
})

test('seth / setheading sets absolute heading; heading() normalizes to 0..360', () => {
  const { api } = tt()
  api.seth(270); assertHeading(api, 270)
  api.setheading(-90); assertHeading(api, 270)   // -90 normalized => 270
  api.seth(450); assertHeading(api, 90)
  assert.equal(api.heading(), 90)
})

test('home resets position to origin and heading to 0', () => {
  const { api } = tt()
  api.fd(30); api.rt(50)
  api.home()
  assertPoint(api.pos(), 0, 0)
  assertHeading(api, 0)
})

test('home draws a line back to origin when pen is down', () => {
  const { api, rec } = tt()
  api.fd(40)
  const before = rec.lines.length
  api.home()
  assert.equal(rec.lines.length, before + 1)
  assert.deepEqual([rec.lines.at(-1).x2, rec.lines.at(-1).y2], [0, 0])
})

// ---------------------------------------------------------------------------
// Pen up/down: pu / penup / up / pd / pendown / down / isdown
// ---------------------------------------------------------------------------

test('pen up suppresses drawing but still moves; pen down resumes', () => {
  const { api, rec } = tt()
  api.pu()
  assert.equal(api.isdown(), false)
  api.fd(50)
  assert.equal(rec.lines.length, 0, 'no line while pen up')
  assertPoint(api.pos(), 50, 0)
  api.pd()
  assert.equal(api.isdown(), true)
  api.fd(10)
  assert.equal(rec.lines.length, 1)
})

test('penup/up and pendown/down aliases', () => {
  const { api } = tt()
  api.penup(); assert.equal(api.isdown(), false)
  api.up(); assert.equal(api.isdown(), false)
  api.pendown(); assert.equal(api.isdown(), true)
  api.down(); assert.equal(api.isdown(), true)
})

// ---------------------------------------------------------------------------
// goto family: goto / setpos / setposition / setx / sety / teleport
// ---------------------------------------------------------------------------

test('goto moves and draws to target', () => {
  const { api, rec } = tt()
  api.goto(30, 40)
  assertPoint(api.pos(), 30, 40)
  assert.deepEqual([rec.lines.at(-1).x2, rec.lines.at(-1).y2], [30, 40])
})

test('setpos / setposition aliases', () => {
  const { api } = tt()
  api.setpos(10, 10); assertPoint(api.pos(), 10, 10)
  api.setposition(-5, 7); assertPoint(api.pos(), -5, 7)
})

test('setx / sety change one coordinate only', () => {
  const { api } = tt()
  api.goto(10, 20)
  api.setx(50); assertPoint(api.pos(), 50, 20)
  api.sety(60); assertPoint(api.pos(), 50, 60)
})

test('teleport moves without turning; draws if pen down', () => {
  const { api, rec } = tt()
  api.pd()
  const before = rec.lines.length
  api.teleport(15, 15)
  assertPoint(api.pos(), 15, 15)
  assert.equal(rec.lines.length, before + 1)
})

// ---------------------------------------------------------------------------
// Query helpers: pos / position / xcor / ycor / distance / towards
// ---------------------------------------------------------------------------

test('pos / position / xcor / ycor', () => {
  const { api } = tt()
  api.goto(12, 34)
  assertPoint(api.pos(), 12, 34)
  assertPoint(api.position(), 12, 34)
  assert.equal(api.xcor(), 12)
  assert.equal(api.ycor(), 34)
})

test('distance and towards', () => {
  const { api } = tt()
  assert.ok(near(api.distance(3, 4), 5))
  // towards returns atan2 degrees
  assert.ok(near(api.towards(1, 0), 0))
  assert.ok(near(api.towards(0, 1), 90))
})

// ---------------------------------------------------------------------------
// circle: rect/textbook math + end state
// ---------------------------------------------------------------------------

test('circle(50): returns to start, ends with heading rotated 360, radius ~50', () => {
  const { api, rec } = tt()
  const start = api.pos()
  api.circle(50)
  assertPoint(api.pos(), start[0], start[1], 1e-6, 'circle full turn returns to start:')
  assertHeading(api, 0) // +360 => 0
  // All points should sit ~50 from centre (centre at (0,50) for heading 0 → left is +y)
  const cx = 0, cy = 50
  for (const seg of rec.lines) {
    const d = Math.hypot(seg.x2 - cx, seg.y2 - cy)
    assert.ok(Math.abs(d - 50) < 0.5, `point not ~50 from centre: r=${d}`)
  }
})

test('circle negative radius sweeps the other way (centre on the right)', () => {
  const { api } = tt()
  api.circle(-50)
  // centre should be (0,-50); still returns to start
  assertPoint(api.pos(), 0, 0, 1e-6)
  assertHeading(api, 0)
})

test('circle with extent 180 is a semicircle and rotates heading by 180', () => {
  const { api } = tt()
  api.circle(50, 180)
  assertHeading(api, 180)
  // end point is diameter away from start on a semicircle: (0, 100) for centre (0,50)
  assertPoint(api.pos(), 0, 100, 1e-6)
})

test('circle honours explicit steps (regular polygon vertex count)', () => {
  const { api, rec } = tt()
  api.circle(50, 360, 4) // square-ish, 4 steps
  assert.equal(rec.lines.length, 4)
})

test('circle(0) draws nothing', () => {
  const { api, rec } = tt()
  api.circle(0)
  assert.equal(rec.lines.length, 0)
  assertPoint(api.pos(), 0, 0)
})

// ---------------------------------------------------------------------------
// pensize / width / pencolor / fillcolor / color
// ---------------------------------------------------------------------------

test('pensize / width set and clamp width; affects drawn line width', () => {
  const { api, rec } = tt()
  api.pensize(5)
  assert.equal(api.pensize(), 5)
  api.fd(10)
  assert.equal(rec.lines.at(-1).width, 5)
  api.width(3)
  assert.equal(api.pensize(), 3)
  api.pensize(0.1)          // clamped to >= 0.5
  assert.equal(api.pensize(), 0.5)
})

test('pencolor / fillcolor / color set colours (named + rgb + hex passthrough)', () => {
  const { api, rec } = tt()
  api.pencolor('red')
  api.fd(5)
  assert.equal(rec.lines.at(-1).color, '#e11d48')

  api.pencolor(10, 20, 30)
  api.fd(5)
  assert.equal(rec.lines.at(-1).color, 'rgb(10,20,30)')

  api.pencolor('#123456')
  api.fd(5)
  assert.equal(rec.lines.at(-1).color, '#123456')
})

test('color(*args) sets pen colour', () => {
  const { api, rec } = tt()
  api.color('blue')
  api.fd(5)
  assert.equal(rec.lines.at(-1).color, '#2563eb')
})

// ---------------------------------------------------------------------------
// Filling: begin_fill / end_fill / filling / fill
// ---------------------------------------------------------------------------

test('begin_fill / end_fill records a filled path with current fill colour', () => {
  const { api, rec } = tt()
  api.fillcolor('green')
  api.begin_fill()
  assert.equal(api.filling(), true)
  api.fd(10); api.rt(90); api.fd(10)
  api.end_fill()
  assert.equal(api.filling(), false)
  assert.equal(rec.fills.length, 1)
  assert.equal(rec.fills[0].color, '#16a34a')
})

test('t.fill() helper begins a fill that auto-closes at finish', () => {
  const { rec, surface } = makeSurface()
  const api = createInterpreter({ surface })
  const ns = { ...api }
  // The turtle namespace exposes fill(); emulate what the parser calls.
  const ctx = { __enter: true, __exit__: () => api.end_fill() }
  api.begin_fill()
  assert.equal(api.filling(), true)
  ctx.__exit__()
  assert.equal(api.filling(), false)
  void ns
})

test('__finish auto-closes an open fill', () => {
  const { api, rec } = tt()
  api.begin_fill()
  api.fd(10)
  api.__finish()
  assert.equal(rec.fills.length, 1)
})

// ---------------------------------------------------------------------------
// dot / write
// ---------------------------------------------------------------------------

test('dot draws a dot at the current position with size/colour', () => {
  const { api, rec } = tt()
  api.goto(5, 6)
  api.dot(8, 'red')
  assert.equal(rec.dots.length, 1)
  assert.deepEqual([rec.dots[0].x, rec.dots[0].y, rec.dots[0].r], [5, 6, 4]) // r = size/2
  assert.equal(rec.dots[0].color, '#e11d48')
})

test('write emits text at the position', () => {
  const { api, rec } = tt()
  api.goto(1, 2)
  api.write('hi')
  assert.equal(rec.texts.length, 1)
  assert.deepEqual([rec.texts[0].x, rec.texts[0].y, rec.texts[0].text], [1, 2, 'hi'])
})

// ---------------------------------------------------------------------------
// Visibility: ht / hideturtle / st / showturtle / isvisible / __finish pose
// ---------------------------------------------------------------------------

test('hideturtle / showturtle toggle visibility and are reported at finish', () => {
  const { api, rec } = tt()
  api.ht(); assert.equal(api.isvisible(), false)
  api.__finish()
  assert.equal(rec.turtle.visible, false)
  api.st(); assert.equal(api.isvisible(), true)
  api.hideturtle(); assert.equal(api.isvisible(), false)
  api.showturtle(); assert.equal(api.isvisible(), true)
})

test('__finish reports final pose to drawTurtle', () => {
  const { api, rec } = tt()
  api.fd(25); api.rt(90)
  api.__finish()
  assert.ok(rec.turtle)
  assert.ok(near(rec.turtle.x, 25) && near(rec.turtle.y, 0))
  assert.ok(near(((rec.turtle.heading % 360) + 360) % 360, 270))
})

// ---------------------------------------------------------------------------
// speed
// ---------------------------------------------------------------------------

test('speed accepts numbers and names, notifies host, clamps out-of-range to 0', () => {
  const { api, rec } = tt()
  assert.equal(api.speed(), 3)          // default
  api.speed(10); assert.equal(api.speed(), 10)
  api.speed('fastest'); assert.equal(api.speed(), 0)
  api.speed('normal'); assert.equal(api.speed(), 6)
  api.speed('slow'); assert.equal(api.speed(), 3)
  api.speed('slowest'); assert.equal(api.speed(), 1)
  api.speed(20); assert.equal(api.speed(), 0)  // >10 → 0
  assert.deepEqual(rec.speeds.slice(-1), [0])
})

// ---------------------------------------------------------------------------
// No-ops / misc commands that must simply not throw
// ---------------------------------------------------------------------------

test('no-op commands do not throw', () => {
  const { api } = tt()
  for (const fn of ['degrees', 'radians', 'undo', 'done', 'mainloop']) {
    assert.doesNotThrow(() => api[fn](), `${fn} should not throw`)
  }
})

test('clear / reset clear the surface and reset state', () => {
  const { api, rec } = tt()
  api.clear()
  assert.equal(rec.clears, 1)
  api.fd(10); api.rt(90)
  api.reset()
  assertPoint(api.pos(), 0, 0)
  assertHeading(api, 0)
  assert.equal(rec.clears, 2)
})

test('pen() toggles and returns a controller object', () => {
  const { api } = tt()
  api.pen(false); assert.equal(api.isdown(), false)
  const p = api.pen()
  assert.equal(typeof p.down, 'function')
  p.down(); assert.equal(api.isdown(), true)
  p.up(); assert.equal(api.isdown(), false)
})

// ---------------------------------------------------------------------------
// Syntax / language features via runTurtle
// ---------------------------------------------------------------------------

function runAndRecord(src) {
  const { rec, surface } = makeSurface()
  runTurtle(src, { surface })
  return rec
}

test('syntax: import turtle as t and from turtle import *', () => {
  const rec = runAndRecord('import turtle as t\nt.fd(10)\n')
  assert.equal(rec.lines.length, 1)
  // star import makes bare command names available
  const rec2 = runAndRecord('from turtle import *\nfd(10)\nrt(90)\nfd(5)\n')
  assert.equal(rec2.lines.length, 2)
  assert.ok(near(rec2.lines[1].y2, -5)) // after rt(90), fd goes south
})

test('syntax: from turtle import fd, rt (named)', () => {
  const rec = runAndRecord('from turtle import fd, rt\nfd(10)\nrt(90)\nfd(5)\n')
  assert.equal(rec.lines.length, 2)
  assert.ok(near(rec.lines[1].y2, -5))
})

test('syntax: for range (1/2/3 arg)', () => {
  assert.equal(runAndRecord('for i in range(4):\n    t.fd(1)\n').lines.length, 4)
  assert.equal(runAndRecord('for i in range(2, 5):\n    t.fd(1)\n').lines.length, 3)
  assert.equal(runAndRecord('for i in range(0, 10, 3):\n    t.fd(1)\n').lines.length, 4) // 0,3,6,9
})

test('syntax: while loop with counter', () => {
  const rec = runAndRecord('c = 0\nwhile c < 3:\n    t.fd(10)\n    c = c + 1\n')
  assert.equal(rec.lines.length, 3)
})

test('syntax: variable accumulation inside loop persists (scoping)', () => {
  const rec = runAndRecord('s = 5\nfor i in range(3):\n    s = s + 10\nt.fd(s)\n')
  const last = rec.lines.at(-1)
  assert.ok(near(Math.hypot(last.x2 - last.x1, last.y2 - last.y1), 35), 'accumulated s should be 35')
})

test('syntax: def with params and return', () => {
  const rec = runAndRecord(
    'def draw(n):\n    for i in range(n):\n        t.fd(10)\n        t.rt(90)\ndraw(4)\n'
  )
  assert.equal(rec.lines.length, 4)
})

test('syntax: def with return value used in expression', () => {
  const rec = runAndRecord('def sq(x):\n    return x * x\nt.fd(sq(5))\n')
  const last = rec.lines.at(-1)
  assert.ok(near(Math.hypot(last.x2 - last.x1, last.y2 - last.y1), 25))
})

test('syntax: if / elif / else branches', () => {
  const rec = runAndRecord(
    'x = 2\nif x == 1:\n    t.fd(1)\nelif x == 2:\n    t.fd(2)\nelse:\n    t.fd(3)\n'
  )
  assert.equal(rec.lines.length, 1)
  assert.ok(near(rec.lines[0].x2, 2))
})

test('syntax: arithmetic + - * / // % ** and precedence', () => {
  // 2 + 3 * 4 = 14 ; (2+3)*4 = 20 ; 2**3 = 8
  let last = runAndRecord('t.fd(2 + 3 * 4)\n').lines.at(-1)
  assert.ok(near(last.x2, 14))
  last = runAndRecord('t.fd((2 + 3) * 4)\n').lines.at(-1)
  assert.ok(near(last.x2, 20))
  last = runAndRecord('t.fd(2 ** 3)\n').lines.at(-1)
  assert.ok(near(last.x2, 8))
  last = runAndRecord('t.fd(7 // 2)\n').lines.at(-1)
  assert.ok(near(last.x2, 3))
  last = runAndRecord('t.fd(7 % 3)\n').lines.at(-1)
  assert.ok(near(last.x2, 1))
  last = runAndRecord('t.fd(10 / 4)\n').lines.at(-1)
  assert.ok(near(last.x2, 2.5))
})

test('syntax: unary minus and comparison operators', () => {
  let last = runAndRecord('t.fd(-5)\n').lines.at(-1)
  assert.ok(near(last.x2, -5))
  const rec = runAndRecord(
    'if 1 < 2 and 3 >= 3 and not (4 == 5):\n    t.fd(1)\n'
  )
  assert.equal(rec.lines.length, 1)
})

test('syntax: augmented assignment += -= *= /=', () => {
  const rec = runAndRecord('x = 10\nx += 5\nx -= 3\nx *= 2\nt.fd(x)\n') // 24
  const last = rec.lines.at(-1)
  assert.ok(near(Math.hypot(last.x2 - last.x1, last.y2 - last.y1), 24))
})

test('syntax: builtins abs/min/max/int/float/round/len/range', () => {
  assert.ok(near(runAndRecord('t.fd(abs(-7))\n').lines.at(-1).x2, 7))
  assert.ok(near(runAndRecord('t.fd(min(3, 9, 1))\n').lines.at(-1).x2, 1))
  assert.ok(near(runAndRecord('t.fd(max(3, 9, 1))\n').lines.at(-1).x2, 9))
  assert.ok(near(runAndRecord('t.fd(int(3.9))\n').lines.at(-1).x2, 3))
  assert.ok(near(runAndRecord('t.fd(round(4.6))\n').lines.at(-1).x2, 5))
  assert.ok(near(runAndRecord('t.fd(len(range(5)))\n').lines.at(-1).x2, 5))
  assert.ok(near(runAndRecord('t.fd(float(3))\n').lines.at(-1).x2, 3))
})

test('syntax: list literal and indexing', () => {
  const rec = runAndRecord('a = [10, 20, 30]\nt.fd(a[1])\n')
  assert.ok(near(rec.lines.at(-1).x2, 20))
})

test('syntax: comments and blank lines ignored', () => {
  const rec = runAndRecord('# comment\nt.fd(5)  # inline\n\n# another\nt.fd(5)\n')
  assert.equal(rec.lines.length, 2)
})

test('syntax: multi-statement line with semicolons', () => {
  const rec = runAndRecord('t.fd(3); t.rt(90); t.fd(4)\n')
  assert.equal(rec.lines.length, 2)
})

test('syntax: keyword arguments (write with move)', () => {
  const rec = runAndRecord("t.write('x', move=True)\n")
  assert.equal(rec.texts.length, 1)
})

test('syntax: negative numbers in args and default params', () => {
  assert.ok(near(runAndRecord('t.fd(2.5)\n').lines.at(-1).x2, 2.5))
})

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

test('undefined name throws a helpful error', () => {
  assert.throws(() => runAndRecord('t.fd(unknownvar)\n'), /未定义|undefined/)
})

test('unknown character raises TurtleSyntaxError with line info', () => {
  assert.throws(() => tokenizeLines('t.fd(10) @'), TurtleSyntaxError)
})

// ---------------------------------------------------------------------------
// Tokenizer sanity
// ---------------------------------------------------------------------------

test('tokenizeLines: indentation, comments, strings with #', () => {
  const lines = tokenizeLines('if x:\n    t.fd(1)  # c\n# full\n\ns = "#notcomment"\n')
  assert.equal(lines.length, 3) // if-header, t.fd(1), s = "#notcomment" (comments/blanks dropped)
  assert.equal(lines[0].indent, 0)
  assert.equal(lines[1].indent, 4)
})
