import { z } from 'zod'

const body = z.object({
  name: z.string().trim().min(2).max(40),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')!
  const { match } = await requireMatchAccess(id, user.id)

  if (match.status === 'cancelado' || match.status === 'jugado') {
    throw createError({ statusCode: 409, statusMessage: 'Este partido ya está cerrado' })
  }

  const { name } = await readValidatedBody(event, body.parse)

  // A guest has no account, so they are counted in and vouched for by whoever
  // brought them. That person is on the hook for their payment.
  const [guest] = await useDb()
    .insert(schema.matchPlayers)
    .values({ matchId: id, guestName: name, invitedBy: user.id, status: 'voy' })
    .returning()

  return guest
})
