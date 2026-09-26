import { eq } from 'drizzle-orm'

// Una foto nueva: el recorte de 256 px más el original reducido del que se sacó.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const { avatar, source, crop } = await readAvatarUpload(event, true)

  const db = useDb()
  const [current] = await db
    .select({ avatarUrl: schema.users.avatarUrl, avatarSourceUrl: schema.users.avatarSourceUrl })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  const avatarKey = avatarStore.newKey(avatar.type)
  const sourceKey = avatarStore.newKey(source.type)
  await avatarStore.put(avatarKey, avatar.bytes)
  await avatarStore.put(sourceKey, source.bytes)

  const updated = (await db
    .update(schema.users)
    .set({
      avatarUrl: avatarStore.url(avatarKey),
      avatarSourceUrl: avatarStore.url(sourceKey),
      avatarCrop: crop,
    })
    .where(eq(schema.users.id, user.id))
    .returning(avatarUserColumns))[0]!

  await dropAvatarFiles(current?.avatarUrl, current?.avatarSourceUrl)
  await replaceUserSession(event, { user: updated })

  return { avatarUrl: updated.avatarUrl }
})
