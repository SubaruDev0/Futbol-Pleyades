export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  await clearUserSession(event)
  return { ok: true }
})
