/**
 * Datos de prueba para el tutorial (/tutorial). Nada aquí toca la API ni la
 * base de datos: los componentes reales se alimentan con este grupo, partido
 * y plantel inventados, y el paso del tour decide qué tan avanzada va la historia.
 */
import type { PaymentAccount } from '#shared/utils/bank-account'
import { rutCheckDigit } from '#shared/utils/rut'
import type { SheetPlayer } from '~/components/MatchSheet.vue'
import type { ConstellationPlayer } from '~/utils/constellation'

/** Qué tan avanzada va la historia en un paso de un tutorial. */
export interface DemoState {
  /** Pantalla de grupos: aún sin grupo, unido a "Los del martes", o recién creado. */
  groups: 'none' | 'joined' | 'created'
  /** Pantalla de grupos: la pestaña abierta del panel crear / unirse. */
  tab: 'create' | 'join'
  /** Pantalla de grupos: el nombre o código ya está tecleado. */
  typed: boolean
  /** Partido: cuántos de los que llegan han dicho "voy" (0 a 14). */
  arrived: number
  /** Partido: equipos sorteados, Oscuro vs Claro. */
  drawn: boolean
  /** Partido: el pago de quien mira. */
  pay: 'unpaid' | 'sent' | 'paid'
  /** Partido, como quien cobra: la revisión de comprobante está abierta. */
  review: boolean
}

export const DEMO_START: DemoState = {
  groups: 'none',
  tab: 'create',
  typed: false,
  arrived: 14,
  drawn: true,
  pay: 'unpaid',
  review: false,
}

const fakeRut = (body: string) => `${body}-${rutCheckDigit(body)}`

export const DEMO_YOU = { id: 'demo-you', name: 'Álvaro Díaz', phone: '+56 9 5555 0123' }
export const DEMO_COLLECTOR = { id: 'demo-tomas', name: 'Tomás Fuentes' }

interface DemoMember {
  id: string
  name: string
  role: 'organizador' | 'miembro'
  kit: 'oscuro' | 'claro'
  /** El pago de todos los demás, tal como lo muestra la planilla al final. */
  pay: 'paid' | 'pending' | 'owes'
}

const m = (id: string, name: string, kit: DemoMember['kit'], pay: DemoMember['pay']): DemoMember =>
  ({ id: `demo-${id}`, name, role: 'miembro', kit, pay })

// En el orden en que dicen "voy". Quien mira y su invitado llegan sexto y séptimo.
const OTHERS_BEFORE: DemoMember[] = [
  { ...DEMO_COLLECTOR, role: 'organizador', kit: 'oscuro', pay: 'paid' },
  m('benja', 'Benjamín Araya', 'claro', 'paid'),
  m('vicente', 'Vicente Morales', 'oscuro', 'paid'),
  m('martin', 'Martín Castro', 'claro', 'paid'),
  m('joaquin', 'Joaquín Reyes', 'oscuro', 'paid'),
]
const OTHERS_AFTER: DemoMember[] = [
  m('cristobal', 'Cristóbal Pinto', 'oscuro', 'paid'),
  m('seba', 'Sebastián Muñoz', 'oscuro', 'pending'),
  m('nico', 'Nicolás Herrera', 'oscuro', 'owes'),
  m('gonzalo', 'Gonzalo Tapia', 'claro', 'pending'),
  m('pablo', 'Pablo Navarro', 'claro', 'paid'),
  m('andres', 'Andrés Riquelme', 'claro', 'paid'),
  m('maxi', 'Maximiliano Lagos', 'claro', 'owes'),
]
const MAYBE = m('rodrigo', 'Rodrigo Vargas', 'claro', 'owes')
const NOT_GOING = m('felipe', 'Felipe Contreras', 'claro', 'owes')

const YOU_KIT = 'oscuro'
const GUEST = { id: 'demo-guest', name: 'Lucas', kit: 'claro' as const }

/** Índice en ARRIVALS donde quien mira responde "voy". */
export const DEMO_YOU_AT = OTHERS_BEFORE.length

export const DEMO_CAPACITY = 14
export const DEMO_TOTAL = 56000
export const DEMO_SEED = 'demo-los-del-martes'

export const DEMO_VENUE = {
  name: 'Complejo Los Carrera',
  field: 'Cancha 2',
  address: 'Av. Los Carrera 2150, Concepción',
}

/** El próximo martes a las 21:00: siempre un poco adelante, para que se lea como próximo. */
export function demoKickoff(now = new Date()): Date {
  const d = new Date(now)
  d.setHours(21, 0, 0, 0)
  do d.setDate(d.getDate() + 1)
  while (d.getDay() !== 2)
  return d
}

export const DEMO_ACCOUNT: PaymentAccount = {
  holderName: 'Tomás Fuentes Vidal',
  rut: fakeRut('16842379'),
  bank: 'bancoestado',
  accountType: 'cuenta_rut',
  accountNumber: '16842379',
  email: null,
}

/** Los datos propios de quien mira, tal como los mostraría su perfil. */
export const DEMO_YOUR_ACCOUNT: PaymentAccount = {
  holderName: 'Álvaro Díaz Rojas',
  rut: fakeRut('18305427'),
  bank: 'banco_chile',
  accountType: 'corriente',
  accountNumber: '00123456789',
  email: null,
}

// --- Grupo ---------------------------------------------------------------------

const ALL_MEMBERS = [
  ...OTHERS_BEFORE,
  { id: DEMO_YOU.id, name: DEMO_YOU.name, role: 'miembro' as const },
  ...OTHERS_AFTER,
  MAYBE,
  NOT_GOING,
]

export const DEMO_MEMBERS = ALL_MEMBERS.map(({ id, name, role }) => ({ id, name, role, avatarUrl: null }))

export const DEMO_GROUP_NAME = 'Los del martes'
export const DEMO_CODE = 'K7M4QX'

/** El grupo al que se une quien mira, con su próximo partido. */
export function demoGroup(going: number, kickoffAt: Date) {
  return {
    id: 'demo-group',
    name: DEMO_GROUP_NAME,
    inviteCode: DEMO_CODE,
    role: 'miembro',
    memberCount: DEMO_MEMBERS.length,
    members: DEMO_MEMBERS,
    nextMatch: {
      id: 'demo-match',
      slug: 'demo',
      kickoffAt: kickoffAt.toISOString(),
      capacity: DEMO_CAPACITY,
      going,
      status: 'abierto',
      venueName: DEMO_VENUE.name,
      fieldLabel: DEMO_VENUE.field,
    },
  }
}

/** El grupo que quien mira acaba de crear: solo esa persona, nada agendado. */
export function demoNewGroup() {
  return {
    id: 'demo-new-group',
    name: DEMO_GROUP_NAME,
    inviteCode: DEMO_CODE,
    role: 'organizador',
    memberCount: 1,
    members: [{ id: DEMO_YOU.id, name: DEMO_YOU.name, role: 'organizador', avatarUrl: null }],
    nextMatch: null,
  }
}

// --- Plantel del partido ------------------------------------------------------------------

type DemoPlayer = SheetPlayer & ConstellationPlayer

function row(id: string, name: string, kit: string, drawn: boolean, paid: boolean, pending: boolean, guest = false, receiptId: string | null = null): DemoPlayer {
  return {
    id,
    userId: guest ? null : id,
    name: guest ? null : name,
    guestName: guest ? name : null,
    avatarUrl: null,
    status: 'voy',
    kit: drawn ? kit : null,
    paid,
    receipt: pending ? { id: receiptId, status: 'pendiente' } : null,
  }
}

/**
 * El plantel en un punto dado de la historia: quiénes van, en orden de
 * llegada, más el resto. Quien cobra también recibe los ids de los
 * comprobantes pendientes para poder abrirlos.
 */
export function demoRoster(state: DemoState, asCollector = false) {
  const you = (drawn: boolean) =>
    row(DEMO_YOU.id, DEMO_YOU.name, YOU_KIT, drawn, state.pay === 'paid', state.pay === 'sent')
  const other = (p: DemoMember, drawn: boolean) =>
    row(p.id, p.name, p.kit, drawn, p.pay === 'paid' && p.role !== 'organizador', p.pay === 'pending', false,
      asCollector && p.pay === 'pending' ? `${p.id}-receipt` : null)

  const arrivals: DemoPlayer[] = [
    ...OTHERS_BEFORE.map(p => other(p, state.drawn)),
    you(state.drawn),
    // El cupo del invitado corre por cuenta de quien mira; en esta historia ya está pagado.
    row(GUEST.id, GUEST.name, GUEST.kit, state.drawn, true, false, true),
    ...OTHERS_AFTER.map(p => other(p, state.drawn)),
  ]
  const going = arrivals.slice(0, Math.min(state.arrived, arrivals.length))
  const maybe = { ...other(MAYBE, false), status: 'quizas' }
  const notGoing = { ...other(NOT_GOING, false), status: 'no_voy' }

  return {
    going,
    /** Todos con una respuesta, como los quiere la constelación. */
    players: [...going, maybe, notGoing],
    out: [MAYBE.name, NOT_GOING.name],
    you: going.find(p => p.id === DEMO_YOU.id) ?? null,
    perPlayer: going.length ? Math.ceil(DEMO_TOTAL / going.length) : null,
  }
}

/** Comprobantes esperando a quien cobra, los más nuevos primero. */
export function demoPending(now = Date.now()) {
  return OTHERS_AFTER.filter(p => p.pay === 'pending').map((p, i) => ({
    receiptId: `${p.id}-receipt`,
    playerId: p.id,
    name: p.name,
    guest: false,
    createdAt: new Date(now - (12 + i * 25) * 60_000).toISOString(),
  }))
}
