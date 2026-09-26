import { and, eq, inArray } from 'drizzle-orm'

/** Fisher-Yates sobre aleatoriedad criptográfica — un sorteo honesto que nadie tiene que confiar a ciegas. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1)
    const swap = out[i]!
    out[i] = out[j]!
    out[j] = swap
  }
  return out
}

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const { canManage } = await requireMatchAccess(id, user.id)

  if (!canManage) {
    throw createError({ statusCode: 403, statusMessage: 'Solo el organizador puede sortear' })
  }

  const db = useDb()
  const going = await db
    .select({ id: schema.matchPlayers.id })
    .from(schema.matchPlayers)
    .where(and(eq(schema.matchPlayers.matchId, id), eq(schema.matchPlayers.status, 'voy')))

  if (going.length < 2) {
    throw createError({ statusCode: 409, statusMessage: 'Faltan jugadores para sortear' })
  }

  const shuffled = shuffle(going.map(p => p.id))
  const half = Math.ceil(shuffled.length / 2)
  const dark = shuffled.slice(0, half)
  const light = shuffled.slice(half)

  await db
    .update(schema.matchPlayers)
    .set({ kit: 'oscuro' })
    .where(inArray(schema.matchPlayers.id, dark))

  if (light.length) {
    await db
      .update(schema.matchPlayers)
      .set({ kit: 'claro' })
      .where(inArray(schema.matchPlayers.id, light))
  }

  return { oscuro: dark.length, claro: light.length }
})
