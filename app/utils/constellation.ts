/**
 * Distribución de estrellas compartida por las constelaciones de partido y grupo.
 * Pura y determinista, así SSR y el cliente dibujan el mismo cielo.
 */

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export type StarPoint = { x: number, y: number }
type Pt = StarPoint

export function starHash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Una espiral de ángulo dorado con variación aleatoria dentro de una elipse,
 * luego relajada para que no haya dos estrellas superpuestas. El punto 0 es
 * el centro del cúmulo.
 */
export function starCluster(n: number, cx: number, cy: number, rx: number, ry: number, seed: number): Pt[] {
  if (n <= 0) return []
  const rand = seededRandom(seed + n * 977)
  const turn = rand() * Math.PI * 2
  const spacing = Math.sqrt((Math.PI * rx * ry) / n)
  const pts: Pt[] = []

  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : Math.sqrt(i / (n - 1))
    const a = turn + i * GOLDEN_ANGLE
    const jitter = i === 0 ? 0 : spacing * 0.42
    pts.push({
      x: cx + Math.cos(a) * t * rx + (rand() - 0.5) * jitter,
      y: cy + Math.sin(a) * t * ry + (rand() - 0.5) * jitter,
    })
  }

  const minD = Math.min(spacing * 0.7, 46)
  for (let pass = 0; pass < 40; pass++) {
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const pa = pts[a]!
        const pb = pts[b]!
        const dx = pb.x - pa.x
        const dy = pb.y - pa.y
        const d = Math.hypot(dx, dy) || 0.01
        if (d >= minD) continue
        const push = (minD - d) / 2
        const ux = dx / d
        const uy = dy / d
        // La brillante se queda quieta en el medio; las demás le hacen espacio.
        if (a !== 0) {
          pa.x -= ux * push
          pa.y -= uy * push
        }
        pb.x += ux * (a === 0 ? push * 2 : push)
        pb.y += uy * (a === 0 ? push * 2 : push)
      }
    }
    for (const p of pts) {
      const k = ((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2
      if (k > 1) {
        const s = 1 / Math.sqrt(k)
        p.x = cx + (p.x - cx) * s
        p.y = cy + (p.y - cy) * s
      }
    }
  }

  return pts.map(p => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }))
}

/** Árbol de expansión mínima de Prim: se lee como el dibujo de una constelación, no un polígono. */
export function starSpanningTree(pts: Pt[]): [number, number][] {
  const n = pts.length
  if (n < 2) return []
  const inTree = new Array<boolean>(n).fill(false)
  const best = new Array<number>(n).fill(Infinity)
  const from = new Array<number>(n).fill(-1)
  const edges: [number, number][] = []
  best[0] = 0

  for (let step = 0; step < n; step++) {
    let u = -1
    for (let i = 0; i < n; i++) {
      if (!inTree[i] && (u === -1 || best[i]! < best[u]!)) u = i
    }
    inTree[u] = true
    if (from[u]! >= 0) edges.push([from[u]!, u])
    for (let v = 0; v < n; v++) {
      if (inTree[v]) continue
      const d = Math.hypot(pts[u]!.x - pts[v]!.x, pts[u]!.y - pts[v]!.y)
      if (d < best[v]!) {
        best[v] = d
        from[v] = u
      }
    }
  }
  return edges
}

/** Lo que una constelación de partido necesita saber de cada persona del plantel. */
export interface ConstellationPlayer {
  id: string
  userId: string | null
  name: string | null
  guestName: string | null
  status: string
  kit: string | null
}

/** Una estrella nombrada tal como la dibuja ConstellationSky. */
export interface SkyStar extends StarPoint {
  id: string
  r: number
  /** bright: la Alcyone del cúmulo · dark/light: camisetas de equipo · maybe/loose: tenue. */
  tone: 'bright' | 'voy' | 'dark' | 'light' | 'loose' | 'maybe'
  label: string
}

/** Un toque de variación de tamaño por id, para que se lea como un cielo, no una grilla de puntos. */
export const starSize = (id: string, base: number) => base + ((starHash(id) % 7) - 3) * 0.14
