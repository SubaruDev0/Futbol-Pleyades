import { eq, sql } from 'drizzle-orm'

/**
 * Elimina el grupo de verdad: miembros, cada partido con sus jugadores, invitados,
 * comprobantes y sus imágenes. Solo organizadores (o quien sea su último miembro).
 * `?dryRun=1` solo cuenta.
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const groupId = groupIdParam(event)
  const membership = await requireMembership(groupId, user.id)

  const db = useDb()
  const [matchRows, [members]] = await Promise.all([
    db.select({ id: schema.matches.id }).from(schema.matches).where(eq(schema.matches.groupId, groupId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.groupMembers)
      .where(eq(schema.groupMembers.groupId, groupId)),
  ])
  if (membership.role !== 'organizador' && (members?.n ?? 0) > 1) {
    throw createError({ statusCode: 403, statusMessage: 'Solo un organizador puede borrar el grupo' })
  }
  const matchIds = matchRows.map(m => m.id)
  const footprint = await playerRowsFootprint({ matchIds })
  const counts: DeletionCounts & { members: number } = {
    matches: matchIds.length,
    players: footprint.players,
    guests: footprint.guests,
    receipts: footprint.receipts,
    members: members?.n ?? 0,
  }
  if (isDryRun(event)) return { dryRun: true, counts }

  await atomically(tx => [
    ...(matchIds.length ? deletePlayerRows(tx, { matchIds }) : []),
    tx.delete(schema.matches).where(eq(schema.matches.groupId, groupId)),
    tx.delete(schema.groupMembers).where(eq(schema.groupMembers.groupId, groupId)),
    tx.delete(schema.groups).where(eq(schema.groups.id, groupId)),
  ])
  await dropReceiptFiles(footprint.fileKeys)

  return { deleted: true, counts }
})
