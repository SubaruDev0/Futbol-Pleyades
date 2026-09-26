import { z } from 'zod'

const body = z.object({
  name: z.string().trim().min(2).max(40),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const { match } = await requireMatchAccess(id, user.id)

  if (match.status === 'cancelado' || match.status === 'jugado') {
    throw createError({ statusCode: 409, statusMessage: 'Este partido ya está cerrado' })
  }

  const { name } = await readValidatedBody(event, body.parse)

  // Un invitado no tiene cuenta, así que se le suma y responde por él quien lo
  // trajo. Esa persona queda a cargo de su pago.
  const [guest] = await useDb()
    .insert(schema.matchPlayers)
    .values({ matchId: id, guestName: name, invitedBy: user.id, status: 'voy' })
    .returning()

  return guest
})
