import { and, eq } from 'drizzle-orm'

export async function requireMembership(groupId: string, userId: string) {
  const db = useDb()
  const [membership] = await db
    .select({ role: schema.groupMembers.role })
    .from(schema.groupMembers)
    .where(
      and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, userId)),
    )
    .limit(1)

  // 404 en vez de 403: alguien que no es miembro no debería enterarse de que este grupo existe.
  if (!membership) {
    throw createError({ statusCode: 404, statusMessage: 'No encontrado' })
  }

  return membership
}

export async function requireMatchAccess(matchId: string, userId: string) {
  const db = useDb()
  const [match] = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.id, matchId))
    .limit(1)

  if (!match) {
    throw createError({ statusCode: 404, statusMessage: 'Partido no encontrado' })
  }

  const membership = await requireMembership(match.groupId, userId)
  const canManage = membership.role === 'organizador' || match.createdBy === userId

  return { match, canManage }
}

export const capacityFor = (format: 'f5' | 'f6' | 'f7' | 'libre') =>
  ({ f5: 10, f6: 12, f7: 14, libre: 14 })[format]
