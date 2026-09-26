import { z } from 'zod'

const body = z
  .object({
    holderName: z
      .string()
      .trim()
      .min(2, 'Escribe el nombre del titular')
      .max(80, 'El nombre del titular es demasiado largo'),
    rut: z.string().refine(isValidRut, 'El RUT no es válido').transform(normalizeRut),
    bank: z.enum(BANK_CODES, 'Elige un banco de la lista'),
    accountType: z.enum(ACCOUNT_TYPES, 'Elige un tipo de cuenta'),
    accountNumber: z.string().trim().optional().default(''),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(120)
      .nullish()
      .transform(v => v || null)
      .pipe(z.email('El correo no es válido').nullable()),
  })
  .superRefine((v, ctx) => {
    if (!accountTypesFor(v.bank).includes(v.accountType)) {
      ctx.addIssue({
        code: 'custom',
        path: ['accountType'],
        message: `${bankName(v.bank)} no ofrece ${ACCOUNT_TYPE_LABEL[v.accountType]}`,
      })
    }
  })
  .transform((v, ctx) => {
    // El número de Cuenta RUT se deriva aquí, sea cual sea lo que envió el cliente.
    const accountNumber = derivedAccountNumber(v.bank, v.accountType, v.rut, v.accountNumber)
    if (!/^\d{4,20}$/.test(accountNumber)) {
      ctx.addIssue({
        code: 'custom',
        path: ['accountNumber'],
        message: 'El número de cuenta debe tener entre 4 y 20 dígitos',
      })
      return z.NEVER
    }
    return { ...v, accountNumber }
  })

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]!.message })
  }
  const account = parsed.data

  const [saved] = await useDb()
    .insert(schema.paymentAccounts)
    .values({ userId: user.id, ...account })
    .onConflictDoUpdate({
      target: schema.paymentAccounts.userId,
      set: { ...account, updatedAt: new Date() },
    })
    .returning({
      holderName: schema.paymentAccounts.holderName,
      rut: schema.paymentAccounts.rut,
      bank: schema.paymentAccounts.bank,
      accountType: schema.paymentAccounts.accountType,
      accountNumber: schema.paymentAccounts.accountNumber,
      email: schema.paymentAccounts.email,
    })

  return saved!
})
