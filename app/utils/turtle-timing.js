// Pure, source-faithful ports of CPython 3.15 Lib/turtle.py timing/geometry
// helpers. Kept side-effect free and dependency free so both the animation
// runner and the test-suite use the EXACT same formulas as CPython.
//
// References (cpython/3.15/Lib/turtle.py):
//   RawTurtle._goto   (hop count for a straight move)
//   RawTurtle._rotate (step count for a turn)
//   Turtle.circle     (polygon step count + chord length)

// speed -> effective integer speed exactly like Turtle.speed():
//   names map {fastest:0, fast:10, normal:6, slow:3, slowest:1}
//   elif 0.5 < speed < 10.5: speed = int(round(speed))
//   else: speed = 0
export const SPEED_NAMES = { fastest: 0, fast: 10, normal: 6, slow: 3, slowest: 1 }

export function normalizeSpeed(speed) {
  if (typeof speed === 'string') {
    const s = SPEED_NAMES[speed.toLowerCase()]
    if (s === undefined) return 0
    return s
  }
  const n = Number(speed)
  if (0.5 < n && n < 10.5) return Math.round(n)
  return 0
}

// RawTurtle._goto: number of hops for a move of world-space distance `dist`
// at integer `speed` (>=1). nhops = 1 + int(dist / (3 * 1.1**speed * speed)).
// The turtle performs `nhops` position updates in total (nhops-1 intermediate
// redraws in `range(1, nhops)` plus the final jump to `end`).
export function moveHops(dist, speed) {
  const s = normalizeSpeed(speed)
  if (!s) return 1 // speed 0 => no hop loop; turtle jumps straight to end (single update)
  if (!(dist > 0)) return 1
  return 1 + Math.floor(dist / (3 * Math.pow(1.1, s) * s))
}

// RawTurtle._rotate: number of intermediate rotation steps for a turn of
// |angle| degrees at integer `speed`. steps = 1 + int(|angle| / (3 * speed)).
// speed 0 => instant (no animated intermediate orientations). Note: like
// CPython, a 0-degree turn still yields steps == 1 (one no-op update); callers
// typically skip zero-length turns before calling this.
export function rotateSteps(angle, speed) {
  const s = normalizeSpeed(speed)
  if (!s) return 0
  return 1 + Math.floor(Math.abs(angle) / (3 * s))
}

// Turtle.circle: automatic step count when `steps` is None.
// steps = 1 + int(min(11 + |radius|/6, 59) * frac), frac = |extent|/fullcircle.
export function circleSteps(radius, extent, fullcircle = 360) {
  const frac = Math.abs(extent) / fullcircle
  return 1 + Math.floor(Math.min(11 + Math.abs(radius) / 6.0, 59.0) * frac)
}

// Turtle.circle: chord length the turtle moves each step.
// l = 2 * radius * sin(radians(w/2) * degreesPerAU), w = extent/steps.
// For radius < 0 the caller negates l, w, w2 (see circle()).
export function circleChord(radius, extent, steps, fullcircle = 360) {
  const degreesPerAU = 360 / fullcircle
  const w = extent / steps
  return 2 * radius * Math.sin((Math.PI / 180) * (w / 2) * degreesPerAU)
}
