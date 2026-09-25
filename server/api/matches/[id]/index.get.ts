import { asc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')!
  const { match, canManage } = await requireMatchAccess(id, user.id)

  const db = useDb()
  const collector = alias(schema.users, 'collector')

  const [detail] = await db
    .select({
      match: schema.matches,
      venue: schema.venues,
      collectorName: collector.name,
      // Transfer details reach only players of this match, never a group chat.
      collectorAlias: collector.paymentAlias,
    })
    .from(schema.matches)
    .leftJoin(schema.venues, eq(schema.venues.id, schema.matches.venueId))
    .leftJoin(collector, eq(collector.id, schema.matches.collectorUserId))
    .where(eq(schema.matches.id, id))
    .limit(1)

  const players = await db
    .select({
      id: schema.matchPlayers.id,
      userId: schema.matchPlayers.userId,
      name: schema.users.name,
      guestName: schema.matchPlayers.guestName,
      status: schema.matchPlayers.status,
      kit: schema.matchPlayers.kit,
      paid: schema.matchPlayers.paid,
      respondedAt: schema.matchPlayers.respondedAt,
    })
    .from(schema.matchPlayers)
    .leftJoin(schema.users, eq(schema.users.id, schema.matchPlayers.userId))
    .where(eq(schema.matchPlayers.matchId, id))
    .orderBy(asc(schema.matchPlayers.respondedAt))

  const going = players.filter(p => p.status === 'voy')

  return {
    ...detail,
    match,
    canManage,
    players,
    // The split the chat recomputed by hand every single time.
    perPlayer:
      match.totalCost && going.length ? Math.ceil(match.totalCost / going.length) : null,
  }
})
