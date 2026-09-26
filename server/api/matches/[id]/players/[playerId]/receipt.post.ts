import { and, eq } from 'drizzle-orm'

// Un jugador (o quien trajo al invitado) envía la captura de la transferencia a revisión.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const playerId = getRouterParam(event, 'playerId')!
  const { match } = await requireMatchAccess(id, user.id)

  if (!match.collectorUserId) {
    throw createError({ statusCode: 409, statusMessage: 'Aún no hay nadie definido para cobrar' })
  }
  if (match.status === 'cancelado') {
    throw createError({ statusCode: 409, statusMessage: 'Este partido está cancelado' })
  }

  const db = useDb()
  const [player] = await db
    .select()
    .from(schema.matchPlayers)
    .where(and(eq(schema.matchPlayers.id, playerId), eq(schema.matchPlayers.matchId, id)))
    .limit(1)

  if (!player) {
    throw createError({ statusCode: 404, statusMessage: 'Jugador no encontrado' })
  }
  if (!paysFor(player, user.id)) {
    throw createError({ statusCode: 403, statusMessage: 'Solo puedes enviar tu pago o el de tus invitados' })
  }
  if (player.paid) {
    throw createError({ statusCode: 409, statusMessage: 'Este pago ya está registrado' })
  }

  const file = await readReceiptUpload(event)
  const key = receiptStore.newKey(file.type)
  await receiptStore.put(key, file.bytes)

  // Una subida nueva reemplaza a la pendiente: ese archivo ya no es de nadie para revisar.
  const superseded = await db
    .delete(schema.paymentReceipts)
    .where(
      and(
        eq(schema.paymentReceipts.matchPlayerId, player.id),
        eq(schema.paymentReceipts.status, 'pendiente'),
      ),
    )
    .returning({ fileKey: schema.paymentReceipts.fileKey })

  let receipt
  try {
    [receipt] = await db
      .insert(schema.paymentReceipts)
      .values({
        matchPlayerId: player.id,
        uploadedBy: user.id,
        fileKey: key,
        contentType: file.type,
      })
      .returning({
        id: schema.paymentReceipts.id,
        status: schema.paymentReceipts.status,
        createdAt: schema.paymentReceipts.createdAt,
      })
  }
  catch {
    // Dos subidas compitieron pasando el delete; el índice único parcial se quedó con una.
    await receiptStore.remove(key).catch(() => {})
    throw createError({ statusCode: 409, statusMessage: 'Ya hay un comprobante en revisión' })
  }

  for (const old of superseded) await receiptStore.remove(old.fileKey).catch(() => {})

  return receipt
})
