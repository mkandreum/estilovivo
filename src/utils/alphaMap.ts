import type { AlphaMap } from './tryOnLayers'

const MAX_SIDE = 128
const CACHE_MAX = 48
const cache = new Map<string, AlphaMap | null>()
const pending = new Map<string, Promise<AlphaMap | null>>()

/** Extrae un mapa de alfa pequeño de un ImageData (puro, testeable). */
export function alphaFromImageData(id: { width: number; height: number; data: ArrayLike<number> }): AlphaMap {
  const data = new Uint8Array(id.width * id.height)
  for (let i = 0; i < data.length; i++) data[i] = id.data[i * 4 + 3]
  return { w: id.width, h: id.height, data }
}

export function getCachedAlpha(url: string): AlphaMap | null | undefined {
  return cache.get(url)
}

function remember(url: string, v: AlphaMap | null) {
  cache.delete(url)
  cache.set(url, v)
  while (cache.size > CACHE_MAX) {
    const first = cache.keys().next().value
    if (first === undefined) break
    cache.delete(first)
  }
}

/** Carga (una vez) el mapa de alfa de una imagen; null si no se puede leer
 *  (CORS, error): el hit-test cae entonces a la caja rectangular. */
export function ensureAlphaMap(url: string): Promise<AlphaMap | null> {
  if (cache.has(url)) return Promise.resolve(cache.get(url) ?? null)
  const inflight = pending.get(url)
  if (inflight) return inflight
  const p = new Promise<AlphaMap | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1
        const s = Math.min(1, MAX_SIDE / Math.max(nw, nh))
        const w = Math.max(1, Math.round(nw * s)), h = Math.max(1, Math.round(nh * s))
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        const ctx = c.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('no ctx')
        ctx.drawImage(img, 0, 0, w, h)
        const map = alphaFromImageData(ctx.getImageData(0, 0, w, h))
        c.width = 0; c.height = 0
        remember(url, map)
        resolve(map)
      } catch {
        remember(url, null)
        resolve(null)
      }
    }
    img.onerror = () => { remember(url, null); resolve(null) }
    img.src = url
  }).finally(() => { pending.delete(url) })
  pending.set(url, p)
  return p
}
