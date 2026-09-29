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
    .select({
      id: schema.matchPlayers.id,
      kit: schema.matchPlayers.kit,
      kitLocked: schema.matchPlayers.kitLocked,
    })
    .from(schema.matchPlayers)
    .where(and(eq(schema.matchPlayers.matchId, id), eq(schema.matchPlayers.status, 'voy')))

  if (going.length < 2) {
    throw createError({ statusCode: 409, statusMessage: 'Faltan jugadores para sortear' })
  }

  // Los que el organizador puso a mano se quedan donde están; el sorteo reparte al resto
  // para que los equipos queden parejos (oscuro se lleva el impar).
  const fixed = going.filter(p => p.kitLocked && p.kit)
  const darkFixed = fixed.filter(p => p.kit === 'oscuro').length
  const lightFixed = fixed.length - darkFixed
  const free = shuffle(going.filter(p => !(p.kitLocked && p.kit)).map(p => p.id))

  const darkTarget = Math.ceil(going.length / 2)
  const lightTarget = going.length - darkTarget
  const needDark = Math.max(0, darkTarget - darkFixed)
  const needLight = Math.max(0, lightTarget - lightFixed)
  // Si las fijaciones ya desbalancean, el lado con menos cupo absorbe lo que sobre.
  const darkCount = needDark >= free.length ? free.length : needLight >= free.length ? 0 : needDark
  const dark = free.slice(0, darkCount)
  const light = free.slice(darkCount)

  if (dark.length) {
    await db
      .update(schema.matchPlayers)
      .set({ kit: 'oscuro' })
      .where(inArray(schema.matchPlayers.id, dark))
  }

  if (light.length) {
    await db
      .update(schema.matchPlayers)
      .set({ kit: 'claro' })
      .where(inArray(schema.matchPlayers.id, light))
  }

  return { oscuro: darkFixed + dark.length, claro: lightFixed + light.length, fijados: fixed.length }
})
