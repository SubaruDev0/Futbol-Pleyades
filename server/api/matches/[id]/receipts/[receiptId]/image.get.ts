import { and, eq } from 'drizzle-orm'

// Los comprobantes muestran datos bancarios y montos: solo quien lo subió, la
// persona a la que pertenece la fila y quien cobra pueden verlo. Nunca cacheado, nunca público.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const receiptId = getRouterParam(event, 'receiptId') ?? ''
  const { match, canManage } = await requireMatchAccess(id, user.id)

  const notFound = () => createError({ statusCode: 404, statusMessage: 'Comprobante no encontrado' })
  if (!/^[0-9a-f-]{36}$/i.test(receiptId)) throw notFound()

  const [row] = await useDb()
    .select({
      fileKey: schema.paymentReceipts.fileKey,
      uploadedBy: schema.paymentReceipts.uploadedBy,
      userId: schema.matchPlayers.userId,
      invitedBy: schema.matchPlayers.invitedBy,
    })
    .from(schema.paymentReceipts)
    .innerJoin(schema.matchPlayers, eq(schema.matchPlayers.id, schema.paymentReceipts.matchPlayerId))
    .where(and(eq(schema.paymentReceipts.id, receiptId), eq(schema.matchPlayers.matchId, id)))
    .limit(1)

  if (!row) throw notFound()

  const allowed = row.uploadedBy === user.id
    || paysFor(row, user.id)
    || canSettlePayments(match, user.id, canManage)
  // 404, no 403: no se debe confirmar que existe el comprobante de otra persona.
  if (!allowed) throw notFound()

  const image = row.fileKey ? await receiptStore.get(row.fileKey) : null
  if (!image) throw notFound()

  setResponseHeaders(event, {
    'Content-Type': image.type,
    'Content-Length': String(image.bytes.length),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  return image.bytes
})
