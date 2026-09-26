// El único archivo a cambiar cuando las imágenes subidas se muden a Cloudinary
// (o cualquier bucket): avatares y comprobantes ven newKey/put/get/remove, nunca
// el almacenamiento detrás de ellos. Cada store es un mount de storage de Nitro
// (nuxt.config.ts `nitro.storage`), en disco bajo .data/.

export const IMAGE_TYPES = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
} as const

export type ImageType = keyof typeof IMAGE_TYPES

export type ImageMount = 'avatars' | 'receipts'

const KEY_RE = /^[\w-]{16,64}\.(?:webp|jpg|png)$/

export function createImageStore(mount: ImageMount) {
  const storage = () => useStorage(mount)

  return {
    newKey(type: ImageType): string {
      const id = crypto.randomUUID().replaceAll('-', '')
      return `${id}.${IMAGE_TYPES[type]}`
    },

    isKey(key: string): boolean {
      return KEY_RE.test(key)
    },

    async put(key: string, bytes: Uint8Array): Promise<void> {
      await storage().setItemRaw(key, Buffer.from(bytes))
    },

    async get(key: string): Promise<{ bytes: Buffer, type: ImageType } | null> {
      if (!KEY_RE.test(key)) return null
      const raw = await storage().getItemRaw<Buffer>(key)
      if (!raw) return null
      const ext = key.slice(key.lastIndexOf('.') + 1)
      const type = (Object.keys(IMAGE_TYPES) as ImageType[]).find(t => IMAGE_TYPES[t] === ext)!
      return { bytes: Buffer.isBuffer(raw) ? raw : Buffer.from(raw), type }
    },

    async remove(key: string): Promise<void> {
      if (KEY_RE.test(key)) await storage().removeItem(key)
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
