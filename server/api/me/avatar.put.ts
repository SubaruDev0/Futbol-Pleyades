import { eq } from 'drizzle-orm'

// Volver a encuadrar la foto actual: solo viaja el recorte nuevo, el original se queda igual.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const { avatar, crop } = await readAvatarUpload(event, false)

  const db = useDb()
  const [current] = await db
    .select({ avatarUrl: schema.users.avatarUrl, avatarSourceUrl: schema.users.avatarSourceUrl })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  if (!current?.avatarSourceUrl) {
    throw createError({ statusCode: 409, statusMessage: 'No encontramos la foto original. Súbela de nuevo.' })
  }

  const avatarKey = avatarStore.newKey(avatar.type)
  await avatarStore.put(avatarKey, avatar.bytes)

  const updated = (await db
    .update(schema.users)
    .set({ avatarUrl: avatarStore.url(avatarKey), avatarCrop: crop })
    .where(eq(schema.users.id, user.id))
    .returning(avatarUserColumns))[0]!

  await dropAvatarFiles(current.avatarUrl)
  await replaceUserSession(event, { user: updated })

  return { avatarUrl: updated.avatarUrl }
})
