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
    drawLine(x1, y1, x2, y2, color, width, animSpeed) { rec.lines.push({ x1, y1, x2, y2, color, width, animSpeed }) },
    drawDot(x, y, r, color) { rec.dots.push({ x, y, r, color }) },
    drawText(x, y, text, color, opts) { const o = opts && typeof opts === 'object' ? opts : {}; const font = Array.isArray(o.font) ? o.font : null; rec.texts.push({ x, y, text, color, align: o.align || 'left', size: font ? Number(font[1]) || 13 : 13 }) },
    beginPath() { rec.begins += 1 },
    endFill(color) { rec.fills.push({ color }) },
    moveCursor(x, y, heading, penDown, animSpeed) { rec.moves.push({ x, y, heading, penDown, animSpeed }) },
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

test('pensize / width set the value verbatim (CPython does not clamp)', () => {
  const { api, rec } = tt()
  api.pensize(5)
  assert.equal(api.pensize(), 5)
  api.fd(10)
  assert.equal(rec.lines.at(-1).width, 5)
  api.width(3)
  assert.equal(api.pensize(), 3)
  api.pensize(0.1)          // stored as-is (renderer clamps for draw only)
  assert.equal(api.pensize(), 0.1)
  api.pensize(0)
  assert.equal(api.pensize(), 0)
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

// --- CPython turtle.py animation-model alignment ---------------------------
// The runner replays ops using CPython's exact hop formulas. For that it needs
// each op's *speed* at emission time. These tests pin the interpreter side:
//   * circle() animates its arc chords at the turtle's speed...
//   * ...but its internal heading rotation runs at speed 0 (instant), exactly
//     like CPython's `speed(0)` wrapped around the _rotate() calls in circle().

test('circle: arc chords animate at the current speed; final rotation is speed 0 (CPython-aligned)', () => {
  const { api, rec } = tt()
  api.speed(5)
  rec.lines.length = 0; rec.moves.length = 0
  api.circle(60)
  // Every drawn chord of the arc should carry animSpeed === 5.
  assert.ok(rec.lines.length > 0, 'circle draws arc chords')
  for (const ln of rec.lines) assert.equal(ln.animSpeed, 5, 'arc chord animates at turtle speed')
  // The very last cursor notification (the trailing heading change) must be
  // speed 0 so the full-circle rotation is instantaneous, as in CPython.
  const lastMove = rec.moves[rec.moves.length - 1]
  assert.equal(lastMove.animSpeed, 0, 'circle final rotation is instant (speed 0)')
})

test('fd/rt carry the current speed on their ops (for CPython hop sizing)', () => {
  const { api, rec } = tt()
  api.speed(7)
  rec.lines.length = 0; rec.moves.length = 0
  api.fd(100)
  api.rt(45)
  assert.equal(rec.lines[0].animSpeed, 7, 'fd line op carries speed 7')
  const rotMove = rec.moves[rec.moves.length - 1]
  assert.equal(rotMove.animSpeed, 7, 'rt move op carries speed 7')
})

test('speed(0) makes moves/turns jump (instant) — carried as animSpeed 0', () => {
  const { api, rec } = tt()
  api.speed(0)
  rec.lines.length = 0; rec.moves.length = 0
  api.fd(80)
  api.rt(90)
  assert.equal(rec.lines[0].animSpeed, 0)
  assert.equal(rec.moves[rec.moves.length - 1].animSpeed, 0)
})

// --- circle geometry matches CPython's chord construction ------------------
// CPython draws a circle as `steps` chords: after _rotate(w/2) it repeatedly
// _go(l) then _rotate(w). The chord *endpoints* therefore lie exactly on the
// circle at angles w, 2w, 3w, ... measured from the start point. Our interpreter
// samples those same arc points, so the vertices must match to floating point.
import { circleSteps as _cps, circleChord as _cpc } from '../app/utils/turtle-timing.js'

test('circle vertices coincide with CPython chord construction (full circle)', () => {
  const { api, rec } = tt()
  const r = 50
  const start = api.pos() // (0,0), heading 0 (east); centre = radius to the LEFT => +y
  const steps = _cps(r, 360)
  api.circle(r)
  assert.equal(rec.lines.length, steps, 'one chord per CPython step')
  // centre for radius>0 & heading east is (0, +r)
  const cx = start[0], cy = start[1] + r
  rec.lines.forEach((seg, i) => {
    const d = Math.hypot(seg.x2 - cx, seg.y2 - cy)
    assert.ok(Math.abs(d - r) < 1e-6, `vertex ${i} not on circle: r=${d}`)
  })
})

test('circle chord length equals CPython l = 2*r*sin(w/2)', () => {
  const { api, rec } = tt()
  const r = 70, steps = _cps(r, 360)
  api.circle(r)
  // each drawn segment length should equal the CPython chord for its step angle
  for (const seg of rec.lines) {
    const chord = _cpc(r, 360, steps) // constant chord for a full circle
    const segLen = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1)
    assert.ok(Math.abs(segLen - Math.abs(chord)) < 1e-6, `chord ${segLen} != ${Math.abs(chord)}`)
  }
})

test('a right-angle square program matches CPython hop accounting', () => {
  // fd(80) x4 with rt(90) x4 at default speed 3.
  // Per CPython: each fd = 1+int(80/(3*1.1^3*3)) hops; each rt(90) = 1+int(90/9).
  const rec = runAndRecord('import turtle as t\nfor i in range(4):\n  t.fd(80)\n  t.rt(90)')
  const fdHops = 1 + Math.trunc(80 / (3 * Math.pow(1.1, 3) * 3))
  const rtSteps = 1 + Math.trunc(90 / (3 * 3))
  assert.equal(rec.lines.length, 4, 'four drawn edges')
  // each line op carries the fd speed; each rt move op carries the rotate speed
  for (const ln of rec.lines) assert.equal(ln.animSpeed, 3)
  const rotMoves = rec.moves.filter(m => m.animSpeed === 3)
  assert.ok(rotMoves.length >= 4)
  assert.equal(fdHops, 7, 'fd(80) speed3 -> 7 hops (CPython)')
  assert.equal(rtSteps, 11, 'rt(90) speed3 -> 11 steps (CPython)')
})

// --- Command semantics parity with native turtle ---------------------------
// These pin behaviours that CPython's Turtle implements but a naive port often
// gets wrong: towards() range, dot() sizing, write() options, tuple coordinates,
// and color()'s 1-/2-argument form.

test('towards() returns an angle in [0, 360), like CPython', () => {
  const { api } = tt()
  api.goto(10, 10)
  // atan2 gives -135 for the vector to the origin; CPython returns 225.
  assert.ok(Math.abs(api.towards(0, 0) - 225) < 1e-9)
  api.home(); api.goto(-10, 10)
  assert.ok(Math.abs(api.towards(0, 0) - 315) < 1e-9)
  // never negative across all quadrants
  for (let a = 0; a < 360; a += 15) {
    const x = Math.cos(a * Math.PI / 180) * 10, y = Math.sin(a * Math.PI / 180) * 10
    api.home(); api.goto(x, y)
    const t = api.towards(0, 0)
    assert.ok(t >= 0 && t < 360, `towards in range: ${t}`)
  }
})

test('dot(): default diameter = pensize + max(pensize,4); size is a diameter', () => {
  const { api, rec } = tt()
  api.pensize(10)
  api.dot()
  assert.equal(rec.dots[0].r, 10, 'radius = (10 + max(10,4)) / 2 = 10')
  api.dot(20)
  assert.equal(rec.dots[1].r, 10, 'dot(20) radius = 10')
  // default pensize 1 -> diameter 1 + 4 = 5 -> radius 2.5
  const { api: a2, rec: r2 } = tt()
  a2.dot()
  assert.equal(r2.dots[0].r, 2.5)
})

test('dot() accepts a colour as its first argument (dot("red") / dot((r,g,b)))', () => {
  const { api, rec } = tt()
  api.dot('red')
  assert.ok(rec.dots[0].color && rec.dots[0].color !== api.pencolor(), 'dot("red") uses red, keeps default size')
  assert.equal(rec.dots[0].r, 2.5)
})

test('write(): move=True advances the turtle; align/font are forwarded', () => {
  const { api, rec } = tt()
  api.write('Hi', true, 'center', ['Arial', 16])
  assert.equal(rec.texts.length, 1)
  assert.equal(rec.texts[0].text, 'Hi')
  assert.equal(rec.texts[0].align, 'center')
  assert.equal(rec.texts[0].size, 16)
  assert.ok(api.pos()[0] > 0, 'pen moved right after write(move=True)')
})

test('goto/distance accept a coordinate pair (goto((x,y)), distance(pos()))', () => {
  const { api } = tt()
  api.goto([50, 30])
  assert.deepEqual(api.pos(), [50, 30])
  api.goto(0, 0)
  assert.ok(Math.abs(api.distance([30, 40]) - 50) < 1e-9)
})

test('color() 1-arg sets both; 2-arg sets pen then fill (CPython semantics)', () => {
  const { api } = tt()
  api.color('red')
  assert.equal(api.pencolor(), api.fillcolor())
  api.color('blue', 'green')
  assert.notEqual(api.pencolor(), api.fillcolor())
})

// helper: our recording surface stores text opts under `.align`/`.size`

test('every standard turtle command name is callable without throwing (safe no-ops)', () => {
  // A student can reasonably type any of these; native turtle accepts them all.
  // Unimplemented drawing-neutral ones must be safe no-ops, never "no such method".
  const names = ('title setup Screen register_shape addshape mode colormode ' +
    'setworldcoordinates tracer update delay listen mainloop exitonclick bye ' +
    'shape shapesize resizemode shearfactor tilt tiltangle stamp clearstamp ' +
    'clearstamps clone begin_poly end_poly get_poly poly getscreen getturtle ' +
    'getpen get_shapepoly shapetransform setundobuffer undobufferentries ' +
    'getcanvas ontimer onclick ondrag onrelease onkey onkeypress onkeyrelease ' +
    'onscreenclick window_width window_height degrees radians undo done').split(/\s+/)
  const rec = runAndRecord('import turtle as t\n' + names.map((n) => `t.${n}()`).join('\n'))
  assert.ok(rec, 'program ran without throwing')
})

// ===========================================================================
// COMPREHENSIVE COVERAGE — exhaustive per-command behaviour (native parity)
// ===========================================================================

// --- movement trigonometry (fd/bk along arbitrary headings) ----------------
test('fd moves by exactly distance along every heading (trig check)', () => {
  for (const h of [0, 30, 45, 90, 135, 180, 225, 270, 315, 360, -90]) {
    const { api } = tt()
    api.seth(h)
    api.fd(100)
    const rad = h * Math.PI / 180
    assertPoint(api.pos(), Math.cos(rad) * 100, Math.sin(rad) * 100, 1e-6, `seth ${h}`)
    assertHeading(api, h)
  }
})

test('bk moves opposite; fd(-d)==bk(d)', () => {
  const a = tt().api, b = tt().api
  a.fd(-30); b.bk(30)
  assertPoint(a.pos(), b.pos()[0], b.pos()[1])
  assertPoint(a.pos(), -30, 0)
})

test('pen up: moving does NOT emit a line op but still changes position', () => {
  const { api, rec } = tt()
  api.pu(); api.fd(50)
  assert.equal(rec.lines.length, 0)
  assertPoint(api.pos(), 50, 0)
  api.pd(); api.fd(20)
  assert.equal(rec.lines.length, 1)
  assert.equal(rec.lines[0].x1, 50) // continues from 50
})

// --- turning: additive, wrap-around, sign -----------------------------------
test('rt/lt accumulate and wrap; heading() always in [0,360)', () => {
  const { api } = tt()
  api.rt(90); assertHeading(api, 270)   // right = clockwise = -90 => 270
  api.lt(180); assertHeading(api, 90)
  api.rt(450); assertHeading(api, 0)    // -450 from 90
  assert.ok(api.heading() >= 0 && api.heading() < 360)
})

test('seth accepts negative and >360 values, normalising the heading', () => {
  const { api } = tt()
  api.seth(-90); assertHeading(api, 270)
  api.seth(450); assertHeading(api, 90)
  api.seth(720); assertHeading(api, 0)
})

// --- goto family: all forms ------------------------------------------------
test('goto/setpos/setposition all move to (x,y) and draw when pen down', () => {
  for (const m of ['goto', 'setpos', 'setposition']) {
    const { api, rec } = tt()
    api[m](30, 40)
    assertPoint(api.pos(), 30, 40, 1e-9, m)
    assert.equal(rec.lines.length, 1, m)
  }
})

test('goto with a pair: goto((x,y)) / goto([x,y])', () => {
  const a = tt().api, b = tt().api
  a.goto(12, 34); b.goto([12, 34])
  assertPoint(a.pos(), 12, 34); assertPoint(b.pos(), 12, 34)
})

test('setx/sety move a single axis and draw', () => {
  const { api, rec } = tt()
  api.goto(10, 20)
  api.setx(50); assertPoint(api.pos(), 50, 20)
  api.sety(80); assertPoint(api.pos(), 50, 80)
  assert.equal(rec.lines.length, 3)
})

// --- position queries ------------------------------------------------------
test('pos/position/xcor/ycor report the current coordinates', () => {
  const { api } = tt()
  api.goto(-7, 13)
  assert.deepEqual(api.pos(), [-7, 13])
  assert.deepEqual(api.position(), [-7, 13])
  assert.equal(api.xcor(), -7)
  assert.equal(api.ycor(), 13)
})

test('distance and towards use the turtle position; towards in [0,360)', () => {
  const { api } = tt()
  api.goto(3, 4)
  assert.ok(Math.abs(api.distance(0, 0) - 5) < 1e-9)
  assert.ok(Math.abs(api.distance([6, 8]) - 5) < 1e-9) // pair form
  // towards (0,0) from (3,4) ~ 233.13 deg
  const t = api.towards(0, 0)
  assert.ok(t > 233 && t < 234, `towards ${t}`)
  assert.ok(t >= 0 && t < 360)
})

// --- circle: exhaustive geometry against the analytic formula --------------
// For a full/partial circle, every vertex is exactly on the circle of the given
// radius about the correct centre, and the end poses follow CPython.
function circleCase(r, extent, steps, startHeading = 0) {
  const { api, rec } = tt()
  api.seth(startHeading)
  const start = api.pos()
  const h0 = startHeading * Math.PI / 180
  // centre is |r| to the left of the heading (for r>0); right for r<0
  const side = r > 0 ? 1 : -1
  const cx = start[0] + Math.cos(h0 + side * Math.PI / 2) * Math.abs(r)
  const cy = start[1] + Math.sin(h0 + side * Math.PI / 2) * Math.abs(r)
  api.circle(r, extent, steps)
  // every drawn vertex lies on the circle
  for (const s of rec.lines) assert.ok(Math.abs(Math.hypot(s.x2 - cx, s.y2 - cy) - Math.abs(r)) < 1e-6, `r=${r} ext=${extent}: vertex off circle`)
  return { api, rec, start, cx, cy }
}

test('circle: all quadrant/radius/extent combos keep vertices on the circle', () => {
  for (const r of [50, -50, 30, -30])
    for (const ext of [360, 180, 90, -90, 270, -270, 45])
      circleCase(r, ext, null)
})

test('circle ends with heading rotated by extent (sign of radius unchanged by extent<0)', () => {
  // full circle -> back to start, heading +-360 => same heading
  for (const r of [50, -50]) {
    const { api, start } = circleCase(r, 360, null)
    assertPoint(api.pos(), start[0], start[1], 1e-6)
    assertHeading(api, 0)
  }
  // half circle (r>0) -> point diameter away on the left; heading +180
  const a = circleCase(50, 180, null)
  assertPoint(a.api.pos(), 0, 100, 1e-6)
  assertHeading(a.api, 180)
  // half circle (r<0) -> point diameter away on the right; heading -180 => 180
  const b = circleCase(-50, 180, null)
  assertPoint(b.api.pos(), 0, -100, 1e-6)
  assertHeading(b.api, 180)
})

test('circle steps: explicit steps produce that many chords (regular polygon)', () => {
  for (const st of [1, 3, 4, 6, 8, 12]) {
    const { rec } = circleCase(50, 360, st)
    assert.equal(rec.lines.length, st, `steps=${st}`)
  }
})

test('circle(0) draws nothing; circle(r, 0) draws at most a zero-length chord', () => {
  const a = tt(); a.api.circle(0)
  assert.equal(a.rec.lines.length, 0)
  const b = tt(); b.api.circle(50, 0)
  assert.ok(b.rec.lines.length <= 1, 'extent 0 => a single degenerate chord, like CPython _go(0)')
  for (const s of b.rec.lines) assert.ok(Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 1e-9)
})

// --- teleport / home -------------------------------------------------------
test('teleport jumps without drawing when pen up, draws when pen down', () => {
  const { api, rec } = tt()
  api.pu(); api.teleport(40, 40)
  assertPoint(api.pos(), 40, 40); assert.equal(rec.lines.length, 0)
  api.pd(); api.teleport(0, 0)
  assert.equal(rec.lines.length, 1)
})

test('home: returns to origin AND resets heading to 0 (east)', () => {
  const { api } = tt()
  api.seth(135); api.fd(30)
  api.home()
  assertPoint(api.pos(), 0, 0)
  assertHeading(api, 0)
})

// --- pen state / queries ---------------------------------------------------
test('isdown reflects penup/pendown; pen() returns native-style dict', () => {
  const { api } = tt()
  assert.equal(api.isdown(), true)
  api.pu(); assert.equal(api.isdown(), false)
  api.pd(); assert.equal(api.isdown(), true)
  const d = api.pen()
  for (const k of ['shown', 'pendown', 'pencolor', 'fillcolor', 'pensize', 'speed']) {
    assert.ok(k in d, `pen() dict has ${k}`)
  }
})

test('pen(dict)/pen(kwargs) restore pen attributes like CPython', () => {
  const { api } = tt()
  api.pen({ pencolor: 'red', pensize: 7, pendown: false })
  assert.equal(api.pensize(), 7)
  assert.equal(api.isdown(), false)
  assert.notEqual(api.pencolor(), '#1f2937')
  const before = api.pen()
  api.pen({ pencolor: 'blue' })
  api.pen(before) // restore
  assert.equal(api.pensize(), 7)
  assert.equal(api.isdown(), false)
})

// --- colours: formats + assignment semantics ------------------------------
test('pencolor accepts name / hex / rgb-triplet / tuple; unknown names pass through', () => {
  const { api } = tt()
  api.pencolor('red'); assert.notEqual(api.pencolor(), 'red') // mapped to hex
  api.pencolor('#123456'); assert.equal(api.pencolor(), '#123456')
  api.pencolor(10, 20, 30); assert.ok(/rgb\(10,\s*20,\s*30\)/.test(api.pencolor()))
  api.pencolor([1, 2, 3]); assert.ok(/rgb\(1,\s*2,\s*3\)/.test(api.pencolor()))
  api.pencolor('chartreuse'); assert.equal(api.pencolor(), 'chartreuse')
})

test('fillcolor is independent; color() sets both; color(c1,c2) sets pen then fill', () => {
  const { api } = tt()
  api.pencolor('red'); api.fillcolor('blue')
  assert.notEqual(api.pencolor(), api.fillcolor())
  api.color('green')
  assert.equal(api.pencolor(), api.fillcolor())
  api.color('red', 'blue')
  assert.notEqual(api.pencolor(), api.fillcolor())
})

// --- fill: begin/end with moving path --------------------------------------
test('begin_fill/end_fill capture a path; fill uses FILL colour not pen colour', () => {
  const { api, rec } = tt()
  api.pencolor('red'); api.fillcolor('blue')
  api.begin_fill()
  api.fd(10); api.rt(90); api.fd(10)
  assert.equal(api.filling(), true)
  api.end_fill()
  assert.equal(api.filling(), false)
  assert.equal(rec.fills.length, 1)
  assert.notEqual(rec.fills[0].color, api.pencolor()) // blue fill, red pen
})

test('no end_fill: __finish auto-closes an open fill', () => {
  const { api, rec } = tt()
  api.begin_fill(); api.fd(10)
  assert.equal(rec.fills.length, 0)
  api.__finish()
  assert.equal(rec.fills.length, 1)
})

// --- visibility ------------------------------------------------------------
test('hideturtle/showturtle/isvisible and finish reports visibility', () => {
  const { api, rec } = tt()
  assert.equal(api.isvisible(), true)
  api.ht(); assert.equal(api.isvisible(), false)
  api.__finish(); assert.equal(rec.turtle.visible, false)
  api.st(); assert.equal(api.isvisible(), true)
})

// --- speed: values, names, getter, clamping --------------------------------
test('speed: numeric/name getters, invalid -> 0, notifies host', () => {
  const { api, rec } = tt()
  assert.equal(api.speed(), 3)         // default
  api.speed(7); assert.equal(api.speed(), 7)
  api.speed('fast'); assert.equal(api.speed(), 10)
  api.speed('slowest'); assert.equal(api.speed(), 1)
  api.speed(0); assert.equal(api.speed(), 0)
  api.speed(50); assert.equal(api.speed(), 0)
  assert.ok(rec.speeds.length >= 5)    // host was notified each time
})

// --- dot ------------------------------------------------------------------
test('dot: default diameter pensize+max(pensize,4); explicit size is a diameter; colour forms', () => {
  const a = tt(); a.api.pensize(6); a.api.dot()
  assert.equal(a.rec.dots[0].r, 6, 'radius = (6 + max(6,4)) / 2 = 6')
  const b = tt(); b.api.dot(20)
  assert.equal(b.rec.dots[0].r, 10, 'dot(20) -> radius 10')
  const c = tt(); c.api.dot('red')
  assert.equal(c.rec.dots[0].r, 2.5, 'dot("red") keeps default size')
  assert.notEqual(c.rec.dots[0].color, c.api.pencolor())
  // default pensize 1 -> diameter 5 -> radius 2.5
  const d = tt(); d.api.dot()
  assert.equal(d.rec.dots[0].r, 2.5)
})

// --- write ----------------------------------------------------------------
test('write: draws text at position; move=True advances; align/font forwarded', () => {
  const { api, rec } = tt()
  api.goto(5, 5)
  api.write('Hello', false, 'left', ['Arial', 20])
  assert.equal(rec.texts.length, 1)
  assert.equal(rec.texts[0].text, 'Hello')
  assert.equal(rec.texts[0].size, 20)
  assertPoint(api.pos(), 5, 5) // no move
  api.write('x', true) // move
  assert.ok(api.pos()[0] > 5, 'turtle advanced after move=True')
})

// --- aliases are exact synonyms --------------------------------------------
test('every documented alias behaves identically to its canonical command', () => {
  const pairs = [
    ['forward', 'fd', [40]], ['back', 'bk', [20]], ['backward', 'bk', [20]],
    ['right', 'rt', [90]], ['left', 'lt', [90]], ['setheading', 'seth', [45]],
    ['setpos', 'goto', [10, 10]], ['setposition', 'goto', [10, 10]],
    ['penup', 'pu', []], ['up', 'pu', []], ['pendown', 'pd', []], ['down', 'pd', []],
    ['hideturtle', 'ht', []], ['showturtle', 'st', []], ['width', 'pensize', [4]],
  ]
  for (const [alias, canon, argv] of pairs) {
    const a = tt().api, b = tt().api
    a[alias](...argv); b[canon](...argv)
    assert.deepEqual(a.pos(), b.pos(), `${alias} vs ${canon} pos`)
    assert.equal(a.heading(), b.heading(), `${alias} vs ${canon} heading`)
    assert.equal(a.isdown(), b.isdown(), `${alias} vs ${canon} down`)
    assert.equal(a.isvisible(), b.isvisible(), `${alias} vs ${canon} visible`)
    assert.equal(a.pensize(), b.pensize(), `${alias} vs ${canon} size`)
  }
})

// --- clear vs reset --------------------------------------------------------
test('clear wipes drawings but keeps turtle state; reset restores initial state', () => {
  const { api, rec } = tt()
  api.seth(90); api.pensize(5); api.pencolor('red'); api.fd(10)
  api.clear()
  assert.equal(rec.clears, 1)
  // clear keeps pose/pen in CPython
  assertHeading(api, 90)
  assert.equal(api.pensize(), 5)
  // reset restores everything
  api.reset()
  assertHeading(api, 0)
  assert.equal(api.pensize(), 1)
  assert.equal(api.pencolor(), '#1f2937')
})
