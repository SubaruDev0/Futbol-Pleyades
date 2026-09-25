import { sql } from 'drizzle-orm'
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

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

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  // Transfer details. Exposed only to players of a match this user collects for,
  // so an account number stops being a message pinned in a group chat.
  paymentAlias: text('payment_alias'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
  // "la 5 tiene hoyos", "la 1 tiene mejor pasto" — this knowledge lived in
  // people's heads and got re-argued before every booking.
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  kickoffAt: timestamp('kickoff_at', { withTimezone: true }).notNull(),
  venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'set null' }),
  fieldLabel: text('field_label'),
  format: matchFormat('format').notNull(),
  capacity: integer('capacity').notNull(),
  // Chilean pesos: whole units, never fractional.
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
    // Null for a guest brought by a member who has no account of their own.
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

export type User = typeof users.$inferSelect
export type Group = typeof groups.$inferSelect
export type Venue = typeof venues.$inferSelect
export type Match = typeof matches.$inferSelect
export type MatchPlayer = typeof matchPlayers.$inferSelect
