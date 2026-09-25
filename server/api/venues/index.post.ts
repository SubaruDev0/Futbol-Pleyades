import { z } from 'zod'

const body = z.object({
  name: z.string().trim().min(2).max(60),
  address: z.string().trim().max(120).optional(),
  mapsUrl: z.url().optional(),
  notes: z.string().trim().max(300).optional(),
})

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const input = await readValidatedBody(event, body.parse)

  const [venue] = await useDb().insert(schema.venues).values(input).returning()
  return venue
})
