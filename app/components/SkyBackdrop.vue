<script setup lang="ts">
/**
 * El cielo detrás de cada pantalla: negro plano, con la marca en vertical por
 * los márgenes. Estático a propósito: sin animación ni elementos al azar.
 */
</script>

<template>
  <div class="pl-sky" aria-hidden="true">
    <span class="pl-sky__word pl-sky__word--left">Pleyades</span>
    <span class="pl-sky__word pl-sky__word--right">Pleyades</span>
  </div>
</template>

<style scoped>
.pl-sky {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
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

/* En celulares la marca vertical no cabe en los márgenes. */
@media (max-width: 900px) {
  .pl-sky__word {
    display: none;
  }
}
</style>
