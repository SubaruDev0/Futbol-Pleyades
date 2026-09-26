import { z } from 'zod'

const body = z.object({ role: z.literal('organizador') })

/** "Hacer organizador": un organizador asciende a otro miembro. */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const groupId = groupIdParam(event)
  const userId = getRouterParam(event, 'userId') ?? ''
  await requireOrganizer(groupId, user.id)
  const { role } = await readValidatedBody(event, body.parse)

  const [updated] = /^[0-9a-f-]{36}$/i.test(userId)
    ? await useDb()
        .update(schema.groupMembers)
        .set({ role })
        .where(memberOf(groupId, userId))
        .returning({ userId: schema.groupMembers.userId, role: schema.groupMembers.role })
    : []
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Miembro no encontrado' })
  }
  return updated
})
