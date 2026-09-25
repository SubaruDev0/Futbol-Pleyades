// No 0/O, no 1/I/L: this code gets dictated over chat and retyped by hand.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateInviteCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}
