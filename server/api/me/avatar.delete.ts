import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const db = useDb()

  const [current] = await db
    .select({ avatarUrl: schema.users.avatarUrl, avatarSourceUrl: schema.users.avatarSourceUrl })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  const updated = (await db
    .update(schema.users)
    .set({ avatarUrl: null, avatarSourceUrl: null, avatarCrop: null })
    .where(eq(schema.users.id, user.id))
    .returning(avatarUserColumns))[0]!

  await dropAvatarFiles(current?.avatarUrl, current?.avatarSourceUrl)
  await replaceUserSession(event, { user: updated })

  return { avatarUrl: null }
})
