import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  await useDb()
    .delete(schema.paymentAccounts)
    .where(eq(schema.paymentAccounts.userId, user.id))

  return { ok: true }
})
