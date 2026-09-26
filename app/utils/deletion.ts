/** Conteos devueltos por el `?dryRun=1` de un endpoint de eliminación. */
export interface DeletionCounts {
  matches?: number
  players?: number
  guests?: number
  receipts?: number
  members?: number
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "Se borrarán 3 partidos, 12 anotados y 5 comprobantes. No se puede deshacer." */
export function lossText(c: DeletionCounts): string {
  const parts: string[] = []
  if (c.members !== undefined) parts.push(plural(c.members, 'miembro', 'miembros'))
  if (c.matches) parts.push(plural(c.matches, 'partido', 'partidos'))
  if (c.players) {
    const guests = c.guests ? ` (${plural(c.guests, 'invitado', 'invitados')})` : ''
    parts.push(`${plural(c.players, 'anotado', 'anotados')}${guests}`)
  }
  if (c.receipts) parts.push(plural(c.receipts, 'comprobante con su imagen', 'comprobantes con sus imágenes'))
  if (!parts.length) return 'No se puede deshacer.'
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}` : parts[0]
  const verb = parts.length === 1 && /^1 /.test(parts[0]!) ? 'Se borrará' : 'Se borrarán'
  return `${verb} ${list}. No se puede deshacer.`
}

/** Un invitado sale de la planilla, con cualquier comprobante que se haya enviado por él. */
export function guestLossText(receipts: number): string {
  if (!receipts) return 'Sale de la planilla. No se puede deshacer.'
  const what = receipts === 1
    ? 'se borrará 1 comprobante con su imagen'
    : `se borrarán ${receipts} comprobantes con sus imágenes`
  return `Sale de la planilla y ${what}. No se puede deshacer.`
}
