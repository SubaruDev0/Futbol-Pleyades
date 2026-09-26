// Coincide con el alfabeto de server/utils/invite-code.ts: sin 0/O, sin 1/I/L.
const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/

/** Un nombre de grupo que en realidad es alguien pegando un código de invitación por error. */
export function looksLikeInviteCode(value: string): boolean {
  return CODE_PATTERN.test(value.trim().toUpperCase())
}
