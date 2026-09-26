<script setup lang="ts">
import { mdiMapMarkerOutline, mdiOpenInNew } from '@mdi/js'
import type { ConstellationPlayer } from '~/utils/constellation'

/** El marcador del partido: cuándo, la constelación de quiénes van, y los datos. */
defineProps<{
  kickoffAt: string | Date
  players: ConstellationPlayer[]
  capacity: number
  seed: string
  place: string
  address?: string | null
  mapsHref?: string | null
  format: string
  going: number
  perPlayer?: number | null
  notes?: string | null
}>()
</script>

<template>
  <header class="pl-panel pl-hero">
    <div class="pl-hero__when">
      <span class="pl-display pl-hero__day"><span class="pl-wipe">{{ matchDay(kickoffAt) }}</span></span>
      <span class="pl-display pl-hero__time pl-numeric">{{ matchTime(kickoffAt) }}</span>
    </div>

    <MatchConstellation :players="players" :capacity="capacity" :seed="seed" />

    <dl class="pl-facts">
      <div>
        <dt class="pl-eyebrow">Cancha</dt>
        <dd>{{ place }}</dd>
        <dd v-if="address" class="pl-facts__sub">{{ address }}</dd>
        <dd v-if="mapsHref" class="pl-facts__sub">
          <a :href="mapsHref" target="_blank" rel="noopener" class="pl-maplink">
            <v-icon :icon="mdiMapMarkerOutline" size="15" />
            <span>Cómo llegar</span>
            <v-icon :icon="mdiOpenInNew" size="13" class="pl-maplink__ext" />
          </a>
        </dd>
      </div>
      <div>
        <dt class="pl-eyebrow">Formato</dt>
        <dd>{{ FORMAT_LABEL[format] }} · {{ going }}/{{ capacity }}</dd>
      </div>
      <div v-if="perPlayer">
        <dt class="pl-eyebrow">Por jugador</dt>
        <dd class="pl-numeric">{{ clp(perPlayer) }}</dd>
      </div>
    </dl>

    <p v-if="notes" class="pl-hero__notes">{{ notes }}</p>
  </header>
</template>

<style scoped>
.pl-hero {
  padding: 1.4rem;
  margin-bottom: 0.85rem;
}

.pl-hero__when {
  display: flex;
  align-items: baseline;
  gap: 0.9rem;
  flex-wrap: wrap;
}

.pl-hero__day {
  font-size: 1.5rem;
  color: var(--pl-ink-dim);
  letter-spacing: 0.05em;
}

.pl-hero__time {
  font-size: clamp(3rem, 14vw, 4.5rem);
  line-height: 0.85;
}

.pl-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 1.6rem;
  margin: 1.4rem 0 0;
  padding-top: 1.1rem;
  border-top: 1px solid var(--pl-line);
}

.pl-facts dd {
  margin: 0.25rem 0 0;
  font-weight: 600;
}

.pl-facts .pl-facts__sub {
  margin-top: 0.15rem;
  font-weight: 400;
  font-size: 0.84rem;
  color: var(--pl-ink-dim);
}

.pl-maplink {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--pl-accent);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
  text-decoration: none;
}

.pl-maplink:hover span {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.pl-maplink__ext {
  opacity: 0.7;
}

.pl-hero__notes {
  margin: 1rem 0 0;
  color: var(--pl-ink-dim);
  font-size: 0.9rem;
}
</style>
