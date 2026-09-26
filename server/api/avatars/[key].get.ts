export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const key = getRouterParam(event, 'key') ?? ''
  const avatar = avatarStore.isKey(key) ? await avatarStore.get(key) : null
  if (!avatar) {
    throw createError({ statusCode: 404, statusMessage: 'Foto no encontrada' })
  }

  // Cada subida recibe una clave nueva, así una URL dada nunca cambia de contenido.
  setResponseHeaders(event, {
    'Content-Type': avatar.type,
    'Content-Length': String(avatar.bytes.length),
    'Cache-Control': 'private, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  })
  return avatar.bytes
})
