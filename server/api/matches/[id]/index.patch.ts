import { z } from 'zod'
import { eq } from 'drizzle-orm'

const body = z
  .object({
    kickoffAt: z.coerce.date(),
    status: z.enum(['convocado', 'confirmado']),
  })
  .partial()
  .refine(v => v.kickoffAt !== undefined || v.status !== undefined, 'Nada que guardar')

/** El día y la hora se negocian entre el grupo antes de cerrarse: quien organiza los ajusta
 *  y marca el partido "confirmado" (verde) o lo deja "por confirmar" (amarillo). */
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
  await useDb().update(schema.matches).set(patch).where(eq(schema.matches.id, id))
  return { ok: true }
})
