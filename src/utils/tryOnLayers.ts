/**
 * Matemática pura del probador (sin DOM): capas guardadas como FRACCIONES de la
 * foto del cuerpo (portables entre dispositivos), gestos de 1 y 2 dedos con
 * centroide, límites de escala, hit-test sobre alfa, historial y migración de
 * presets antiguos (que guardaban píxeles).
 */

export const MIN_SCALE = 0.2
export const MAX_SCALE = 5
export const MIN_ZOOM = 1
export const MAX_ZOOM = 3
export const MAX_HISTORY = 50

export interface Pt { x: number; y: number }

/** Capa del probador. cx/cy = centro en fracción de ancho/alto del cuerpo;
 *  wf = ancho en fracción del ancho del cuerpo; el alto se deriva SIEMPRE de
 *  `aspect` (ancho/alto reales de la imagen) para no deformar la prenda. */
export interface LayerGeom {
  cx: number
  cy: number
  wf: number
  /** wf inicial: los límites 0.2×–5× se miden contra este valor. */
  baseWf: number
  aspect: number
  rotation: number
}

export interface TryOnLayer<G = any> extends LayerGeom {
  id: string
  garment: G
  url: string
  opacity: number
  flipX: boolean
  flipY: boolean
  locked: boolean
}

export const isFiniteNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function safeAspect(a: unknown): number {
  return isFiniteNum(a) && a > 0.05 && a < 20 ? a : 1
}

export function clampWf(wf: number, baseWf: number): number {
  const base = isFiniteNum(baseWf) && baseWf > 0 ? baseWf : 0.3
  const v = isFiniteNum(wf) ? wf : base
  return clamp(v, base * MIN_SCALE, base * MAX_SCALE)
}

export function normalizeDeg(d: number): number {
  let r = d % 360
  if (r > 180) r -= 360
  if (r <= -180) r += 360
  return r
}

/** Caja de la capa en píxeles del escenario (sw × sh = rectángulo del cuerpo). */
export function layerBox(l: LayerGeom, sw: number, sh: number) {
  const w = l.wf * sw
  const h = w / safeAspect(l.aspect)
  return { cx: l.cx * sw, cy: l.cy * sh, w, h }
}

/** Transformación para exportCanvas, en píxeles naturales del cuerpo. */
export function layerToTransform(
  l: TryOnLayer,
  bodyW: number,
  bodyH: number,
) {
  const width = l.wf * bodyW
  const height = width / safeAspect(l.aspect)
  return {
    x: l.cx * bodyW - width / 2,
    y: l.cy * bodyH - height / 2,
    width,
    height,
    rotation: l.rotation,
    opacity: l.opacity,
    flipX: l.flipX,
    flipY: l.flipY,
  }
}

// ───────────────────────── Gestos ─────────────────────────

export interface Centroid { x: number; y: number; dist: number; angle: number }

export function centroid(pts: Pt[]): Centroid {
  if (pts.length === 0) return { x: 0, y: 0, dist: 0, angle: 0 }
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, dist: 0, angle: 0 }
  const a = pts[0], b = pts[1]
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    dist: Math.hypot(b.x - a.x, b.y - a.y),
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  }
}

/** Seguimiento de ángulo continuo (sin saltos de ±180°). */
export class AngleTracker {
  private last: number
  private acc = 0
  constructor(start: number) { this.last = start }
  update(a: number): number {
    let d = a - this.last
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    this.acc += d
    this.last = a
    return this.acc
  }
  get value() { return this.acc }
}

export type GestureKind = 'move' | 'pinch' | 'corner' | 'rotate'

/**
 * Gesto sobre una capa. Se crea con la capa y los punteros ACTUALES; si cambia
 * el nº de dedos se crea otro con el estado vigente de la capa (sin saltos).
 * Todas las coordenadas de punteros están en píxeles del escenario.
 */
export class LayerGesture {
  readonly kind: GestureKind
  private start: LayerGeom
  private startPts: Pt[]
  private c0: Centroid
  private tracker: AngleTracker
  private sw: number
  private sh: number

  constructor(kind: GestureKind, layer: LayerGeom, pts: Pt[], sw: number, sh: number) {
    this.kind = kind
    this.start = { ...layer }
    this.startPts = pts.map(p => ({ ...p }))
    this.sw = sw > 0 ? sw : 1
    this.sh = sh > 0 ? sh : 1
    this.c0 = centroid(pts)
    this.tracker = new AngleTracker(this.c0.angle)
    if (kind === 'corner' || kind === 'rotate') {
      const box = layerBox(layer, this.sw, this.sh)
      const p = pts[0] ?? { x: box.cx, y: box.cy }
      this.c0 = { x: box.cx, y: box.cy, dist: Math.hypot(p.x - box.cx, p.y - box.cy), angle: Math.atan2(p.y - box.cy, p.x - box.cx) }
      this.tracker = new AngleTracker(this.c0.angle)
    }
  }

  update(pts: Pt[]): LayerGeom {
    const s = this.start
    if (pts.length === 0 || pts.some(p => !isFiniteNum(p.x) || !isFiniteNum(p.y))) return { ...s }

    if (this.kind === 'move' || (this.kind === 'pinch' && pts.length < 2)) {
      const p = pts[0], p0 = this.startPts[0] ?? p
      return {
        ...s,
        cx: s.cx + (p.x - p0.x) / this.sw,
        cy: s.cy + (p.y - p0.y) / this.sh,
      }
    }

    if (this.kind === 'pinch') {
      const c1 = centroid(pts)
      const ratio = this.c0.dist > 1e-3 ? c1.dist / this.c0.dist : 1
      const wf = clampWf(s.wf * (isFiniteNum(ratio) && ratio > 0 ? ratio : 1), s.baseWf)
      const sEff = wf / s.wf
      const da = this.tracker.update(c1.angle)
      const cos = Math.cos(da), sin = Math.sin(da)
      const vx = s.cx * this.sw - this.c0.x
      const vy = s.cy * this.sh - this.c0.y
      const nx = c1.x + sEff * (vx * cos - vy * sin)
      const ny = c1.y + sEff * (vx * sin + vy * cos)
      return {
        ...s,
        cx: nx / this.sw,
        cy: ny / this.sh,
        wf,
        rotation: s.rotation + (da * 180) / Math.PI,
      }
    }

    const box = layerBox(s, this.sw, this.sh)
    const p = pts[0]
    if (this.kind === 'corner') {
      const d = Math.hypot(p.x - box.cx, p.y - box.cy)
      const ratio = this.c0.dist > 1e-3 ? d / this.c0.dist : 1
      return { ...s, wf: clampWf(s.wf * (isFiniteNum(ratio) && ratio > 0 ? ratio : 1), s.baseWf) }
    }
    // rotate
    const a = Math.atan2(p.y - box.cy, p.x - box.cx)
    const da = this.tracker.update(a)
    return { ...s, rotation: s.rotation + (da * 180) / Math.PI }
  }
}

// ───────────────────────── Hit-test sobre alfa ─────────────────────────

export interface AlphaMap { w: number; h: number; data: Uint8Array }

/** Punto (px del escenario) → coordenadas normalizadas 0..1 dentro de la imagen
 *  de la capa (deshaciendo rotación y flips). null si cae fuera de la caja. */
export function toLayerUV(
  l: Pick<TryOnLayer, 'cx' | 'cy' | 'wf' | 'aspect' | 'rotation' | 'flipX' | 'flipY'>,
  sw: number, sh: number, px: number, py: number,
): { u: number; v: number } | null {
  const box = layerBox(l, sw, sh)
  if (!(box.w > 0 && box.h > 0)) return null
  const rad = (-l.rotation * Math.PI) / 180
  const dx = px - box.cx, dy = py - box.cy
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad)
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad)
  let u = lx / box.w + 0.5
  let v = ly / box.h + 0.5
  if (l.flipX) u = 1 - u
  if (l.flipY) v = 1 - v
  if (u < 0 || u > 1 || v < 0 || v > 1) return null
  return { u, v }
}

export const ALPHA_HIT = 24

export function hitLayer(
  l: Pick<TryOnLayer, 'cx' | 'cy' | 'wf' | 'aspect' | 'rotation' | 'flipX' | 'flipY'>,
  sw: number, sh: number, px: number, py: number,
  alpha?: AlphaMap | null,
  radius = 1,
): boolean {
  const uv = toLayerUV(l, sw, sh, px, py)
  if (!uv) return false
  if (!alpha) return true // sin mapa de alfa: caja
  const x = Math.min(alpha.w - 1, Math.floor(uv.u * alpha.w))
  const y = Math.min(alpha.h - 1, Math.floor(uv.v * alpha.h))
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const xx = x + dx, yy = y + dy
      if (xx < 0 || yy < 0 || xx >= alpha.w || yy >= alpha.h) continue
      if (alpha.data[yy * alpha.w + xx] > ALPHA_HIT) return true
    }
  }
  return false
}

/** Capa más alta (índice mayor = delante) golpeada en el punto; -1 si ninguna.
 *  Las capas bloqueadas dejan pasar el toque. */
export function pickLayer(
  layers: TryOnLayer[], sw: number, sh: number, px: number, py: number,
  alphaOf: (l: TryOnLayer) => AlphaMap | null | undefined,
): number {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]
    if (l.locked) continue
    if (hitLayer(l, sw, sh, px, py, alphaOf(l))) return i
  }
  return -1
}

// ───────────────────────── Zoom / pan del escenario ─────────────────────────

export function clampZoom(z: number): number {
  return isFiniteNum(z) ? clamp(z, MIN_ZOOM, MAX_ZOOM) : 1
}

export function clampPan(p: Pt, zoom: number, w: number, h: number): Pt {
  const mx = (w * (zoom - 1)) / 2, my = (h * (zoom - 1)) / 2
  return {
    x: isFiniteNum(p.x) ? clamp(p.x, -mx, mx) : 0,
    y: isFiniteNum(p.y) ? clamp(p.y, -my, my) : 0,
  }
}

// ───────────────────────── Colocación inicial ─────────────────────────

/** Encaja la imagen (con su proporción real) dentro de la caja sugerida. */
export function placeInBox(
  box: { x: number; y: number; w: number; h: number },
  aspect: number,
  bodyW: number, bodyH: number,
): Pick<LayerGeom, 'cx' | 'cy' | 'wf'> {
  const a = safeAspect(aspect)
  let w = box.w > 0 ? box.w : bodyW * 0.4
  let h = w / a
  if (box.h > 0 && h > box.h) { h = box.h; w = h * a }
  const wf = clamp(w / bodyW, 0.04, 1)
  const cx = clamp((box.x + box.w / 2) / bodyW, 0.05, 0.95)
  const cy = clamp((box.y + box.h / 2) / bodyH, 0.03, 0.97)
  return { cx, cy, wf }
}

// ───────────────────────── Migración ─────────────────────────

/** Acepta capas v2 (fracciones) o antiguas (x,y,w,h en píxeles naturales del cuerpo). */
export function migrateLayerGeom(raw: any, bodyW: number, bodyH: number, knownAspect?: number): LayerGeom | null {
  if (!raw || typeof raw !== 'object') return null
  const bw = bodyW > 0 ? bodyW : 1000
  const bh = bodyH > 0 ? bodyH : 1000
  const rot = isFiniteNum(raw.rotation) ? raw.rotation : 0

  if (isFiniteNum(raw.cx) && isFiniteNum(raw.cy) && isFiniteNum(raw.wf)) {
    const wf = clamp(raw.wf, 0.02, 3)
    return {
      cx: clamp(raw.cx, -0.5, 1.5), cy: clamp(raw.cy, -0.5, 1.5), wf,
      baseWf: isFiniteNum(raw.baseWf) && raw.baseWf > 0 ? raw.baseWf : wf,
      aspect: safeAspect(knownAspect ?? raw.aspect),
      rotation: rot,
    }
  }
  if (![raw.x, raw.y, raw.w, raw.h].every(isFiniteNum) || raw.w <= 0 || raw.h <= 0) return null
  // Heurística: valores ≤ 2 son fracciones del cuerpo, el resto píxeles.
  const frac = raw.x <= 2 && raw.y <= 2 && raw.w <= 2 && raw.h <= 2
  const px = frac ? { x: raw.x * bw, y: raw.y * bh, w: raw.w * bw, h: raw.h * bh } : raw
  const oldAspect = px.w / px.h
  const aspect = safeAspect(knownAspect ?? oldAspect)
  const wf = clamp(px.w / bw, 0.02, 3)
  // Si conocemos la proporción real, conservamos el ALTO antiguo como referencia
  // para que la prenda siga ocupando su zona (ajustando ancho si hace falta).
  let wfFinal = wf
  if (knownAspect && isFiniteNum(knownAspect)) {
    const hOld = px.h
    const wByH = (hOld * aspect) / bw
    wfFinal = clamp(Math.min(wf, wByH), 0.02, 3)
  }
  return {
    cx: clamp((px.x + px.w / 2) / bw, -0.5, 1.5),
    cy: clamp((px.y + px.h / 2) / bh, -0.5, 1.5),
    wf: wfFinal, baseWf: wfFinal, aspect, rotation: rot,
  }
}

// ───────────────────────── Historial ─────────────────────────

export interface History<T> { stack: T[]; idx: number }

export const histInit = <T,>(v: T): History<T> => ({ stack: [v], idx: 0 })

export function histPush<T>(h: History<T>, v: T, max = MAX_HISTORY): History<T> {
  const stack = h.stack.slice(0, h.idx + 1)
  stack.push(v)
  while (stack.length > max) stack.shift()
  return { stack, idx: stack.length - 1 }
}
export const histCanUndo = <T,>(h: History<T>) => h.idx > 0
export const histCanRedo = <T,>(h: History<T>) => h.idx < h.stack.length - 1
export const histUndo = <T,>(h: History<T>): History<T> => (histCanUndo(h) ? { ...h, idx: h.idx - 1 } : h)
export const histRedo = <T,>(h: History<T>): History<T> => (histCanRedo(h) ? { ...h, idx: h.idx + 1 } : h)
export const histCurrent = <T,>(h: History<T>): T => h.stack[h.idx]

/** ¿Han cambiado dos capas en algo relevante (para decidir si se registra historial)? */
export function geomChanged(a: LayerGeom, b: LayerGeom, eps = 1e-6): boolean {
  return Math.abs(a.cx - b.cx) > eps || Math.abs(a.cy - b.cy) > eps ||
    Math.abs(a.wf - b.wf) > eps || Math.abs(a.rotation - b.rotation) > 1e-4
}
