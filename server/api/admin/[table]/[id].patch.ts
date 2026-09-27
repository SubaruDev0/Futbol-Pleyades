import { eq, sql } from 'drizzle-orm'

/** Edita solo los campos de ADMIN_EDIT; cada tabla tiene su propio schema zod. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const table = adminTableParam(event)
  const id = groupIdParam(event)
  const db = useDb()
  const s = schema
  const E = ADMIN_EDIT

  const updated = await (async (): Promise<{ id: string }[]> => {
    switch (table) {
      case 'users': {
        const v = await readValidatedBody(event, E.users.schema.parse)
        return db.update(s.users).set(v).where(eq(s.users.id, id)).returning({ id: s.users.id })
      }
      case 'groups': {
        const v = await readValidatedBody(event, E.groups.schema.parse)
        return db.update(s.groups).set(v).where(eq(s.groups.id, id)).returning({ id: s.groups.id })
      }
      case 'group_members': {
        const v = await readValidatedBody(event, E.group_members.schema.parse)
        return db.update(s.groupMembers).set(v).where(eq(s.groupMembers.id, id)).returning({ id: s.groupMembers.id })
      }
      case 'venues': {
        const v = await readValidatedBody(event, E.venues.schema.parse)
        return db.update(s.venues).set(v).where(eq(s.venues.id, id)).returning({ id: s.venues.id })
      }
      case 'matches': {
        const v = await readValidatedBody(event, E.matches.schema.parse)
        return db.update(s.matches).set(v).where(eq(s.matches.id, id)).returning({ id: s.matches.id })
      }
      case 'match_players': {
        const { paid, ...v } = await readValidatedBody(event, E.match_players.schema.parse)
        const mp = s.matchPlayers
        // Guardar "pagado" otra vez no mueve la fecha en que se pagó.
        const paidPatch = paid === undefined
          ? {}
          : { paid, paidAt: paid ? sql`coalesce(${mp.paidAt}, now())` : null }
        return db.update(mp).set({ ...v, ...paidPatch }).where(eq(mp.id, id)).returning({ id: mp.id })
      }
      case 'payment_receipts': {
        const v = await readValidatedBody(event, E.payment_receipts.schema.parse)
        return db
          .update(s.paymentReceipts)
          .set(v)
          .where(eq(s.paymentReceipts.id, id))
          .returning({ id: s.paymentReceipts.id })
      }
      default:
        throw createError({ statusCode: 405, statusMessage: 'Esta tabla no se edita desde aquí' })
    }
  })().catch((e: { code?: string, cause?: { code?: string } }) => {
    // payment_receipts_one_pending: solo puede haber un comprobante pendiente por jugador.
    if ((e?.code ?? e?.cause?.code) === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Ese cambio choca con otra fila (valor único repetido)' })
    }
    throw e
  })

  if (!updated.length) throw createError({ statusCode: 404, statusMessage: 'No encontrado' })
  return { updated: true }
})
