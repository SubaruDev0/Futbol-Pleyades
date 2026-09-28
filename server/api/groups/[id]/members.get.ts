import { asc, eq, isNotNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const groupId = getRouterParam(event, 'id')!
  await requireMembership(groupId, user.id)

  return useDb()
    .select({
      id: schema.users.id,
      name: schema.users.name,
      phone: schema.users.phone,
      avatarUrl: schema.users.avatarUrl,
      role: schema.groupMembers.role,
      // Si pueden cobrar — nunca los datos de la cuenta en sí.
      hasPaymentAccount: isNotNull(schema.paymentAccounts.userId).mapWith(Boolean),
    })
    .from(schema.groupMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.groupMembers.userId))
    .leftJoin(schema.paymentAccounts, eq(schema.paymentAccounts.userId, schema.users.id))
    .where(eq(schema.groupMembers.groupId, groupId))
    .orderBy(asc(schema.groupMembers.role), asc(schema.users.name))
})
