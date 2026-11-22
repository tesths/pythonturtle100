// Alignment tests: assert our turtle timing/geometry helpers reproduce CPython
// 3.15 Lib/turtle.py EXACTLY. Each expected value is derived from a literal
// transcription of the CPython formula (kept inline here, independent of the
// implementation under test, so the two must agree).
//
//   RawTurtle._goto   : nhops  = 1 + int( sqrt((dx*xscale)^2+(dy*yscale)^2)
//                                          / (3 * 1.1**speed * speed) )
//   RawTurtle._rotate : steps  = 1 + int( |angle| / (3.0 * speed) )
//   Turtle.circle     : steps  = 1 + int( min(11 + |radius|/6, 59) * |extent|/fullcircle )
//                       chord  = 2*radius*sin( radians(w/2) * degreesPerAU ), w = extent/steps
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeSpeed, moveHops, rotateSteps, circleSteps, circleChord,
} from '../app/utils/turtle-timing.js'

// --- Literal CPython references (independent re-statements) ----------------
const refMoveHops = (dist, speed) => {
  if (!speed) return 1
  return 1 + Math.trunc(dist / (3 * Math.pow(1.1, speed) * speed))
}
const refRotateSteps = (angleDeg, speed) => {
  if (!speed) return 0
  return 1 + Math.trunc(Math.abs(angleDeg) / (3.0 * speed))
}
const refCircleSteps = (radius, extent, fullcircle = 360) =>
  1 + Math.trunc(Math.min(11 + Math.abs(radius) / 6.0, 59.0) * (Math.abs(extent) / fullcircle))
const refCircleChord = (radius, extent, steps, fullcircle = 360) => {
  const degreesPerAU = 360 / fullcircle
  const w = extent / steps
  return 2 * radius * Math.sin((Math.PI / 180) * (w / 2) * degreesPerAU)
}

// --- speed mapping (Turtle.speed) ------------------------------------------
test('normalizeSpeed matches Turtle.speed() mapping exactly', () => {
  // names
  assert.equal(normalizeSpeed('fastest'), 0)
  assert.equal(normalizeSpeed('fast'), 10)
  assert.equal(normalizeSpeed('normal'), 6)
  assert.equal(normalizeSpeed('slow'), 3)
  assert.equal(normalizeSpeed('slowest'), 1)
  // 0.5 < n < 10.5 -> round; else 0
  assert.equal(normalizeSpeed(3), 3)
  assert.equal(normalizeSpeed(9), 9)
  assert.equal(normalizeSpeed(10.5), 0)  // not < 10.5
  assert.equal(normalizeSpeed(10.4), 10) // rounds to 10
  assert.equal(normalizeSpeed(0.5), 0)   // not > 0.5
  assert.equal(normalizeSpeed(0.6), 1)   // rounds to 1
  assert.equal(normalizeSpeed(0), 0)
  assert.equal(normalizeSpeed(-2), 0)
  assert.equal(normalizeSpeed(100), 0)
})

// --- move hops == CPython _goto for many distances / speeds -----------------
test('moveHops equals CPython _goto nhops across distances & speeds', () => {
  const dists = [0, 0.1, 1, 5, 11.98, 12, 40, 80, 100, 200, 240, 300, 999, 12345.6]
  for (let s = 1; s <= 10; s += 1) {
    for (const d of dists) {
      assert.equal(moveHops(d, s), refMoveHops(d, s), `dist=${d} speed=${s}`)
    }
  }
  // speed 0 => single update (jump), regardless of distance
  assert.equal(moveHops(500, 0), 1)
})

// --- rotate steps == CPython _rotate ---------------------------------------
test('rotateSteps equals CPython _rotate steps across angles & speeds', () => {
  const angles = [0, 1, 9, 30, 45, 90, 120, 180, 270, 360, 720, -90, -180, -360]
  for (let s = 1; s <= 10; s += 1) {
    for (const a of angles) {
      assert.equal(rotateSteps(a, s), refRotateSteps(a, s), `angle=${a} speed=${s}`)
    }
  }
  // speed 0 => instant (no animated intermediate orientations)
  assert.equal(rotateSteps(90, 0), 0)
  assert.equal(rotateSteps(-270, 0), 0)
})

// --- circle step count == CPython circle ----------------------------------
test('circleSteps equals CPython circle step formula', () => {
  const cases = [
    [50, 360], [60, 360], [80, 180], [10, 360], [100, 360],
    [1, 360], [-50, 360], [50, 90], [500, 360], [50, 45],
  ]
  for (const [r, e] of cases) {
    assert.equal(circleSteps(r, e), refCircleSteps(r, e), `r=${r} extent=${e}`)
  }
  // the documented cap: min(..., 59)
  assert.equal(circleSteps(100000, 360), 1 + 59, 'min(11+big,59)=59 -> 1+59=60')
})

// --- circle chord == CPython circle ---------------------------------------
test('circleChord equals CPython chord length formula', () => {
  for (const [r, e, steps] of [[50, 360, refCircleSteps(50, 360)], [80, 180, refCircleSteps(80, 180)], [-50, 360, refCircleSteps(-50, 360)]]) {
    assert.ok(Math.abs(circleChord(r, e, steps) - refCircleChord(r, e, steps)) < 1e-9, `r=${r} e=${e}`)
  }
})

// --- Exhaustive hop matrices ----------------------------------------------
// The animation runner turns each primitive into moveHops/rotateSteps frames.
// These matrices pin the exact frame counts CPython would use for a wide range
// of distances/angles and every speed 1..10.
test('move hop matrix matches CPython _goto for distances x speeds 1..10', () => {
  const dists = [1, 5, 10, 11.98, 24, 48, 100, 120, 200, 240, 360, 480, 1000]
  for (let s = 1; s <= 10; s += 1) {
    for (const d of dists) {
      const expected = 1 + Math.trunc(d / (3 * Math.pow(1.1, s) * s))
      assert.equal(moveHops(d, s), expected, `d=${d} s=${s}`)
    }
  }
})

test('rotate hop matrix matches CPython _rotate for angles x speeds 1..10', () => {
  const angles = [1, 5, 9, 30, 45, 60, 90, 120, 135, 180, 270, 360, 540]
  for (let s = 1; s <= 10; s += 1) {
    for (const a of angles) {
      const expected = 1 + Math.trunc(a / (3 * s))
      assert.equal(rotateSteps(a, s), expected, `a=${a} s=${s}`)
    }
  }
})

test('move hop count is independent of direction (xscale==yscale==1)', () => {
  // A move of the same Euclidean length along any heading yields the same hops.
  for (const L of [50, 100, 200]) {
    const ref = moveHops(L, 3)
    for (const deg of [0, 15, 30, 45, 90, 135, 180, 270]) {
      const dx = Math.cos(deg * Math.PI / 180) * L
      const dy = Math.sin(deg * Math.PI / 180) * L
      assert.equal(moveHops(Math.hypot(dx, dy), 3), ref, `L=${L} deg=${deg}`)
    }
  }
})

test('speed 0 => move is a single frame (jump); rotate is instant (0 steps)', () => {
  for (const d of [10, 100, 1000]) assert.equal(moveHops(d, 0), 1)
  for (const a of [90, 180, 360]) assert.equal(rotateSteps(a, 0), 0)
})
