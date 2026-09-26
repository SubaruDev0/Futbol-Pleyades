<script setup lang="ts">
const props = defineProps<{
  match: {
    id: string
    slug: string
    kickoffAt: string
    format: string
    capacity: number
    status: string
    fieldLabel: string | null
    totalCost: number | null
    groupName: string
    venueName: string | null
    going: number
    myStatus: string | null
    myPaid: boolean | null
    toReview?: number
  }
}>()

const m = computed(() => props.match)

const edge = computed(() => {
  if (m.value.myStatus === 'voy') return 'pl-edge--in'
  if (m.value.myStatus === 'no_voy') return 'pl-edge--out'
  if (m.value.myStatus === 'quizas') return 'pl-edge--maybe'
  return 'pl-edge--empty'
})

const badge = computed(() => {
  if (m.value.status === 'cancelado') return { class: 'pl-badge--off', text: 'Cancelado' }
  if (m.value.going >= m.value.capacity) return { class: 'pl-badge--full', text: 'Completo' }
  return { class: 'pl-badge--open', text: 'Faltan ' + (m.value.capacity - m.value.going) }
})

const perPlayer = computed(() =>
  m.value.totalCost && m.value.going ? Math.ceil(m.value.totalCost / m.value.going) : null,
)

// Una celda por cupo en la planilla. Un medidor que se puede contar, no una barra de progreso.
const slots = computed(() =>
  Array.from({ length: m.value.capacity }, (_, i) => i < m.value.going),
)
</script>

<template>
  <NuxtLink :to="`/partido/${m.slug}`" class="pl-card pl-panel pl-edge" :class="edge">
    <div class="pl-card__when">
      <span class="pl-display pl-card__day">{{ matchDay(m.kickoffAt) }}</span>
      <span class="pl-display pl-card__time pl-numeric">{{ matchTime(m.kickoffAt) }}</span>
    </div>

    <div class="pl-card__where">
      <p class="pl-card__venue">
        <template v-if="m.venueName">
          {{ m.venueName }}
          <span v-if="m.fieldLabel" class="pl-card__field">· {{ m.fieldLabel }}</span>
        </template>
        <template v-else>{{ m.fieldLabel ?? 'Cancha por definir' }}</template>
      </p>
      <p class="pl-card__meta">
        {{ m.groupName }} · {{ FORMAT_LABEL[m.format] }} · {{ countdown(m.kickoffAt) }}
      </p>
    </div>

    <div class="pl-card__badges">
      <span class="pl-badge" :class="badge.class"><span>{{ badge.text }}</span></span>
      <span v-if="m.toReview" class="pl-badge pl-badge--live">
        <span class="pl-numeric">{{ m.toReview }} por revisar</span>
      </span>
    </div>

    <div class="pl-card__foot">
      <div class="pl-gauge" :aria-label="`${m.going} de ${m.capacity} anotados`">
        <span
          v-for="(filled, i) in slots"
          :key="i"
          class="pl-gauge__slot"
          :class="{ 'pl-gauge__slot--on': filled }"
        />
      </div>
      <span class="pl-card__count pl-numeric">
        {{ m.going }}/{{ m.capacity }}
        <template v-if="perPlayer"> · {{ clp(perPlayer) }} c/u</template>
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.pl-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 0.35rem 1.1rem;
  padding: 1rem 1.1rem;
  text-decoration: none;
  color: inherit;
  transition: background-color 120ms ease;
}

.pl-card:hover {
  background: var(--pl-raised);
}

.pl-card__when {
  display: flex;
  flex-direction: column;
  min-width: 5.5rem;
}

.pl-card__day {
  font-size: 1.05rem;
  color: var(--pl-ink-dim);
  letter-spacing: 0.06em;
}

.pl-card__time {
  font-size: 2.1rem;
  line-height: 1;
}

.pl-card__venue {
  margin: 0.15rem 0 0.2rem;
  font-weight: 600;
  font-size: 1.02rem;
}

.pl-card__field {
  color: var(--pl-ink-dim);
  font-weight: 500;
}

.pl-card__meta {
  margin: 0;
  font-size: 0.84rem;
  color: var(--pl-ink-dim);
}

.pl-card__badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
}

.pl-card__foot {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--pl-line);
}

.pl-gauge {
  display: flex;
  gap: 3px;
  flex: 1;
}

.pl-gauge__slot {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.09);
}

.pl-gauge__slot--on {
  background: var(--pl-turf);
}

.pl-card__count {
  font-size: 0.82rem;
  color: var(--pl-ink-dim);
  white-space: nowrap;
}

@media (max-width: 520px) {
  .pl-card__time {
    font-size: 1.7rem;
  }
  .pl-card__when {
    min-width: 4.5rem;
  }
}
</style>
