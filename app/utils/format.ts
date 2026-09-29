const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function matchDay(value: string | Date): string {
  const d = new Date(value)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function matchTime(value: string | Date): string {
  const d = new Date(value)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Los pesos chilenos no llevan decimales — "1.750", nunca "1.750,00". */
export function clp(amount: number): string {
  return `$${amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export const FORMAT_LABEL: Record<string, string> = {
  f5: '5v5',
  f6: '6v6',
  f7: '7v7',
  libre: 'Libre',
}

export function countdown(value: string | Date): string {
  const diff = new Date(value).getTime() - Date.now()
  if (diff < 0) return 'En curso'

  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return `En ${Math.floor(diff / 60_000)} min`
  if (hours < 24) return `En ${hours} h`
  return `En ${Math.floor(hours / 24)} días`
}

/** "hace 5 min", "hace 2 h", "hace 3 días": cuánto tiempo lleva esperando algo. */
export function ago(value: string | Date): string {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000)
  if (minutes < 1) return 'recién'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`
}

/** Una búsqueda en Google Maps para una cancha. Sin dirección, la ciudad acota la búsqueda. */
export function mapsSearchUrl(name: string, address?: string | null): string {
  const query = address ? `${name}, ${address}` : `${name}, Concepción, Chile`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** "Benjamin Campos" → "Benjamin C": nombre y la inicial del primer apellido, para filas angostas. */
export function shortName(full: string): string {
  const [first, second] = full.trim().split(/\s+/)
  return second ? `${first} ${second[0]!.toUpperCase()}` : (first ?? full)
}
