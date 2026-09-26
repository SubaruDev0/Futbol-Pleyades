import { z } from 'zod'
import type { H3Event } from 'h3'

const MB = 1024 * 1024
const LIMITS = { avatar: 1 * MB, source: 3 * MB }

const cropSchema = z.object({
  cx: z.number().min(0).max(1),
  cy: z.number().min(0).max(1),
  zoom: z.number().min(1).max(AVATAR_MAX_ZOOM),
})

export interface AvatarFile {
  bytes: Uint8Array
  type: AvatarType
}

function checkFile(
  part: { data: Uint8Array } | undefined,
  field: keyof typeof LIMITS,
): AvatarFile {
  if (!part?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No llegó ninguna foto' })
  }
  if (part.data.length > LIMITS[field]) {
    throw createError({
      statusCode: 413,
      statusMessage: `La foto pesa más de ${LIMITS[field] / MB} MB`,
    })
  }
  const type = sniffAvatarType(part.data)
  if (!type) {
    throw createError({ statusCode: 415, statusMessage: 'La foto debe ser JPG, PNG o WebP' })
  }
  return { bytes: part.data, type }
}

/** Lee el avatar recortado, su encuadre y, cuando se pide, el original del que vino. */
export async function readAvatarUpload<S extends boolean>(event: H3Event, withSource: S) {
  const declared = Number(getRequestHeader(event, 'content-length') ?? 0)
  const ceiling = LIMITS.avatar + (withSource ? LIMITS.source : 0) + 64 * 1024
  if (declared > ceiling) {
    throw createError({ statusCode: 413, statusMessage: 'Las fotos pesan demasiado' })
  }

  const parts = (await readMultipartFormData(event)) ?? []
  const part = (name: string) => parts.find(p => p.name === name)

  let crop: AvatarCrop
  try {
    crop = cropSchema.parse(JSON.parse(part('crop')?.data.toString('utf8') ?? ''))
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'El encuadre de la foto no es válido' })
  }

  return {
    avatar: checkFile(part('avatar'), 'avatar'),
    source: (withSource ? checkFile(part('source'), 'source') : null) as S extends true ? AvatarFile : null,
    crop,
  }
}

export const avatarUserColumns = {
  id: schema.users.id,
  name: schema.users.name,
  phone: schema.users.phone,
  avatarUrl: schema.users.avatarUrl,
}

/** Libera archivos guardados a los que el usuario ya no apunta; un archivo sobrante es inofensivo. */
export async function dropAvatarFiles(...urls: (string | null | undefined)[]) {
  for (const url of urls) {
    const key = avatarStore.keyOf(url)
    if (key) await avatarStore.remove(key).catch(() => {})
  }
}
