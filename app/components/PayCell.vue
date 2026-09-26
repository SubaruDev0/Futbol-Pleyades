<script setup lang="ts">
/** El extremo de pago de una fila de la planilla: una etiqueta de estado, más el toggle manual de quien cobra. */
const props = defineProps<{
  paid: boolean
  receipt: { id: string | null, status: string } | null
  canSettle: boolean
  collects?: boolean
  busy?: boolean
}>()
const emit = defineEmits<{ toggle: [], review: [] }>()

const pending = computed(() => !props.paid && props.receipt?.status === 'pendiente')
const rejected = computed(() => !props.paid && props.receipt?.status === 'rechazado')
</script>

<template>
  <span v-if="collects" class="pl-paycell">
    <span class="pl-paystate pl-paystate--collects">Cobra</span>
  </span>
  <span v-else class="pl-paycell">
    <button
      v-if="pending && canSettle && receipt?.id"
      type="button"
      class="pl-paystate pl-paystate--review pl-paystate--action"
      @click="emit('review')"
    >
      En revisión
    </button>
    <span v-else-if="pending" class="pl-paystate pl-paystate--review">En revisión</span>
    <span v-else-if="rejected" class="pl-paystate pl-paystate--rejected">Rechazado</span>

    <button
      v-if="canSettle && !pending"
      type="button"
      class="pl-paid-toggle"
      :class="{ 'pl-paid-toggle--on': paid }"
      :disabled="busy"
      :aria-pressed="paid"
      @click="emit('toggle')"
    >
      {{ paid ? 'Pagó' : 'Debe' }}
    </button>
    <span v-else-if="paid" class="pl-paystate pl-paystate--paid">Pagó</span>
  </span>
</template>

<style scoped>
.pl-paycell {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.pl-paystate {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  white-space: nowrap;
}

.pl-paystate--paid {
  color: var(--pl-turf);
}

.pl-paystate--collects {
  color: var(--pl-accent);
}

.pl-paystate--review {
  color: var(--pl-amber);
}

.pl-paystate--rejected {
  color: var(--pl-red);
}

.pl-paystate--action {
  padding: 0.2rem 0.45rem;
  background: rgba(var(--v-theme-warning), 0.12);
  border: 1px solid rgba(var(--v-theme-warning), 0.45);
  cursor: pointer;
}

.pl-paid-toggle {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.76rem;
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--pl-line-strong);
  background: transparent;
  color: var(--pl-ink-faint);
  cursor: pointer;
}

.pl-paid-toggle--on {
  border-color: var(--pl-turf);
  color: var(--pl-turf);
  background: rgba(var(--v-theme-success), 0.12);
}
</style>
