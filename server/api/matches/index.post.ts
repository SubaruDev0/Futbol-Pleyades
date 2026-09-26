import { z } from 'zod'
import { eq } from 'drizzle-orm'

const body = z.object({
  groupId: z.uuid(),
  kickoffAt: z.coerce.date(),
  format: z.enum(['f5', 'f6', 'f7', 'libre']),
  capacity: z.number().int().min(2).max(40).optional(),
  venueId: z.uuid().optional(),
  fieldLabel: z.string().trim().max(40).optional(),
  totalCost: z.number().int().min(0).max(10_000_000).optional(),
  collectorUserId: z.uuid().optional(),
  notes: z.string().trim().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const input = await readValidatedBody(event, body.parse)

  await requireMembership(input.groupId, user.id)

  const db = useDb()
  const [group] = await db
    .select({ name: schema.groups.name })
    .from(schema.groups)
    .where(eq(schema.groups.id, input.groupId))
    .limit(1)

  const insert = async () =>
    (await db
      .insert(schema.matches)
      .values({
        ...input,
        slug: await uniqueMatchSlug(group!.name, input.kickoffAt),
        capacity: input.capacity ?? capacityFor(input.format),
        createdBy: user.id,
      })
      .returning())[0]!

  let match: Awaited<ReturnType<typeof insert>>
  try {
    match = await insert()
  }
  catch (e) {
    // Dos partidos creados a la vez para el mismo horario: el segundo toma el siguiente sufijo.
    const err = e as { code?: string, cause?: { code?: string } }
    if ((err.cause?.code ?? err.code) !== '23505') throw e
    match = await insert()
  }

  // Quien convoca el partido está en él. Eso tampoco se ponía en duda en el chat.
  await db.insert(schema.matchPlayers).values({
    matchId: match.id,
    userId: user.id,
    status: 'voy',
  })

  return match
})
