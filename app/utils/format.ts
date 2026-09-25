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

/** Chilean pesos carry no decimals — "1.750", never "1.750,00". */
export function clp(amount: number): string {
  return `$${amount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
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
