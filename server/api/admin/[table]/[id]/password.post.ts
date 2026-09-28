import { z } from 'zod'
import { eq } from 'drizzle-orm'

const body = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

/** Para cuando alguien olvida su contraseña y no hay recuperación por SMS: el dueño la resetea a mano. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const table = adminTableParam(event)
  if (table !== 'users') throw createError({ statusCode: 404, statusMessage: 'No encontrado' })
  const id = getRouterParam(event, 'id') ?? ''
  const { password } = await readValidatedBody(event, body.parse)

  const db = useDb()
  const [user] = await db.select({ id: schema.users.id }).from(schema.users)
    .where(eq(schema.users.id, id)).limit(1)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'No encontrado' })

  await db.update(schema.users).set({ passwordHash: await hashPassword(password) }).where(eq(schema.users.id, id))
  return { ok: true }
})
