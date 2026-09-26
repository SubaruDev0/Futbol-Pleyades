import { z } from 'zod'
import { eq } from 'drizzle-orm'

const body = z.object({
  currentPassword: z.string().min(1, 'Escribe tu contraseña actual'),
  newPassword: z.string().min(8, 'La contraseña nueva debe tener al menos 8 caracteres'),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const { currentPassword, newPassword } = await readValidatedBody(event, body.parse)

  const db = useDb()
  const [row] = await db
    .select({ id: schema.users.id, passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'No encontramos tu cuenta' })
  }

  if (!(await verifyPassword(row.passwordHash, currentPassword))) {
    throw createError({ statusCode: 401, statusMessage: 'La contraseña actual no es correcta' })
  }

  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(schema.users.id, row.id))

  return { ok: true }
})
