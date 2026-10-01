import { and, eq, inArray, sql } from 'drizzle-orm'

/** Lo que un delete se llevaría con él: se muestra en la confirmación antes de que nada se borre. */
export interface DeletionCounts {
  matches: number
  players: number
  guests: number
  receipts: number
}

/** `?dryRun=1` pide solo los conteos. */
export const isDryRun = (event: Parameters<typeof getQuery>[0]) =>
  ['1', 'true'].includes(String(getQuery(event).dryRun ?? ''))

/** Conteos y claves de archivo de comprobantes para un conjunto de filas match_players (por partido o por fila). */
export async function playerRowsFootprint(where: { matchIds?: string[], playerIds?: string[] }) {
  const { matchIds = [], playerIds = [] } = where
  if (!matchIds.length && !playerIds.length) {
    return { players: 0, guests: 0, receipts: 0, fileKeys: [] as string[] }
  }
  const mp = schema.matchPlayers
  const filter = matchIds.length ? inArray(mp.matchId, matchIds) : inArray(mp.id, playerIds)
  const db = useDb()

  const [[rows], receipts] = await Promise.all([
    db
      .select({
        players: sql<number>`count(*)::int`,
        guests: sql<number>`count(*) filter (where ${mp.userId} is null)::int`,
      })
      .from(mp)
      .where(filter),
    db
      .select({ fileKey: schema.paymentReceipts.fileKey })
      .from(schema.paymentReceipts)
      .innerJoin(mp, eq(mp.id, schema.paymentReceipts.matchPlayerId))
      .where(filter),
  ])

  return {
    players: rows?.players ?? 0,
    guests: rows?.guests ?? 0,
    receipts: receipts.length,
    fileKeys: receipts.flatMap(r => (r.fileKey ? [r.fileKey] : [])),
  }
}

/**
 * Elimina las imágenes de comprobantes una vez que sus filas ya no existen.
 * Corre después de que la transacción hace commit: un archivo que queda atrás
 * es inofensivo, una fila que apunta a un archivo faltante no lo es. Un fallo
 * se registra en el log y nunca hace fallar la solicitud que ya eliminó los datos.
 */
export async function dropReceiptFiles(keys: string[]) {
  for (const key of keys) {
    try {
      await receiptStore.remove(key)
    }
    catch (e) {
      console.error(`[delete] could not remove receipt file ${key}:`, e)
    }
  }
}

/** Sentencias que eliminan filas match_players (y sus comprobantes) en orden de FK. */
export function deletePlayerRows(db: ReturnType<typeof useDb>, where: { matchIds?: string[], playerIds?: string[] }) {
  const mp = schema.matchPlayers
  const filter = where.matchIds?.length
    ? inArray(mp.matchId, where.matchIds)
    : inArray(mp.id, where.playerIds ?? [])
  const owned = db.select({ id: mp.id }).from(mp).where(filter)
  return [
    db.delete(schema.paymentReceipts).where(inArray(schema.paymentReceipts.matchPlayerId, owned)),
    db.delete(mp).where(filter),
  ] as const
}

/** Organizador del grupo, o 404 cuando ni siquiera es miembro. */
export async function requireOrganizer(groupId: string, userId: string) {
  const membership = await requireMembership(groupId, userId)
  if (membership.role !== 'organizador') {
    throw createError({ statusCode: 403, statusMessage: 'Solo un organizador puede hacer esto' })
  }
  return membership
}

export const groupIdParam = (event: Parameters<typeof getRouterParam>[0]) => {
  const id = getRouterParam(event, 'id') ?? ''
  // Un id malformado sería un 500 de Postgres; para quien llama, simplemente no está.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'No encontrado' })
  }
  return id
}

export const memberOf = (groupId: string, userId: string) =>
  and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, userId))
