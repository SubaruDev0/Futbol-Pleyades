import { eq, sql } from 'drizzle-orm'

type AdminCounts = Partial<DeletionCounts> & {
  members?: number
  memberships?: number
  reassignedGroups?: number
  reassignedMatches?: number
}

const notFound = () => createError({ statusCode: 404, statusMessage: 'No encontrado' })

/**
 * Borra una fila con lo que cuelga de ella, igual que los deletes del resto de
 * la app: se lee todo primero, se escribe en un solo `atomically` y los archivos
 * se sueltan después del commit. `?dryRun=1` solo cuenta.
 */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const table = adminTableParam(event)
  const id = groupIdParam(event)
  const dryRun = isDryRun(event)
  const db = useDb()
  const s = schema
  const count = sql<number>`count(*)::int`

  switch (table) {
    case 'users': {
      if (id === admin.id) {
        throw createError({ statusCode: 400, statusMessage: 'No puedes borrar tu propia cuenta desde aquí' })
      }
      const [target] = await db
        .select({ avatarUrl: s.users.avatarUrl, avatarSourceUrl: s.users.avatarSourceUrl })
        .from(s.users)
        .where(eq(s.users.id, id))
        .limit(1)
      if (!target) throw notFound()

      const [playerRows, [memberships], [groups], [matches]] = await Promise.all([
        db.select({ id: s.matchPlayers.id }).from(s.matchPlayers).where(eq(s.matchPlayers.userId, id)),
        db.select({ n: count }).from(s.groupMembers).where(eq(s.groupMembers.userId, id)),
        db.select({ n: count }).from(s.groups).where(eq(s.groups.createdBy, id)),
        db.select({ n: count }).from(s.matches).where(eq(s.matches.createdBy, id)),
      ])
      const footprint = await playerRowsFootprint({ playerIds: playerRows.map(r => r.id) })
      const counts: AdminCounts = {
        players: footprint.players,
        receipts: footprint.receipts,
        memberships: memberships?.n ?? 0,
        reassignedGroups: groups?.n ?? 0,
        reassignedMatches: matches?.n ?? 0,
      }
      if (dryRun) return { dryRun: true, counts }

      // created_by es ON DELETE RESTRICT: grupos y partidos pasan a la cuenta admin.
      // Membresías, anotaciones (con sus comprobantes) y datos de pago caen por cascada.
      await atomically(tx => [
        tx.update(s.groups).set({ createdBy: admin.id }).where(eq(s.groups.createdBy, id)),
        tx.update(s.matches).set({ createdBy: admin.id }).where(eq(s.matches.createdBy, id)),
        tx.delete(s.users).where(eq(s.users.id, id)),
      ])
      await dropReceiptFiles(footprint.fileKeys)
      await dropAvatarFiles(target.avatarUrl, target.avatarSourceUrl)
      return { deleted: true, counts }
    }

    case 'groups': {
      const [group] = await db.select({ id: s.groups.id }).from(s.groups).where(eq(s.groups.id, id)).limit(1)
      if (!group) throw notFound()
      const [matchRows, [members]] = await Promise.all([
        db.select({ id: s.matches.id }).from(s.matches).where(eq(s.matches.groupId, id)),
        db.select({ n: count }).from(s.groupMembers).where(eq(s.groupMembers.groupId, id)),
      ])
      const matchIds = matchRows.map(m => m.id)
      const footprint = await playerRowsFootprint({ matchIds })
      const counts: AdminCounts = {
        matches: matchIds.length,
        players: footprint.players,
        guests: footprint.guests,
        receipts: footprint.receipts,
        members: members?.n ?? 0,
      }
      if (dryRun) return { dryRun: true, counts }

      await atomically(tx => [
        ...(matchIds.length ? deletePlayerRows(tx, { matchIds }) : []),
        tx.delete(s.matches).where(eq(s.matches.groupId, id)),
        tx.delete(s.groupMembers).where(eq(s.groupMembers.groupId, id)),
        tx.delete(s.groups).where(eq(s.groups.id, id)),
      ])
      await dropReceiptFiles(footprint.fileKeys)
      return { deleted: true, counts }
    }

    case 'matches': {
      const [match] = await db.select({ id: s.matches.id }).from(s.matches).where(eq(s.matches.id, id)).limit(1)
      if (!match) throw notFound()
      const footprint = await playerRowsFootprint({ matchIds: [id] })
      const counts: AdminCounts = {
        matches: 1,
        players: footprint.players,
        guests: footprint.guests,
        receipts: footprint.receipts,
      }
      if (dryRun) return { dryRun: true, counts }

      await atomically(tx => [
        ...deletePlayerRows(tx, { matchIds: [id] }),
        tx.delete(s.matches).where(eq(s.matches.id, id)),
      ])
      await dropReceiptFiles(footprint.fileKeys)
      return { deleted: true, counts }
    }

    case 'match_players': {
      const footprint = await playerRowsFootprint({ playerIds: [id] })
      if (!footprint.players) throw notFound()
      const counts: AdminCounts = {
        players: footprint.players,
        guests: footprint.guests,
        receipts: footprint.receipts,
      }
      if (dryRun) return { dryRun: true, counts }

      await atomically(tx => [...deletePlayerRows(tx, { playerIds: [id] })])
      await dropReceiptFiles(footprint.fileKeys)
      return { deleted: true, counts }
    }

    case 'payment_receipts': {
      const pr = s.paymentReceipts
      const [receipt] = await db.select({ fileKey: pr.fileKey }).from(pr).where(eq(pr.id, id)).limit(1)
      if (!receipt) throw notFound()
      const counts: AdminCounts = { receipts: 1 }
      if (dryRun) return { dryRun: true, counts }

      await atomically(tx => [tx.delete(pr).where(eq(pr.id, id))])
      await dropReceiptFiles(receipt.fileKey ? [receipt.fileKey] : [])
      return { deleted: true, counts }
    }

    case 'group_members': {
      const gm = s.groupMembers
      const [row] = await db.select({ id: gm.id }).from(gm).where(eq(gm.id, id)).limit(1)
      if (!row) throw notFound()
      if (dryRun) return { dryRun: true, counts: {} as AdminCounts }
      await atomically(tx => [tx.delete(gm).where(eq(gm.id, id))])
      return { deleted: true, counts: {} as AdminCounts }
    }

    case 'venues': {
      const [row] = await db.select({ id: s.venues.id }).from(s.venues).where(eq(s.venues.id, id)).limit(1)
      if (!row) throw notFound()
      if (dryRun) return { dryRun: true, counts: {} as AdminCounts }
      // matches.venue_id es ON DELETE SET NULL: los partidos quedan sin cancha, no se borran.
      await atomically(tx => [tx.delete(s.venues).where(eq(s.venues.id, id))])
      return { deleted: true, counts: {} as AdminCounts }
    }

    case 'payment_accounts': {
      const pa = s.paymentAccounts
      const [row] = await db.select({ id: pa.userId }).from(pa).where(eq(pa.userId, id)).limit(1)
      if (!row) throw notFound()
      if (dryRun) return { dryRun: true, counts: {} as AdminCounts }
      await atomically(tx => [tx.delete(pa).where(eq(pa.userId, id))])
      return { deleted: true, counts: {} as AdminCounts }
    }
  }
})
