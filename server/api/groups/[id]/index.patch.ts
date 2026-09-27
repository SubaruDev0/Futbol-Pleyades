import { z } from 'zod'
import { eq } from 'drizzle-orm'

const body = z.object({
  name: z.string().trim().min(2).max(60),
})

/** Solo el organizador cambia el nombre; el id y el código de invitación no se tocan. */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const groupId = groupIdParam(event)
  await requireOrganizer(groupId, user.id)
  const patch = await readValidatedBody(event, body.parse)

  const [updated] = await useDb()
    .update(schema.groups)
    .set(patch)
    .where(eq(schema.groups.id, groupId))
    .returning({ id: schema.groups.id, name: schema.groups.name })

  return updated
})
