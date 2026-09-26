// Avatares sobre el almacén de imágenes compartido (image-store.ts es el archivo a
// cambiar por Cloudinary). Los avatares se direccionan por URL; los comprobantes nunca.

export const AVATAR_TYPES = IMAGE_TYPES

export type AvatarType = ImageType

const URL_PREFIX = '/api/avatars/'

export const avatarStore = {
  ...createImageStore('avatars'),

  url(key: string): string {
    return `${URL_PREFIX}${key}`
  },

  keyOf(url: string | null | undefined): string | null {
    if (!url?.startsWith(URL_PREFIX)) return null
    const key = url.slice(URL_PREFIX.length)
    return avatarStore.isKey(key) ? key : null
  },
}

export const sniffAvatarType = sniffImageType
