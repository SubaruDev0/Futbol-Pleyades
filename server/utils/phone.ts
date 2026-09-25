/**
 * Chilean mobiles only. The form supplies the eight subscriber digits, but people
 * also paste "+56 9 4620 2726" or "946202726" from a contact card, and all of
 * those are the same login — so they collapse to one stored form.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')

  const withoutCountry = digits.startsWith('56') ? digits.slice(2) : digits
  const subscriber =
    withoutCountry.length === 9 && withoutCountry.startsWith('9')
      ? withoutCountry.slice(1)
      : withoutCountry

  if (!/^\d{8}$/.test(subscriber)) return null

  return `+569${subscriber}`
}

export function formatPhone(stored: string): string {
  const m = stored.match(/^\+56(9)(\d{4})(\d{4})$/)
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : stored
}
