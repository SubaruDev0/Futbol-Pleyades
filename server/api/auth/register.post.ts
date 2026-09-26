import { z } from 'zod'
import { eq } from 'drizzle-orm'

const body = z.object({
  phone: z.string().min(8),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().trim().min(2).max(40),
})

export default defineEventHandler(async (event) => {
  const { phone, password, name } = await readValidatedBody(event, body.parse)

  const normalized = normalizePhone(phone)
  if (!normalized) {
    throw createError({ statusCode: 400, statusMessage: 'Número de teléfono inválido' })
  }

  const db = useDb()
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.phone, normalized))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Ese número ya está registrado' })
  }

  const [user] = await db
    .insert(schema.users)
    .values({ phone: normalized, name, passwordHash: await hashPassword(password) })
    .returning({
      id: schema.users.id,
      name: schema.users.name,
      phone: schema.users.phone,
      avatarUrl: schema.users.avatarUrl,
    })

  await setUserSession(event, { user })

  return { user }
})
