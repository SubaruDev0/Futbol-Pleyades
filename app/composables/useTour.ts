import { tutorialBySlug } from '~/utils/tour-steps'

const SEEN_KEY = 'pl-tour-seen'
export const TOUR_PATH = '/tutorial'

/**
 * Tutoriales cortos por tema, cada uno corriendo sobre una copia de demo de
 * una pantalla real en /tutorial/[tema]. El estado vive en useState para que
 * el selector del encabezado, la oferta del layout, el overlay y la página de
 * demo lo compartan todos.
 */
export function useTour() {
  const active = useState('pl-tour-active', () => false)
  const index = useState('pl-tour-index', () => 0)
  const topic = useState<string | null>('pl-tour-topic', () => null)
  const chooser = useState('pl-tour-chooser', () => false)
  const route = useRoute()

  const tutorial = computed(() => tutorialBySlug(topic.value))
  const steps = computed(() => tutorial.value?.steps ?? [])

  /** Corre un tutorial cuyo demo ya está en pantalla, desde su primer paso. */
  function start(slug: string) {
    if (!import.meta.client || !tutorialBySlug(slug)) return
    topic.value = slug
    index.value = 0
    active.value = true
    markSeen()
  }

  /** Desde cualquier parte: va al demo de ese tutorial y lo corre ahí. */
  async function open(slug: string) {
    chooser.value = false
    markSeen()
    const path = `${TOUR_PATH}/${slug}`
    const { flash } = useAppLoadingFlash()
    await flash(async () => {
      if (route.path === path) return start(slug)
      await navigateTo({ path, query: { start: '1' } })
    })
  }

  function stop() {
    active.value = false
  }

  /** Cerrar el tour (la X) también sale de su página de demo: a nadie se le
   *  debe dejar tocando una pantalla llena de botones que no hacen nada real.
   *  Los cambios de ruta (elegir otro tutorial, un link real dentro del demo)
   *  cierran el overlay solo vía `stop` y no deben además redirigir. */
  async function close() {
    stop()
    if (route.path.startsWith(TOUR_PATH)) await navigateTo('/')
  }

  function next() {
    if (index.value < steps.value.length - 1) index.value++
    else stop()
  }

  function prev() {
    if (index.value > 0) index.value--
  }

  function seen(): boolean {
    try {
      return localStorage.getItem(SEEN_KEY) === '1'
    }
    catch {
      // Modo privado o almacenamiento bloqueado: se trata como ya visto en vez de molestar en cada visita.
      return true
    }
  }

  function markSeen() {
    try {
      localStorage.setItem(SEEN_KEY, '1')
    }
    catch {
      // Nada que hacer: la oferta simplemente puede volver a aparecer la próxima vez.
    }
  }

  return { active, index, topic, tutorial, steps, chooser, start, open, stop, close, next, prev, seen, markSeen }
}
