import { and, eq, gt, isNull, notExists, or, sql } from 'drizzle-orm'

const SOLE_ORGANIZER = 'Antes de salir, deja a otro como organizador o borra el grupo'
const LAST_MEMBER = 'Eres el último miembro: en vez de salir, borra el grupo'

/**
 * Sale del grupo. Salir también quita tus cupos (y los invitados que trajiste) en
 * los próximos partidos del grupo, salvo filas ya pagadas o con comprobante enviado;
 * los partidos pasados y todo el historial de pagos quedan como estaban. `?dryRun=1` solo informa.
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const groupId = groupIdParam(event)
  const membership = await requireMembership(groupId, user.id)

  const db = useDb()
  const gm = schema.groupMembers
  const [[roster], rows] = await Promise.all([
    db
      .select({
        members: sql<number>`count(*)::int`,
        organizers: sql<number>`count(*) filter (where ${gm.role} = 'organizador')::int`,
      })
      .from(gm)
      .where(eq(gm.groupId, groupId)),
    db
      .select({ id: schema.matchPlayers.id, userId: schema.matchPlayers.userId })
      .from(schema.matchPlayers)
      .innerJoin(schema.matches, eq(schema.matches.id, schema.matchPlayers.matchId))
      .where(droppedOnLeave(groupId, user.id)),
  ])

  const blocked
    = (roster?.members ?? 0) <= 1
      ? 'last-member'
      : membership.role === 'organizador' && (roster?.organizers ?? 0) <= 1
        ? 'sole-organizer'
        : null
  const counts = {
    rsvps: rows.filter(r => r.userId).length,
    guests: rows.filter(r => !r.userId).length,
  }

  if (isDryRun(event)) {
    return {
      dryRun: true,
      counts,
      blocked,
      message: blocked === 'last-member' ? LAST_MEMBER : blocked === 'sole-organizer' ? SOLE_ORGANIZER : null,
    }
  }
  if (blocked) {
    throw createError({
      statusCode: 409,
      statusMessage: blocked === 'last-member' ? LAST_MEMBER : SOLE_ORGANIZER,
      data: { reason: blocked },
    })
  }

  const ids = rows.map(r => r.id)
  await atomically(tx => [
    ...(ids.length ? deletePlayerRows(tx, { playerIds: ids }) : []),
    tx.delete(gm).where(memberOf(groupId, user.id)),
  ])

  return { left: true, counts }
})

/** Mis filas sin pagar y sin comprobante (mi propio cupo o mis invitados) en los próximos partidos de este grupo. */
function droppedOnLeave(groupId: string, userId: string) {
  const mp = schema.matchPlayers
  return and(
    eq(schema.matches.groupId, groupId),
    gt(schema.matches.kickoffAt, sql`now()`),
    or(eq(mp.userId, userId), and(isNull(mp.userId), eq(mp.invitedBy, userId))),
    eq(mp.paid, false),
    notExists(
      useDb()
        .select({ one: sql`1` })
        .from(schema.paymentReceipts)
        .where(eq(schema.paymentReceipts.matchPlayerId, mp.id)),
    ),
  )
}
