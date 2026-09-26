<script setup lang="ts">
useHead({ title: 'Partidos' })

const { data: matches, pending, refresh } = await useFetch('/api/matches')
const { data: groups } = await useFetch('/api/groups')

// Alguien marca un pago o se baja desde su propio teléfono; un polling corto
// mantiene la planilla al día sin arrastrar un websocket a una app de doce personas.
let interval: ReturnType<typeof setInterval> | undefined
onMounted(() => { interval = setInterval(refresh, 30_000) })
onUnmounted(() => clearInterval(interval))

const HOW = [
  {
    n: '01',
    title: 'Arma el partido',
    text: 'Día, hora, cancha y quién cobra.',
    tip: 'Cualquier miembro del grupo puede armar un partido. Si pones el valor de la cancha, la app divide el costo entre los que van.',
  },
  {
    n: '02',
    title: 'Anótate',
    text: 'Voy, quizás o no voy. Y tus invitados.',
    tip: 'Solo los que marcan "voy" ocupan cupo. Si llevas a alguien sin cuenta, lo sumas como invitado y queda a tu cargo.',
  },
  {
    n: '03',
    title: 'Sortea y paga',
    text: 'Equipos parejos al azar y quién ya transfirió.',
    tip: 'Quien organiza sortea oscuro contra claro. Cada uno sube su comprobante y quien cobra lo revisa.',
  },
]

// Filas de relleno para la planilla vacía: la lista que antes se copiaba y pegaba en el chat.
const PREVIEW_ROWS = 5
</script>

<template>
  <div>
    <header class="pl-head pl-rise">
      <div>
        <p class="pl-eyebrow">Próximos</p>
        <h1 class="pl-display pl-head__title"><span class="pl-wipe">Partidos</span></h1>
      </div>
      <v-btn v-if="groups?.length" to="/partido/nuevo" color="primary">
        Armar partido
      </v-btn>
    </header>

    <div class="pl-layout">
      <div class="pl-main">
        <div v-if="pending" class="pl-list" aria-busy="true">
          <div v-for="n in 3" :key="n" class="pl-panel pl-skeleton" />
        </div>

        <section v-else-if="!groups?.length" class="pl-panel pl-empty pl-rise" style="--i: 1">
          <div class="pl-empty__copy">
            <p class="pl-eyebrow pl-empty__kicker">Para empezar</p>
            <h2 class="pl-display pl-empty__title">Primero, tu grupo</h2>
            <p>Crea el grupo de tus partidos o entra a uno con el código que te pasaron.</p>
            <v-btn to="/grupos" color="primary">Ir a grupos</v-btn>
          </div>
          <div class="pl-empty__sheet" aria-hidden="true">
            <div v-for="n in PREVIEW_ROWS" :key="n" class="pl-sheet-row">
              <span class="pl-sheet-num">{{ n }}</span>
              <span class="pl-empty__slot">Cupo libre</span>
              <span />
            </div>
          </div>
        </section>

        <section v-else-if="!matches?.length" class="pl-panel pl-empty pl-rise" style="--i: 1">
          <div class="pl-empty__copy">
            <p class="pl-eyebrow pl-empty__kicker">Sin partidos</p>
            <h2 class="pl-display pl-empty__title">No hay nada agendado</h2>
            <p>Cuando alguien arme un partido, aparece aquí con la lista y el reparto de la cancha.</p>
            <v-btn to="/partido/nuevo" color="primary">Armar partido</v-btn>
          </div>
          <div class="pl-empty__sheet" aria-hidden="true">
            <div v-for="n in PREVIEW_ROWS" :key="n" class="pl-sheet-row">
              <span class="pl-sheet-num">{{ n }}</span>
              <span class="pl-empty__slot">Cupo libre</span>
              <span />
            </div>
          </div>
        </section>

        <div v-else class="pl-list">
          <MatchCard
            v-for="(m, i) in matches"
            :key="m.id"
            :match="m as any"
            class="pl-rise"
            :style="{ '--i': i + 1 }"
          />
        </div>
      </div>

      <aside class="pl-aside">
        <section class="pl-panel pl-how pl-rise" style="--i: 2">
          <h2 class="pl-eyebrow pl-how__title">Cómo funciona</h2>
          <ol class="pl-how__list">
            <li v-for="s in HOW" :key="s.n" class="pl-how__item">
              <span class="pl-display pl-how__n pl-numeric">{{ s.n }}</span>
              <div>
                <p class="pl-how__name pl-section-title">
                  {{ s.title }}
                  <InfoTip :title="s.title" :text="s.tip" />
                </p>
                <p class="pl-how__text">{{ s.text }}</p>
              </div>
            </li>
          </ol>
        </section>

        <section v-if="groups?.length" class="pl-panel pl-mygroups pl-rise" style="--i: 3">
          <h2 class="pl-eyebrow pl-how__title">Tus grupos</h2>
          <NuxtLink v-for="g in groups" :key="g.id" to="/grupos" class="pl-mygroups__row">
            <span class="pl-name">{{ g.name }}</span>
            <span class="pl-mygroups__meta">{{ FORMAT_LABEL[g.defaultFormat] }}</span>
          </NuxtLink>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.pl-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.4rem;
}

.pl-head__title {
  font-size: clamp(2.2rem, 9vw, 3rem);
  margin: 0.1rem 0 0;
}

.pl-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.6rem;
}

.pl-main {
  min-width: 0;
}

.pl-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.pl-skeleton {
  height: 132px;
  opacity: 0.6;
}

/* --- Estados vacíos ---------------------------------------------------------- */

.pl-empty {
  display: grid;
  grid-template-columns: 1fr;
}

.pl-empty__copy {
  padding: 1.8rem 1.4rem;
}

.pl-empty__kicker {
  color: var(--pl-accent);
}

.pl-empty__title {
  font-size: clamp(1.8rem, 7vw, 2.4rem);
  margin: 0.3rem 0 0.6rem;
}

.pl-empty__copy p:not(.pl-eyebrow) {
  color: var(--pl-ink-dim);
  margin: 0 0 1.4rem;
  max-width: 42ch;
  line-height: 1.5;
}

.pl-empty__sheet {
  border-top: 1px solid var(--pl-line);
  /* Se desvanece hacia abajo: la lista sigue, solo que aún no se ha llenado. */
  -webkit-mask-image: linear-gradient(to bottom, #000 40%, transparent);
  mask-image: linear-gradient(to bottom, #000 40%, transparent);
}

.pl-empty__slot {
  color: var(--pl-ink-faint);
  font-size: 0.9rem;
}

/* --- Columna lateral ---------------------------------------------------------- */

.pl-aside {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.pl-how__title {
  margin: 0;
  padding: 0.9rem 1.1rem 0.7rem;
  border-bottom: 1px solid var(--pl-line);
}

.pl-how__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.pl-how__item {
  display: grid;
  grid-template-columns: 2.4rem 1fr;
  gap: 0.6rem;
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--pl-line);
}

.pl-how__item:last-child {
  border-bottom: 0;
}

.pl-how__n {
  font-size: 1.6rem;
  color: var(--pl-accent);
}

.pl-how__name {
  margin: 0;
  font-weight: 600;
}

.pl-how__text {
  margin: 0.15rem 0 0;
  font-size: 0.86rem;
  color: var(--pl-ink-dim);
}

.pl-mygroups__row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 1.1rem;
  border-bottom: 1px solid var(--pl-line);
  color: inherit;
  text-decoration: none;
  transition: background-color 120ms ease;
}

.pl-mygroups__row:last-child {
  border-bottom: 0;
}

.pl-mygroups__row:hover {
  background: var(--pl-raised);
}

.pl-mygroups__meta {
  font-size: 0.82rem;
  color: var(--pl-ink-dim);
}

@media (min-width: 760px) {
  .pl-empty {
    grid-template-columns: 1.1fr 1fr;
  }
  .pl-empty__copy {
    padding: 2.4rem 2rem;
    align-self: center;
  }
  .pl-empty__sheet {
    border-top: 0;
    border-left: 1px solid var(--pl-line);
  }
}

@media (min-width: 1000px) {
  .pl-layout {
    grid-template-columns: minmax(0, 1fr) 320px;
    align-items: start;
  }
  .pl-aside {
    position: sticky;
    top: 80px;
  }
}
</style>
