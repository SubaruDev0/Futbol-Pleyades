import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

const body = z.object({
  paid: z.boolean().optional(),
  kit: z.enum(['oscuro', 'claro']).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')!
  const playerId = getRouterParam(event, 'playerId')!
  const { canManage } = await requireMatchAccess(id, user.id)

  const patch = await readValidatedBody(event, body.parse)
  const db = useDb()

  const [player] = await db
    .select()
    .from(schema.matchPlayers)
    .where(and(eq(schema.matchPlayers.id, playerId), eq(schema.matchPlayers.matchId, id)))
    .limit(1)

  if (!player) {
    throw createError({ statusCode: 404, statusMessage: 'Jugador no encontrado' })
  }

  // Players tick off their own transfer, exactly as they did in the chat.
  // Everyone else's row, and every kit change, belongs to the organizer.
  const isOwnRow = player.userId === user.id || player.invitedBy === user.id
  if (!canManage && (!isOwnRow || patch.kit !== undefined)) {
    throw createError({ statusCode: 403, statusMessage: 'No puedes modificar a otro jugador' })
  }

  const [updated] = await db
    .update(schema.matchPlayers)
    .set({
      ...(patch.kit !== undefined ? { kit: patch.kit } : {}),
      ...(patch.paid !== undefined
        ? { paid: patch.paid, paidAt: patch.paid ? new Date() : null }
        : {}),
    })
    .where(eq(schema.matchPlayers.id, playerId))
    .returning()

  return updated
})
