import { and, asc, eq, gte, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const db = useDb()

  const mine = db.$with('mine').as(
    db
      .select({
        matchId: schema.matchPlayers.matchId,
        status: schema.matchPlayers.status,
        paid: schema.matchPlayers.paid,
      })
      .from(schema.matchPlayers)
      .where(eq(schema.matchPlayers.userId, user.id)),
  )

  return db
    .with(mine)
    .select({
      id: schema.matches.id,
      kickoffAt: schema.matches.kickoffAt,
      format: schema.matches.format,
      capacity: schema.matches.capacity,
      status: schema.matches.status,
      fieldLabel: schema.matches.fieldLabel,
      totalCost: schema.matches.totalCost,
      groupName: schema.groups.name,
      venueName: schema.venues.name,
      going: sql<number>`count(${schema.matchPlayers.id}) filter (where ${schema.matchPlayers.status} = 'voy')::int`,
      myStatus: mine.status,
      myPaid: mine.paid,
    })
    .from(schema.matches)
    .innerJoin(schema.groups, eq(schema.groups.id, schema.matches.groupId))
    .innerJoin(
      schema.groupMembers,
      and(
        eq(schema.groupMembers.groupId, schema.matches.groupId),
        eq(schema.groupMembers.userId, user.id),
      ),
    )
    .leftJoin(schema.venues, eq(schema.venues.id, schema.matches.venueId))
    .leftJoin(schema.matchPlayers, eq(schema.matchPlayers.matchId, schema.matches.id))
    .leftJoin(mine, eq(mine.matchId, schema.matches.id))
    .where(gte(schema.matches.kickoffAt, sql`now() - interval '3 hours'`))
    .groupBy(schema.matches.id, schema.groups.name, schema.venues.name, mine.status, mine.paid)
    .orderBy(asc(schema.matches.kickoffAt))
})
