import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import type { Match, MatchPlayer } from '../database/schema'

/** Comprobantes de transferencia: archivos privados, servidos solo a través de la ruta de imagen autenticada. */
export const receiptStore = createImageStore('receipts')

const MB = 1024 * 1024
export const RECEIPT_MAX_BYTES = 3 * MB

/**
 * Quién cobra los pagos. Quien cobra recibe el dinero, así que solo esa
 * persona revisa comprobantes y marca jugadores como pagados; cuando un
 * partido no tiene quien cobre, el organizador (canManage) conserva el toggle
 * manual de pagado, pero todavía nadie puede subir un comprobante.
 */
export function canSettlePayments(match: Match, userId: string, canManage: boolean): boolean {
  return match.collectorUserId ? match.collectorUserId === userId : canManage
}

/** La persona responsable de una fila: el jugador mismo, o quien trajo al invitado. */
export function paysFor(player: Pick<MatchPlayer, 'userId' | 'invitedBy'>, userId: string): boolean {
  return player.userId ? player.userId === userId : player.invitedBy === userId
}

export async function readReceiptUpload(event: H3Event) {
  const declared = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (declared > RECEIPT_MAX_BYTES + 64 * 1024) {
    throw createError({ statusCode: 413, statusMessage: 'El comprobante pesa más de 3 MB' })
  }

  const parts = (await readMultipartFormData(event)) ?? []
  const file = parts.find(p => p.name === 'file')
  if (!file?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No llegó ninguna imagen' })
  }
  if (file.data.length > RECEIPT_MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'El comprobante pesa más de 3 MB' })
  }
  const type = sniffImageType(file.data)
  if (!type) {
    throw createError({ statusCode: 415, statusMessage: 'El comprobante debe ser JPG, PNG o WebP' })
  }
  return { bytes: file.data as Uint8Array, type }
}

/**
 * La fila que quien llama puede pagar, con todas las reglas que comparten
 * subir una imagen y avisar que se pagó por otro medio.
 */
export async function requirePayableRow(event: H3Event) {
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
  return { db, user, player }
}

/**
 * Deja `values` como el único comprobante pendiente de la fila. Una subida nueva
 * reemplaza a la pendiente: ese archivo ya no es de nadie para revisar.
 */
export async function replacePendingReceipt(
  db: ReturnType<typeof useDb>,
  playerId: string,
  values: { uploadedBy: string, fileKey: string | null, contentType: string | null },
) {
  const superseded = await db
    .delete(schema.paymentReceipts)
    .where(
      and(
        eq(schema.paymentReceipts.matchPlayerId, playerId),
        eq(schema.paymentReceipts.status, 'pendiente'),
      ),
    )
    .returning({ fileKey: schema.paymentReceipts.fileKey })

  let receipt
  try {
    [receipt] = await db
      .insert(schema.paymentReceipts)
      .values({ matchPlayerId: playerId, ...values })
      .returning({
        id: schema.paymentReceipts.id,
        status: schema.paymentReceipts.status,
        createdAt: schema.paymentReceipts.createdAt,
      })
  }
  catch {
    // Dos envíos compitieron pasando el delete; el índice único parcial se quedó con uno.
    if (values.fileKey) await receiptStore.remove(values.fileKey).catch(() => {})
    throw createError({ statusCode: 409, statusMessage: 'Ya hay un comprobante en revisión' })
  }

  for (const old of superseded) if (old.fileKey) await receiptStore.remove(old.fileKey).catch(() => {})
  return receipt
}
