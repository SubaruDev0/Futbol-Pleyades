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
      linkGroup: schema.matchPlayers.linkGroup,
    })
    .from(schema.matchPlayers)
    .where(and(eq(schema.matchPlayers.matchId, id), eq(schema.matchPlayers.status, 'voy')))

  if (going.length < 2) {
    throw createError({ statusCode: 409, statusMessage: 'Faltan jugadores para sortear' })
  }

  // Los ligados (mismo número) viajan juntos: cada grupo es una sola unidad del sorteo.
  const linked = new Map<number, string[]>()
  const units: string[][] = []
  for (const p of going) {
    if (p.linkGroup == null) {
      units.push([p.id])
      continue
    }
    const members = linked.get(p.linkGroup) ?? []
    members.push(p.id)
    linked.set(p.linkGroup, members)
  }
  units.push(...linked.values())

  // Las unidades grandes primero (con el azar decidiendo entre las del mismo tamaño) y cada una va
  // al equipo con menos gente, así los equipos quedan lo más parejos que permitan los grupos.
  const dark: string[] = []
  const light: string[] = []
  for (const unit of shuffle(units).sort((a, b) => b.length - a.length)) {
    const toDark = dark.length === light.length
      ? crypto.getRandomValues(new Uint32Array(1))[0]! % 2 === 0
      : dark.length < light.length
    ;(toDark ? dark : light).push(...unit)
  }

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

  return { oscuro: dark.length, claro: light.length }
})
