import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

const body = z.object({
  code: z.string().trim().min(4).max(12),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const { code } = await readValidatedBody(event, body.parse)

  const db = useDb()
  const [group] = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.inviteCode, code.toUpperCase()))
    .limit(1)

  if (!group) {
    throw createError({ statusCode: 404, statusMessage: 'Ese código no existe' })
  }

  const [already] = await db
    .select({ id: schema.groupMembers.id })
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, group.id),
        eq(schema.groupMembers.userId, user.id),
      ),
    )
    .limit(1)

  if (already) {
    throw createError({ statusCode: 409, statusMessage: `Ya estás en «${group.name}»` })
  }

  await db
    .insert(schema.groupMembers)
    .values({ groupId: group.id, userId: user.id })
    .onConflictDoNothing()

  return group
})
