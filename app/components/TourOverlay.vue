<script setup lang="ts">
import { mdiClose } from '@mdi/js'

const { active, steps, index, tutorial, chooser, next, prev, stop, close } = useTour()
const route = useRoute()

const step = computed(() => steps.value[index.value])
const isLast = computed(() => index.value === steps.value.length - 1)

function otherTutorial() {
  stop()
  chooser.value = true
}

const PAD = 6
const GAP = 14
const EDGE = 16
/** Libre del encabezado sticky y de la barra "Ejemplo" del tutorial debajo de él. */
const TOP = 100

const hole = ref<{ top: number, left: number, width: number, height: number } | null>(null)
const popStyle = ref<Record<string, string>>({})
const pop = ref<HTMLElement | null>(null)
const nextBtn = ref<HTMLButtonElement | null>(null)
const ctaLink = ref<{ $el: Element } | null>(null)

let raf = 0
let settleTimer: ReturnType<typeof setTimeout> | undefined
let returnFocus: HTMLElement | null = null

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function target(): HTMLElement | null {
  if (!step.value) return null
  const el = document.querySelector(step.value.target)
  return el instanceof HTMLElement ? el : null
}

function measure() {
  const el = target()
  if (!el) {
    hole.value = null
    return
  }
  const r = el.getBoundingClientRect()
  hole.value = {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  }
  placePopover()
}

function placePopover() {
  const h = hole.value
  if (!h) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(360, vw - EDGE * 2)
  const popH = pop.value?.offsetHeight ?? 190

  // Píxeles enteros: los desplazamientos fraccionarios hacen que las marcas finas de progreso salten de forma dispareja.
  const left = Math.round(Math.min(Math.max(h.left + h.width / 2 - width / 2, EDGE), vw - width - EDGE))
  const below = Math.round(h.top + h.height + GAP)
  const above = Math.round(h.top - GAP - popH)

  if (below + popH <= vh - EDGE) {
    popStyle.value = { width: `${width}px`, left: `${left}px`, top: `${below}px` }
  }
  else if (above >= TOP) {
    popStyle.value = { width: `${width}px`, left: `${left}px`, top: `${above}px` }
  }
  else {
    // Objetivo alto en una pantalla de teléfono corta: se ancla la tarjeta al borde inferior.
    popStyle.value = { width: `${width}px`, left: `${left}px`, bottom: `${EDGE}px` }
  }
}

function schedule() {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(measure)
}

/**
 * Trae el objetivo a la vista con espacio para la tarjeta debajo: el par se
 * centra cuando cabe, si no, la parte superior del objetivo queda bajo el encabezado.
 */
function scrollToTarget(el: HTMLElement): boolean {
  // Dentro de un diálogo la página de atrás no mueve el objetivo.
  if (el.closest('.v-overlay__content')) return false
  const r = el.getBoundingClientRect()
  const vh = window.innerHeight
  const popH = pop.value?.offsetHeight ?? 190
  const block = r.height + PAD * 2 + GAP + popH
  const room = vh - TOP - EDGE
  const want = block <= room ? TOP + PAD + (room - block) / 2 : TOP + PAD
  const delta = r.top - want
  if (Math.abs(delta) < 24) return false
  window.scrollTo({ top: window.scrollY + delta, behavior: reducedMotion() ? 'auto' : 'smooth' })
  return true
}

// El demo cambia de tamaño bajo el resaltado (un estado de pago, los equipos): se le sigue.
let targetObs: ResizeObserver | undefined
function watchTarget(el: HTMLElement | null) {
  targetObs?.disconnect()
  if (el && typeof ResizeObserver !== 'undefined') {
    targetObs = new ResizeObserver(() => schedule())
    targetObs.observe(el)
  }
}

let retryTimer: ReturnType<typeof setTimeout> | undefined

async function focusStep(attempt = 0) {
  clearTimeout(retryTimer)
  // Se deja que el demo renderice el estado de este paso antes de medirlo.
  await nextTick()
  const el = target()
  watchTarget(el)
  if (!el) {
    hole.value = null
    // Un diálogo en el demo se monta un instante después: se reintenta un momento.
    if (attempt < 8) retryTimer = setTimeout(() => focusStep(attempt + 1), 100)
    return
  }
  scrollToTarget(el)
  measure()
  // El scroll suave sigue moviéndose un momento; se vuelve a medir una vez que se asienta.
  clearTimeout(settleTimer)
  // Los diálogos se deslizan sin hacer scroll de nada, así que siempre se revisa una vez más.
  settleTimer = setTimeout(measure, reducedMotion() ? 40 : 520)
  const main = nextBtn.value ?? (ctaLink.value?.$el as HTMLElement | undefined)
  main?.focus({ preventScroll: true })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowRight') next()
  else if (e.key === 'ArrowLeft') prev()
}

function detach() {
  window.removeEventListener('resize', schedule)
  window.removeEventListener('scroll', schedule, true)
  window.removeEventListener('keydown', onKey)
  targetObs?.disconnect()
}

watch(active, (on) => {
  if (!import.meta.client) return
  if (on) {
    returnFocus = document.activeElement as HTMLElement | null
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('keydown', onKey)
    focusStep()
  }
  else {
    detach()
    hole.value = null
    returnFocus?.focus?.({ preventScroll: true })
  }
})

// La tarjeta cambia de altura entre pasos; se mantiene alejada del resaltado.
let resizeObs: ResizeObserver | undefined
watch(pop, (el) => {
  resizeObs?.disconnect()
  if (el && typeof ResizeObserver !== 'undefined') {
    resizeObs = new ResizeObserver(() => placePopover())
    resizeObs.observe(el)
  }
})

watch(index, () => {
  if (active.value) focusStep()
})

// El tour vive en /tutorial; salir de ahí termina el tour. Los cambios de query no cuentan.
watch(() => route.path, () => stop())

onBeforeUnmount(() => {
  stop()
  resizeObs?.disconnect()
  cancelAnimationFrame(raf)
  clearTimeout(settleTimer)
  clearTimeout(retryTimer)
  if (import.meta.client) detach()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="pl-tour">
      <div
        v-if="active && step"
        class="pl-tour"
        @click.self.prevent
      >
        <div
          v-if="hole"
          class="pl-tour__hole"
          :style="{
            top: `${hole.top}px`,
            left: `${hole.left}px`,
            width: `${hole.width}px`,
            height: `${hole.height}px`,
          }"
        />

        <div
          ref="pop"
          class="pl-tour__card"
          :style="popStyle"
          role="dialog"
          aria-modal="true"
          :aria-label="`Tutorial, paso ${index + 1} de ${steps.length}`"
        >
          <div class="pl-tour__top">
            <span class="pl-tour__count pl-numeric">
              <strong>{{ String(index + 1).padStart(2, '0') }}</strong>
              / {{ String(steps.length).padStart(2, '0') }}
            </span>
            <button type="button" class="pl-tour__close" aria-label="Cerrar tutorial" @click="close">
              <v-icon :icon="mdiClose" size="18" />
            </button>
          </div>

          <Transition name="pl-swap" mode="out-in">
            <div :key="index">
              <h2 class="pl-display pl-tour__title">{{ step.title }}</h2>
              <p class="pl-tour__text">{{ step.text }}</p>
            </div>
          </Transition>

          <div class="pl-tour__progress" aria-hidden="true">
            <span
              v-for="(_, i) in steps"
              :key="i"
              :class="{ 'pl-tour__tick--on': i <= index }"
              class="pl-tour__tick"
            />
          </div>

          <div class="pl-tour__actions">
            <button
              type="button"
              class="pl-tour__btn"
              :disabled="index === 0"
              @click="prev"
            >
              Anterior
            </button>
            <NuxtLink
              v-if="isLast && tutorial"
              ref="ctaLink"
              :to="tutorial.cta.to"
              class="pl-tour__btn pl-tour__btn--main"
            >
              {{ tutorial.cta.label }}
            </NuxtLink>
            <button
              v-else
              ref="nextBtn"
              type="button"
              class="pl-tour__btn pl-tour__btn--main"
              @click="next"
            >
              Siguiente
            </button>
          </div>
          <button v-if="isLast" type="button" class="pl-tour__other" @click="otherTutorial">
            Ver otro tutorial
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pl-tour {
  position: fixed;
  inset: 0;
  z-index: 3000;
}


/* El fondo oscurecido es la propia sombra del agujero, así el objetivo queda iluminado. */
.pl-tour__hole {
  position: fixed;
  box-shadow: 0 0 0 200vmax rgba(var(--v-theme-background), 0.78);
  outline: 2px solid var(--pl-accent);
  outline-offset: 0;
  pointer-events: none;
  transition:
    top 260ms cubic-bezier(0.2, 0.7, 0.2, 1),
    left 260ms cubic-bezier(0.2, 0.7, 0.2, 1),
    width 260ms cubic-bezier(0.2, 0.7, 0.2, 1),
    height 260ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.pl-tour__card {
  position: fixed;
  background: var(--pl-raised);
  border: 1px solid var(--pl-line-strong);
  border-top: 3px solid var(--pl-accent);
  padding: 0.85rem 1rem 1rem;
  color: var(--pl-ink);
  transition:
    top 260ms cubic-bezier(0.2, 0.7, 0.2, 1),
    left 260ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.pl-tour__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.pl-tour__count {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.12em;
  font-size: 0.8rem;
  color: var(--pl-ink-faint);
}

.pl-tour__count strong {
  color: var(--pl-accent);
  font-weight: 800;
}

.pl-tour__close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  margin: -6px -8px -6px 0;
  background: none;
  border: 0;
  color: var(--pl-ink-dim);
  cursor: pointer;
}

.pl-tour__title {
  font-size: 1.45rem;
  margin: 0 0 0.35rem;
}

.pl-tour__text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--pl-ink);
}

.pl-tour__progress {
  display: flex;
  gap: 3px;
  margin: 0.95rem 0 0.9rem;
}

.pl-tour__tick {
  flex: 1;
  height: 4px;
  background: var(--pl-line);
  transition: background-color 200ms ease;
}

.pl-tour__tick--on {
  background: var(--pl-accent);
}

.pl-tour__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.pl-tour__btn {
  display: grid;
  place-items: center;
  padding: 0 0.5rem;
  text-align: center;
  text-decoration: none;
  height: 42px;
  border: 1px solid var(--pl-line-strong);
  background: transparent;
  color: var(--pl-ink);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.88rem;
  cursor: pointer;
}

.pl-tour__btn:disabled {
  color: var(--pl-ink-faint);
  cursor: default;
}

.pl-tour__other {
  display: block;
  margin: 0.7rem auto -0.2rem;
  padding: 0.3rem 0.5rem;
  background: none;
  border: 0;
  color: var(--pl-ink-dim);
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
}

.pl-tour__other:hover {
  color: var(--pl-accent);
}

.pl-tour__btn--main {
  background: var(--pl-accent);
  border-color: var(--pl-accent);
  color: var(--pl-pitch);
}

.pl-tour-enter-active,
.pl-tour-leave-active {
  transition: opacity 200ms ease;
}

.pl-tour-enter-from,
.pl-tour-leave-to {
  opacity: 0;
}
</style>
