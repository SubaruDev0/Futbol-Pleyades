import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

const body = z.object({
  status: z.enum(['voy', 'no_voy', 'quizas']),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const { match } = await requireMatchAccess(id, user.id)

  if (match.status === 'cancelado' || match.status === 'jugado') {
    throw createError({ statusCode: 409, statusMessage: 'Este partido ya está cerrado' })
  }

  const { status } = await readValidatedBody(event, body.parse)
  const db = useDb()

  const [existing] = await db
    .select({ id: schema.matchPlayers.id, paid: schema.matchPlayers.paid })
    .from(schema.matchPlayers)
    .where(
      and(eq(schema.matchPlayers.matchId, id), eq(schema.matchPlayers.userId, user.id)),
    )
    .limit(1)

  if (!existing) {
    const [created] = await db
      .insert(schema.matchPlayers)
      .values({ matchId: id, userId: user.id, status })
      .returning()
    return created
  }

  if (existing.paid && status === 'no_voy') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ya pagaste. Avísale al organizador para que te devuelva o te reemplace.',
    })
  }

  // Bajarse libera la asignación de camiseta; el sorteo ya no es válido para esa persona.
  const [updated] = await db
    .update(schema.matchPlayers)
    .set({
      status,
      respondedAt: new Date(),
      ...(status === 'no_voy' ? { kit: null } : {}),
    })
    .where(eq(schema.matchPlayers.id, existing.id))
    .returning()

  return updated
})
