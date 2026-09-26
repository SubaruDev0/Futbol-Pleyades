/** El cuerpo de RUT más largo (8 dígitos) más su dígito verificador. */
export const RUT_MAX_CHARS = 9

/** Mantiene solo dígitos y una K final, en mayúscula: "21.347.032-k" → "21347032K".
 *  Una K en cualquier posición que no sea la última se elimina, igual que los ceros iniciales. */
export function cleanRut(value: string): string {
  const raw = value.toUpperCase().replace(/[^0-9K]/g, '')
  if (!raw) return ''
  const body = raw.slice(0, -1).replace(/K/g, '')
  return `${body}${raw.slice(-1)}`.replace(/^0+/, '')
}

/** Dígito verificador módulo 11 para un cuerpo de RUT. */
export function rutCheckDigit(body: string): string {
  let sum = 0
  let factor = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const dv = 11 - (sum % 11)
  return dv === 11 ? '0' : dv === 10 ? 'K' : String(dv)
}

export function isValidRut(value: string): boolean {
  const clean = cleanRut(value)
  const body = clean.slice(0, -1)
  if (!/^\d{7,8}$/.test(body)) return false
  return rutCheckDigit(body) === clean.slice(-1)
}

/** "21347032-9": la forma guardada. Asume un RUT válido. */
export function normalizeRut(value: string): string {
  const clean = cleanRut(value)
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`
}

/** El RUT sin su dígito verificador — el número de cuenta de la Cuenta RUT de BancoEstado. */
export function rutBody(value: string): string {
  return cleanRut(value).slice(0, -1)
}

/** "21.347.032-9". También funciona con input parcial, así puede formatear mientras se escribe. */
export function formatRut(value: string): string {
  const clean = cleanRut(value)
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${body}-${clean.slice(-1)}`
}
