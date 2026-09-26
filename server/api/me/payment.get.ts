import { eq } from 'drizzle-orm'
import type { PaymentAccount } from '#shared/utils/bank-account'

export default defineEventHandler(async (event): Promise<PaymentAccount | null> => {
  const { user } = await requireUserSession(event)

  const [row] = await useDb()
    .select({
      holderName: schema.paymentAccounts.holderName,
      rut: schema.paymentAccounts.rut,
      bank: schema.paymentAccounts.bank,
      accountType: schema.paymentAccounts.accountType,
      accountNumber: schema.paymentAccounts.accountNumber,
      email: schema.paymentAccounts.email,
    })
    .from(schema.paymentAccounts)
    .where(eq(schema.paymentAccounts.userId, user.id))
    .limit(1)

  return row ?? null
})
