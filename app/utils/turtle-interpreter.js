/**
 * A small, self-contained Python-subset interpreter that drives a turtle
 * drawing surface. It is purpose-built for the "Python 海龟绘图 100 题"
 * exercises on this site: the code is short, procedural and uses a stable
 * subset of the language plus the turtle API.
 *
 * It is NOT a general Python implementation. It intentionally supports:
 *   - statements: assignment, augmented assignment, expression statements,
 *     for / while loops, if / elif / else, def (with params + return), break,
 *     continue, pass
 *   - expressions: numbers, strings, names, booleans, arithmetic
 *     (+ - * / // % **), unary minus, comparisons, and/or/not, calls,
 *     attribute access, list/tuple literals, range(), len(), abs(), min(),
 *     max(), int(), float(), round()
 *   - turtle API exposed as an object (`t`, `turtle`, or any variable bound
 *     to the turtle module) with the common drawing commands.
 *
 * Drawing is emitted as an ordered list of vector operations against a
 * "surface" abstraction, so the same interpreter can be unit-tested headlessly
 * (recording ops) or drive a real <canvas> in the browser.
 */

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

const KEYWORDS = new Set([
  'for', 'in', 'while', 'if', 'elif', 'else', 'def', 'return', 'break',
  'continue', 'pass', 'and', 'or', 'not', 'True', 'False', 'None', 'import',
  'as', 'from', 'global', 'lambda'
])

/**
 * Turn source into an array of logical lines:
 *   { indent: number, tokens: [...], line: number }
 * Blank lines and comment-only lines are dropped. This gives the parser a
 * simple, reliable indentation-block structure to walk.
 */
export function tokenizeLines(source) {
  const logicalLines = []
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n')

  for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
    let line = stripComment(lines[lineNo])
    if (line.trim() === '') continue
    const indent = line.match(/^[ \t]*/)[0].replace(/\t/g, '    ').length
    const tokens = tokenizeLine(line, lineNo + 1)
    // Support simple `;` statement separators on one physical line.
    let current = []
    const grouped = [current]
    for (const tok of tokens) {
      if (tok.type === 'op' && tok.value === ';') { current = []; grouped.push(current); continue }
      current.push(tok)
    }
    grouped.forEach((group, idx) => {
      if (group.length) logicalLines.push({ indent: idx === 0 ? indent : indent, tokens: group, line: lineNo })
    })
  }
  return logicalLines
}

function tokenizeLine(src, lineNo) {
  const tokens = []
  let i = 0
  {
    while (i < src.length) {
      const ch = src[i]
      if (ch === ' ' || ch === '\t') { i += 1; continue }

      // numbers
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        let j = i
        while (j < src.length && /[0-9._]/.test(src[j])) j += 1
        const text = src.slice(i, j).replace(/_/g, '')
        tokens.push({ type: 'number', value: Number(text), line: lineNo })
        i = j
        continue
      }

      // strings
      if (ch === '"' || ch === "'") {
        const quote = ch
        let j = i + 1
        let value = ''
        while (j < src.length && src[j] !== quote) {
          if (src[j] === '\\') {
            const next = src[j + 1]
            value += unescape(next)
            j += 2
            continue
          }
          value += src[j]
          j += 1
        }
        tokens.push({ type: 'string', value, line: lineNo })
        i = j + 1
        continue
      }

      // identifiers / keywords
      if (/[A-Za-z_]/.test(ch)) {
        let j = i
        while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j += 1
        const word = src.slice(i, j)
        if (word === 'True') tokens.push({ type: 'const', value: true, line: lineNo })
        else if (word === 'False') tokens.push({ type: 'const', value: false, line: lineNo })
        else if (word === 'None') tokens.push({ type: 'const', value: null, line: lineNo })
        else if (KEYWORDS.has(word)) tokens.push({ type: 'keyword', value: word, line: lineNo })
        else tokens.push({ type: 'name', value: word, line: lineNo })
        i = j
        continue
      }

      // multi-char operators
      const three = src.slice(i, i + 3)
      const two = src.slice(i, i + 2)
      if (['**='].includes(three)) { tokens.push({ type: 'op', value: three, line: lineNo }); i += 3; continue }
      if (['//=', '**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '->'].includes(two)) {
        tokens.push({ type: 'op', value: two, line: lineNo }); i += 2; continue
      }
      if ('+-*/%()[],:=<>'.includes(ch)) {
        tokens.push({ type: 'op', value: ch, line: lineNo }); i += 1; continue
      }
      if (ch === ';') { tokens.push({ type: 'op', value: ';', line: lineNo }); i += 1; continue }
      if (ch === '.') { tokens.push({ type: 'op', value: '.', line: lineNo }); i += 1; continue }

      throw new TurtleSyntaxError(`无法识别的字符 "${ch}"`, lineNo)
    }
  }
  return tokens
}

function unescape(c) {
  switch (c) {
    case 'n': return '\n'
    case 't': return '\t'
    case 'r': return '\r'
    case '\\': return '\\'
    case '"': return '"'
    case "'": return "'"
    default: return c === undefined ? '' : c
  }
}

function stripComment(line) {
  let inStr = null
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i]
    if (inStr) {
      if (c === '\\') { i += 1; continue }
      if (c === inStr) inStr = null
    } else if (c === '"' || c === "'") {
      inStr = c
    } else if (c === '#') {
      return line.slice(0, i)
    }
  }
  return line
}

export class TurtleSyntaxError extends Error {
  constructor(message, line) {
    super(`第 ${line} 行：${message}`)
    this.name = 'TurtleSyntaxError'
    this.line = line
  }
}

// ---------------------------------------------------------------------------
// Parser (produces an AST of statements / expressions)
// ---------------------------------------------------------------------------

class Parser {
  constructor(lines) {
    this.lines = lines
    this.li = 0
    this.tokens = []
    this.pos = 0
  }

  // --- current-line token cursor ---
  loadLine() {
    this.tokens = this.lines[this.li] ? this.lines[this.li].tokens : []
    this.pos = 0
  }
  peek(offset = 0) { return this.tokens[this.pos + offset] }
  next() { return this.tokens[this.pos++] }
  atEnd() { return this.pos >= this.tokens.length }
  line() { return this.lines[this.li] }
  lineIndent(offset = 0) {
    const l = this.lines[this.li + offset]
    return l ? l.indent : null
  }

  error(msg) {
    const l = this.line()
    throw new TurtleSyntaxError(msg, l ? l.line + 1 : 0)
  }

  isOp(value, offset = 0) {
    const t = this.peek(offset)
    return t && t.type === 'op' && t.value === value
  }
  isKw(value, offset = 0) {
    const t = this.peek(offset)
    return t && t.type === 'keyword' && t.value === value
  }
  expectOp(value) {
    if (!this.isOp(value)) this.error(`缺少 "${value}"`)
    return this.next()
  }

  // Parse a block whose indentation is strictly greater than parentIndent,
  // beginning at this.li. On return this.li points at the first line that is
  // NOT part of the block (i.e. indent <= parentIndent or EOF).
  parseBlock(parentIndent) {
    const body = []
    let blockIndent = null
    while (this.li < this.lines.length) {
      const indent = this.lineIndent()
      if (indent === null || indent <= parentIndent) break
      if (blockIndent === null) blockIndent = indent
      else if (indent < blockIndent) break // dedent closes block
      this.loadLine()
      const stmt = this.parseStatement(blockIndent)
      if (stmt) body.push(stmt)
      // Simple statements leave this.li on themselves; advance.
      // Compound statements leave this.li already at the next unconsumed line.
      if (!stmt || !stmt.__compound) this.li += 1
      if (this.li < this.lines.length) {
        const ind2 = this.lineIndent()
        if (ind2 !== null && ind2 > blockIndent) {
          // stray deeper line (e.g. after a simple stmt) — treat as syntax error
          throw new TurtleSyntaxError('意外的缩进', this.line().line + 1)
        }
      }
    }
    return body
  }

  parseProgram() {
    const body = []
    while (this.li < this.lines.length) {
      const before = this.li
      this.loadLine()
      const stmt = this.parseStatement(0)
      if (stmt) body.push(stmt)
      if (!stmt || !stmt.__compound) this.li = Math.max(this.li, before) + 1
    }
    return body
  }

  parseStatement(blockIndent) {
    if (this.isKw('for')) return this.parseFor(blockIndent)
    if (this.isKw('while')) return this.parseWhile(blockIndent)
    if (this.isKw('if')) return this.parseIf(blockIndent)
    if (this.isKw('def')) return this.parseDef(blockIndent)
    if (this.isKw('return')) {
      this.next()
      const value = this.atEnd() ? null : this.parseExpression()
      return { type: 'return', value }
    }
    if (this.isKw('break')) { this.next(); return { type: 'break' } }
    if (this.isKw('continue')) { this.next(); return { type: 'continue' } }
    if (this.isKw('pass')) { this.next(); return { type: 'pass' } }
    if (this.isKw('import')) { return this.parseImport() }
    if (this.isKw('global')) { this.next(); if (!this.atEnd()) this.next(); return { type: 'pass' } }
    return this.parseExpressionStatement()
  }

  parseImport() {
    this.next()
    const aliases = []
    while (true) {
      const mod = this.peek()
      if (!mod || mod.type !== 'name') this.error('import 后应为模块名')
      let asName = mod.value
      this.next()
      if (this.isKw('as')) {
        this.next()
        const alias = this.next()
        if (!alias || alias.type !== 'name') this.error('as 后应为名称')
        asName = alias.value
      }
      aliases.push({ module: mod.value, as: asName })
      if (this.isOp(',')) { this.next(); continue }
      break
    }
    return { type: 'import', aliases }
  }

  // Compounds: header sits at this.li; body starts at this.li + 1.
  parseCompoundBody(headerIndent) {
    this.li += 1
    return this.parseBlock(headerIndent)
  }

  parseFor(blockIndent) {
    this.next()
    const target = this.next()
    if (!target || target.type !== 'name') this.error('for 后应为变量名')
    if (!this.isKw('in')) this.error('for 语句缺少 in')
    this.next()
    const iterable = this.parseExpression()
    this.expectOp(':')
    const body = this.parseCompoundBody(blockIndent)
    return { type: 'for', target: target.value, iterable, body, __compound: true }
  }

  parseWhile(blockIndent) {
    this.next()
    const test = this.parseExpression()
    this.expectOp(':')
    const body = this.parseCompoundBody(blockIndent)
    return { type: 'while', test, body, __compound: true }
  }

  parseIf(blockIndent) {
    this.next() // if
    const branches = []
    const test0 = this.parseExpression()
    this.expectOp(':')
    const body0 = this.parseCompoundBody(blockIndent)
    branches.push({ test: test0, body: body0 })
    while (true) {
      const nextLine = this.lines[this.li]
      if (!nextLine || nextLine.indent !== blockIndent) break
      const first = nextLine.tokens[0]
      if (first.type === 'keyword' && first.value === 'elif') {
        this.loadLine()
        this.next()
        const test = this.parseExpression()
        this.expectOp(':')
        const body = this.parseCompoundBody(blockIndent)
        branches.push({ test, body })
        continue
      }
      if (first.type === 'keyword' && first.value === 'else') {
        this.loadLine()
        this.next()
        this.expectOp(':')
        const body = this.parseCompoundBody(blockIndent)
        branches.push({ test: null, body })
        break
      }
      break
    }
    return { type: 'if', branches, __compound: true }
  }

  parseDef(blockIndent) {
    this.next()
    const nameTok = this.next()
    if (!nameTok || nameTok.type !== 'name') this.error('def 后应为函数名')
    this.expectOp('(')
    const params = []
    while (!this.isOp(')')) {
      const p = this.next()
      if (!p || p.type !== 'name') this.error('参数应为名称')
      params.push(p.value)
      if (this.isOp('=')) { this.next(); this.parseExpression() }
      if (this.isOp(',')) { this.next(); continue }
      break
    }
    this.expectOp(')')
    this.expectOp(':')
    const body = this.parseCompoundBody(blockIndent)
    return { type: 'def', name: nameTok.value, params, body, __compound: true }
  }

  parseExpressionStatement() {
    const first = this.peek()
    if (!first) this.error('空语句')
    if (first.type === 'name' && this.peek(1) && this.peek(1).type === 'op' &&
        ['=', '+=', '-=', '*=', '/=', '//=', '%=', '**='].includes(this.peek(1).value)) {
      const name = this.next().value
      const op = this.next().value
      const value = this.parseExpression()
      return { type: 'assign', name, op, value }
    }
    const expr = this.parseExpression()
    return { type: 'expr', expr }
  }

  // ----- expression precedence climbing -----
  parseExpression() { return this.parseOr() }

  parseOr() {
    let left = this.parseAnd()
    while (this.isKw('or')) { this.next(); const right = this.parseAnd(); left = { type: 'logical', op: 'or', left, right } }
    return left
  }

  parseAnd() {
    let left = this.parseNot()
    while (this.isKw('and')) { this.next(); const right = this.parseNot(); left = { type: 'logical', op: 'and', left, right } }
    return left
  }

  parseNot() {
    if (this.isKw('not')) { this.next(); return { type: 'unary', op: 'not', operand: this.parseNot() } }
    return this.parseComparison()
  }

  parseComparison() {
    let left = this.parseArith()
    while (this.peek() && this.peek().type === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(this.peek().value)) {
      const op = this.next().value
      const right = this.parseArith()
      left = { type: 'compare', op, left, right }
    }
    return left
  }

  parseArith() {
    let left = this.parseTerm()
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.next().value
      const right = this.parseTerm()
      left = { type: 'binary', op, left, right }
    }
    return left
  }

  parseTerm() {
    let left = this.parseUnary()
    while (this.isOp('*') || this.isOp('/') || this.isOp('//') || this.isOp('%')) {
      const op = this.next().value
      const right = this.parseUnary()
      left = { type: 'binary', op, left, right }
    }
    return left
  }

  parseUnary() {
    if (this.isOp('-')) { this.next(); return { type: 'unary', op: '-', operand: this.parseUnary() } }
    if (this.isOp('+')) { this.next(); return this.parseUnary() }
    return this.parsePower()
  }

  parsePower() {
    const base = this.parsePostfix()
    if (this.isOp('**')) {
      this.next()
      const exp = this.parseUnary()
      return { type: 'binary', op: '**', left: base, right: exp }
    }
    return base
  }

  parsePostfix() {
    let node = this.parsePrimary()
    while (true) {
      if (this.isOp('.')) {
        this.next()
        const prop = this.next()
        if (!prop || prop.type !== 'name') this.error('属性访问缺少名称')
        node = { type: 'attribute', object: node, property: prop.value }
      } else if (this.isOp('(')) {
        this.next()
        const args = []
        const kwargs = []
        while (!this.isOp(')')) {
          if (this.peek().type === 'name' && this.peek(1).type === 'op' && this.peek(1).value === '=') {
            const key = this.next().value
            this.next()
            kwargs.push({ key, value: this.parseExpression() })
          } else {
            args.push(this.parseExpression())
          }
          if (this.isOp(',')) { this.next(); continue }
          break
        }
        this.expectOp(')')
        node = { type: 'call', callee: node, args, kwargs }
      } else if (this.isOp('[')) {
        this.next()
        const index = this.parseExpression()
        this.expectOp(']')
        node = { type: 'index', object: node, index }
      } else {
        break
      }
    }
    return node
  }

  parsePrimary() {
    const t = this.peek()
    if (!t) this.error('表达式为空')
    if (t.type === 'number' || t.type === 'string' || t.type === 'const') {
      this.next()
      return { type: 'literal', value: t.value }
    }
    if (t.type === 'name') {
      this.next()
      return { type: 'name', id: t.value }
    }
    if (t.type === 'op' && t.value === '(') {
      this.next()
      const items = []
      while (!this.isOp(')')) {
        items.push(this.parseExpression())
        if (this.isOp(',')) { this.next(); continue }
        break
      }
      this.expectOp(')')
      if (items.length === 1) return items[0]
      return { type: 'list', items }
    }
    if (t.type === 'op' && t.value === '[') {
      this.next()
      const items = []
      while (!this.isOp(']')) {
        items.push(this.parseExpression())
        if (this.isOp(',')) { this.next(); continue }
        break
      }
      this.expectOp(']')
      return { type: 'list', items }
    }
    this.error('无法解析的表达式')
  }
}

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

class ReturnSignal { constructor(value) { this.value = value } }
class BreakSignal {}
class ContinueSignal {}

class Env {
  constructor(parent = null) { this.parent = parent; this.vars = new Map() }
  get(name) {
    if (this.vars.has(name)) return this.vars.get(name)
    if (this.parent) return this.parent.get(name)
    throw new Error(`名称 "${name}" 未定义`)
  }
  has(name) {
    if (this.vars.has(name)) return true
    return this.parent ? this.parent.has(name) : false
  }
  set(name, value) { this.vars.set(name, value); return value }
  assign(name, value) {
    if (this.vars.has(name) || !this.parent) { this.vars.set(name, value); return value }
    return this.parent.assign(name, value)
  }
}

function makeRange(...args) {
  let start = 0, stop = 0, step = 1
  if (args.length === 1) { stop = args[0] }
  else if (args.length === 2) { start = args[0]; stop = args[1] }
  else { start = args[0]; stop = args[1]; step = args[2] }
  if (step === 0) throw new Error('range 的步长不能为 0')
  const out = []
  if (step > 0) for (let i = start; i < stop; i += step) out.push(i)
  else for (let i = start; i > stop; i += step) out.push(i)
  return out
}

// A tiny module object whose methods are all no-ops returning themselves,
// for real turtle-style math helpers that don't affect drawing.
function createTurtleModule(api) {
  const mod = {}
  const passthrough = ['title', 'setup', 'Screen', 'register_shape', 'addshape', 'mode', 'colormode', 'setworldcoordinates', 'tracer', 'update', 'delay', 'listen', 'mainloop', 'exitonclick', 'bye', 'clear', 'reset', 'color', 'shape', 'shapesize', 'resizemode', 'shearfactor', 'tilt', 'tiltangle', 'stamp', 'clearstamp', 'clearstamps', 'clone', 'begin_poly', 'end_poly', 'get_poly', 'getscreen', 'getturtle', 'getpen', 'setundobuffer', 'getcanvas', 'ontimer']
  for (const name of passthrough) mod[name] = (...a) => { if (api[name]) return api[name](...a); return 0 }
  return mod
}

function isTurtleLike(value) {
  return value && value.__isTurtleWrapper
}

function createTurtleNamespace(api) {
  // Construct a callable namespace object that mimics `turtle` (module) and also
  // acts like a single default turtle. Every drawing method forwards to api.
  const forwardMethods = new Set([
    'fd', 'forward', 'bk', 'back', 'backward', 'rt', 'right', 'lt', 'left',
    'circle', 'goto', 'setpos', 'setposition', 'teleport', 'setx', 'sety',
    'seth', 'setheading', 'heading', 'towards', 'home', 'pu', 'penup', 'up',
    'pd', 'pendown', 'down', 'pensize', 'width', 'pencolor', 'fillcolor',
    'begin_fill', 'end_fill', 'fill', 'dot', 'write', 'ht', 'hideturtle',
    'st', 'showturtle', 'isvisible', 'isdown', 'filling', 'speed', 'pen',
    'pos', 'position', 'xcor', 'ycor', 'distance', 'degrees', 'radians',
    'undo', 'done', 'mainloop'
  ])

  const ns = { __isTurtleWrapper: true }

  for (const name of forwardMethods) {
    ns[name] = (...args) => {
      const fn = api[name]
      if (typeof fn === 'function') return fn(...args)
      return undefined
    }
  }

  // color(*args) sets both pen and fill
  ns.color = (...args) => api.pencolor(...args)

  // with t.fill(): ... — returns a context manager-ish object
  // (parsed as expression statements; suport both `fill()` context and manual)
  ns.fill = () => {
    api.begin_fill()
    return { __enter: true, __exit__: () => api.end_fill() }
  }

  Object.assign(ns, createTurtleModule(api))
  return ns
}

export function createInterpreter(options = {}) {
  const surface = options.surface // { moveTo, lineTo, setColor, setWidth, beginFill, endFill, dot, write, home, clear, ... }
  const maxSteps = options.maxSteps || 200000
  const maxLoop = options.maxLoop || 100000

  const state = {
    x: 0, y: 0, heading: 90, // turtle starts facing up (east=0, up=90)
    penDown: true,
    penColor: '#1f2937',
    penWidth: 1,
    fillColor: '#1f2937',
    filling: false,
    fillPath: [],
    visible: true
  }

  let steps = 0
  let needsScreenUpdate = false
  let callsSinceUpdate = 0

  function throttleUpdate() {
    callsSinceUpdate += 1
    if (callsSinceUpdate >= 1) {
      callsSinceUpdate = 0
    }
  }

  function toRadians(deg) { return (deg * Math.PI) / 180 }

  function moveTo(nx, ny, draw) {
    if (draw && state.penDown && surface) {
      surface.drawLine(state.x, state.y, nx, ny, state.penColor, state.penWidth)
    }
    state.x = nx
    state.y = ny
    if (state.filling) state.fillPath.push([nx, ny])
  }

  const api = {
    fd(d = 0) {
      const rad = toRadians(state.heading)
      moveTo(state.x + Math.cos(rad) * d, state.y + Math.sin(rad) * d, true)
      throttleUpdate()
    },
    bk(d = 0) { api.fd(-d) },
    rt(a = 0) { state.heading -= a; throttleUpdate() },
    lt(a = 0) { state.heading += a; throttleUpdate() },

    circle(radius = 0, extent = null, stepsArg = null) {
      const r = Number(radius)
      const ext = extent === null || extent === undefined ? 360 : Number(extent)
      const stepsN = stepsArg ? Math.max(3, Math.floor(stepsArg)) : Math.max(12, Math.floor(Math.abs(ext) / 4))
      // Approximate: sample along the arc using tangent motion.
      const segs = stepsN
      const sign = r >= 0 ? 1 : -1
      // For positive radius, turtle turns left (counterclockwise) around center to its left.
      // The turtle's position follows the circle; use chord steps.
      const diameter = Math.abs(r) * 2
      const stepAngle = ext / segs
      // distance per step (chord)
      for (let i = 0; i < segs; i += 1) {
        const chord = 2 * Math.abs(r) * Math.sin(Math.abs(toRadians(stepAngle)) / 2)
        const rad = toRadians(state.heading)
        const nx = state.x + Math.cos(rad) * chord
        const ny = state.y + Math.sin(rad) * chord
        moveTo(nx, ny, true)
        // turn by stepAngle; positive radius => turn left => heading += stepAngle
        state.heading += sign * stepAngle
      }
      throttleUpdate()
    },

    goto(x, y) { moveTo(Number(x), Number(y), true); throttleUpdate() },
    setpos(x, y) { api.goto(x, y) },
    setposition(x, y) { api.goto(x, y) },
    teleport(x, y) {
      if (state.penDown && surface) surface.drawLine(state.x, state.y, Number(x), Number(y), state.penColor, state.penWidth)
      state.x = Number(x); state.y = Number(y)
    },
    setx(x) { api.goto(Number(x), state.y) },
    sety(y) { api.goto(state.x, Number(y)) },
    seth(a) { state.heading = Number(a); throttleUpdate() },
    setheading(a) { api.seth(a) },
    heading() { return normalizeHeading(state.heading) },
    home() { api.goto(0, 0); state.heading = 90; throttleUpdate() },
    towards(x, y) {
      return (Math.atan2(Number(y) - state.y, Number(x) - state.x) * 180) / Math.PI
    },
    pos() { return [state.x, state.y] },
    position() { return [state.x, state.y] },
    xcor() { return state.x },
    ycor() { return state.y },
    distance(x, y) { return Math.hypot(Number(x) - state.x, Number(y) - state.y) },
    pu() { state.penDown = false }, penup() { state.penDown = false }, up() { state.penDown = false },
    pd() { state.penDown = true }, pendown() { state.penDown = true }, down() { state.penDown = true },
    isdown() { return state.penDown },
    pensize(w) { state.penWidth = Math.max(0.5, Number(w)); return state.penWidth },
    width(w) { return api.pensize(w) },
    pencolor(...args) { state.penColor = normalizeColor(args, state.penColor); return state.penColor },
    fillcolor(...args) { state.fillColor = normalizeColor(args, state.fillColor); return state.fillColor },
    color(...args) {
      const c = normalizeColor(args, state.penColor)
      state.penColor = c; state.fillColor = c; return c
    },
    begin_fill() {
      state.filling = true
      state.fillPath = [[state.x, state.y]]
      if (surface) surface.beginPath()
    },
    end_fill() {
      if (state.filling && surface) surface.endFill(state.fillColor)
      state.filling = false
      state.fillPath = []
    },
    filling() { return state.filling },
    dot(size = 3, color = null) {
      if (surface) surface.drawDot(state.x, state.y, Math.max(1, Number(size)) / 2, color ? normalizeColor([color], state.penColor) : state.penColor)
    },
    write(text, opts) {
      const move = opts && typeof opts === 'object' ? opts.move : false
      if (surface) surface.drawText(state.x, state.y, String(text), state.penColor)
      if (move) { /* not commonly used */ }
    },
    ht() { state.visible = false }, hideturtle() { state.visible = false },
    st() { state.visible = true }, showturtle() { state.visible = true },
    isvisible() { return state.visible },
    speed() {},
    degrees() {}, radians() {},
    undo() {},
    done() {}, mainloop() {},
    clear() { if (surface) surface.clear() },
    reset() {
      if (surface) surface.clear()
      state.x = 0; state.y = 0; state.heading = 90; state.penDown = true
    },
    pen(...args) {
      if (args.length) { state.penDown = Boolean(args[0]) }
      return { down: () => api.pd(), up: () => api.pu(), color: state.penColor, width: state.penWidth }
    },
    __state: state,
    __finish() {
      if (state.filling) api.end_fill()
      if (surface && surface.drawTurtle) surface.drawTurtle(state.x, state.y, state.heading, state.visible)
    }
  }

  return api
}

function normalizeHeading(h) {
  return ((h % 360) + 360) % 360
}

const NAMED_COLORS = {
  red: '#e11d48', green: '#16a34a', blue: '#2563eb', black: '#111827',
  white: '#ffffff', yellow: '#eab308', orange: '#f97316', purple: '#7c3aed',
  pink: '#ec4899', gray: '#6b7280', grey: '#6b7280', brown: '#92400e',
  cyan: '#06b6d4', magenta: '#d946ef', gold: '#facc15', navy: '#1e3a8a',
  lightblue: '#93c5fd', lightgreen: '#86efac', darkgreen: '#166534',
  darkblue: '#1e40af', violet: '#8b5cf6', indigo: '#4f46e5', teal: '#14b8a6'
}

function normalizeColor(args, fallback) {
  if (!args.length) return fallback
  const first = args[0]
  if (typeof first === 'string') {
    const key = first.toLowerCase().trim()
    return NAMED_COLORS[key] || key
  }
  if (Array.isArray(first)) return normalizeColor(first, fallback)
  if (args.length >= 3) return `rgb(${args[0] | 0},${args[1] | 0},${args[2] | 0})`
  return fallback
}

// ---------------------------------------------------------------------------
// Evaluator / executor
// ---------------------------------------------------------------------------

export function runTurtle(source, options = {}) {
  const api = createInterpreter(options)
  const turtleNs = createTurtleNamespace(api)

  const lines = tokenizeLines(source)
  const parser = new Parser(lines)
  const program = parser.parseProgram()

  const globalEnv = new Env()
  globalEnv.set('__turtle__', turtleNs)
  globalEnv.set('turtle', turtleNs)
  globalEnv.set('t', turtleNs)

  const builtins = {
    range: (...a) => makeRange(...a.map(Number)),
    len: (v) => (Array.isArray(v) || typeof v === 'string') ? v.length : 0,
    abs: (v) => Math.abs(Number(v)),
    min: (...a) => Math.min(...(a.length === 1 && Array.isArray(a[0]) ? a[0] : a)),
    max: (...a) => Math.max(...(a.length === 1 && Array.isArray(a[0]) ? a[0] : a)),
    int: (v) => Math.trunc(Number(v)),
    float: (v) => Number(v),
    round: (v, n = 0) => { const p = 10 ** n; return Math.round(Number(v) * p) / p },
    str: (v) => String(v),
    print: () => {},
    boolean: (v) => Boolean(v)
  }

  const state = { steps: 0 }
  const maxSteps = options.maxSteps || 2000000

  function tick() {
    state.steps += 1
    if (state.steps > maxSteps) throw new Error('程序运行步数过多（可能死循环），已停止。')
  }

  function execBlock(body, env) {
    for (const stmt of body) execStmt(stmt, env)
  }

  function execStmt(stmt, env) {
    tick()
    switch (stmt.type) {
      case 'pass':
        return
      case 'expr': {
        evalExprAllowContext(stmt.expr, env)
        return
      }
      case 'assign': {
        const value = evalExpr(stmt.value, env)
        if (stmt.op === '=') {
          env.set(stmt.name, value)
        } else {
          const cur = env.get(stmt.name)
          const op = stmt.op.slice(0, -1)
          env.set(stmt.name, applyBinary(op, cur, value))
        }
        return
      }
      case 'import': {
        for (const { module, as } of stmt.aliases) {
          if (['turtle', 'turtledemo'].includes(module)) {
            env.set(as, turtleNs)
          } else {
            // unknown module: give a permissive namespace
            env.set(as, makePermissiveModule())
          }
        }
        return
      }
      case 'def': {
        env.set(stmt.name, { __fn: true, params: stmt.params, body: stmt.body, closure: env, name: stmt.name })
        return
      }
      case 'if': {
        for (const branch of stmt.branches) {
          if (branch.test === null || truthy(evalExpr(branch.test, env))) {
            execBlock(branch.body, new Env(env))
            return
          }
        }
        return
      }
      case 'for': {
        const iterable = evalExpr(stmt.iterable, env)
        const items = Array.isArray(iterable) ? iterable : []
        for (const item of items) {
          env.set(stmt.target, item)
          try {
            execBlock(stmt.body, new Env(env))
          } catch (e) {
            if (e instanceof BreakSignal) break
            if (e instanceof ContinueSignal) continue
            throw e
          }
        }
        return
      }
      case 'while': {
        let guard = 0
        while (truthy(evalExpr(stmt.test, env))) {
          guard += 1
          if (guard > 100000) throw new Error('while 循环次数过多，已停止。')
          try {
            execBlock(stmt.body, new Env(env))
          } catch (e) {
            if (e instanceof BreakSignal) break
            if (e instanceof ContinueSignal) continue
            throw e
          }
        }
        return
      }
      case 'return': {
        const value = stmt.value ? evalExpr(stmt.value, env) : null
        throw new ReturnSignal(value)
      }
      case 'break': throw new BreakSignal()
      case 'continue': throw new ContinueSignal()
      default:
        throw new Error(`未知语句类型 ${stmt.type}`)
    }
  }

  function evalExprAllowContext(expr, env) {
    // handle `with t.fill():` is not supported; but handle chained call statements.
    return evalExpr(expr, env)
  }

  function evalExpr(node, env) {
    tick()
    switch (node.type) {
      case 'literal': return node.value
      case 'name': {
        if (builtins[node.id]) return builtins[node.id]
        if (env.has(node.id)) return env.get(node.id)
        // treat unknown builtins (like `screen`) gracefully
        if (node.id === 'screen' || node.id === 'Screen') return turtleNs
        throw new Error(`名称 "${node.id}" 未定义（如果你的代码用了本模拟器不支持的功能，可先看上面的参考图）`)
      }
      case 'list': return node.items.map((it) => evalExpr(it, env))
      case 'unary': {
        const v = evalExpr(node.operand, env)
        if (node.op === '-') return -Number(v)
        if (node.op === 'not') return !truthy(v)
        return v
      }
      case 'binary': {
        const l = evalExpr(node.left, env)
        const r = evalExpr(node.right, env)
        return applyBinary(node.op, l, r)
      }
      case 'compare': {
        const l = evalExpr(node.left, env)
        const r = evalExpr(node.right, env)
        switch (node.op) {
          case '==': return l === r
          case '!=': return l !== r
          case '<': return Number(l) < Number(r)
          case '>': return Number(l) > Number(r)
          case '<=': return Number(l) <= Number(r)
          case '>=': return Number(l) >= Number(r)
          default: return false
        }
      }
      case 'logical': {
        if (node.op === 'and') {
          const l = evalExpr(node.left, env)
          return truthy(l) ? evalExpr(node.right, env) : l
        }
        const l = evalExpr(node.left, env)
        return truthy(l) ? l : evalExpr(node.right, env)
      }
      case 'attribute': {
        const obj = evalExpr(node.object, env)
        if (obj == null) throw new Error(`不能读取 ${node.property}`)
        // return a bound function wrapper if it's a method
        if (typeof obj[node.property] === 'function') {
          return obj[node.property].bind(obj)
        }
        return obj[node.property]
      }
      case 'index': {
        const obj = evalExpr(node.object, env)
        const idx = evalExpr(node.index, env)
        return obj[Number(idx)]
      }
      case 'call': {
        return evalCall(node, env)
      }
      default:
        throw new Error(`未知表达式 ${node.type}`)
    }
  }

  function evalCall(node, env) {
    let fn
    let thisObj = null
    if (node.callee.type === 'attribute') {
      thisObj = evalExpr(node.callee.object, env)
      const prop = node.callee.property
      fn = thisObj[prop]
      if (typeof fn !== 'function') {
        if (typeof thisObj[prop] !== 'undefined') return thisObj[prop]
        throw new Error(`对象没有方法 "${prop}"`)
      }
    } else {
      fn = evalExpr(node.callee, env)
    }

    const args = node.args.map((a) => evalExpr(a, env))
    const kwargs = {}
    for (const kw of node.kwargs) kwargs[kw.key] = evalExpr(kw.value, env)

    // user-defined function
    if (fn && fn.__fn) {
      return callUserFunction(fn, args)
    }

    if (typeof fn !== 'function') throw new Error('调用了一个不是函数的值')

    // keyword arguments: pass as trailing object for methods that accept them (write/fill)
    if (Object.keys(kwargs).length && (fn.length <= args.length)) {
      args.push(kwargs)
    }
    try {
      return thisObj ? fn.apply(thisObj, args) : fn(...args)
    } catch (e) {
      if (e instanceof ReturnSignal || e instanceof BreakSignal || e instanceof ContinueSignal) throw e
      throw e
    }
  }

  function callUserFunction(fnObj, args) {
    const local = new Env(fnObj.closure)
    fnObj.params.forEach((p, i) => {
      local.set(p, args[i])
    })
    try {
      execBlock(fnObj.body, local)
    } catch (e) {
      if (e instanceof ReturnSignal) return e.value
      throw e
    }
    return null
  }

  function applyBinary(op, l, r) {
    switch (op) {
      case '+': return (typeof l === 'string' || typeof r === 'string') ? String(l) + String(r) : Number(l) + Number(r)
      case '-': return Number(l) - Number(r)
      case '*': return Number(l) * Number(r)
      case '/': return Number(l) / Number(r)
      case '//': return Math.floor(Number(l) / Number(r))
      case '%': return ((Number(l) % Number(r)) + Number(r)) % Number(r)
      case '**': return Number(l) ** Number(r)
      default: throw new Error(`未知运算符 ${op}`)
    }
  }

  try {
    execBlock(program, globalEnv)
  } finally {
    try { api.__finish() } catch (_) { /* ignore */ }
  }

  return { steps: state.steps }
}

function truthy(v) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (v == null) return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'string') return v.length > 0
  return true
}

function makePermissiveModule() {
  const handler = {
    get(target, prop) {
      if (prop in target) return target[prop]
      return (..._args) => 0
    }
  }
  return new Proxy({}, handler)
}
