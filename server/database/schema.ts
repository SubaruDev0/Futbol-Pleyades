import { sql } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { ACCOUNT_TYPES } from '../../shared/utils/bank-account'
import type { AvatarCrop } from '../../shared/utils/avatar-crop'

export const matchFormat = pgEnum('match_format', ['f5', 'f6', 'f7', 'libre'])
export const matchStatus = pgEnum('match_status', [
  'borrador',
  'convocado',
  'confirmado',
  'cancelado',
  'jugado',
])
export const rsvpStatus = pgEnum('rsvp_status', ['voy', 'no_voy', 'quizas'])
export const kit = pgEnum('kit', ['oscuro', 'claro'])
export const memberRole = pgEnum('member_role', ['organizador', 'jugador'])
export const receiptStatus = pgEnum('receipt_status', ['pendiente', 'aceptado', 'rechazado'])
export const accountType = pgEnum('account_type', ACCOUNT_TYPES)

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  // El original reducido y su encuadre, para que "Editar foto" vuelva a recortar desde ahí.
  avatarSourceUrl: text('avatar_source_url'),
  avatarCrop: jsonb('avatar_crop').$type<AvatarCrop>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Datos de transferencia. Expuestos solo a jugadores de un partido donde este
// usuario cobra, para que un número de cuenta deje de ser un mensaje fijado en un chat grupal.
export const paymentAccounts = pgTable('payment_accounts', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  holderName: text('holder_name').notNull(),
  // Normalizado "21347032-9", K en mayúscula.
  rut: text('rut').notNull(),
  // Un código de shared/utils/bank-account.ts, no un enum: la lista de
  // instituciones cambia más seguido de lo que debería cambiar el schema.
  bank: text('bank').notNull(),
  accountType: accountType('account_type').notNull(),
  accountNumber: text('account_number').notNull(),
  email: text('email'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  defaultFormat: matchFormat('default_format').notNull().default('f7'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const groupMembers = pgTable(
  'group_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: memberRole('role').notNull().default('jugador'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [uniqueIndex('group_members_unique').on(table.groupId, table.userId)],
)

export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address'),
  mapsUrl: text('maps_url'),
  // "la 5 tiene hoyos", "la 1 tiene mejor pasto" — este conocimiento vivía en
  // la cabeza de la gente y se discutía de nuevo antes de cada reserva.
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  // "fushipelota-29-sep-18h": URLs legibles; el id también sigue resolviendo.
  slug: text('slug').notNull().unique(),
  kickoffAt: timestamp('kickoff_at', { withTimezone: true }).notNull(),
  venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'set null' }),
  fieldLabel: text('field_label'),
  format: matchFormat('format').notNull(),
  capacity: integer('capacity').notNull(),
  // Pesos chilenos: unidades enteras, nunca fraccionarias.
  totalCost: integer('total_cost'),
  collectorUserId: uuid('collector_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  status: matchStatus('status').notNull().default('convocado'),
  notes: text('notes'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const matchPlayers = pgTable(
  'match_players',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    // Null para un invitado traído por un miembro que no tiene cuenta propia.
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    guestName: text('guest_name'),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    status: rsvpStatus('status').notNull(),
    kit: kit('kit'),
    paid: boolean('paid').notNull().default(false),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    respondedAt: timestamp('responded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex('match_players_unique_user')
      .on(table.matchId, table.userId)
      .where(sql`${table.userId} is not null`),
  ],
)

// Una captura de transferencia que quien cobra revisa antes de contar a un
// jugador como pagado. El archivo en sí vive en el almacén privado de comprobantes, nunca en una ruta pública.
export const paymentReceipts = pgTable(
  'payment_receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchPlayerId: uuid('match_player_id')
      .notNull()
      .references(() => matchPlayers.id, { onDelete: 'cascade' }),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    fileKey: text('file_key').notNull(),
    contentType: text('content_type').notNull(),
    status: receiptStatus('status').notNull().default('pendiente'),
    rejectReason: text('reject_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  },
  table => [
    // Una subida nueva reemplaza a la pendiente, así la revisión nunca ve dos a la vez.
    uniqueIndex('payment_receipts_one_pending')
      .on(table.matchPlayerId)
      .where(sql`${table.status} = 'pendiente'`),
  ],
)

export type User = typeof users.$inferSelect
export type PaymentAccountRow = typeof paymentAccounts.$inferSelect
export type Group = typeof groups.$inferSelect
export type Venue = typeof venues.$inferSelect
export type Match = typeof matches.$inferSelect
export type MatchPlayer = typeof matchPlayers.$inferSelect
export type PaymentReceipt = typeof paymentReceipts.$inferSelect
