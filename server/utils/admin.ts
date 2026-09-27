import { z } from 'zod'
import type { H3Event } from 'h3'
import { isAdminTable } from '../../shared/utils/admin-tables'
import type { AdminField, AdminTable } from '../../shared/utils/admin-tables'

/** Igual que databaseUrl en db.ts: NUXT_ADMIN_PHONE o ADMIN_PHONE, normalizado como en el registro. */
function adminPhone(): string | null {
  const raw = useRuntimeConfig().adminPhone || process.env.ADMIN_PHONE || ''
  return raw ? normalizePhone(raw) : null
}

export function isAdminPhone(phone: string | null | undefined): boolean {
  const admin = adminPhone()
  return !!admin && !!phone && normalizePhone(phone) === admin
}

/** Solo la cuenta dueña. Para cualquier otra, el panel no existe: 404, no 403. */
export async function requireAdmin(event: H3Event) {
  const session = await requireUserSession(event)
  if (!isAdminPhone(session.user.phone)) {
    throw createError({ statusCode: 404, statusMessage: 'No encontrado' })
  }
  return session.user
}

export function adminTableParam(event: H3Event): AdminTable {
  const key = getRouterParam(event, 'table') ?? ''
  if (!isAdminTable(key)) throw createError({ statusCode: 404, statusMessage: 'No encontrado' })
  return key
}

const text = (min: number, max: number) => z.string().trim().min(min).max(max)
const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().transform(v => v || null)

// Vacío no es un cambio: sin esto Drizzle falla con "No values to set".
const patch = <S extends z.ZodRawShape>(shape: S) =>
  z.object(shape).partial().strict().refine(v => Object.values(v).some(x => x !== undefined), 'Nada que guardar')

/** Lo único que el panel puede editar, tabla por tabla. payment_accounts no está: solo se borra. */
export const ADMIN_EDIT = {
  users: {
    schema: patch({ name: text(2, 40) }),
    fields: [{ key: 'name', kind: 'text' }],
  },
  groups: {
    schema: patch({ name: text(2, 60), defaultFormat: z.enum(schema.matchFormat.enumValues) }),
    fields: [
      { key: 'name', kind: 'text' },
      { key: 'defaultFormat', kind: 'select', options: schema.matchFormat.enumValues },
    ],
  },
  group_members: {
    schema: patch({ role: z.enum(schema.memberRole.enumValues) }),
    fields: [{ key: 'role', kind: 'select', options: schema.memberRole.enumValues }],
  },
  venues: {
    schema: patch({
      name: text(2, 60),
      address: nullableText(120),
      mapsUrl: nullableText(500).pipe(z.url().nullable()),
      notes: nullableText(300),
    }),
    fields: [
      { key: 'name', kind: 'text' },
      { key: 'address', kind: 'text', nullable: true },
      { key: 'mapsUrl', kind: 'text', nullable: true },
      { key: 'notes', kind: 'textarea', nullable: true },
    ],
  },
  matches: {
    schema: patch({
      status: z.enum(schema.matchStatus.enumValues),
      kickoffAt: z.iso.datetime({ offset: true }).transform(v => new Date(v)),
      fieldLabel: nullableText(60),
      capacity: z.number().int().min(2).max(40),
      totalCost: z.number().int().min(0).max(100_000_000).nullable(),
      notes: nullableText(500),
    }),
    fields: [
      { key: 'status', kind: 'select', options: schema.matchStatus.enumValues },
      { key: 'kickoffAt', kind: 'datetime' },
      { key: 'fieldLabel', kind: 'text', nullable: true },
      { key: 'capacity', kind: 'number' },
      { key: 'totalCost', kind: 'number', nullable: true },
      { key: 'notes', kind: 'textarea', nullable: true },
    ],
  },
  match_players: {
    schema: patch({
      status: z.enum(schema.rsvpStatus.enumValues),
      kit: z.enum(schema.kit.enumValues).nullable(),
      paid: z.boolean(),
    }),
    fields: [
      { key: 'status', kind: 'select', options: schema.rsvpStatus.enumValues },
      { key: 'kit', kind: 'select', options: schema.kit.enumValues, nullable: true },
      { key: 'paid', kind: 'switch' },
    ],
  },
  payment_receipts: {
    schema: patch({
      status: z.enum(schema.receiptStatus.enumValues),
      rejectReason: nullableText(200),
    }),
    fields: [
      { key: 'status', kind: 'select', options: schema.receiptStatus.enumValues },
      { key: 'rejectReason', kind: 'textarea', nullable: true },
    ],
  },
} satisfies Partial<Record<AdminTable, { schema: z.ZodType, fields: AdminField[] }>>

export const adminFields = (table: AdminTable): AdminField[] =>
  (ADMIN_EDIT as Partial<Record<AdminTable, { fields: AdminField[] }>>)[table]?.fields ?? []
