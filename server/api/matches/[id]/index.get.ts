import { asc, desc, eq, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const { match, canManage } = await requireMatchAccess(id, user.id)

  const db = useDb()
  const collector = alias(schema.users, 'collector')

  const [detail] = await db
    .select({
      match: schema.matches,
      venue: schema.venues,
      collectorName: collector.name,
      collectorPhone: collector.phone,
      collectorAccount: {
        holderName: schema.paymentAccounts.holderName,
        rut: schema.paymentAccounts.rut,
        bank: schema.paymentAccounts.bank,
        accountType: schema.paymentAccounts.accountType,
        accountNumber: schema.paymentAccounts.accountNumber,
        email: schema.paymentAccounts.email,
      },
    })
    .from(schema.matches)
    .leftJoin(schema.venues, eq(schema.venues.id, schema.matches.venueId))
    .leftJoin(collector, eq(collector.id, schema.matches.collectorUserId))
    .leftJoin(
      schema.paymentAccounts,
      eq(schema.paymentAccounts.userId, schema.matches.collectorUserId),
    )
    .where(eq(schema.matches.id, id))
    .limit(1)

  const players = await db
    .select({
      id: schema.matchPlayers.id,
      userId: schema.matchPlayers.userId,
      name: schema.users.name,
      avatarUrl: schema.users.avatarUrl,
      guestName: schema.matchPlayers.guestName,
      invitedBy: schema.matchPlayers.invitedBy,
      status: schema.matchPlayers.status,
      kit: schema.matchPlayers.kit,
      linkGroup: schema.matchPlayers.linkGroup,
      paid: schema.matchPlayers.paid,
      spectatorPays: schema.matchPlayers.spectatorPays,
      respondedAt: schema.matchPlayers.respondedAt,
    })
    .from(schema.matchPlayers)
    .leftJoin(schema.users, eq(schema.users.id, schema.matchPlayers.userId))
    .where(eq(schema.matchPlayers.matchId, id))
    .orderBy(asc(schema.matchPlayers.respondedAt))

  const payers = players.filter(sharesCost)
  const canSettle = canSettlePayments(match, user.id, canManage)

  // El último comprobante por fila. Solo uno abierto (pendiente o rechazado) dice
  // algo que la bandera "paid" no dice; una vez pagado, la bandera es la verdad.
  const receipts = players.length
    ? await db
      .select({
        id: schema.paymentReceipts.id,
        matchPlayerId: schema.paymentReceipts.matchPlayerId,
        status: schema.paymentReceipts.status,
        rejectReason: schema.paymentReceipts.rejectReason,
        createdAt: schema.paymentReceipts.createdAt,
      })
      .from(schema.paymentReceipts)
      .where(inArray(schema.paymentReceipts.matchPlayerId, players.map(p => p.id)))
      .orderBy(desc(schema.paymentReceipts.createdAt))
    : []
  const latest = new Map<string, (typeof receipts)[number]>()
  for (const r of receipts) if (!latest.has(r.matchPlayerId)) latest.set(r.matchPlayerId, r)

  const receiptFor = (p: (typeof players)[number]) => {
    const r = latest.get(p.id)
    if (!r || p.paid || r.status === 'aceptado') return null
    // Cualquiera puede ver que un pago está en revisión; el comprobante en sí y un
    // rechazo quedan solo entre quien paga y quien cobra.
    if (canSettle || paysFor(p, user.id)) return r
    return r.status === 'pendiente'
      ? { id: null, matchPlayerId: r.matchPlayerId, status: r.status, rejectReason: null, createdAt: r.createdAt }
      : null
  }
  const withReceipts = players.map(p => ({ ...p, receipt: receiptFor(p) }))

  const pendingReceipts = canSettle
    ? withReceipts
      .filter(p => p.receipt?.status === 'pendiente')
      .map(p => ({
        receiptId: p.receipt!.id!,
        playerId: p.id,
        name: p.name ?? p.guestName ?? 'Sin nombre',
        guest: !p.userId,
        createdAt: p.receipt!.createdAt,
      }))
    : []

  // Los datos de transferencia llegan solo a quienes juegan este partido (y a
  // quien cobra), nunca a todos los miembros del grupo.
  const isPaying = players.some(p => p.userId === user.id && (p.status === 'voy' || p.status === 'quizas' || sharesCost(p)))
  const canSeeAccount = isPaying || match.collectorUserId === user.id

  return {
    ...detail,
    collectorAccount: canSeeAccount ? detail?.collectorAccount ?? null : null,
    collectorPhone: canSeeAccount ? detail?.collectorPhone ?? null : null,
    match,
    canManage,
    canSettle,
    players: withReceipts,
    pendingReceipts,
    // La división que el chat recalculaba a mano cada vez.
    perPlayer:
      match.totalCost && payers.length ? Math.ceil(match.totalCost / payers.length) : null,
  }
})
