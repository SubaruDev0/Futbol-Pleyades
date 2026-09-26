<script setup lang="ts">
/**
 * Cancha nocturna vista desde las tribunas: línea de medio campo y círculo
 * central dibujados una vez, bajo un solo baño de foco. Estático a propósito
 * — queda detrás de cada pantalla.
 */
const PITCH = { left: 150, right: 1450, top: -200, bottom: 1400 }
const HALFWAY = 540
const CENTRE = { x: 800, r: 175 }
</script>

<template>
  <div class="pl-sky" aria-hidden="true">
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMin slice" class="pl-sky__pitch">
      <rect
        :x="PITCH.left"
        :y="PITCH.top"
        :width="PITCH.right - PITCH.left"
        :height="PITCH.bottom - PITCH.top"
      />
      <line :x1="PITCH.left" :y1="HALFWAY" :x2="PITCH.right" :y2="HALFWAY" />
      <circle :cx="CENTRE.x" :cy="HALFWAY" :r="CENTRE.r" />
      <circle :cx="CENTRE.x" :cy="HALFWAY" r="3" class="pl-sky__spot" />
    </svg>
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

.pl-sky__pitch {
  width: 100%;
  height: 100%;
  display: block;
  fill: none;
  stroke: rgba(var(--v-theme-on-background), 0.05);
  stroke-width: 1.5;
  -webkit-mask-image: linear-gradient(to bottom, black 55%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 55%, transparent 100%);
}

.pl-sky__pitch * {
  vector-effect: non-scaling-stroke;
}

.pl-sky__spot {
  fill: rgba(var(--v-theme-on-background), 0.08);
  stroke: none;
}
</style>
