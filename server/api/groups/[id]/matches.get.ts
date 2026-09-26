import { and, asc, eq, gte, notInArray, sql } from 'drizzle-orm'

/** Los próximos partidos del grupo, para el diálogo de detalle del grupo. */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const groupId = getRouterParam(event, 'id')!
  await requireMembership(groupId, user.id)

  return useDb()
    .select({
      id: schema.matches.id,
      slug: schema.matches.slug,
      kickoffAt: schema.matches.kickoffAt,
      format: schema.matches.format,
      capacity: schema.matches.capacity,
      status: schema.matches.status,
      fieldLabel: schema.matches.fieldLabel,
      venueName: schema.venues.name,
      going: sql<number>`(
        select count(*) from ${schema.matchPlayers}
        where ${schema.matchPlayers.matchId} = ${schema.matches.id}
          and ${schema.matchPlayers.status} = 'voy'
      )::int`,
    })
    .from(schema.matches)
    .leftJoin(schema.venues, eq(schema.venues.id, schema.matches.venueId))
    .where(
      and(
        eq(schema.matches.groupId, groupId),
        gte(schema.matches.kickoffAt, sql`now() - interval '3 hours'`),
        notInArray(schema.matches.status, ['cancelado', 'jugado']),
      ),
    )
    .orderBy(asc(schema.matches.kickoffAt))
    .limit(10)
})
