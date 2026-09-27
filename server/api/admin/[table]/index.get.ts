import { desc, eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

const LIMIT = 500

/** Filas de una tabla para el panel, con nombres legibles en vez de ids donde sale barato. Nunca password_hash. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const table = adminTableParam(event)
  const db = useDb()
  const s = schema
  const creator = alias(s.users, 'creator')
  const inviter = alias(s.users, 'inviter')
  const uploader = alias(s.users, 'uploader')

  const rows = await (async (): Promise<Record<string, unknown>[]> => {
    switch (table) {
      case 'users':
        return db
          .select({
            id: s.users.id,
            name: s.users.name,
            phone: s.users.phone,
            hasAvatar: sql<boolean>`${s.users.avatarUrl} is not null`,
            groups: sql<number>`(select count(*)::int from ${s.groupMembers} where ${s.groupMembers.userId} = ${s.users.id})`,
            createdAt: s.users.createdAt,
          })
          .from(s.users)
          .orderBy(desc(s.users.createdAt))
          .limit(LIMIT)

      case 'groups':
        return db
          .select({
            id: s.groups.id,
            name: s.groups.name,
            inviteCode: s.groups.inviteCode,
            defaultFormat: s.groups.defaultFormat,
            members: sql<number>`(select count(*)::int from ${s.groupMembers} where ${s.groupMembers.groupId} = ${s.groups.id})`,
            createdByName: creator.name,
            createdAt: s.groups.createdAt,
          })
          .from(s.groups)
          .leftJoin(creator, eq(creator.id, s.groups.createdBy))
          .orderBy(desc(s.groups.createdAt))
          .limit(LIMIT)

      case 'group_members':
        return db
          .select({
            id: s.groupMembers.id,
            groupName: s.groups.name,
            userName: s.users.name,
            userPhone: s.users.phone,
            role: s.groupMembers.role,
            joinedAt: s.groupMembers.joinedAt,
          })
          .from(s.groupMembers)
          .innerJoin(s.groups, eq(s.groups.id, s.groupMembers.groupId))
          .innerJoin(s.users, eq(s.users.id, s.groupMembers.userId))
          .orderBy(desc(s.groupMembers.joinedAt))
          .limit(LIMIT)

      case 'venues':
        return db
          .select({
            id: s.venues.id,
            name: s.venues.name,
            address: s.venues.address,
            mapsUrl: s.venues.mapsUrl,
            notes: s.venues.notes,
            createdAt: s.venues.createdAt,
          })
          .from(s.venues)
          .orderBy(desc(s.venues.createdAt))
          .limit(LIMIT)

      case 'matches':
        return db
          .select({
            id: s.matches.id,
            slug: s.matches.slug,
            groupName: s.groups.name,
            kickoffAt: s.matches.kickoffAt,
            venueName: s.venues.name,
            fieldLabel: s.matches.fieldLabel,
            format: s.matches.format,
            capacity: s.matches.capacity,
            totalCost: s.matches.totalCost,
            status: s.matches.status,
            notes: s.matches.notes,
            createdByName: creator.name,
            createdAt: s.matches.createdAt,
          })
          .from(s.matches)
          .innerJoin(s.groups, eq(s.groups.id, s.matches.groupId))
          .leftJoin(s.venues, eq(s.venues.id, s.matches.venueId))
          .leftJoin(creator, eq(creator.id, s.matches.createdBy))
          .orderBy(desc(s.matches.createdAt))
          .limit(LIMIT)

      case 'match_players':
        return db
          .select({
            id: s.matchPlayers.id,
            matchSlug: s.matches.slug,
            playerName: sql<string>`coalesce(${s.users.name}, ${s.matchPlayers.guestName})`,
            guest: sql<boolean>`${s.matchPlayers.userId} is null`,
            invitedByName: inviter.name,
            status: s.matchPlayers.status,
            kit: s.matchPlayers.kit,
            paid: s.matchPlayers.paid,
            respondedAt: s.matchPlayers.respondedAt,
          })
          .from(s.matchPlayers)
          .innerJoin(s.matches, eq(s.matches.id, s.matchPlayers.matchId))
          .leftJoin(s.users, eq(s.users.id, s.matchPlayers.userId))
          .leftJoin(inviter, eq(inviter.id, s.matchPlayers.invitedBy))
          .orderBy(desc(s.matchPlayers.respondedAt))
          .limit(LIMIT)

      case 'payment_accounts':
        return db
          .select({
            id: s.paymentAccounts.userId,
            userName: s.users.name,
            holderName: s.paymentAccounts.holderName,
            rut: s.paymentAccounts.rut,
            bank: s.paymentAccounts.bank,
            accountType: s.paymentAccounts.accountType,
            accountNumber: s.paymentAccounts.accountNumber,
            email: s.paymentAccounts.email,
            updatedAt: s.paymentAccounts.updatedAt,
          })
          .from(s.paymentAccounts)
          .innerJoin(s.users, eq(s.users.id, s.paymentAccounts.userId))
          .orderBy(desc(s.paymentAccounts.updatedAt))
          .limit(LIMIT)

      case 'payment_receipts':
        return db
          .select({
            id: s.paymentReceipts.id,
            matchSlug: s.matches.slug,
            playerName: sql<string>`coalesce(${s.users.name}, ${s.matchPlayers.guestName})`,
            uploadedByName: uploader.name,
            status: s.paymentReceipts.status,
            rejectReason: s.paymentReceipts.rejectReason,
            createdAt: s.paymentReceipts.createdAt,
            reviewedAt: s.paymentReceipts.reviewedAt,
          })
          .from(s.paymentReceipts)
          .innerJoin(s.matchPlayers, eq(s.matchPlayers.id, s.paymentReceipts.matchPlayerId))
          .innerJoin(s.matches, eq(s.matches.id, s.matchPlayers.matchId))
          .leftJoin(s.users, eq(s.users.id, s.matchPlayers.userId))
          .leftJoin(uploader, eq(uploader.id, s.paymentReceipts.uploadedBy))
          .orderBy(desc(s.paymentReceipts.createdAt))
          .limit(LIMIT)
    }
  })()

  return { rows, fields: adminFields(table), limit: LIMIT }
})
