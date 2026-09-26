import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const [me] = await useDb()
    .select({
      id: schema.users.id,
      name: schema.users.name,
      phone: schema.users.phone,
      avatarUrl: schema.users.avatarUrl,
      avatarSourceUrl: schema.users.avatarSourceUrl,
      avatarCrop: schema.users.avatarCrop,
    })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  return me
})
