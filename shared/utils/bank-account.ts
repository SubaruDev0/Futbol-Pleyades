import { formatRut, rutBody } from './rut'

/**
 * Dónde puede recibir una transferencia una persona en Chile: bancos
 * autorizados por la CMF que ofrecen cuentas personales, luego las
 * cooperativas, tarjetas prepago y billeteras que los formularios de
 * transferencia bancaria listan junto a ellos. `code` es lo que se guarda —
 * nunca renombrar uno; agregar una entrada nueva en su lugar.
 */
export const BANKS = [
  { code: 'bancoestado', name: 'BancoEstado' },
  { code: 'banco_chile', name: 'Banco de Chile / Edwards / Citi' },
  { code: 'santander', name: 'Banco Santander' },
  { code: 'bci', name: 'Bci' },
  { code: 'scotiabank', name: 'Scotiabank' },
  { code: 'itau', name: 'Itaú' },
  { code: 'security', name: 'Banco Security' },
  { code: 'falabella', name: 'Banco Falabella' },
  { code: 'ripley', name: 'Banco Ripley' },
  { code: 'consorcio', name: 'Banco Consorcio' },
  { code: 'internacional', name: 'Banco Internacional' },
  { code: 'bice', name: 'Banco BICE' },
  { code: 'hsbc', name: 'HSBC Bank Chile' },
  { code: 'btg_pactual', name: 'Banco BTG Pactual' },
  { code: 'coopeuch', name: 'Coopeuch' },
  { code: 'tenpo', name: 'Tenpo' },
  { code: 'mercado_pago', name: 'Mercado Pago' },
  { code: 'mach', name: 'MACH' },
  { code: 'tapp', name: 'Tapp Caja Los Andes' },
  { code: 'los_heroes', name: 'Prepago Los Héroes' },
  { code: 'copec_pay', name: 'Copec Pay' },
  { code: 'global66', name: 'Global66' },
  { code: 'prex', name: 'Prex' },
] as const

export type BankCode = (typeof BANKS)[number]['code']

export const BANK_CODES = BANKS.map(b => b.code) as [BankCode, ...BankCode[]]

export const ACCOUNT_TYPES = ['cuenta_rut', 'corriente', 'vista', 'ahorro'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cuenta_rut: 'Cuenta RUT',
  corriente: 'Cuenta corriente',
  vista: 'Cuenta vista',
  ahorro: 'Cuenta de ahorro',
}

/** En BancoEstado la Cuenta RUT es la cuenta vista, así que "vista" no se ofrece ahí. */
export function accountTypesFor(bank: string | null | undefined): AccountType[] {
  return bank === 'bancoestado'
    ? ['cuenta_rut', 'corriente', 'ahorro']
    : ['corriente', 'vista', 'ahorro']
}

export function bankName(code: string): string {
  return BANKS.find(b => b.code === code)?.name ?? code
}

/** El número de una Cuenta RUT es el RUT del titular sin el dígito verificador. */
export function isCuentaRut(bank: string | null | undefined, type: string | null | undefined) {
  return bank === 'bancoestado' && type === 'cuenta_rut'
}

export function derivedAccountNumber(
  bank: string | null | undefined,
  type: string | null | undefined,
  rut: string,
  typed: string,
): string {
  return isCuentaRut(bank, type) ? rutBody(rut) : typed
}

export interface PaymentAccount {
  holderName: string
  rut: string
  bank: string
  accountType: AccountType
  accountNumber: string
  email: string | null
}

/** El bloque que la gente pega en su app del banco, en el orden que piden los formularios chilenos. */
export function paymentAccountText(a: PaymentAccount): string {
  return [
    `Nombre: ${a.holderName}`,
    `RUT: ${formatRut(a.rut)}`,
    `Banco: ${bankName(a.bank)}`,
    `Tipo de cuenta: ${ACCOUNT_TYPE_LABEL[a.accountType]}`,
    `N° de cuenta: ${a.accountNumber}`,
    ...(a.email ? [`Correo: ${a.email}`] : []),
  ].join('\n')
}
