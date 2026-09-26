import { eq } from 'drizzle-orm'

/** Elimina el partido de verdad: sus jugadores, invitados, comprobantes y sus imágenes. `?dryRun=1` solo cuenta. */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  // canManage: quien creó el partido, o un organizador de su grupo.
  const { canManage } = await requireMatchAccess(id, user.id)
  if (!canManage) {
    throw createError({ statusCode: 403, statusMessage: 'Solo quien creó el partido o un organizador puede borrarlo' })
  }

  const footprint = await playerRowsFootprint({ matchIds: [id] })
  const counts: DeletionCounts = {
    matches: 1,
    players: footprint.players,
    guests: footprint.guests,
    receipts: footprint.receipts,
  }
  if (isDryRun(event)) return { dryRun: true, counts }

  await atomically(db => [
    ...deletePlayerRows(db, { matchIds: [id] }),
    db.delete(schema.matches).where(eq(schema.matches.id, id)),
  ])
  await dropReceiptFiles(footprint.fileKeys)

  return { deleted: true, counts }
})
