import type { H3Event } from 'h3'
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
