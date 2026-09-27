<script setup lang="ts">
/**
 * El cielo detrás de cada pantalla: un baño de foco arriba, la marca en
 * vertical por los márgenes y el cúmulo de las Pléyades anclado arriba a la
 * derecha, con su forma real del cielo. Estático a propósito: sin animación
 * ni elementos al azar.
 */
</script>

<template>
  <div class="pl-sky" aria-hidden="true">
    <span class="pl-sky__word pl-sky__word--left">Pleyades</span>
    <span class="pl-sky__word pl-sky__word--right">Pleyades</span>

    <div class="pl-sky__cluster-wrap">
      <svg viewBox="0 0 640 400" preserveAspectRatio="xMaxYMin meet" class="pl-sky__cluster">
        <line v-for="(l, i) in CLUSTER_LINES" :key="i" v-bind="l" />
        <circle
          v-for="s in SISTERS"
          :key="s.name"
          :cx="s.x"
          :cy="s.y"
          :r="s.r"
          class="pl-sky__star"
          :class="{ 'pl-sky__star--main': s.name === ALCYONE }"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.pl-sky {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  background:
    radial-gradient(ellipse 62% 48% at 50% -8%, rgba(var(--v-theme-on-background), 0.075), transparent 72%),
    radial-gradient(ellipse 120% 70% at 50% -20%, rgba(var(--v-theme-surface-bright), 0.9), transparent 70%);
}

/* La marca en vertical por los márgenes, como una gráfica de transmisión. */
.pl-sky__word {
  position: absolute;
  top: 50%;
  font-family: var(--font-display);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5em;
  font-size: clamp(2.2rem, 4.4vw, 3.6rem);
  line-height: 1;
  color: rgba(var(--v-theme-on-background), 0.045);
  white-space: nowrap;
  user-select: none;
}

.pl-sky__word--left {
  left: 0.6rem;
  writing-mode: vertical-rl;
  transform: translateY(-50%) rotate(180deg);
}

.pl-sky__word--right {
  right: 0.6rem;
  writing-mode: vertical-rl;
  transform: translateY(-50%);
}

.pl-sky__cluster-wrap {
  position: absolute;
  top: 0;
  right: 0;
  width: min(46vw, 620px);
  height: min(38vh, 420px);
}

.pl-sky__cluster {
  width: 100%;
  height: 100%;
  display: block;
}

.pl-sky__cluster line {
  stroke: rgba(var(--v-theme-on-background), 0.22);
  stroke-width: 1;
}

.pl-sky__star {
  fill: var(--pl-ink);
  opacity: 0.9;
  filter: drop-shadow(0 0 5px rgba(var(--v-theme-on-background), 0.75));
}

.pl-sky__star--main {
  fill: var(--pl-accent);
  opacity: 1;
  filter: drop-shadow(0 0 10px rgba(var(--v-theme-primary), 0.9));
}

/* En celulares el cúmulo le quitaría aire al encabezado, y la marca vertical
   no cabe en los márgenes. */
@media (max-width: 900px) {
  .pl-sky__word {
    display: none;
  }
}

@media (max-width: 700px) {
  .pl-sky__cluster {
    opacity: 0.45;
  }
}
</style>
