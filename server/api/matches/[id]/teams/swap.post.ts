import { and, eq, isNotNull, sql } from 'drizzle-orm'

// Intercambia los colores: los integrantes de cada equipo no cambian, solo la camiseta que llevan.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const { canManage } = await requireMatchAccess(id, user.id)

  if (!canManage) {
    throw createError({ statusCode: 403, statusMessage: 'Solo el organizador puede cambiar los colores' })
  }

  const db = useDb()
  await db
    .update(schema.matchPlayers)
    .set({ kit: sql`CASE ${schema.matchPlayers.kit} WHEN 'oscuro' THEN 'claro'::kit ELSE 'oscuro'::kit END` })
    .where(and(eq(schema.matchPlayers.matchId, id), eq(schema.matchPlayers.status, 'voy'), isNotNull(schema.matchPlayers.kit)))

  return { ok: true }
})
