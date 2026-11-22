<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { runTurtle } from '~/utils/turtle-interpreter.js'

const props = defineProps<{
  code: string
  title?: string
  keywords?: string[]
}>()

// 一段对所有用户与搜索引擎都可见的真实文字，说明本题的可运行能力与核心命令，
// 让该区域成为「可被抓取的内容增量」，而不是纯客户端工具。
const usedCommands = computed(() => {
  const src = String(props.code || '')
  const map: Record<string, string> = {
    fd: '前进', forward: '前进', bk: '后退', back: '后退', backward: '后退',
    rt: '右转', right: '右转', lt: '左转', left: '左转',
    circle: '画圆/圆弧', goto: '移动到坐标', setpos: '移动到坐标', home: '回到原点',
    pu: '抬笔', penup: '抬笔', pd: '落笔', pendown: '落笔',
    pencolor: '设定画笔颜色', fillcolor: '设定填充颜色', color: '设定颜色',
    pensize: '设定画笔粗细', begin_fill: '开始填充', end_fill: '结束填充',
    dot: '画点', write: '写文字', seth: '设定朝向', setheading: '设定朝向',
    speed: '设定速度', hideturtle: '隐藏海龟'
  }
  const found: string[] = []
  for (const key of Object.keys(map)) {
    const re = new RegExp(`\\.${key}\\s*\\(`)
    const label = map[key]
    if (label && re.test(src) && !found.includes(label)) found.push(label)
  }
  return found
})

const plainSummary = computed(() => {
  const kw = (props.keywords || []).filter(Boolean).join('、')
  const cmds = usedCommands.value.slice(0, 6).join('、')
  const head = props.title ? `本题（${props.title}）` : '本题'
  const kwPart = kw ? `涉及${kw}等知识点，` : ''
  const cmdPart = cmds ? `会用到 ${cmds} 等海龟绘图命令，` : ''
  return `${head}可以直接在浏览器里运行 Python 海龟绘图代码：${kwPart}${cmdPart}无需安装环境即可看到绘制结果，修改参数还能观察图形变化。`
})


const canvasRef = ref<HTMLCanvasElement | null>(null)
const editorCode = ref(props.code || '')
const status = ref<'idle' | 'running' | 'ok' | 'error'>('idle')
const errorMessage = ref('')
const copied = ref(false)
const ranOnce = ref(false)

// One step of the drawing timeline. The interpreter drives these in order.
type Seg = { x1: number, y1: number, x2: number, y2: number, color: string, width: number }
type Op =
  | { kind: 'line', x1: number, y1: number, x2: number, y2: number, color: string, width: number, animSpeed?: number }
  | { kind: 'dot', x: number, y: number, r: number, color: string }
  | { kind: 'text', x: number, y: number, text: string, color: string }
  | { kind: 'fill', color: string, path: number[][] }
  | { kind: 'move', x: number, y: number, heading: number, penDown: boolean, animSpeed?: number }

let opLog: Op[] = []
// Current turtle pose (live, for animation).
let cursor = { x: 0, y: 0, heading: 0, penDown: true, visible: false }
let speedSetting = 3
let currentFillPath: number[][] | null = null
let fillPoints: number[][] = []

// Transform (computed once per run so the canvas never rescales mid-animation).
let worldTransform = { scale: 1, wcx: 0, wcy: 0, cssW: 0, cssH: 0, ready: false }
let lastCssW = 0
let lastCssH = 0

let animHandle = 0

function resetBuffers() {
  opLog = []
  currentFillPath = null
  fillPoints = []
  cursor = { x: 0, y: 0, heading: 0, penDown: true, visible: true }
  worldTransform.ready = false
}

// Canvas drawing surface bridging the interpreter's vector calls to the timeline.
const surface = {
  drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number, animSpeed?: number) {
    opLog.push({ kind: 'line', x1, y1, x2, y2, color, width, animSpeed: animSpeed === undefined ? speedSetting : animSpeed })
    if (currentFillPath) { fillPoints.push([x2, y2]) }
  },
  drawDot(x: number, y: number, r: number, color: string) {
    opLog.push({ kind: 'dot', x, y, r, color })
  },
  drawText(x: number, y: number, text: string, color: string) {
    opLog.push({ kind: 'text', x, y, text, color })
  },
  beginPath() {
    currentFillPath = [[cursor.x, cursor.y]]
    fillPoints = [[cursor.x, cursor.y]]
  },
  endFill(color: string) {
    if (currentFillPath) opLog.push({ kind: 'fill', color, path: fillPoints.slice() })
    currentFillPath = null
    fillPoints = []
  },
  moveCursor(x: number, y: number, heading: number, penDown: boolean, animSpeed?: number) {
    cursor = { x, y, heading, penDown, visible: cursor.visible }
    opLog.push({ kind: 'move', x, y, heading, penDown, animSpeed: animSpeed === undefined ? speedSetting : animSpeed })
  },
  setSpeed(sp: number) { speedSetting = sp },
  drawTurtle(x: number, y: number, heading: number, visible: boolean) {
    cursor = { x, y, heading, penDown: cursor.penDown, visible }
  },
  clear() {
    resetBuffers()
  }
}

// Bounds over the COMPLETE op log, so the transform is stable for the whole run.
function computeBounds() {
  let minX = 0, maxX = 0, minY = 0, maxY = 0
  const consider = (x: number, y: number, pad = 0) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    minX = Math.min(minX, x - pad); maxX = Math.max(maxX, x + pad)
    minY = Math.min(minY, y - pad); maxY = Math.max(maxY, y + pad)
  }
  for (const op of opLog) {
    if (op.kind === 'line') { consider(op.x1, op.y1); consider(op.x2, op.y2) }
    else if (op.kind === 'dot') consider(op.x, op.y, op.r)
    else if (op.kind === 'text') { consider(op.x, op.y); consider(op.x + 6, op.y + 6) }
    else if (op.kind === 'fill') for (const pt of op.path) consider(pt[0] ?? 0, pt[1] ?? 0)
    else if (op.kind === 'move') consider(op.x, op.y, 6)
  }
  return { minX, maxX, minY, maxY }
}

// Prepare the canvas size + a fixed world->screen transform for this run.
function prepareTransform() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cssW = canvas.clientWidth || 420
  const cssH = Math.max(220, Math.min(420, Math.round(cssW * 0.72)))
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1

  // Only resize the backing store when the CSS size actually changed: setting
  // canvas.width/height clears it and can trigger a layout flash (the "抖动").
  if (cssW !== lastCssW || cssH !== lastCssH) {
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    canvas.style.height = `${cssH}px`
    lastCssW = cssW
    lastCssH = cssH
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const b = computeBounds()
  const MIN_WORLD = 260
  let spanX = Math.max(b.maxX - b.minX, MIN_WORLD)
  let spanY = Math.max(b.maxY - b.minY, MIN_WORLD)
  const wcx = (b.minX + b.maxX) / 2
  const wcy = (b.minY + b.maxY) / 2
  spanX *= 1.15
  spanY *= 1.15

  const margin = 16
  const availW = cssW - margin * 2
  const availH = cssH - margin * 2
  const scale = Math.min(availW / spanX, availH / spanY)

  worldTransform = { scale, wcx, wcy, cssW, cssH, ready: true }
}

const tx = (x: number) => worldTransform.cssW / 2 + (x - worldTransform.wcx) * worldTransform.scale
const ty = (y: number) => worldTransform.cssH / 2 - (y - worldTransform.wcy) * worldTransform.scale

function clearStage(ctx: CanvasRenderingContext2D) {
  const { cssW, cssH } = worldTransform
  ctx.clearRect(0, 0, cssW, cssH)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cssW, cssH)
  drawGrid(ctx, cssW, cssH)
  drawOrigin(ctx, tx(0), ty(0))
}

// Draw a single op onto the canvas (incremental, no full clear).
function drawOp(ctx: CanvasRenderingContext2D, op: Op) {
  if (op.kind === 'fill') {
    if (!op.path.length) return
    ctx.beginPath()
    op.path.forEach((pt, i) => { const x = pt[0] ?? 0; const y = pt[1] ?? 0; if (i === 0) ctx.moveTo(tx(x), ty(y)); else ctx.lineTo(tx(x), ty(y)) })
    ctx.closePath()
    ctx.fillStyle = op.color
    ctx.fill()
  } else if (op.kind === 'line') {
    ctx.beginPath()
    ctx.strokeStyle = op.color
    ctx.lineWidth = Math.max(1.2, Math.min(2, op.width * 0.9))
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(tx(op.x1), ty(op.y1))
    ctx.lineTo(tx(op.x2), ty(op.y2))
    ctx.stroke()
  } else if (op.kind === 'dot') {
    ctx.beginPath()
    ctx.fillStyle = op.color
    ctx.arc(tx(op.x), ty(op.y), Math.max(1.4, op.r * worldTransform.scale), 0, Math.PI * 2)
    ctx.fill()
  } else if (op.kind === 'text') {
    ctx.fillStyle = op.color
    ctx.font = '13px system-ui, sans-serif'
    ctx.textBaseline = 'bottom'
    ctx.fillText(op.text, tx(op.x), ty(op.y))
  }
  // 'move' ops produce no ink; cursor is drawn on top each frame.
}

// Redraw everything up to index `count` (used for instant render / resize).
function drawUpTo(ctx: CanvasRenderingContext2D, count: number) {
  for (let i = 0; i < count && i < opLog.length; i += 1) { const op = opLog[i]; if (op) drawOp(ctx, op) }
}

// Find cursor pose after consuming `count` ops.
function poseAfter(count: number) {
  let pose = { x: 0, y: 0, heading: 0, penDown: true }
  for (let i = 0; i < count && i < opLog.length; i += 1) {
    const op = opLog[i]
    if (!op) continue
    if (op.kind === 'move') pose = { x: op.x, y: op.y, heading: op.heading, penDown: op.penDown }
    else if (op.kind === 'line') pose = { x: op.x2, y: op.y2, heading: pose.heading, penDown: true }
    else if (op.kind === 'dot') pose = { x: op.x, y: op.y, heading: pose.heading, penDown: true }
  }
  return pose
}

function renderStatic() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  prepareTransform()
  if (!worldTransform.ready) return
  clearStage(ctx)
  if (opLog.length === 0) return
  drawUpTo(ctx, opLog.length)
  const pose = poseAfter(opLog.length)
  if (cursor.visible) drawTurtleCursor(ctx, tx(pose.x), ty(pose.y), pose.heading)
}

// --- Animation model: matches CPython turtle.py's hop-based animation. ---
// CPython splits each primitive into `nhops` frames and waits the SAME delay
// between frames, so every command animates at a constant rate:
//   - move of screen distance d:  nhops_move = 1 + int(d / (3 * 1.1^s * s))
//   - rotate of angle a (deg):    nhops_rot  = 1 + int(|a| / (3 * s))
// We build a flat timeline of frames (one per hop). Each frame advances either a
// small distance along the current segment or a small angle of the current turn
// (or nothing, for dot/text/fill which are instantaneous). One frame == one unit
// of time, giving uniform speed for all commands.
type Frame =
  | { kind: 'stroke', op: Seg, fromX: number, fromY: number, toFrac: number, heading: number } // drawn segment, partial ink
  | { kind: 'rot', x: number, y: number, heading: number }      // pure rotation pose
  | { kind: 'jump', x: number, y: number, heading: number }     // pen-up move pose
  | { kind: 'instant', op: Op }                                 // dot/text/fill (drawn at once)

let frames: Frame[] = []

// Faithful transcription of CPython turtle.py's animation model.
//
// In CPython (RawTurtle._goto / _rotate) each primitive is split into `nhops`
// steps, and EVERY step calls screen._delay(screen._delayvalue) with the SAME
// fixed delay (default 10 ms). So speed does not change the frame delay; it
// changes the number/size of hops:
//   move:    nhops = 1 + int( sqrt((dx*xscale)^2+(dy*yscale)^2) / (3*1.1^s*s) )
//   rotate:  steps = 1 + int( |angle| / (3*s) );   s == 0  => instant (no steps)
// In standard mode xscale == yscale == 1.0, so we use WORLD units here (the
// canvas fit-scale is a pure rendering concern and must NOT leak into timing).
// The per-op speed comes from the interpreter (circle's internal rotations use
// speed 0 => instant, exactly like CPython's speed(0) around _rotate()).
function buildFrames(defaultSpeed: number) {
  frames = []
  const clampSpeed = (v: number | undefined) => {
    const n = v === undefined || v === null ? defaultSpeed : v
    if (!(0.5 < n && n < 10.5)) return 0 // CPython: <0.5 or >10.5 => 0 (jump)
    return Math.round(n)
  }
  const XSCALE = 1, YSCALE = 1 // standard mode

  let px = 0, py = 0, heading = 0

  const pushRot = (targetHeading: number, sp: number) => {
    const delta = targetHeading - heading
    if (Math.abs(delta) < 1e-9) return
    if (sp <= 0) { heading = targetHeading; return } // speed 0 => turn instantly
    const steps = 1 + Math.floor(Math.abs(delta) / (3 * sp))
    const inc = delta / steps
    for (let i = 1; i <= steps; i += 1) {
      frames.push({ kind: 'rot', x: px, y: py, heading: heading + inc * i })
    }
    heading = targetHeading
  }

  // Emit motion frames for a translation from (px,py) to (tx2,ty2).
  //   strokeOp given  -> drawn segment: emit `stroke` frames that lay ink.
  //   strokeOp absent -> pen-up jump: emit `jump` frames that only move the cursor.
  const pushMove = (tx2: number, ty2: number, sp: number, trackHeading: boolean, strokeOp?: Seg) => {
    const dx = tx2 - px, dy = ty2 - py
    const distSq = (dx * XSCALE) ** 2 + (dy * YSCALE) ** 2
    const dist = Math.sqrt(distSq)
    if (dist < 1e-9) return
    const nhops = sp <= 0 ? 1 : 1 + Math.floor(dist / (3 * Math.pow(1.1, sp) * sp))
    const startX = px, startY = py
    const h = Math.atan2(dy, dx) * 180 / Math.PI
    for (let n = 1; n <= nhops; n += 1) {
      const f = n / nhops
      if (strokeOp) {
        frames.push({ kind: 'stroke', op: strokeOp, fromX: startX, fromY: startY, toFrac: f, heading: h })
      } else {
        frames.push({ kind: 'jump', x: startX + dx * f, y: startY + dy * f, heading: h })
      }
    }
    px = tx2; py = ty2
    if (trackHeading) heading = h // pen-up jump follows travel dir; drawn line does not
  }

  for (const op of opLog) {
    if (op.kind === 'line') {
      // A drawn segment is pure translation (_go): animate it, no rotation.
      // The turtle's heading is owned by the adjacent `move` op, so don't touch it.
      pushMove(op.x2, op.y2, clampSpeed(op.animSpeed), false, op)
    } else if (op.kind === 'move') {
      const sp = clampSpeed(op.animSpeed)
      // Pen-up / jump translation along the straight path.
      const dist = Math.hypot(op.x - px, op.y - py)
      if (dist > 1e-6) pushMove(op.x, op.y, sp, true)
      // Heading change (rotation) at this op's speed.
      pushRot(op.heading, sp)
    } else {
      // dot / text / fill: instantaneous
      frames.push({ kind: 'instant', op })
    }
  }
}

function startAnimation() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (animHandle) cancelAnimationFrame(animHandle)
  prepareTransform()
  if (!worldTransform.ready) return

  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
  const ink = document.createElement('canvas')
  ink.width = canvas.width
  ink.height = canvas.height
  const ictx = ink.getContext('2d')
  if (!ictx) { renderStatic(); return }
  ictx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ictx.lineCap = 'round'
  ictx.lineJoin = 'round'

  // speed 0 ("fastest") => no animation, draw instantly (CPython: jumps).
  if (speedSetting === 0) {
    for (let i = 0; i < opLog.length; i += 1) { const op = opLog[i]; if (op) drawOp(ictx, op) }
    const pose = poseAfter(opLog.length)
    clearStage(ctx)
    ctx.drawImage(ink, 0, 0, worldTransform.cssW, worldTransform.cssH)
    if (cursor.visible) drawTurtleCursor(ctx, tx(pose.x), ty(pose.y), pose.heading)
    status.value = 'ok'
    ranOnce.value = true
    return
  }

  buildFrames(speedSetting)
  // @ts-ignore debug hook (removed after measurement)
  // @ts-ignore debug hook (removed after measurement)
  if (typeof window !== 'undefined') (window as any).__ttFrames = { frames, scale: worldTransform.scale }

  // CPython's animation uses a FIXED delay between every hop
  // (screen._delayvalue, default 10 ms). Speed changes the *number of hops*, not
  // the delay. We honour that: one frame == one hop == DELAY_MS of wall time.
  // (We use requestAnimationFrame's elapsed-time accounting to keep the cadence,
  // and only coalesce hops if the tab is throttled, never changing relative speed.)
  const DELAY_MS = 10 // CPython _CFG["delay"]: fixed wall-clock delay per hop

  let frameIdx = 0
  let acc = 0
  let lastTs = 0

  const composite = (curX: number, curY: number, curHeading: number) => {
    clearStage(ctx)
    ctx.drawImage(ink, 0, 0, worldTransform.cssW, worldTransform.cssH)
    if (cursor.visible) drawTurtleCursor(ctx, tx(curX), ty(curY), curHeading)
  }

  const applyFrame = (fr: Frame) => {
    if (fr.kind === 'stroke') {
      strokePartial(ictx, fr.op, fr.toFrac)
      return { x: fr.fromX + (fr.op.x2 - fr.fromX) * fr.toFrac, y: fr.fromY + (fr.op.y2 - fr.fromY) * fr.toFrac, heading: fr.heading }
    }
    if (fr.kind === 'instant') { drawOp(ictx, fr.op); return null }
    return { x: fr.x, y: fr.y, heading: fr.heading }
  }

  let pose = { x: 0, y: 0, heading: 0 }
  const step = (ts: number) => {
    if (!lastTs) lastTs = ts
    acc += ts - lastTs
    lastTs = ts
    // Consume one hop per DELAY_MS of elapsed wall time (CPython cadence).
    // Clamp catch-up so a stalled/throttled tab can't fast-forward the whole
    // animation in one giant frame; relative speed is still preserved.
    let budget = Math.floor(acc / DELAY_MS)
    if (budget > 8) budget = 8
    acc -= budget * DELAY_MS
    if (acc < 0) acc = 0
    if (budget < 1) budget = 1 // always progress at least one hop per tick
    while (budget > 0 && frameIdx < frames.length) {
      const fr = frames[frameIdx]
      frameIdx += 1
      budget -= 1
      if (fr) { const p = applyFrame(fr); if (p) pose = p }
    }
    if (frameIdx >= frames.length) {
      // Final clean draw (#3 ensures exact geometry with full-precision ops).
      for (let i = 0; i < opLog.length; i += 1) { const op = opLog[i]; if (op) drawOp(ictx, op) }
      const fin = poseAfter(opLog.length)
      composite(fin.x, fin.y, fin.heading)
      status.value = 'ok'
      ranOnce.value = true
      animHandle = 0
      // @ts-ignore debug
      if (typeof window !== 'undefined') (window as any).__ttInfo = { hops: frames.length, startMs: (window as any).__ttStartMs || 0, endMs: performance.now() }
      return
    }
    composite(pose.x, pose.y, pose.heading)
    animHandle = requestAnimationFrame(step)
  }
  status.value = 'running'
  // @ts-ignore debug
  if (typeof window !== 'undefined') (window as any).__ttStartMs = performance.now()
  animHandle = requestAnimationFrame(step)
}

// Stroke a line op from its start to `frac` (0..1) of the way.
function strokePartial(ctx: CanvasRenderingContext2D, op: { x1: number, y1: number, x2: number, y2: number, color: string, width: number }, frac: number) {
  const ex = op.x1 + (op.x2 - op.x1) * frac
  const ey = op.y1 + (op.y2 - op.y1) * frac
  ctx.beginPath()
  ctx.strokeStyle = op.color
  ctx.lineWidth = Math.max(1.2, Math.min(2, op.width * 0.9))
  ctx.moveTo(tx(op.x1), ty(op.y1))
  ctx.lineTo(tx(ex), ty(ey))
  ctx.stroke()
}

function drawOrigin(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(sx, sy, 3, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = 1.2
  ctx.strokeStyle = '#111827'
  ctx.stroke()
  ctx.restore()
}

function drawTurtleCursor(ctx: CanvasRenderingContext2D, sx: number, sy: number, heading: number) {
  ctx.save()
  ctx.translate(sx, sy)
  // screen heading: turtle 0deg = +x (east); canvas y is flipped
  ctx.rotate((-heading * Math.PI) / 180)
  // Tip sits exactly at the cursor point (the pen tip), body trails behind, so
  // the freshly drawn line always meets the arrowhead with no visible gap.
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-11, 5.5)
  ctx.lineTo(-11, -5.5)
  ctx.closePath()
  ctx.fillStyle = '#111827'
  ctx.fill()
  ctx.restore()
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const scale = worldTransform.scale
  ctx.save()
  ctx.strokeStyle = '#eef2f7'
  ctx.lineWidth = 1
  // world-unit grid spacing chosen so lines land ~30px apart
  const worldStepRaw = 30 / Math.max(scale, 0.0001)
  const pow = Math.pow(10, Math.floor(Math.log10(worldStepRaw)))
  const candidates = [1, 2, 5, 10].map((m) => m * pow)
  const worldStep: number = candidates.find((c) => c * scale >= 22) ?? candidates[candidates.length - 1] ?? 1
  const stepPx = worldStep * scale
  if (stepPx > 4) {
    let guard = 0
    for (let x = Math.floor((0 - tx(0)) / stepPx) * worldStep; guard < 400; x += worldStep, guard += 1) {
      const px = tx(x)
      if (px > w + 1) break
      if (px >= -1) { ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke() }
    }
    guard = 0
    for (let y = Math.floor((ty(0) - h) / stepPx) * worldStep; guard < 400; y += worldStep, guard += 1) {
      const py = ty(y)
      if (py < -1) break
      if (py <= h + 1) { ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke() }
    }
  }
  ctx.restore()
}

function run() {
  status.value = 'running'
  errorMessage.value = ''
  // @ts-ignore debug
  if (typeof window !== 'undefined') { (window as any).__ttInfo = null; (window as any).__ttFrames = null }
  if (animHandle) { cancelAnimationFrame(animHandle); animHandle = 0 }
  resetBuffers()
  // Execute the whole program first (records the ordered op timeline), then
  // animate the replay. Running the interpreter is synchronous and cheap.
  try {
    runTurtle(editorCode.value, { surface })
    // Begin animation on the next frame so the running state paints first.
    requestAnimationFrame(() => startAnimation())
  } catch (e: any) {
    status.value = 'error'
    errorMessage.value = e && e.message ? e.message : String(e)
    // Still show whatever was drawn before the error, without animation.
    requestAnimationFrame(() => renderStatic())
  }
}

// Execute the program WITHOUT animating, just so we can compute the final
// transform and paint the grid at that exact transform. This prevents the grid
// (and the drawing) from shifting when the animation begins.
function prewarmAndPaintGrid() {
  resetBuffers()
  try {
    runTurtle(editorCode.value, { surface })
  } catch (_) {
    // ignore: run() will report the error properly
  }
  // Compute the same transform startAnimation will use, then paint grid only.
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  prepareTransform()
  if (worldTransform.ready) clearStage(ctx)
}

function resetToOriginal() {
  if (animHandle) { cancelAnimationFrame(animHandle); animHandle = 0 }
  editorCode.value = props.code || ''
  errorMessage.value = ''
  status.value = 'idle'
  resetBuffers()
  prewarmAndPaintGrid()
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(editorCode.value)
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 1400)
  } catch (_) { /* ignore */ }
}

let resizeTimer: any = null
function onResize() {
  if (resizeTimer) window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    // Cancel any running animation and repaint instantly at the new size.
    if (animHandle) { cancelAnimationFrame(animHandle); animHandle = 0 }
    renderStatic()
  }, 120)
}

onMounted(() => {
  // Run the program to learn the final transform, then paint ONLY the grid at
  // that transform. The drawing then animates on top; nothing shifts.
  prewarmAndPaintGrid()
  window.addEventListener('resize', onResize)
  // Auto-run the reference solution so visitors immediately see it drawn.
  window.setTimeout(() => run(), 300)
})

onBeforeUnmount(() => {
  if (animHandle) cancelAnimationFrame(animHandle)
  window.removeEventListener('resize', onResize)
})

const hasCode = computed(() => Boolean(props.code && props.code.trim()))
</script>

<template>
  <section class="turtle-runner" aria-label="在线运行 Python 海龟绘图">
    <header class="turtle-runner__head">
      <div class="turtle-runner__title">
        <span class="turtle-runner__dot" />
        在线运行 · 改一改数字，点运行看效果
      </div>
      <div class="turtle-runner__actions">
        <button type="button" class="tr-btn tr-btn--ghost" @click="copyCode">
          {{ copied ? '已复制' : '复制代码' }}
        </button>
        <button type="button" class="tr-btn tr-btn--ghost" @click="resetToOriginal">重置</button>
        <button type="button" class="tr-btn tr-btn--primary" @click="run">▶ 运行</button>
      </div>
    </header>

    <p class="turtle-runner__intro">{{ plainSummary }}</p>

    <div class="turtle-runner__body">
      <div class="turtle-runner__editor-wrap">
        <textarea
          v-model="editorCode"
          class="turtle-runner__editor"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
          aria-label="Python 绘图代码编辑器"
        />
      </div>
      <div class="turtle-runner__stage">
        <canvas ref="canvasRef" class="turtle-runner__canvas" />
        <div v-if="status === 'error'" class="turtle-runner__error">
          {{ errorMessage }}
        </div>
        <div v-else-if="!ranOnce && status !== 'running'" class="turtle-runner__hint">
          点「▶ 运行」查看绘制结果
        </div>
      </div>
    </div>

    <noscript>
      <p class="turtle-runner__noscript">
        在线运行需要浏览器启用 JavaScript；你也可以直接复制上方「答案」中的完整参考代码，在自己的 Python 环境里运行。
      </p>
    </noscript>

    <p class="turtle-runner__foot">
      提示：本页在浏览器内模拟运行常见 turtle 命令（前进 / 转向 / 画圆 / 抬笔落笔 / 填色等），改个参数就能看到不同图案。
      <span v-if="!hasCode">（本页暂无可运行的参考代码）</span>
    </p>
  </section>
</template>

<style scoped>
.turtle-runner {
  margin: 1.6rem 0 1.8rem;
  border: 1px solid var(--ui-border, #e5e7eb);
  border-radius: 0.85rem;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 10px 30px -18px rgba(15, 23, 42, 0.35);
}

.turtle-runner__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.6rem 0.85rem;
  background: linear-gradient(180deg, #f8fafc, #eef2f7);
  border-bottom: 1px solid #e5e7eb;
}

.turtle-runner__title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #334155;
}

.turtle-runner__dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
}

.turtle-runner__actions {
  display: inline-flex;
  gap: 0.4rem;
}

.tr-btn {
  border-radius: 0.45rem;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 0.34rem 0.7rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.tr-btn--primary {
  background: #4f46e5;
  color: #fff;
  border-color: #4338ca;
}
.tr-btn--primary:hover { background: #4338ca; }

.tr-btn--ghost {
  background: #fff;
  color: #334155;
  border-color: #cbd5e1;
}
.tr-btn--ghost:hover { border-color: #94a3b8; background: #f8fafc; }

.turtle-runner__intro {
  margin: 0;
  padding: 0.6rem 0.85rem;
  font-size: 0.8rem;
  line-height: 1.65;
  color: #475569;
  background: #f8fafc;
  border-bottom: 1px solid #eef2f7;
}

.turtle-runner__noscript {
  margin: 0;
  padding: 0.6rem 0.85rem;
  font-size: 0.78rem;
  line-height: 1.6;
  color: #92400e;
  background: #fffbeb;
  border-top: 1px solid #fde68a;
}

.turtle-runner__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0;
}

.turtle-runner__editor-wrap {
  border-right: 1px solid #e5e7eb;
  background: #0f172a;
}

.turtle-runner__editor {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 260px;
  resize: vertical;
  border: 0;
  outline: none;
  padding: 0.9rem;
  background: #0f172a;
  color: #dbeafe;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  tab-size: 4;
  white-space: pre;
  overflow: auto;
}

.turtle-runner__stage {
  position: relative;
  padding: 0.6rem;
  background: #f8fafc;
}

.turtle-runner__canvas {
  display: block;
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.turtle-runner__error {
  position: absolute;
  left: 0.9rem;
  right: 0.9rem;
  bottom: 0.9rem;
  padding: 0.5rem 0.7rem;
  border-radius: 0.45rem;
  background: rgba(220, 38, 38, 0.95);
  color: #fff;
  font-size: 0.74rem;
  line-height: 1.4;
  max-height: 40%;
  overflow: auto;
}

.turtle-runner__hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.8rem;
  color: #94a3b8;
}

.turtle-runner__foot {
  margin: 0;
  padding: 0.6rem 0.85rem;
  border-top: 1px solid #eef2f7;
  background: #fbfcfe;
  font-size: 0.74rem;
  color: #64748b;
  line-height: 1.6;
}

@media (max-width: 767px) {
  .turtle-runner__body {
    grid-template-columns: 1fr;
  }
  .turtle-runner__editor-wrap {
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }
  .turtle-runner__editor {
    min-height: 200px;
  }
}
</style>
