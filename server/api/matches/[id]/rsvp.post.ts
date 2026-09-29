import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

const body = z.object({
  status: z.enum(['voy', 'no_voy', 'quizas', 'espectador']),
  // Solo importa si eres espectador: si igual pagas tu parte de la cancha.
  spectatorPays: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const { match } = await requireMatchAccess(id, user.id)

  if (match.status === 'cancelado' || match.status === 'jugado') {
    throw createError({ statusCode: 409, statusMessage: 'Este partido ya está cerrado' })
  }

  const { status, spectatorPays } = await readValidatedBody(event, body.parse)
  const db = useDb()

  const [existing] = await db
    .select({ id: schema.matchPlayers.id, paid: schema.matchPlayers.paid })
    .from(schema.matchPlayers)
    .where(
      and(eq(schema.matchPlayers.matchId, id), eq(schema.matchPlayers.userId, user.id)),
    )
    .limit(1)

  if (!existing) {
    // Quien cobra no se paga a sí mismo: su propia fila arranca pagada.
    const [created] = await db
      .insert(schema.matchPlayers)
      .values({
        matchId: id,
        userId: user.id,
        status,
        spectatorPays: status === 'espectador' && spectatorPays,
        paid: user.id === match.collectorUserId,
      })
      .returning()
    return created
  }

  // Quien ya pagó solo puede dejar de repartir la cancha hablando con quien cobra.
  const stopsPaying = status === 'no_voy' || (status === 'espectador' && !spectatorPays)
  if (existing.paid && stopsPaying) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ya pagaste. Avísale al organizador para que te devuelva o te reemplace.',
    })
  }

  const [updated] = await db
    .update(schema.matchPlayers)
    .set({
      status,
      respondedAt: new Date(),
      spectatorPays: status === 'espectador' && spectatorPays,
      // Bajarse o pasar a espectador libera la camiseta.
      ...(status === 'no_voy' || status === 'espectador' ? { kit: null } : {}),
    })
    .where(eq(schema.matchPlayers.id, existing.id))
    .returning()

  return updated
})
