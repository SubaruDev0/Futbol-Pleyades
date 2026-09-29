import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

const body = z.object({
  phone: z.string().trim().min(1),
  matchRef: z.string().trim().min(1),
  status: z.enum(['voy', 'no_voy', 'quizas']).default('voy'),
})

/** Anota a alguien a un partido sin que ella misma responda: para cuando el dueño lo hace a mano. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { phone, matchRef, status } = await readValidatedBody(event, body.parse)
  const db = useDb()
  const s = schema

  const normalized = normalizePhone(phone)
  if (!normalized) throw createError({ statusCode: 400, statusMessage: 'Ese celular no es válido' })

  const [user] = await db.select({ id: s.users.id, name: s.users.name }).from(s.users)
    .where(eq(s.users.phone, normalized)).limit(1)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'No hay ninguna cuenta con ese celular' })

  const matchId = await resolveMatchId(matchRef.trim())
  const [match] = await db.select({ slug: s.matches.slug }).from(s.matches)
    .where(eq(s.matches.id, matchId)).limit(1)
  if (!match) throw createError({ statusCode: 404, statusMessage: 'Partido no encontrado' })

  const [existing] = await db.select({ id: s.matchPlayers.id }).from(s.matchPlayers)
    .where(and(eq(s.matchPlayers.matchId, matchId), eq(s.matchPlayers.userId, user.id))).limit(1)

  if (existing) {
    await db.update(s.matchPlayers)
      .set({ status, respondedAt: new Date(), ...(status === 'no_voy' ? { kit: null } : {}) })
      .where(eq(s.matchPlayers.id, existing.id))
  }
  else {
    await db.insert(s.matchPlayers).values({ matchId, userId: user.id, status })
  }

  return { userName: user.name, matchSlug: match.slug }
})
