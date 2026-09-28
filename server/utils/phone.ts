/**
 * Solo celulares chilenos. El formulario entrega los ocho dígitos de abonado,
 * pero la gente también pega "+56 9 4620 2726" o "946202726" desde una
 * tarjeta de contacto, y todos esos son el mismo login — así que colapsan a una sola forma guardada.
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
