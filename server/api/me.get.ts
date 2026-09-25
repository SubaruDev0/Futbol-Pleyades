import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const [me] = await useDb()
    .select({
      id: schema.users.id,
      name: schema.users.name,
      phone: schema.users.phone,
      paymentAlias: schema.users.paymentAlias,
    })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  return me
})
