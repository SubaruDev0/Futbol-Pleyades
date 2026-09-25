<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 26 })

// The seven sisters, laid out as the cluster actually sits in the sky.
// Alcyone is the bright one, so it carries the accent.
const STARS = [
  { x: 12, y: 9, r: 1.6, name: 'Taygeta' },
  { x: 21, y: 6, r: 1.5, name: 'Maia' },
  { x: 9, y: 19, r: 1.7, name: 'Electra' },
  { x: 26, y: 16, r: 2.9, name: 'Alcyone' },
  { x: 18, y: 25, r: 1.6, name: 'Merope' },
  { x: 34, y: 12, r: 1.4, name: 'Pleione' },
  { x: 35, y: 23, r: 1.9, name: 'Atlas' },
]
</script>

<template>
  <svg
    :width="size * 1.5"
    :height="size"
    viewBox="0 0 44 32"
    fill="none"
    role="img"
    aria-label="Pléyades"
  >
    <circle
      v-for="s in STARS"
      :key="s.name"
      :cx="s.x"
      :cy="s.y"
      :r="s.r"
      :fill="s.name === 'Alcyone' ? '#CCFF00' : '#E8EDE6'"
      :opacity="s.name === 'Alcyone' ? 1 : 0.72"
    />
  </svg>
</template>
