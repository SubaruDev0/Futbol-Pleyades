import { DEMO_START, type DemoState } from '~/utils/tour-demo'

export interface TourStep {
  /** Selector CSS del elemento a resaltar. */
  target: string
  title: string
  text: string
  /** Dónde está la historia del demo mientras este paso está en pantalla. */
  demo: DemoState
  /** Si el objetivo no cabe junto a la tarjeta, qué extremo queda a la vista. */
  focus?: 'start' | 'end'
}

/** Qué pantalla real dibuja el tutorial con datos de demo. */
export type TourView = 'grupos' | 'partido' | 'cobrar' | 'perfil'

export interface Tutorial {
  slug: string
  title: string
  /** Una línea para el selector. */
  description: string
  view: TourView
  steps: TourStep[]
  /** Adónde te manda el último paso para hacerlo de verdad. */
  cta: { label: string, to: string }
}

const S = (patch: Partial<DemoState>): DemoState => ({ ...DEMO_START, ...patch })

/** Tutoriales cortos, uno por tema, sobre copias de demo de las pantallas reales. */
export const TUTORIALS: Tutorial[] = [
  {
    slug: 'unirme',
    title: 'Unirme a un grupo',
    description: 'Entra al grupo de tus amigos con su código.',
    view: 'grupos',
    steps: [
      {
        target: '.pl-rail .pl-ga',
        title: 'Unirme con código',
        text: 'Pide el código a quien organiza, escríbelo aquí y toca Unirme.',
        demo: S({ tab: 'join', typed: true }),
        focus: 'end',
      },
      {
        target: '.pl-list .pl-gcard',
        title: 'Ya estás en el grupo',
        text: 'Aparece en tu lista. Tócalo para ver quiénes son y los próximos partidos.',
        demo: S({ tab: 'join', groups: 'joined' }),
      },
      {
        target: '.pl-list .pl-gcard__next',
        title: 'Tu próximo partido',
        text: 'Entra al partido para decir si vas.',
        demo: S({ tab: 'join', groups: 'joined' }),
      },
    ],
    cta: { label: 'Unirme ahora', to: '/grupos?tab=join' },
  },
  {
    slug: 'crear',
    title: 'Crear un grupo y armar partido',
    description: 'Arma tu grupo, invita con el código y agenda el primer partido.',
    view: 'grupos',
    steps: [
      {
        target: '.pl-rail .pl-ga',
        title: 'Crear grupo',
        text: 'Ponle nombre y toca Crear grupo. Quedas como organizador.',
        demo: S({ tab: 'create', typed: true }),
        focus: 'end',
      },
      {
        target: '.pl-list .pl-gcard__code',
        title: 'Comparte el código',
        text: 'Envíalo a los demás. Cada uno entra con él desde su teléfono.',
        demo: S({ groups: 'created' }),
      },
      {
        target: '.pl-list .pl-gcard .pl-gbtn',
        title: 'Armar partido',
        text: 'Eliges día, hora, cancha y formato. Si pones el valor de la cancha y quién cobra, la app calcula cuánto pone cada uno.',
        demo: S({ groups: 'created' }),
      },
    ],
    cta: { label: 'Crear mi grupo', to: '/grupos?tab=create' },
  },
  {
    slug: 'partido',
    title: 'Anotarme y pagar',
    description: 'Di si vas, mira la planilla y paga tu parte.',
    view: 'partido',
    steps: [
      {
        target: '.pl-hero',
        title: 'El partido',
        text: 'Día, hora, cancha y cuánto sale por jugador. Mientras más van, menos pone cada uno.',
        demo: S({ arrived: 5, drawn: false }),
      },
      {
        target: '.pl-answer',
        title: '¿Vas?',
        text: 'Voy te suma y ocupa un cupo. Quizás avisa sin ocupar cupo. Con «Llevo a alguien» sumas a un invitado y su pago queda a tu cargo.',
        demo: S({ arrived: 6, drawn: false }),
      },
      {
        target: '.pl-sheet',
        title: 'Planilla y sorteo',
        text: 'La lista de los que van. Quien organiza sortea los equipos: Oscuro contra Claro.',
        demo: S({ arrived: 14, drawn: true }),
      },
      {
        target: '.pl-money',
        title: 'Pagar',
        text: 'Transfiere a quien cobra, toca «Ya transferí» y sube la captura. Queda en revisión hasta que la acepten.',
        demo: S({ arrived: 14, drawn: true }),
      },
    ],
    cta: { label: 'Ver mis partidos', to: '/' },
  },
  {
    slug: 'cobrar',
    title: 'Cobrar',
    description: 'Revisa los comprobantes y marca quién pagó.',
    view: 'cobrar',
    steps: [
      {
        target: '.pl-review',
        title: 'Por revisar',
        text: 'Cuando alguien sube su comprobante, aparece aquí. Tócalo para verlo.',
        demo: S({}),
      },
      {
        target: '.pl-demo-review .pl-modal__foot',
        title: 'Aceptar o rechazar',
        text: 'Mira la captura y acéptala. Si algo no calza, recházala con un motivo y esa persona sube otra.',
        demo: S({ review: true }),
      },
      {
        target: '.pl-sheet',
        title: 'Quién pagó',
        text: 'Toca Debe o Pagó para marcar un pago en efectivo o corregir un error.',
        demo: S({}),
      },
    ],
    cta: { label: 'Cargar mis datos', to: '/perfil' },
  },
  {
    slug: 'perfil',
    title: 'Tu perfil',
    description: 'Tu foto, tu nombre y tus datos de transferencia.',
    view: 'perfil',
    steps: [
      {
        target: '[data-tour="me"]',
        title: 'Tu foto y tu nombre',
        text: 'Así apareces en la planilla. Toca la foto para subirla o cambiarla.',
        demo: S({}),
      },
      {
        target: '[data-tour="bank"]',
        title: 'Datos de transferencia',
        text: 'Si te toca cobrar, cárgalos aquí. Solo los ven quienes juegan ese partido.',
        demo: S({}),
      },
    ],
    cta: { label: 'Completar mi perfil', to: '/perfil' },
  },
]

export const tutorialBySlug = (slug: string | null | undefined) =>
  TUTORIALS.find(t => t.slug === slug) ?? null
