import { and, asc, desc, eq, gte, inArray, notInArray, sql } from 'drizzle-orm'

const MEMBER_PREVIEW = 8

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const db = useDb()

  const rows = await db
    .select({
      id: schema.groups.id,
      name: schema.groups.name,
      inviteCode: schema.groups.inviteCode,
      defaultFormat: schema.groups.defaultFormat,
      role: schema.groupMembers.role,
    })
    .from(schema.groupMembers)
    .innerJoin(schema.groups, eq(schema.groups.id, schema.groupMembers.groupId))
    .where(eq(schema.groupMembers.userId, user.id))
    .orderBy(desc(schema.groups.createdAt))

  if (!rows.length) return []

  const ids = rows.map(r => r.id)

  const [members, upcoming] = await Promise.all([
    db
      .select({
        groupId: schema.groupMembers.groupId,
        id: schema.users.id,
        name: schema.users.name,
        avatarUrl: schema.users.avatarUrl,
        role: schema.groupMembers.role,
      })
      .from(schema.groupMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.groupMembers.userId))
      .where(inArray(schema.groupMembers.groupId, ids))
      .orderBy(asc(schema.groupMembers.role), asc(schema.users.name)),
    db
      .selectDistinctOn([schema.matches.groupId], {
        groupId: schema.matches.groupId,
        id: schema.matches.id,
        slug: schema.matches.slug,
        kickoffAt: schema.matches.kickoffAt,
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
          inArray(schema.matches.groupId, ids),
          gte(schema.matches.kickoffAt, sql`now() - interval '3 hours'`),
          notInArray(schema.matches.status, ['cancelado', 'jugado']),
        ),
      )
      .orderBy(schema.matches.groupId, asc(schema.matches.kickoffAt)),
  ])

  return rows.map((g) => {
    const all = members.filter(m => m.groupId === g.id)
    const next = upcoming.find(m => m.groupId === g.id)
    return {
      ...g,
      memberCount: all.length,
      members: all.slice(0, MEMBER_PREVIEW).map(({ groupId: _, ...m }) => m),
      nextMatch: next
        ? {
            id: next.id,
            slug: next.slug,
            kickoffAt: next.kickoffAt,
            capacity: next.capacity,
            going: next.going,
            status: next.status,
            venueName: next.venueName,
            fieldLabel: next.fieldLabel,
          }
        : null,
    }
  })
})
