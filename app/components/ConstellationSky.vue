<script setup lang="ts">
/**
 * Un pequeño cielo de estrellas nombradas: el dibujo compartido por las
 * constelaciones de partido y grupo. Quien lo usa decide dónde va cada estrella
 * (utils/constellation.ts) y puede dibujar SVG extra debajo mediante el slot por defecto.
 */
import type { SkyStar } from '~/utils/constellation'

const props = withDefaults(defineProps<{
  stars: SkyStar[]
  /** Resumen leído por lectores de pantalla para todo el cielo. */
  label: string
  width?: number
  height?: number
  /** Ids que acaban de llegar y reciben el efecto de aparición + destello. */
  fresh?: Set<string>
}>(), { width: 400, height: 200, fresh: () => new Set<string>() })

const active = ref<string | null>(null)
const activeStar = computed(() => props.stars.find(s => s.id === active.value) ?? null)

const labelStyle = computed(() => {
  const s = activeStar.value
  if (!s) return {}
  const shiftX = s.x < 70 ? '-12%' : s.x > props.width - 70 ? '-88%' : '-50%'
  const below = s.y < 40
  return {
    left: `${(s.x / props.width) * 100}%`,
    top: `${(s.y / props.height) * 100}%`,
    transform: `translate(${shiftX}, ${below ? '14px' : 'calc(-100% - 12px)'})`,
  }
})

function toggle(id: string) {
  active.value = active.value === id ? null : id
}
</script>

<template>
  <div class="cst-sky">
    <svg
      class="cst-sky__svg"
      :viewBox="`0 0 ${width} ${height}`"
      role="group"
      :aria-label="label"
      @click.self="active = null"
    >
      <slot />

      <g
        v-for="s in stars"
        :key="s.id"
        class="cst-star"
        :class="[`cst-star--${s.tone}`, { 'cst-star--on': active === s.id }]"
        :style="{ transform: `translate(${s.x}px, ${s.y}px)` }"
        role="img"
        :aria-label="s.label"
        tabindex="0"
        @mouseenter="active = s.id"
        @mouseleave="active = null"
        @focus="active = s.id"
        @blur="active = null"
        @click.stop="toggle(s.id)"
        @keydown.enter.prevent.stop="toggle(s.id)"
      >
        <circle class="cst-star__hit" r="11" />
        <circle v-if="s.tone === 'bright'" class="cst-star__halo cst-star__halo--wide" :r="s.r * 4.2" />
        <circle v-if="s.tone === 'bright' || s.tone === 'dark'" class="cst-star__halo" :r="s.r * 2.3" />
        <circle v-if="fresh.has(s.id)" class="cst-star__flare" :r="s.r" />
        <circle class="cst-star__core" :class="{ 'cst-star__core--fresh': fresh.has(s.id) }" :r="s.r" />
      </g>
    </svg>

    <Transition name="cst-sky-label">
      <p v-if="activeStar" class="cst-sky__label" :style="labelStyle" aria-hidden="true">
        {{ activeStar.label }}
      </p>
    </Transition>
  </div>
</template>

<style scoped>
.cst-sky {
  position: relative;
}

.cst-sky__svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: 280px;
  overflow: visible;
}

/* --- Estrellas -------------------------------------------------------------- */

.cst-star {
  cursor: pointer;
  outline: none;
  transition: transform 750ms cubic-bezier(0.65, 0, 0.25, 1);
}

.cst-star__hit {
  fill: transparent;
}

/* Las estrellas brillan un poco en vez de ser discos planos. */
.cst-star__core {
  fill: var(--pl-ink);
  filter: drop-shadow(0 0 2px rgba(var(--v-theme-on-background), 0.55));
  transition:
    fill 500ms ease,
    opacity 500ms ease;
}

.cst-star__halo {
  fill: var(--pl-accent);
  opacity: 0.1;
  transition: opacity 500ms ease;
}

.cst-star--bright .cst-star__core {
  fill: var(--pl-accent);
  filter: drop-shadow(0 0 4px rgba(var(--v-theme-primary), 0.95));
}
.cst-star--bright .cst-star__halo {
  opacity: 0.14;
}
.cst-star--bright .cst-star__halo--wide {
  opacity: 0.05;
}

.cst-star--dark .cst-star__core {
  fill: var(--pl-accent);
  filter: drop-shadow(0 0 3px rgba(var(--v-theme-primary), 0.8));
}
.cst-star--dark .cst-star__halo {
  opacity: 0.08;
}

.cst-star--light .cst-star__core {
  fill: var(--pl-ink);
}

.cst-star--loose .cst-star__core {
  fill: var(--pl-ink-dim);
  opacity: 0.6;
  filter: none;
}

.cst-star--maybe .cst-star__core {
  fill: var(--pl-ink-dim);
  opacity: 0.45;
  filter: none;
}

.cst-star:hover .cst-star__core,
.cst-star--on .cst-star__core {
  opacity: 1;
}

.cst-star:focus-visible .cst-star__hit {
  stroke: var(--pl-accent);
  stroke-width: 1.5;
}

/* Una estrella nueva: aparece con un breve destello. */
.cst-star__core--fresh {
  transform-box: fill-box;
  transform-origin: center;
  animation: cst-pop 650ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.cst-star__flare {
  fill: none;
  stroke: var(--pl-accent);
  stroke-width: 1.2;
  transform-box: fill-box;
  transform-origin: center;
  animation: cst-flare 900ms ease-out both;
}

@keyframes cst-pop {
  0% {
    transform: scale(0);
  }
  55% {
    transform: scale(1.8);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes cst-flare {
  from {
    transform: scale(1);
    opacity: 0.9;
  }
  to {
    transform: scale(6);
    opacity: 0;
  }
}

/* --- Etiqueta de nombre ------------------------------------------------------ */

.cst-sky__label {
  position: absolute;
  margin: 0;
  padding: 0.2rem 0.5rem;
  background: var(--pl-raised);
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink);
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1;
}

.cst-sky-label-enter-active {
  transition: opacity 120ms ease;
}
.cst-sky-label-leave-active {
  transition: opacity 200ms ease;
}
.cst-sky-label-enter-from,
.cst-sky-label-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .cst-star,
  .cst-star__core,
  .cst-star__halo,
  .cst-sky-label-enter-active,
  .cst-sky-label-leave-active {
    transition: none;
  }
  .cst-star__core--fresh {
    animation: none;
  }
  .cst-star__flare {
    display: none;
  }
}
</style>
