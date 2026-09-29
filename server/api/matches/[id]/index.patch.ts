import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

const body = z
  .object({
    kickoffAt: z.coerce.date(),
    status: z.enum(['convocado', 'confirmado']),
    venueId: z.uuid().nullable(),
    fieldLabel: z.string().trim().max(40).nullable(),
    format: z.enum(['f5', 'f6', 'f7', 'libre']),
    totalCost: z.number().int().min(0).max(10_000_000).nullable(),
    collectorUserId: z.uuid().nullable(),
  })
  .partial()
  .refine(v => Object.values(v).some(x => x !== undefined), 'Nada que guardar')

/** El día, la hora, la cancha y demás detalles se negocian entre el grupo antes de cerrarse:
 *  quien organiza los ajusta y marca el partido "confirmado" (verde) o lo deja "por confirmar"
 *  (amarillo). */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = await matchIdParam(event)
  const { match, canManage } = await requireMatchAccess(id, user.id)
  if (!canManage) {
    throw createError({ statusCode: 403, statusMessage: 'Solo quien organiza puede editar el partido' })
  }
  if (match.status === 'cancelado' || match.status === 'jugado') {
    throw createError({ statusCode: 409, statusMessage: 'Este partido ya está cerrado' })
  }

  const patch = await readValidatedBody(event, body.parse)
  const db = useDb()
  await db.update(schema.matches).set(patch).where(eq(schema.matches.id, id))

  // Quien pasa a cobrar no se paga a sí mismo: si ya estaba anotado, queda pagado.
  if (patch.collectorUserId && patch.collectorUserId !== match.collectorUserId) {
    await db.update(schema.matchPlayers)
      .set({ paid: true })
      .where(and(eq(schema.matchPlayers.matchId, id), eq(schema.matchPlayers.userId, patch.collectorUserId)))
  }

  return { ok: true }
})
