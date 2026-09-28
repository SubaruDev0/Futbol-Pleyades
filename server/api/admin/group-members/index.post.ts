import { z } from 'zod'
import { eq } from 'drizzle-orm'

const body = z.object({
  phone: z.string().trim().min(1),
  inviteCode: z.string().trim().min(4).max(12),
})

/** Suma a alguien a un grupo sin pasar por su código de invitación: para cuando el dueño lo hace a mano. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { phone, inviteCode } = await readValidatedBody(event, body.parse)
  const db = useDb()
  const s = schema

  const normalized = normalizePhone(phone)
  if (!normalized) throw createError({ statusCode: 400, statusMessage: 'Ese celular no es válido' })

  const [user] = await db.select({ id: s.users.id, name: s.users.name }).from(s.users)
    .where(eq(s.users.phone, normalized)).limit(1)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'No hay ninguna cuenta con ese celular' })

  const [group] = await db.select({ id: s.groups.id, name: s.groups.name }).from(s.groups)
    .where(eq(s.groups.inviteCode, inviteCode.toUpperCase())).limit(1)
  if (!group) throw createError({ statusCode: 404, statusMessage: 'Ese código de grupo no existe' })

  const [existing] = await db.select({ id: s.groupMembers.id }).from(s.groupMembers)
    .where(memberOf(group.id, user.id)).limit(1)
  if (existing) throw createError({ statusCode: 409, statusMessage: `${user.name} ya está en «${group.name}»` })

  await db.insert(s.groupMembers).values({ groupId: group.id, userId: user.id })
  return { userName: user.name, groupName: group.name }
})
