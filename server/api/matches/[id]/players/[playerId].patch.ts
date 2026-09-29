import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

const body = z.object({
  paid: z.boolean().optional(),
  kit: z.enum(['oscuro', 'claro']).nullable().optional(),
  // El organizador pasa a alguien a espectador (o lo devuelve a jugar) y decide si paga cancha.
  status: z.enum(['voy', 'espectador']).optional(),
  spectatorPays: z.boolean().optional(),
  // Soltar una fijación sin sacarlo de su equipo: el próximo sorteo puede moverlo.
  kitLocked: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const playerId = getRouterParam(event, 'playerId')!
  const { match, canManage } = await requireMatchAccess(id, user.id)

  const patch = await readValidatedBody(event, body.parse)

  // Los jugadores ya no marcan su propio pago: envían un comprobante en su lugar.
  // `paid` es decisión de quien cobra (efectivo, correcciones); las camisetas son del organizador.
  if (patch.paid !== undefined && !canSettlePayments(match, user.id, canManage)) {
    throw createError({ statusCode: 403, statusMessage: 'Solo quien cobra puede marcar pagos' })
  }
  if ((patch.kit !== undefined || patch.status !== undefined || patch.spectatorPays !== undefined || patch.kitLocked !== undefined) && !canManage) {
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
      // Poner una camiseta a mano la fija para el sorteo; quitarla la suelta.
      ...(patch.kit !== undefined ? { kit: patch.kit, kitLocked: patch.kit !== null } : {}),
      ...(patch.kitLocked !== undefined ? { kitLocked: patch.kitLocked } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.spectatorPays !== undefined ? { spectatorPays: patch.spectatorPays } : {}),
      // Un espectador no juega: pierde la camiseta que tuviera.
      ...(patch.status === 'espectador' ? { kit: null, kitLocked: false } : {}),
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
