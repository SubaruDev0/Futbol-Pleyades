<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 26 })

// Misma forma que dibuja el fondo, a escala de logo: el cúmulo real, con
// Alcyone (la más brillante) llevando el color de acento.
</script>

<template>
  <svg
    :width="size * 1.6"
    :height="size"
    viewBox="0 0 640 400"
    fill="none"
    role="img"
    aria-label="Pleyades"
  >
    <circle
      v-for="s in SISTERS"
      :key="s.name"
      :cx="s.x"
      :cy="s.y"
      :r="s.r * 3.4"
      :style="{ fill: s.name === ALCYONE ? 'var(--pl-accent)' : 'var(--pl-ink)' }"
      :opacity="s.name === ALCYONE ? 1 : 0.72"
    />
  </svg>
</template>
