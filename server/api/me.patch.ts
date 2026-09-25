import { z } from 'zod'
import { eq } from 'drizzle-orm'

const body = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  paymentAlias: z.string().trim().max(120).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const patch = await readValidatedBody(event, body.parse)

  const updated = (await useDb()
    .update(schema.users)
    .set(patch)
    .where(eq(schema.users.id, user.id))
    .returning({
      id: schema.users.id,
      name: schema.users.name,
      phone: schema.users.phone,
      paymentAlias: schema.users.paymentAlias,
    }))[0]!

  await replaceUserSession(event, {
    user: { id: updated.id, name: updated.name, phone: updated.phone },
  })

  return updated
})
