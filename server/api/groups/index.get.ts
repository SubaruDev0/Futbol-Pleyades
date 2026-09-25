import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const db = useDb()

  return db
    .select({
      id: schema.groups.id,
      name: schema.groups.name,
      inviteCode: schema.groups.inviteCode,
      defaultFormat: schema.groups.defaultFormat,
      role: schema.groupMembers.role,
    })
    .from(schema.groupMembers)
    .innerJoin(schema.groups, eq(schema.groups.id, schema.groupMembers.groupId))
    .where(eq(schema.groupMembers.userId, user.id))
    .orderBy(desc(schema.groups.createdAt))
})
