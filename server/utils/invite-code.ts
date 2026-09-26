// Sin 0/O, sin 1/I/L: este código se dicta por chat y se teclea de nuevo a mano.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateInviteCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}
