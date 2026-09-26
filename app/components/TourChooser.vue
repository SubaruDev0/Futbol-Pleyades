<script setup lang="ts">
import { mdiChevronRight, mdiClose } from '@mdi/js'
import { TUTORIALS } from '~/utils/tour-steps'

/** El "Tutorial" del encabezado: elige uno de los tutoriales cortos. */
const tour = useTour()
</script>

<template>
  <v-dialog v-model="tour.chooser.value" max-width="480" scrollable>
    <section class="pl-modal" aria-labelledby="tour-chooser-title">
      <header class="pl-modal__head">
        <div>
          <p class="pl-eyebrow">Tutoriales</p>
          <h2 id="tour-chooser-title" class="pl-display pl-modal__title">¿Qué quieres ver?</h2>
        </div>
        <button type="button" class="pl-modal__close" aria-label="Cerrar" @click="tour.chooser.value = false">
          <v-icon :icon="mdiClose" size="20" />
        </button>
      </header>
      <ul class="pl-choose">
        <li v-for="t in TUTORIALS" :key="t.slug">
          <button type="button" class="pl-choose__item" @click="tour.open(t.slug)">
            <span class="pl-choose__text">
              <span class="pl-choose__title">{{ t.title }}</span>
              <span class="pl-choose__desc">{{ t.description }}</span>
            </span>
            <span class="pl-choose__count pl-numeric">{{ t.steps.length }} pasos</span>
            <v-icon :icon="mdiChevronRight" size="18" class="pl-choose__chev" />
          </button>
        </li>
      </ul>
    </section>
  </v-dialog>
</template>

<style scoped>
.pl-choose {
  list-style: none;
  margin: 0;
  padding: 0.3rem 0 0.6rem;
}

.pl-choose__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.8rem 1.2rem;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--pl-line);
  color: var(--pl-ink);
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.pl-choose__item:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}

.pl-choose__text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.pl-choose__title {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 1rem;
}

.pl-choose__item:hover .pl-choose__title {
  color: var(--pl-accent);
}

.pl-choose__desc {
  font-size: 0.85rem;
  line-height: 1.35;
  color: var(--pl-ink-dim);
}

.pl-choose__count {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.7rem;
  color: var(--pl-ink-faint);
  white-space: nowrap;
}

.pl-choose__chev {
  color: var(--pl-ink-faint);
}
</style>
