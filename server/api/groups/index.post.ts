import { z } from 'zod'

const body = z.object({
  name: z.string().trim().min(2).max(50),
  defaultFormat: z.enum(['f5', 'f6', 'f7', 'libre']).default('f7'),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const { name, defaultFormat } = await readValidatedBody(event, body.parse)

  const db = useDb()

  const group = (await db
    .insert(schema.groups)
    .values({ name, defaultFormat, inviteCode: generateInviteCode(), createdBy: user.id })
    .returning())[0]!

  await db.insert(schema.groupMembers).values({
    groupId: group.id,
    userId: user.id,
    role: 'organizador',
  })

  return group
})
