import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  LayerGesture, TryOnLayer, Pt, centroid, clampPan, clampWf, clampZoom, geomChanged,
  layerBox, pickLayer,
} from '../src/utils/tryOnLayers'
import { ensureAlphaMap, getCachedAlpha } from '../src/utils/alphaMap'

export interface TryOnStageHandle { resetZoom: () => void }

interface Props {
  bodyUrl: string
  /** ancho/alto naturales de la foto del cuerpo */
  bodyAspect: number
  layers: TryOnLayer[]
  activeId: string | null
  mirror: boolean
  background?: string
  className?: string
  style?: React.CSSProperties
  onSelect: (id: string | null) => void
  /** Se llama UNA vez al soltar (o tras un ajuste de teclado/rueda) con las capas finales. */
  onCommit: (next: TryOnLayer[]) => void
  onZoomChange?: (zoom: number) => void
}

const TAP_MOVE_PX = 8
const TAP_MS = 400
const DOUBLE_TAP_MS = 300

type Mode = 'none' | 'layer' | 'handle' | 'stage'

/**
 * Lienzo del probador: Pointer Events + touch-action:none, multitáctil real
 * (1 dedo arrastra, 2 dedos escalan y rotan con centroide, sin saltos al
 * añadir/quitar dedos), hit-test sobre alfa y movimiento directo sobre el DOM
 * (React sólo se entera al soltar).
 */
const TryOnStage = forwardRef<TryOnStageHandle, Props>(function TryOnStage(props, ref) {
  const { bodyUrl, bodyAspect, layers, activeId, mirror, background, className, style } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const wrapEls = useRef(new Map<string, HTMLDivElement>())
  const propsRef = useRef(props)
  propsRef.current = props

  const [box, setBox] = useState({ w: 300, h: 400 })
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setBox(b => (Math.abs(b.w - r.width) < 0.5 && Math.abs(b.h - r.height) < 0.5 ? b : { w: r.width, h: r.height }))
    }
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    window.addEventListener('orientationchange', measure)
    return () => { obs.disconnect(); window.removeEventListener('orientationchange', measure) }
  }, [])

  const aspect = bodyAspect > 0 && Number.isFinite(bodyAspect) ? bodyAspect : 0.75
  const dims = useMemo(() => {
    let rW: number, rH: number
    if (box.w / box.h > aspect) { rH = box.h; rW = box.h * aspect } else { rW = box.w; rH = box.w / aspect }
    return { rW, rH, oX: (box.w - rW) / 2, oY: (box.h - rH) / 2 }
  }, [box, aspect])
  const dimsRef = useRef(dims)
  dimsRef.current = dims

  // Estado "vivo" (mutado sin pasar por React durante los gestos)
  const liveRef = useRef<TryOnLayer[]>(layers)
  const interacting = useRef(false)
  const zoomRef = useRef(1)
  const panRef = useRef<Pt>({ x: 0, y: 0 })

  const applyContent = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    el.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0) scale(${zoomRef.current})`
  }, [])

  const applyLayers = useCallback(() => {
    const { rW, rH } = dimsRef.current
    for (const l of liveRef.current) {
      const el = wrapEls.current.get(l.id)
      if (!el) continue
      const b = layerBox(l, rW, rH)
      el.style.width = `${b.w}px`
      el.style.height = `${b.h}px`
      el.style.transform = `translate3d(${b.cx - b.w / 2}px, ${b.cy - b.h / 2}px, 0) rotate(${l.rotation}deg)`
    }
  }, [])

  useLayoutEffect(() => {
    if (!interacting.current) liveRef.current = layers
    applyLayers()
    applyContent()
  })

  useEffect(() => {
    for (const l of layers) { if (getCachedAlpha(l.url) === undefined) void ensureAlphaMap(l.url) }
  }, [layers])

  useImperativeHandle(ref, () => ({
    resetZoom: () => {
      zoomRef.current = 1; panRef.current = { x: 0, y: 0 }
      applyContent(); propsRef.current.onZoomChange?.(1)
    },
  }), [applyContent])

  // ── Eventos nativos (passive:false) ──
  useEffect(() => {
    const root = rootRef.current!
    const pointers = new Map<number, Pt>() // coordenadas de cliente
    let mode: Mode = 'none'
    let gesture: LayerGesture | null = null
    let activeLayerId: string | null = null
    let handlePointer = -1
    let startSnapshot: TryOnLayer[] = []
    let downAt = 0
    let downPt: Pt = { x: 0, y: 0 }
    let maxPointers = 0
    let moved = false
    let lastTapAt = 0
    let stage = { z: 1, pan: { x: 0, y: 0 }, c0: { x: 0, y: 0, dist: 0 } }
    let wheelTimer: ReturnType<typeof setTimeout> | null = null
    let wheelDirty = false

    const toLocal = (p: Pt): Pt | null => {
      const el = contentRef.current
      if (!el) return null
      const r = el.getBoundingClientRect()
      if (!(r.width > 0 && r.height > 0)) return null
      const { rW, rH } = dimsRef.current
      let x = ((p.x - r.left) / r.width) * rW
      const y = ((p.y - r.top) / r.height) * rH
      if (propsRef.current.mirror) x = rW - x
      return { x, y }
    }

    const localPts = (): Pt[] => {
      const out: Pt[] = []
      for (const p of pointers.values()) { const l = toLocal(p); if (l) out.push(l) }
      return out
    }

    const setLive = (id: string, geom: Partial<TryOnLayer>) => {
      liveRef.current = liveRef.current.map(l => (l.id === id ? { ...l, ...geom } : l))
      applyLayers()
    }

    const rebaseLayerGesture = () => {
      const l = liveRef.current.find(x => x.id === activeLayerId)
      if (!l) { gesture = null; return }
      const pts = localPts()
      if (pts.length === 0) { gesture = null; return }
      const { rW, rH } = dimsRef.current
      gesture = new LayerGesture(pts.length >= 2 ? 'pinch' : 'move', l, pts.slice(0, 2), rW, rH)
    }

    const rebaseStage = () => {
      const pts = [...pointers.values()]
      const c = centroid(pts)
      stage = { z: zoomRef.current, pan: { ...panRef.current }, c0: { x: c.x, y: c.y, dist: c.dist } }
    }

    const commitIfChanged = () => {
      const before = startSnapshot, after = liveRef.current
      let changed = before.length !== after.length
      if (!changed) {
        for (let i = 0; i < after.length; i++) {
          if (before[i].id !== after[i].id || geomChanged(before[i], after[i])) { changed = true; break }
        }
      }
      if (changed) propsRef.current.onCommit(after)
    }

    const endInteraction = (canceled: boolean) => {
      const wasMode = mode
      if (wasMode === 'layer' || wasMode === 'handle') {
        if (!canceled) commitIfChanged()
        else { liveRef.current = propsRef.current.layers; applyLayers() }
      } else if (wasMode === 'stage') {
        propsRef.current.onZoomChange?.(zoomRef.current)
        if (!canceled && !moved && maxPointers === 1 && performance.now() - downAt < TAP_MS) {
          const now = performance.now()
          if (now - lastTapAt < DOUBLE_TAP_MS) {
            lastTapAt = 0
            if (zoomRef.current > 1) { zoomRef.current = 1 } else { zoomRef.current = 2 }
            panRef.current = { x: 0, y: 0 }
            applyContent()
            propsRef.current.onZoomChange?.(zoomRef.current)
          } else {
            lastTapAt = now
            propsRef.current.onSelect(null)
          }
        }
      }
      mode = 'none'; gesture = null; activeLayerId = null; handlePointer = -1
      interacting.current = false
      maxPointers = 0; moved = false
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      e.preventDefault()
      try { root.setPointerCapture(e.pointerId) } catch { /* noop */ }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      maxPointers = Math.max(maxPointers, pointers.size)
      root.focus({ preventScroll: true })

      if (pointers.size === 1) {
        interacting.current = true
        moved = false
        downAt = performance.now()
        downPt = { x: e.clientX, y: e.clientY }
        startSnapshot = liveRef.current
        const { rW, rH } = dimsRef.current
        const target = e.target as Element | null
        const handleEl = target?.closest?.('[data-handle]') as HTMLElement | null
        const cur = propsRef.current
        const active = liveRef.current.find(l => l.id === cur.activeId)
        if (handleEl && active && !active.locked) {
          mode = 'handle'
          activeLayerId = active.id
          handlePointer = e.pointerId
          const lp = localPts()
          gesture = new LayerGesture(handleEl.dataset.handle === 'rotate' ? 'rotate' : 'corner', active, lp.slice(0, 1), rW, rH)
          return
        }
        const local = toLocal({ x: e.clientX, y: e.clientY })
        const idx = local
          ? pickLayer(liveRef.current, rW, rH, local.x, local.y, l => getCachedAlpha(l.url))
          : -1
        if (idx >= 0) {
          const l = liveRef.current[idx]
          mode = 'layer'
          activeLayerId = l.id
          if (cur.activeId !== l.id) cur.onSelect(l.id)
          rebaseLayerGesture()
        } else {
          mode = 'stage'
          rebaseStage()
        }
        return
      }

      // 2º dedo (o más)
      if (mode === 'layer') rebaseLayerGesture()
      else if (mode === 'stage') rebaseStage()
      // en modo 'handle' se ignoran dedos extra
    }

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (mode === 'none') return
      e.preventDefault()
      if (!moved && Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) > TAP_MOVE_PX) moved = true

      if (mode === 'layer' && gesture && activeLayerId) {
        const pts = localPts()
        if (pts.length === 0) return
        setLive(activeLayerId, gesture.update(pts.slice(0, 2)))
      } else if (mode === 'handle' && gesture && activeLayerId) {
        if (e.pointerId !== handlePointer) return
        const p = toLocal({ x: e.clientX, y: e.clientY })
        if (p) setLive(activeLayerId, gesture.update([p]))
      } else if (mode === 'stage') {
        const pts = [...pointers.values()]
        if (pts.length >= 2) {
          const c = centroid(pts)
          const ratio = stage.c0.dist > 1e-3 ? c.dist / stage.c0.dist : 1
          const z = clampZoom(stage.z * (Number.isFinite(ratio) ? ratio : 1))
          zoomRef.current = z
          const { rW, rH } = dimsRef.current
          panRef.current = clampPan({ x: stage.pan.x + (c.x - stage.c0.x), y: stage.pan.y + (c.y - stage.c0.y) }, z, rW, rH)
          applyContent()
        } else if (pts.length === 1 && zoomRef.current > 1) {
          const { rW, rH } = dimsRef.current
          panRef.current = clampPan({ x: stage.pan.x + (pts[0].x - stage.c0.x), y: stage.pan.y + (pts[0].y - stage.c0.y) }, zoomRef.current, rW, rH)
          applyContent()
        }
      }
    }

    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.delete(e.pointerId)
      try { root.releasePointerCapture(e.pointerId) } catch { /* noop */ }
      const canceled = e.type === 'pointercancel'
      if (pointers.size === 0) { endInteraction(canceled); return }
      // quedan dedos: re-basear sin saltos
      if (mode === 'layer') rebaseLayerGesture()
      else if (mode === 'stage') rebaseStage()
      else if (mode === 'handle' && e.pointerId === handlePointer) endInteraction(canceled)
    }

    const flushWheel = () => {
      wheelTimer = null
      if (wheelDirty) { wheelDirty = false; propsRef.current.onCommit(liveRef.current) }
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const z = clampZoom(zoomRef.current * (e.deltaY > 0 ? 0.92 : 1.08))
        zoomRef.current = z
        const { rW, rH } = dimsRef.current
        panRef.current = z <= 1 ? { x: 0, y: 0 } : clampPan(panRef.current, z, rW, rH)
        applyContent(); propsRef.current.onZoomChange?.(z)
        return
      }
      if (interacting.current) return
      const cur = propsRef.current
      const idx = liveRef.current.findIndex(l => l.id === cur.activeId)
      if (idx < 0 || liveRef.current[idx].locked) return
      e.preventDefault()
      const l = liveRef.current[idx]
      if (e.shiftKey) setLive(l.id, { rotation: l.rotation + (e.deltaY > 0 ? 5 : -5) })
      else setLive(l.id, { wf: clampWf(l.wf * (e.deltaY > 0 ? 0.96 : 1.04), l.baseWf) })
      wheelDirty = true
      if (wheelTimer) clearTimeout(wheelTimer)
      wheelTimer = setTimeout(flushWheel, 300)
    }

    const stop = (e: Event) => e.preventDefault()
    const onTouchMove = (e: TouchEvent) => { if (pointers.size > 0 || e.touches.length > 1) e.preventDefault() }

    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onUp)
    root.addEventListener('wheel', onWheel, { passive: false })
    root.addEventListener('touchmove', onTouchMove, { passive: false })
    root.addEventListener('contextmenu', stop)
    root.addEventListener('gesturestart', stop)
    root.addEventListener('gesturechange', stop)
    return () => {
      if (wheelTimer) { clearTimeout(wheelTimer); flushWheel() }
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerup', onUp)
      root.removeEventListener('pointercancel', onUp)
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('touchmove', onTouchMove)
      root.removeEventListener('contextmenu', stop)
      root.removeEventListener('gesturestart', stop)
      root.removeEventListener('gesturechange', stop)
    }
  }, [applyContent, applyLayers])

  // Teclado (accesibilidad): flechas mueven, +/- escalan, r rota
  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = liveRef.current.findIndex(l => l.id === activeId)
    if (idx < 0) return
    const l = liveRef.current[idx]
    if (l.locked) return
    const step = e.shiftKey ? 0.02 : 0.005
    let patch: Partial<TryOnLayer> | null = null
    switch (e.key) {
      case 'ArrowLeft': patch = { cx: l.cx - step }; break
      case 'ArrowRight': patch = { cx: l.cx + step }; break
      case 'ArrowUp': patch = { cy: l.cy - step }; break
      case 'ArrowDown': patch = { cy: l.cy + step }; break
      case '+': case '=': patch = { wf: clampWf(l.wf * 1.05, l.baseWf) }; break
      case '-': case '_': patch = { wf: clampWf(l.wf * 0.95, l.baseWf) }; break
      case 'r': case 'R': patch = { rotation: l.rotation + (e.shiftKey ? -15 : 15) }; break
    }
    if (!patch) return
    e.preventDefault()
    const next = liveRef.current.map((x, i) => (i === idx ? { ...x, ...patch! } : x))
    liveRef.current = next
    applyLayers()
    props.onCommit(next)
  }

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="application"
      aria-label="Probador: arrastra la prenda con un dedo; pellizca con dos dedos para escalar y girar"
      onKeyDown={onKeyDown}
      className={`relative overflow-hidden outline-none ${className ?? ''}`}
      style={{
        touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none', overscrollBehavior: 'contain', background, ...style,
      } as React.CSSProperties}
    >
      <div
        ref={contentRef}
        className="absolute"
        style={{ left: dims.oX, top: dims.oY, width: dims.rW, height: dims.rH, transformOrigin: '50% 50%', willChange: 'transform' }}
      >
        <div className="absolute inset-0" style={{ transform: mirror ? 'scaleX(-1)' : undefined }}>
          <img src={bodyUrl} alt="" draggable={false}
            className="absolute inset-0 w-full h-full pointer-events-none select-none" />
          {layers.map(l => {
            const isActive = l.id === activeId
            return (
              <div
                key={l.id}
                ref={el => { if (el) wrapEls.current.set(l.id, el); else wrapEls.current.delete(l.id) }}
                data-garment={l.id}
                className="absolute pointer-events-none"
                style={{ left: 0, top: 0, transformOrigin: '50% 50%', willChange: 'transform' }}
              >
                <img
                  src={l.url} alt={l.garment?.name ?? ''} draggable={false}
                  className="absolute inset-0 w-full h-full pointer-events-none select-none"
                  style={{
                    opacity: l.opacity,
                    transform: `scale(${l.flipX ? -1 : 1}, ${l.flipY ? -1 : 1})`,
                  }}
                />
                {isActive && (
                  <>
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ border: `2px ${l.locked ? 'dashed' : 'solid'} rgba(255,255,255,0.9)`, boxShadow: '0 0 0 1px rgba(255,77,148,0.6)' }} />
                    {!l.locked && (
                      <>
                        {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
                          <div key={c} data-handle="corner"
                            className="absolute pointer-events-auto flex items-center justify-center"
                            style={{
                              width: 36, height: 36,
                              left: c.includes('l') ? -18 : undefined, right: c.includes('r') ? -18 : undefined,
                              top: c.includes('t') ? -18 : undefined, bottom: c.includes('b') ? -18 : undefined,
                              cursor: c === 'tl' || c === 'br' ? 'nwse-resize' : 'nesw-resize',
                            }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, background: '#fff', border: '2px solid var(--color-primary, #ff4d94)' }} />
                          </div>
                        ))}
                        <div className="absolute pointer-events-none" style={{ left: '50%', top: -34, width: 2, height: 34, marginLeft: -1, background: 'var(--color-primary, #ff4d94)', opacity: 0.7 }} />
                        <div data-handle="rotate"
                          className="absolute pointer-events-auto flex items-center justify-center"
                          style={{ left: '50%', top: -52, width: 40, height: 40, marginLeft: -20, cursor: 'grab' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', border: '2px solid var(--color-primary, #ff4d94)' }} />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

export default TryOnStage
