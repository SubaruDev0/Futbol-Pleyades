import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

const body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('aceptar') }),
  z.object({
    action: z.literal('rechazar'),
    reason: z.string().trim().max(140).optional(),
  }),
])

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const receiptId = getRouterParam(event, 'receiptId') ?? ''
  const { match, canManage } = await requireMatchAccess(id, user.id)

  if (!canSettlePayments(match, user.id, canManage)) {
    throw createError({ statusCode: 403, statusMessage: 'Solo quien cobra revisa los comprobantes' })
  }

  const input = await readValidatedBody(event, body.parse)
  const db = useDb()

  const [receipt] = /^[0-9a-f-]{36}$/i.test(receiptId)
    ? await db
      .select({ id: schema.paymentReceipts.id, matchPlayerId: schema.paymentReceipts.matchPlayerId })
      .from(schema.paymentReceipts)
      .innerJoin(schema.matchPlayers, eq(schema.matchPlayers.id, schema.paymentReceipts.matchPlayerId))
      .where(
        and(
          eq(schema.paymentReceipts.id, receiptId),
          eq(schema.matchPlayers.matchId, id),
          eq(schema.paymentReceipts.status, 'pendiente'),
        ),
      )
      .limit(1)
    : []

  if (!receipt) {
    throw createError({ statusCode: 404, statusMessage: 'Este comprobante ya no está pendiente' })
  }

  const now = new Date()
  const accepted = input.action === 'aceptar'

  // Condicionado a que siga pendiente: una subida que lo reemplaza o un segundo tap pierde la carrera limpiamente.
  const [reviewed] = await db
    .update(schema.paymentReceipts)
    .set({
      status: accepted ? 'aceptado' : 'rechazado',
      rejectReason: accepted ? null : input.reason || null,
      reviewedAt: now,
      reviewedBy: user.id,
    })
    .where(
      and(eq(schema.paymentReceipts.id, receipt.id), eq(schema.paymentReceipts.status, 'pendiente')),
    )
    .returning({ id: schema.paymentReceipts.id })

  if (!reviewed) {
    throw createError({ statusCode: 404, statusMessage: 'Este comprobante ya no está pendiente' })
  }

  if (accepted) {
    await db
      .update(schema.matchPlayers)
      .set({ paid: true, paidAt: now })
      .where(eq(schema.matchPlayers.id, receipt.matchPlayerId))
  }

  return { status: accepted ? 'aceptado' : 'rechazado' }
})
