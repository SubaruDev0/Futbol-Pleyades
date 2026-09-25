import { z } from 'zod'
import { eq } from 'drizzle-orm'

const body = z.object({
  phone: z.string().min(8),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const { phone, password } = await readValidatedBody(event, body.parse)

  const normalized = normalizePhone(phone)
  // Same error and shape for a bad number, an unknown user and a wrong password,
  // so the response never reveals which numbers are registered.
  const invalid = () =>
    createError({ statusCode: 401, statusMessage: 'Teléfono o contraseña incorrectos' })

  if (!normalized) throw invalid()

  const db = useDb()
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.phone, normalized))
    .limit(1)

  if (!user) throw invalid()
  if (!(await verifyPassword(user.passwordHash, password))) throw invalid()

  await setUserSession(event, {
    user: { id: user.id, name: user.name, phone: user.phone },
  })

  return { user: { id: user.id, name: user.name, phone: user.phone } }
})
