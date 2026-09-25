import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  return useDb().select().from(schema.venues).orderBy(asc(schema.venues.name))
})
