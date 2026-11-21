<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
    if (re.test(src) && !found.includes(map[key])) found.push(map[key])
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

type Seg = { x1: number, y1: number, x2: number, y2: number, color: string, width: number }
type Dot = { x: number, y: number, r: number, color: string }
type Label = { x: number, y: number, text: string, color: string, font: any }

let segments: Seg[] = []
let dots: Dot[] = []
let labels: Label[] = []
let fills: { color: string, path: number[][] }[] = []
let currentFillPath: number[][] | null = null

function resetBuffers() {
  segments = []
  dots = []
  labels = []
  fills = []
  currentFillPath = null
}

// Canvas drawing surface bridging the interpreter's vector calls.
const surface = {
  drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
    segments.push({ x1, y1, x2, y2, color, width })
  },
  drawDot(x: number, y: number, r: number, color: string) {
    dots.push({ x, y, r, color })
  },
  drawText(x: number, y: number, text: string, color: string) {
    labels.push({ x, y, text, color, font: { size: 14 } })
  },
  beginPath() {
    currentFillPath = []
  },
  endFill(color: string) {
    if (currentFillPath) fills.push({ color, path: currentFillPath.slice() })
    currentFillPath = null
  },
  drawTurtle() {},
  clear() {
    resetBuffers()
  }
}

function computeBounds() {
  let minX = 0, maxX = 0, minY = 0, maxY = 0
  const consider = (x: number, y: number, pad = 0) => {
    minX = Math.min(minX, x - pad); maxX = Math.max(maxX, x + pad)
    minY = Math.min(minY, y - pad); maxY = Math.max(maxY, y + pad)
  }
  for (const s of segments) { consider(s.x1, s.y1); consider(s.x2, s.y2) }
  for (const d of dots) consider(d.x, d.y, d.r)
  for (const l of labels) consider(l.x, l.y)
  for (const f of fills) for (const [x, y] of f.path) consider(x, y)
  return { minX, maxX, minY, maxY }
}

function renderCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cssW = canvas.clientWidth || 420
  const cssH = Math.max(220, Math.min(420, Math.round(cssW * 0.72)))
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.height = `${cssH}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.clearRect(0, 0, cssW, cssH)
  // background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cssW, cssH)
  drawGrid(ctx, cssW, cssH)

  const b = computeBounds()
  const pad = 18
  const spanX = Math.max(1, b.maxX - b.minX)
  const spanY = Math.max(1, b.maxY - b.minY)
  const scale = Math.min((cssW - pad * 2) / spanX, (cssH - pad * 2) / spanY, 4)
  // world -> screen: turtle y is up, canvas y is down. Center the drawing.
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  const tx = (x: number) => cssW / 2 + (x - cx) * scale
  const ty = (y: number) => cssH / 2 - (y - cy) * scale

  // fills first
  for (const f of fills) {
    if (!f.path.length) continue
    ctx.beginPath()
    f.path.forEach(([x, y], i) => {
      const sx = tx(x), sy = ty(y)
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy)
    })
    ctx.closePath()
    ctx.fillStyle = f.color
    ctx.globalAlpha = 0.85
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // lines
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of segments) {
    ctx.beginPath()
    ctx.strokeStyle = s.color
    ctx.lineWidth = Math.max(1, s.width * Math.min(scale, 1.6))
    ctx.moveTo(tx(s.x1), ty(s.y1))
    ctx.lineTo(tx(s.x2), ty(s.y2))
    ctx.stroke()
  }

  for (const d of dots) {
    ctx.beginPath()
    ctx.fillStyle = d.color
    ctx.arc(tx(d.x), ty(d.y), Math.max(1.5, d.r * scale), 0, Math.PI * 2)
    ctx.fill()
  }

  for (const l of labels) {
    ctx.fillStyle = l.color
    ctx.font = '14px sans-serif'
    ctx.fillText(l.text, tx(l.x), ty(l.y))
  }

  // origin marker
  ctx.beginPath()
  ctx.fillStyle = 'rgba(99,102,241,0.9)'
  ctx.arc(tx(0), ty(0), 3, 0, Math.PI * 2)
  ctx.fill()
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  ctx.strokeStyle = '#eef2f7'
  ctx.lineWidth = 1
  const step = 28
  for (let x = 0; x <= w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  for (let y = 0; y <= h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
  ctx.restore()
}

function run() {
  status.value = 'running'
  errorMessage.value = ''
  resetBuffers()
  // let the UI paint the running state first
  requestAnimationFrame(() => {
    try {
      runTurtle(editorCode.value, { surface })
      status.value = 'ok'
      ranOnce.value = true
      renderCanvas()
    } catch (e: any) {
      status.value = 'error'
      errorMessage.value = e && e.message ? e.message : String(e)
      // still draw whatever was produced before the error
      renderCanvas()
    }
  })
}

function resetToOriginal() {
  editorCode.value = props.code || ''
  errorMessage.value = ''
  status.value = 'idle'
  resetBuffers()
  renderCanvas()
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
  resizeTimer = window.setTimeout(() => renderCanvas(), 120)
}

onMounted(() => {
  renderCanvas()
  window.addEventListener('resize', onResize)
  // Auto-run the reference solution once so visitors immediately see a result.
  window.setTimeout(() => run(), 220)
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
        <div v-else-if="!ranOnce" class="turtle-runner__hint">
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
