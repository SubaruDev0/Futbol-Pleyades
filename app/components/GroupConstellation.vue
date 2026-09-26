<script setup lang="ts">
import ConstellationSky from '~/components/ConstellationSky.vue'
import { starCluster, starHash, starSize } from '~/utils/constellation'
import type { SkyStar } from '~/utils/constellation'

/**
 * El grupo como un cúmulo de estrellas: cada miembro es una estrella, el
 * organizador es la brillante. Un grupo nunca "se llena", así que sus
 * estrellas nunca se unen con líneas.
 */
const props = defineProps<{
  groupId: string
  /** Organizadores primero: el primero ocupa el centro. */
  members: { id: string, name: string, role: string }[]
}>()

const W = 400
const H = 190

const stars = computed<SkyStar[]>(() => {
  const n = props.members.length
  // Un grupo chico es un cúmulo compacto, no tres puntos perdidos en el cielo.
  const rx = Math.min(172, 40 + n * 14)
  const ry = Math.min(78, 22 + n * 7)
  const pts = starCluster(n, 200, 95, rx, ry, starHash(props.groupId))
  return props.members.map((m, i) => {
    const org = m.role === 'organizador'
    return {
      id: m.id,
      ...pts[i]!,
      r: org ? 5 : starSize(m.id, 3.1),
      tone: org ? 'bright' : 'voy',
      label: org ? `${m.name} · organiza` : m.name,
    }
  })
})

const summary = computed(() => {
  const n = props.members.length
  return `${n} ${n === 1 ? 'miembro' : 'miembros'} en el grupo`
})
</script>

<template>
  <ConstellationSky :stars="stars" :label="summary" :width="W" :height="H" />
</template>
