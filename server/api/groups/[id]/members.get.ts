import { asc, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const groupId = getRouterParam(event, 'id')!
  await requireMembership(groupId, user.id)

  return useDb()
    .select({
      id: schema.users.id,
      name: schema.users.name,
      role: schema.groupMembers.role,
      // Whether they can collect — never the account details themselves.
      hasPaymentAlias: sql<boolean>`${schema.users.paymentAlias} is not null`,
    })
    .from(schema.groupMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.groupMembers.userId))
    .where(eq(schema.groupMembers.groupId, groupId))
    .orderBy(asc(schema.users.name))
})
