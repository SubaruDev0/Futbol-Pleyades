import { z } from 'zod'

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
  const match = (await db
    .insert(schema.matches)
    .values({
      ...input,
      capacity: input.capacity ?? capacityFor(input.format),
      createdBy: user.id,
    })
    .returning())[0]!

  // Whoever calls the match is in it. That was never in doubt in the chat either.
  await db.insert(schema.matchPlayers).values({
    matchId: match.id,
    userId: user.id,
    status: 'voy',
  })

  return match
})
