import { createHash } from 'node:crypto'

// Cliente REST mínimo de Cloudinary: subir, entregar y destruir una imagen.
// Solo lo usa image-store.ts; nada más en la app sabe que Cloudinary existe.

/** Cómo se entrega el asset: `upload` es público, `authenticated` exige URL firmada. */
export type CloudinaryDelivery = 'upload' | 'authenticated'

export interface CloudinaryConfig {
  cloud: string
  apiKey: string
  apiSecret: string
}

const API = 'https://api.cloudinary.com/v1_1'
const CDN = 'https://res.cloudinary.com'

let resolved: CloudinaryConfig | null | undefined
let warned = false

/** Credenciales desde CLOUDINARY_URL (`cloudinary://key:secret@cloud`); null si no hay o está malformada. */
export function cloudinaryConfig(): CloudinaryConfig | null {
  if (resolved !== undefined) return resolved

  const raw = process.env.CLOUDINARY_URL
  resolved = null
  if (raw) {
    try {
      const url = new URL(raw)
      const cloud = url.hostname
      const apiKey = decodeURIComponent(url.username)
      const apiSecret = decodeURIComponent(url.password)
      if (url.protocol === 'cloudinary:' && cloud && apiKey && apiSecret) {
        resolved = { cloud, apiKey, apiSecret }
      }
    }
    catch {
      // Cae al aviso de abajo; el valor nunca se registra en el log.
    }
    if (!resolved && !warned) {
      warned = true
      console.warn('[cloudinary] CLOUDINARY_URL no es cloudinary://key:secret@cloud; se usa el disco local')
    }
  }
  return resolved
}

/**
 * Firma de la API: SHA-1 de los parámetros ordenados alfabéticamente como
 * `k=v&k=v` más el api_secret. `file`, `api_key` y `resource_type` quedan fuera.
 */
function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const payload = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
  return createHash('sha1').update(payload + apiSecret).digest('hex')
}

async function callApi(
  cfg: CloudinaryConfig,
  endpoint: 'upload' | 'destroy',
  signed: Record<string, string | number>,
  file?: { bytes: Uint8Array, contentType: string },
): Promise<Record<string, unknown>> {
  const body = new FormData()
  if (file) {
    // Una copia: el Blob necesita su propio ArrayBuffer, no la vista del pool de Node.
    body.set('file', new Blob([new Uint8Array(file.bytes)], { type: file.contentType }), 'upload')
  }
  body.set('api_key', cfg.apiKey)
  for (const [k, v] of Object.entries(signed)) body.set(k, String(v))
  body.set('signature', signParams(signed, cfg.apiSecret))

  const res = await fetch(`${API}/${cfg.cloud}/image/${endpoint}`, { method: 'POST', body })
  const json = await res.json().catch(() => ({})) as Record<string, any>
  if (!res.ok) {
    throw new Error(`cloudinary ${endpoint} ${res.status}: ${json?.error?.message ?? 'sin detalle'}`)
  }
  return json
}

export async function cloudinaryUpload(
  cfg: CloudinaryConfig,
  publicId: string,
  delivery: CloudinaryDelivery,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  await callApi(
    cfg,
    'upload',
    { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), type: delivery },
    { bytes, contentType },
  )
}

/**
 * URL de entrega. Para `authenticated` va firmada: los 8 primeros caracteres del
 * SHA-1 en base64url de `<public_id>.<ext>` más el api_secret, en `s--…--`. Sin esa
 * firma Cloudinary responde 401, así que el comprobante nunca es alcanzable en público.
 */
export function cloudinaryUrl(
  cfg: CloudinaryConfig,
  publicId: string,
  ext: string,
  delivery: CloudinaryDelivery,
): string {
  const path = `${publicId}.${ext}`
  if (delivery !== 'authenticated') return `${CDN}/${cfg.cloud}/image/upload/${path}`
  const sig = createHash('sha1').update(path + cfg.apiSecret).digest('base64url').slice(0, 8)
  return `${CDN}/${cfg.cloud}/image/authenticated/s--${sig}--/${path}`
}

/** Bytes del asset, o null cuando Cloudinary dice que no existe o no autoriza (404/401/403). */
export async function cloudinaryFetch(url: string): Promise<Buffer | null> {
  const res = await fetch(url)
  if (res.status === 404 || res.status === 401 || res.status === 403) return null
  if (!res.ok) throw new Error(`cloudinary delivery ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

export async function cloudinaryDestroy(
  cfg: CloudinaryConfig,
  publicId: string,
  delivery: CloudinaryDelivery,
): Promise<void> {
  const json = await callApi(cfg, 'destroy', {
    invalidate: 'true',
    public_id: publicId,
    timestamp: Math.floor(Date.now() / 1000),
    type: delivery,
  })
  // `not found` ya es el estado deseado; cualquier otro resultado es un asset que quedó vivo.
  const result = String(json.result ?? '')
  if (result !== 'ok' && result !== 'not found') {
    throw new Error(`cloudinary destroy: ${result || 'sin resultado'}`)
  }
}
