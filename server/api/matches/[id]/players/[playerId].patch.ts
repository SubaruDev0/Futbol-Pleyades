import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

const body = z.object({
  paid: z.boolean().optional(),
  // El organizador pasa a alguien a espectador (o lo devuelve a jugar) y decide si paga cancha.
  status: z.enum(['voy', 'espectador']).optional(),
  spectatorPays: z.boolean().optional(),
  // Ligar a alguien con otros (mismo número): el sorteo los deja siempre en el mismo equipo. null los desliga.
  linkGroup: z.number().int().min(1).max(9).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const playerId = getRouterParam(event, 'playerId')!
  const { match, canManage } = await requireMatchAccess(id, user.id)

  const patch = await readValidatedBody(event, body.parse)

  // Los jugadores ya no marcan su propio pago: envían un comprobante en su lugar.
  // `paid` es decisión de quien cobra (efectivo, correcciones); las camisetas y los grupos son del organizador.
  if (patch.paid !== undefined && !canSettlePayments(match, user.id, canManage)) {
    throw createError({ statusCode: 403, statusMessage: 'Solo quien cobra puede marcar pagos' })
  }
  if ((patch.status !== undefined || patch.spectatorPays !== undefined || patch.linkGroup !== undefined) && !canManage) {
    throw createError({ statusCode: 403, statusMessage: 'No puedes modificar a otro jugador' })
  }

  const db = useDb()
  const [player] = await db
    .select({ id: schema.matchPlayers.id })
    .from(schema.matchPlayers)
    .where(and(eq(schema.matchPlayers.id, playerId), eq(schema.matchPlayers.matchId, id)))
    .limit(1)

  if (!player) {
    throw createError({ statusCode: 404, statusMessage: 'Jugador no encontrado' })
  }

  const now = new Date()
  const [updated] = await db
    .update(schema.matchPlayers)
    .set({
      ...(patch.linkGroup !== undefined ? { linkGroup: patch.linkGroup } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.spectatorPays !== undefined ? { spectatorPays: patch.spectatorPays } : {}),
      // Un espectador no juega: pierde la camiseta y el grupo que tuviera.
      ...(patch.status === 'espectador' ? { kit: null, linkGroup: null } : {}),
      ...(patch.paid !== undefined ? { paid: patch.paid, paidAt: patch.paid ? now : null } : {}),
    })
    .where(eq(schema.matchPlayers.id, playerId))
    .returning()

  // Marcado como pagado a mano mientras un comprobante esperaba: ese comprobante también se salda.
  if (patch.paid) {
    await db
      .update(schema.paymentReceipts)
      .set({ status: 'aceptado', reviewedAt: now, reviewedBy: user.id })
      .where(
        and(
          eq(schema.paymentReceipts.matchPlayerId, playerId),
          eq(schema.paymentReceipts.status, 'pendiente'),
        ),
      )
  }

  return updated
})
