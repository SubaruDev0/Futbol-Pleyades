<script setup lang="ts">
import ConstellationSky from '~/components/ConstellationSky.vue'
import { starCluster, starHash, starSize, starSpanningTree } from '~/utils/constellation'
import type { ConstellationPlayer, SkyStar, StarPoint } from '~/utils/constellation'

/**
 * El partido como su propio cúmulo de estrellas.
 *
 * Cada jugador confirmado es una estrella; el primero en decir "voy" es la
 * brillante, como Alcyone en las Pléyades. Cuando el plantel se llena las
 * estrellas se unen en una constelación, y una vez que se sortean los equipos
 * se dividen en dos cúmulos enfrentados. Todo se deriva del plantel, así que
 * el polling de la página y las acciones locales lo animan gratis.
 */

const props = defineProps<{
  players: ConstellationPlayer[]
  capacity: number
  /** Cualquier valor estable por partido; le da a cada partido su propio cielo. */
  seed?: string
}>()

// --- Geometría --------------------------------------------------------------
// Todo lo de abajo es puro y determinista, así SSR y el cliente coinciden.

const W = 400
const H = 200
// Dónde flotan los "quizás": los bordes del cielo, lejos del cúmulo.
const FIELD: StarPoint[] = [
  { x: 22, y: 26 }, { x: 378, y: 24 }, { x: 16, y: 96 }, { x: 384, y: 104 },
  { x: 38, y: 196 }, { x: 362, y: 194 }, { x: 64, y: 14 }, { x: 336, y: 12 },
  { x: 14, y: 160 }, { x: 386, y: 158 }, { x: 116, y: 12 }, { x: 284, y: 194 },
]

// --- Estado derivado ---------------------------------------------------------

const seedNum = computed(() => starHash(props.seed ?? 'pleyades'))
const going = computed(() => props.players.filter(p => p.status === 'voy'))
const maybe = computed(() => props.players.filter(p => p.status === 'quizas'))
const capacity = computed(() => Math.max(props.capacity, 1))

const dark = computed(() => going.value.filter(p => p.kit === 'oscuro'))
const light = computed(() => going.value.filter(p => p.kit === 'claro'))
const loose = computed(() => going.value.filter(p => p.kit !== 'oscuro' && p.kit !== 'claro'))

const mode = computed<'gathering' | 'full' | 'teams'>(() => {
  if (dark.value.length || light.value.length) return 'teams'
  return going.value.length >= capacity.value ? 'full' : 'gathering'
})

const slots = computed(() =>
  starCluster(Math.max(capacity.value, going.value.length), 200, 98, 168, 80, seedNum.value),
)
const darkPts = computed(() => starCluster(dark.value.length, 98, 94, 74, 70, seedNum.value + 11))
const lightPts = computed(() => starCluster(light.value.length, 302, 94, 74, 70, seedNum.value + 23))

type Star = SkyStar

const nameOf = (p: ConstellationPlayer) =>
  p.userId ? (p.name ?? 'Sin nombre') : `${p.guestName ?? 'Invitado'} (invitado)`

const sizeOf = starSize

const stars = computed<Star[]>(() => {
  const out: Star[] = []

  if (mode.value === 'teams') {
    dark.value.forEach((p, i) =>
      out.push({ id: p.id, ...darkPts.value[i]!, r: sizeOf(p.id, 3.4), tone: 'dark', label: `${nameOf(p)} · Oscuro` }))
    light.value.forEach((p, i) =>
      out.push({ id: p.id, ...lightPts.value[i]!, r: sizeOf(p.id, 3.4), tone: 'light', label: `${nameOf(p)} · Claro` }))
    const m = loose.value.length
    loose.value.forEach((p, i) =>
      out.push({ id: p.id, x: 200 + (i - (m - 1) / 2) * 16, y: 16, r: 2.4, tone: 'loose', label: `${nameOf(p)} · sin equipo` }))
  }
  else {
    going.value.forEach((p, i) =>
      out.push({
        id: p.id,
        ...slots.value[i]!,
        r: i === 0 ? 5 : sizeOf(p.id, 3.1),
        tone: i === 0 ? 'bright' : 'voy',
        label: nameOf(p),
      }))
  }

  maybe.value.forEach((p, i) =>
    out.push({ id: p.id, ...FIELD[i % FIELD.length]!, r: 1.8, tone: 'maybe', label: `${nameOf(p)} · quizás` }))

  return out
})

const openSlots = computed(() =>
  mode.value === 'gathering' ? slots.value.slice(going.value.length, capacity.value) : [],
)

interface Line { key: string, x1: number, y1: number, x2: number, y2: number, team: 'all' | 'dark' | 'light' }

function linesFor(pts: StarPoint[], ids: string[], team: Line['team']): Line[] {
  return starSpanningTree(pts).map(([a, b]) => ({
    key: `${ids[a]}-${ids[b]}`,
    x1: pts[a]!.x,
    y1: pts[a]!.y,
    x2: pts[b]!.x,
    y2: pts[b]!.y,
    team,
  }))
}

const lines = computed<Line[]>(() => {
  if (mode.value === 'full') {
    return linesFor(slots.value.slice(0, going.value.length), going.value.map(p => p.id), 'all')
  }
  if (mode.value === 'teams') {
    return [
      ...linesFor(darkPts.value, dark.value.map(p => p.id), 'dark'),
      ...linesFor(lightPts.value, light.value.map(p => p.id), 'light'),
    ]
  }
  return []
})

// Remontar el grupo repite el dibujo cada vez que la constelación cambia de forma.
const linesKey = computed(() => `${mode.value}:${lines.value.map(l => l.key).join('|')}`)

// --- Textos ------------------------------------------------------------------

const missing = computed(() => Math.max(0, capacity.value - going.value.length))
const subs = computed(() => Math.max(0, going.value.length - capacity.value))

const caption = computed(() => {
  if (mode.value === 'teams') {
    const rest = loose.value.length ? ` · ${loose.value.length} sin equipo` : ''
    return `Oscuro vs Claro · ${dark.value.length} contra ${light.value.length}${rest}`
  }
  if (mode.value === 'full') {
    return subs.value
      ? `Completo · ${subs.value} ${subs.value === 1 ? 'suplente' : 'suplentes'}`
      : `Completo · ${going.value.length} de ${capacity.value}`
  }
  return `${going.value.length} de ${capacity.value} confirmados · faltan ${missing.value}`
})

const summary = computed(() => {
  if (mode.value === 'teams') {
    return `Equipos sorteados: ${dark.value.length} contra ${light.value.length}`
  }
  const base = `${going.value.length} de ${capacity.value} confirmados`
  return maybe.value.length ? `${base}, ${maybe.value.length} quizás` : base
})

// --- Llegadas ------------------------------------------------------------

// Solo las estrellas que llegan mientras alguien está mirando tienen el destello.
const fresh = ref<Set<string>>(new Set())

watch(
  () => going.value.map(p => p.id),
  (now, before) => {
    const known = new Set(before)
    const added = now.filter(id => !known.has(id))
    if (!added.length) return
    fresh.value = new Set([...fresh.value, ...added])
    setTimeout(() => {
      const next = new Set(fresh.value)
      added.forEach(id => next.delete(id))
      fresh.value = next
    }, 1100)
  },
)
</script>

<template>
  <figure class="cst" :class="`cst--${mode}`">
    <ConstellationSky :stars="stars" :label="summary" :width="W" :height="H" :fresh="fresh">
      <!-- Lugares vacíos por llenar -->
      <g aria-hidden="true">
        <circle
          v-for="(p, i) in openSlots"
          :key="`slot-${i}`"
          class="cst__slot"
          :cx="p.x"
          :cy="p.y"
          r="3.8"
        />
      </g>

      <!-- Líneas de la constelación -->
      <g :key="linesKey" class="cst__lines" aria-hidden="true">
        <line
          v-for="l in lines"
          :key="l.key"
          :class="`cst__line cst__line--${l.team}`"
          :x1="l.x1"
          :y1="l.y1"
          :x2="l.x2"
          :y2="l.y2"
          pathLength="1"
        />
      </g>

      <!-- Enfrentamiento -->
      <Transition name="cst-fade">
        <g v-if="mode === 'teams'" class="cst__versus" aria-hidden="true">
          <text x="200" y="106" class="cst__vs">VS</text>
          <text x="100" y="193" class="cst__team">Oscuro</text>
          <text x="300" y="193" class="cst__team">Claro</text>
        </g>
      </Transition>
    </ConstellationSky>

    <figcaption class="cst__caption">
      <span class="pl-eyebrow cst__status pl-numeric">{{ caption }}</span>
      <span v-if="maybe.length" class="cst__maybe pl-numeric">
        <span class="cst__maybe-dot" aria-hidden="true" />
        {{ maybe.length }} quizás
      </span>
    </figcaption>
  </figure>
</template>

<style scoped>
.cst {
  margin: 1.1rem 0 0;
}

/* --- Lugares vacíos --------------------------------------------------------- */

.cst__slot {
  fill: none;
  stroke: var(--pl-ink-faint);
  stroke-width: 1;
  stroke-dasharray: 2.4 2.2;
  opacity: 0.9;
}

/* --- Líneas ------------------------------------------------------------------ */

.cst__line {
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: cst-draw 1100ms cubic-bezier(0.45, 0, 0.2, 1) forwards;
}

.cst__line--all {
  stroke: rgba(var(--v-theme-primary), 0.55);
}
.cst__line--dark {
  stroke: rgba(var(--v-theme-primary), 0.5);
}
.cst__line--light {
  stroke: rgba(var(--v-theme-on-background), 0.35);
}

/* En el dibujo, se espera a que las estrellas lleguen antes a su lado. */
.cst--teams .cst__line {
  animation-delay: 650ms;
}

@keyframes cst-draw {
  to {
    stroke-dashoffset: 0;
  }
}

/* --- Enfrentamiento --------------------------------------------------------- */

.cst__vs {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 34px;
  letter-spacing: 0.02em;
  fill: var(--pl-ink-dim);
  text-anchor: middle;
}

.cst__team {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  fill: var(--pl-ink-faint);
  text-anchor: middle;
}

.cst-fade-enter-active {
  transition: opacity 400ms ease 500ms;
}
.cst-fade-leave-active {
  transition: opacity 200ms ease;
}
.cst-fade-enter-from,
.cst-fade-leave-to {
  opacity: 0;
}

/* --- Leyenda ----------------------------------------------------------------- */

.cst__caption {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  margin-top: 0.5rem;
}

.cst--full .cst__status,
.cst--teams .cst__status {
  color: var(--pl-accent);
}

.cst__maybe {
  flex: none;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.76rem;
  color: var(--pl-ink-faint);
}

.cst__maybe-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--pl-ink-dim);
  opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
  .cst__line {
    animation: none;
    stroke-dashoffset: 0;
  }
  .cst-fade-enter-active,
  .cst-fade-leave-active {
    transition: none;
  }
}
</style>
