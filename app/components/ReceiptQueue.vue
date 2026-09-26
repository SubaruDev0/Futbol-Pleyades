<script setup lang="ts">
/** La lista de comprobantes de quien cobra, esperando revisión. */
defineProps<{
  items: { receiptId: string, playerId: string, name: string, guest: boolean, createdAt: string | Date }[]
  amount: number | null
}>()
const emit = defineEmits<{ open: [playerId: string] }>()
</script>

<template>
  <section class="pl-panel pl-review">
    <p class="pl-eyebrow pl-review__title">
      Comprobantes por revisar <span class="pl-numeric">({{ items.length }})</span>
    </p>
    <ul class="pl-review__list">
      <li v-for="r in items" :key="r.receiptId">
        <button type="button" class="pl-review__item" @click="emit('open', r.playerId)">
          <span class="pl-review__name">
            {{ r.name }}<span v-if="r.guest" class="pl-invited">invitado</span>
          </span>
          <span v-if="amount" class="pl-review__amount pl-numeric">{{ clp(amount) }}</span>
          <span class="pl-review__when">{{ ago(r.createdAt) }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.pl-invited {
  font-size: 0.72rem;
  color: var(--pl-ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-left: 0.4rem;
}

.pl-review {
  margin-bottom: 0.85rem;
  border-left: 3px solid var(--pl-amber);
}

.pl-review__title {
  margin: 0;
  padding: 0.9rem 1.1rem 0.6rem;
  color: var(--pl-amber);
}

.pl-review__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pl-review__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.9rem;
  width: 100%;
  padding: 0.75rem 1.1rem;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--pl-line);
  color: var(--pl-ink);
  text-align: left;
  cursor: pointer;
}

.pl-review__item:hover {
  background: var(--pl-raised);
}

.pl-review__name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl-review__amount {
  font-weight: 700;
}

.pl-review__when {
  font-size: 0.8rem;
  color: var(--pl-ink-dim);
  white-space: nowrap;
}
</style>
