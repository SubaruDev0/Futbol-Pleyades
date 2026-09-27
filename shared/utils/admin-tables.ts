/** Tablas que el panel de administración puede listar; el servidor rechaza cualquier otra clave. */
export const ADMIN_TABLES = [
  'users',
  'groups',
  'group_members',
  'venues',
  'matches',
  'match_players',
  'payment_accounts',
  'payment_receipts',
] as const

export type AdminTable = (typeof ADMIN_TABLES)[number]

export type AdminFieldKind = 'text' | 'textarea' | 'select' | 'number' | 'switch' | 'datetime'

export interface AdminField {
  key: string
  kind: AdminFieldKind
  options?: readonly string[]
  /** Acepta vacío: se guarda como null. */
  nullable?: boolean
}

export const isAdminTable = (key: string): key is AdminTable =>
  (ADMIN_TABLES as readonly string[]).includes(key)
