import { and, eq } from 'drizzle-orm'

/** Quita a un invitado del partido, junto con cualquier comprobante enviado por él. `?dryRun=1` solo cuenta. */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const playerId = getRouterParam(event, 'playerId') ?? ''
  const { canManage } = await requireMatchAccess(id, user.id)

  const [player] = /^[0-9a-f-]{36}$/i.test(playerId)
    ? await useDb()
        .select()
        .from(schema.matchPlayers)
        .where(and(eq(schema.matchPlayers.id, playerId), eq(schema.matchPlayers.matchId, id)))
        .limit(1)
    : []
  if (!player) {
    throw createError({ statusCode: 404, statusMessage: 'Jugador no encontrado' })
  }
  // Los miembros responden por sí mismos con su RSVP; solo los invitados son quitados por otra persona.
  if (player.userId) {
    throw createError({ statusCode: 400, statusMessage: 'Solo se pueden quitar invitados' })
  }
  if (player.invitedBy !== user.id && !canManage) {
    throw createError({ statusCode: 403, statusMessage: 'Solo quien lo invitó o quien organiza puede quitarlo' })
  }

  const footprint = await playerRowsFootprint({ playerIds: [player.id] })
  const counts: DeletionCounts = { matches: 0, players: 1, guests: 1, receipts: footprint.receipts }
  if (isDryRun(event)) return { dryRun: true, counts }

  await atomically(db => [...deletePlayerRows(db, { playerIds: [player.id] })])
  await dropReceiptFiles(footprint.fileKeys)

  return { deleted: true, counts }
})
