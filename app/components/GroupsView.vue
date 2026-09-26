<script setup lang="ts">
import { mdiChevronDown } from '@mdi/js'
import type { GroupSummary } from '~/components/GroupCard.vue'

/**
 * La pantalla de grupos: encabezado, la lista (o el hero de primer grupo) y el
 * riel con crear / unirse. Quien la usa aporta el panel de acciones y es dueño de los datos.
 */
const props = defineProps<{
  groups: GroupSummary[]
  /** Hace scroll hasta el panel de crear / unirse una vez montado. */
  focusActions?: boolean
}>()
const emit = defineEmits<{ open: [id: string] }>()

const hasGroups = computed(() => props.groups.length > 0)
const total = computed(() => props.groups.length)

// Colapsado por defecto: los pasos están ahí para quien los quiera ver.
const howOpen = ref(false)

const rail = ref<HTMLElement | null>(null)
onMounted(() => {
  if (!props.focusActions) return
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  rail.value?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' })
})

const HOW = [
  { title: 'Crea o únete', text: 'Arma el grupo de tu pichanga o entra con el código que te pasaron.' },
  { title: 'Comparte el código', text: 'Cada uno entra con el código desde su propio teléfono.' },
  { title: 'Arma un partido', text: 'Pon día, hora y cancha. Cada uno se anota desde el partido.' },
]
</script>

<template>
  <div>
    <header class="pl-head pl-rise">
      <div class="pl-head__text">
        <p class="pl-eyebrow">Donde juegas</p>
        <h1 class="pl-display pl-head__title pl-section-title">
          <span class="pl-wipe">Grupos</span>
          <InfoTip title="Qué es un grupo">
            <p>La gente con la que juegas siempre.</p>
            <p>Los partidos pertenecen a un grupo y solo sus miembros los ven y se anotan.</p>
          </InfoTip>
        </h1>
        <p class="pl-head__lead">
          La gente con la que juegas siempre. Los partidos de cada grupo solo los ven sus miembros.
        </p>
      </div>
    </header>

    <div class="pl-layout">
      <div class="pl-col">
        <section v-if="hasGroups" class="pl-list" aria-label="Tus grupos">
          <GroupCard
            v-for="(g, i) in groups"
            :key="g.id"
            :group="g"
            class="pl-rise"
            :style="{ '--i': i + 1 }"
            @open="emit('open', g.id)"
          />
        </section>

        <section v-else class="pl-panel pl-hero pl-rise" style="--i: 1">
          <p class="pl-eyebrow pl-hero__kicker">Empieza aquí</p>
          <h2 class="pl-display pl-hero__title">Tu primer<br>grupo</h2>
          <p class="pl-hero__text">
            Un grupo reúne a los que juegan siempre juntos. Los partidos se arman dentro del
            grupo y solo sus miembros los ven.
          </p>
          <ol class="pl-steps">
            <li v-for="(s, i) in HOW" :key="s.title">
              <span class="pl-steps__n pl-numeric">0{{ i + 1 }}</span>
              <div>
                <strong>{{ s.title }}</strong>
                <p>{{ s.text }}</p>
              </div>
            </li>
          </ol>
        </section>
      </div>

      <aside ref="rail" class="pl-rail pl-panel pl-rise" :style="{ '--i': hasGroups ? total + 1 : 2 }">
        <slot name="actions" />
        <section v-if="hasGroups" class="pl-rail__how" aria-labelledby="pl-how">
          <h2 id="pl-how" class="pl-eyebrow pl-how__title">
            <button
              type="button"
              class="pl-how__toggle"
              :aria-expanded="howOpen"
              aria-controls="pl-how-steps"
              @click="howOpen = !howOpen"
            >
              <span>¿Cómo funciona?</span>
              <v-icon :icon="mdiChevronDown" size="18" class="pl-how__chev" />
            </button>
          </h2>
          <div id="pl-how-steps" class="pl-how__body" :class="{ 'pl-how__body--open': howOpen }" :inert="howOpen ? undefined : true">
            <div class="pl-how__inner"><div class="pl-how__pad">
              <ol class="pl-steps pl-steps--compact">
                <li v-for="(s, i) in HOW" :key="s.title">
                  <span class="pl-steps__n pl-numeric">0{{ i + 1 }}</span>
                  <div>
                    <strong>{{ s.title }}</strong>
                    <p>{{ s.text }}</p>
                  </div>
                </li>
              </ol>
              <p class="pl-how__note">
                Cada grupo tiene un código de 6 caracteres. Cópialo desde su tarjeta y compártelo
                para que los demás se sumen.
              </p>
            </div></div>
          </div>
        </section>
      </aside>
    </div>

  </div>
</template>

<style scoped>
.pl-head {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.6rem;
}

.pl-head__title {
  font-size: clamp(2.2rem, 9vw, 3rem);
  margin: 0.1rem 0 0;
}

.pl-head__lead {
  margin: 0.55rem 0 0;
  max-width: 52ch;
  color: var(--pl-ink-dim);
  font-size: 0.95rem;
  line-height: 1.45;
}

/* --- Layout: lista + riel --------------------------------------------------- */

.pl-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.6rem;
}

.pl-col {
  min-width: 0;
}

/* auto-fit, no auto-fill: con uno o dos grupos las tarjetas ocupan la
   columna en vez de dejar espacios vacíos al lado. */
.pl-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 0.85rem;
  align-content: start;
  align-items: start;
}

.pl-rail {
  border-top: 2px solid var(--pl-accent);
  scroll-margin-top: 76px;
}

.pl-rail__how {
  border-top: 1px solid var(--pl-line);
}

.pl-how__title {
  margin: 0;
}

.pl-how__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1rem 1.2rem;
  background: transparent;
  border: 0;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
  transition: color 140ms ease;
}

.pl-how__toggle:hover {
  color: var(--pl-ink);
}

.pl-how__chev {
  transition: transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.pl-how__toggle[aria-expanded='true'] .pl-how__chev {
  transform: rotate(180deg);
}

/* Animación de altura sin medir: una fila de grid de 0fr a 1fr. */
.pl-how__body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 260ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.pl-how__body--open {
  grid-template-rows: 1fr;
}

.pl-how__inner {
  min-height: 0;
  overflow: hidden;
}

.pl-how__pad {
  padding: 0 1.2rem 1.1rem;
}

.pl-how__note {
  margin: 0.4rem 0 0;
  padding-top: 0.7rem;
  border-top: 1px solid var(--pl-line);
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--pl-ink-faint);
}

/* --- Pasos ------------------------------------------------------------------ */

.pl-steps {
  list-style: none;
  margin: 0;
  padding: 0;
}

.pl-steps li {
  display: grid;
  grid-template-columns: 2rem 1fr;
  gap: 0.6rem;
  padding: 0.7rem 0;
  border-top: 1px solid var(--pl-line);
}

.pl-steps li:first-child {
  border-top: 0;
}

.pl-steps__n {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.15rem;
  line-height: 1.1;
  color: var(--pl-accent);
}

.pl-steps strong {
  display: block;
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.92rem;
}

.pl-steps p {
  margin: 0.15rem 0 0;
  font-size: 0.86rem;
  line-height: 1.4;
  color: var(--pl-ink-dim);
}

.pl-steps--compact li {
  padding: 0.55rem 0;
}

/* --- Hero de estado vacío ---------------------------------------------------- */

.pl-hero {
  padding: 1.6rem 1.3rem 1.2rem;
  background:
    linear-gradient(90deg, var(--pl-accent) 0 3px, transparent 3px),
    var(--pl-surface);
}

.pl-hero__kicker {
  color: var(--pl-accent);
}

.pl-hero__title {
  font-size: clamp(2rem, 8vw, 3.4rem);
  margin: 0.35rem 0 0.8rem;
}

.pl-hero__text {
  color: var(--pl-ink-dim);
  margin: 0 0 1.2rem;
  max-width: 46ch;
  line-height: 1.5;
}

.pl-hero .pl-steps {
  border-top: 1px solid var(--pl-line);
}

@media (min-width: 700px) {
  .pl-head {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}

@media (min-width: 860px) {
  .pl-hero {
    padding: 2.2rem 2rem 1.6rem;
  }
}

@media (min-width: 1000px) {
  .pl-layout {
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 2rem;
    align-items: start;
  }
  .pl-rail {
    position: sticky;
    top: 80px;
  }
}
</style>
