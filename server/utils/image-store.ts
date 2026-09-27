// El único archivo del que depende el almacenamiento de imágenes subidas: avatares y
// comprobantes ven newKey/put/get/remove, nunca lo que hay detrás. Con CLOUDINARY_URL
// los bytes viven en Cloudinary (cloudinary.ts); sin ella se cae al mount de storage de
// Nitro en disco (nuxt.config.ts `nitro.storage`, bajo .data/), así la app corre sin credenciales.

import {
  cloudinaryConfig,
  cloudinaryDestroy,
  cloudinaryFetch,
  cloudinaryUpload,
  cloudinaryUrl,
} from './cloudinary'
import type { CloudinaryConfig, CloudinaryDelivery } from './cloudinary'

export const IMAGE_TYPES = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
} as const

export type ImageType = keyof typeof IMAGE_TYPES

export type ImageMount = 'avatars' | 'receipts'

const KEY_RE = /^[\w-]{16,64}\.(?:webp|jpg|png)$/

/**
 * Cada mount en Cloudinary: su carpeta y cómo se entrega. Los comprobantes son
 * `authenticated` porque muestran datos bancarios: su URL sin firmar responde 401 y
 * los bytes solo salen por la ruta autenticada, que los pide con una URL firmada acá.
 */
const MOUNTS: Record<ImageMount, { folder: string, delivery: CloudinaryDelivery }> = {
  avatars: { folder: 'pleyades/avatars', delivery: 'upload' },
  receipts: { folder: 'pleyades/receipts', delivery: 'authenticated' },
}

/** El public_id conserva la clave de 32 hex sin extensión: la URL sigue siendo inadivinable. */
const publicIdOf = (folder: string, key: string) => `${folder}/${key.slice(0, key.lastIndexOf('.'))}`

const extOf = (key: string) => key.slice(key.lastIndexOf('.') + 1)

const typeOf = (key: string): ImageType =>
  (Object.keys(IMAGE_TYPES) as ImageType[]).find(t => IMAGE_TYPES[t] === extOf(key))!

export function createImageStore(mount: ImageMount) {
  const storage = () => useStorage(mount)
  const { folder, delivery } = MOUNTS[mount]
  // Se resuelve en cada llamada: el mismo build sirve con y sin credenciales.
  const cloud = (): CloudinaryConfig | null => cloudinaryConfig()

  return {
    newKey(type: ImageType): string {
      const id = crypto.randomUUID().replaceAll('-', '')
      return `${id}.${IMAGE_TYPES[type]}`
    },

    isKey(key: string): boolean {
      return KEY_RE.test(key)
    },

    async put(key: string, bytes: Uint8Array): Promise<void> {
      const cfg = cloud()
      if (!cfg) {
        await storage().setItemRaw(key, Buffer.from(bytes))
        return
      }
      try {
        await cloudinaryUpload(cfg, publicIdOf(folder, key), delivery, bytes, typeOf(key))
      }
      catch (e) {
        // El detalle queda en el log del servidor; quien sube recibe un mensaje limpio.
        console.error(`[images] could not upload ${mount}/${key}:`, e)
        throw createError({
          statusCode: 502,
          statusMessage: 'No pudimos guardar la imagen. Inténtalo de nuevo.',
        })
      }
    },

    async get(key: string): Promise<{ bytes: Buffer, type: ImageType } | null> {
      if (!KEY_RE.test(key)) return null
      const cfg = cloud()
      if (!cfg) {
        const raw = await storage().getItemRaw<Buffer>(key)
        if (!raw) return null
        return { bytes: Buffer.isBuffer(raw) ? raw : Buffer.from(raw), type: typeOf(key) }
      }
      const url = cloudinaryUrl(cfg, publicIdOf(folder, key), extOf(key), delivery)
      let bytes: Buffer | null
      try {
        bytes = await cloudinaryFetch(url)
      }
      catch (e) {
        console.error(`[images] could not fetch ${mount}/${key}:`, e)
        throw createError({
          statusCode: 502,
          statusMessage: 'No pudimos leer la imagen. Inténtalo de nuevo.',
        })
      }
      return bytes ? { bytes, type: typeOf(key) } : null
    },

    async remove(key: string): Promise<void> {
      if (!KEY_RE.test(key)) return
      const cfg = cloud()
      if (!cfg) {
        await storage().removeItem(key)
        return
      }
      try {
        await cloudinaryDestroy(cfg, publicIdOf(folder, key), delivery)
      }
      catch (e) {
        // Quien llama decide si ignora el fallo; el asset huérfano queda registrado.
        console.error(`[images] could not remove ${mount}/${key}:`, e)
        throw e
      }
    },
  }
}

/** Identifica la imagen por sus primeros bytes; no se confía en el tipo declarado por el cliente. */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const at = (i: number) => bytes[i]
  if (bytes.length >= 3 && at(0) === 0xFF && at(1) === 0xD8 && at(2) === 0xFF) return 'image/jpeg'
  if (
    bytes.length >= 8
    && [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A].every((b, i) => at(i) === b)
  ) return 'image/png'
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to))
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  return null
}
