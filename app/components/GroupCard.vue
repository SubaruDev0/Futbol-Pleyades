<script setup lang="ts">
import { mdiArrowRight, mdiCheck, mdiContentCopy, mdiMapMarkerOutline, mdiPlus } from '@mdi/js'

/** Un grupo tal como lo muestra la lista (GET /api/groups). */
export interface GroupSummary {
  id: string
  name: string
  inviteCode: string
  role: string
  memberCount: number
  members: { id: string, name: string, avatarUrl: string | null, role: string }[]
  nextMatch: {
    id: string
    slug: string
    kickoffAt: string
    capacity: number
    going: number
    status: string
    venueName: string | null
    fieldLabel: string | null
  } | null
}

const props = defineProps<{ group: GroupSummary }>()

const emit = defineEmits<{ open: [] }>()

const STACK = 3

const organizer = computed(() => props.group.role === 'organizador')
const convocarTo = computed(() => `/partido/nuevo?group=${props.group.id}`)

const stack = computed(() => props.group.members.slice(0, STACK))
const stackExtra = computed(() => Math.max(0, props.group.memberCount - stack.value.length))
const popExtra = computed(() => Math.max(0, props.group.memberCount - props.group.members.length))
const popId = computed(() => `gcard-pop-${props.group.id}`)

const next = computed(() => props.group.nextMatch)
const place = computed(() => {
  const m = next.value
  if (!m) return ''
  if (m.venueName && m.fieldLabel) return `${m.venueName} · ${m.fieldLabel}`
  return m.venueName ?? m.fieldLabel ?? 'Cancha por definir'
})
const badge = computed(() => {
  const m = next.value
  if (!m) return null
  if (m.going >= m.capacity) return { class: 'pl-badge--full', text: 'Completo' }
  return { class: 'pl-badge--open', text: `Faltan ${m.capacity - m.going}` }
})

const { copied: copiedKey, copy } = useCopy()
const copied = computed(() => copiedKey.value === 'code')

function copyCode() {
  copy(props.group.inviteCode, 'code')
}
</script>

<template>
  <article class="pl-panel pl-gcard">
    <header class="pl-gcard__head">
      <div class="pl-gcard__id">
        <h2 class="pl-gcard__name">
          <!-- Estirado sobre toda la tarjeta: la tarjeta abre el detalle del grupo,
               mientras los links y botones internos quedan por encima y siguen funcionando. -->
          <button
            type="button"
            class="pl-gcard__open"
            aria-haspopup="dialog"
            :title="group.name"
            @click="emit('open')"
          >
            {{ group.name }}
          </button>
        </h2>
        <p class="pl-gcard__meta">
          <span :class="{ 'pl-gcard__role--org': organizer }">
            {{ organizer ? 'Organizas' : 'Miembro' }}
          </span>
        </p>
      </div>
      <span class="pl-gcard__count pl-numeric">
        <strong>{{ group.memberCount }}</strong>
        {{ group.memberCount === 1 ? 'miembro' : 'miembros' }}
      </span>
    </header>

    <NuxtLink
      v-if="next"
      :to="`/partido/${next.slug}`"
      class="pl-gcard__next pl-gcard__next--set pl-gcard__above"
      @click.stop
    >
      <span class="pl-eyebrow">Próximo partido</span>
      <span class="pl-gcard__status">
        <span class="pl-badge pl-numeric" :class="badge!.class"><span>{{ badge!.text }}</span></span>
      </span>
      <span class="pl-gcard__when pl-display pl-numeric">
        {{ matchDay(next.kickoffAt) }} <span>{{ matchTime(next.kickoffAt) }}</span>
      </span>
      <span class="pl-gcard__going pl-numeric">
        {{ next.going }}/{{ next.capacity }}
        <v-icon :icon="mdiArrowRight" size="16" class="pl-gcard__arrow" />
      </span>
      <span class="pl-gcard__where">
        <v-icon :icon="mdiMapMarkerOutline" size="14" />
        <span>{{ place }}</span>
      </span>
    </NuxtLink>
    <div v-else class="pl-gcard__next pl-gcard__next--empty">
      <span class="pl-eyebrow">Próximo partido</span>
      <span class="pl-gcard__none">Aún no hay partido</span>
    </div>

    <div class="pl-gcard__people">
      <button
        type="button"
        class="pl-gcard__stack pl-gcard__above"
        :aria-describedby="popId"
        :aria-label="`Ver los ${group.memberCount} miembros`"
        @click.stop="emit('open')"
      >
        <span
          v-for="m in stack"
          :key="m.id"
          class="pl-gcard__av"
          :class="{ 'pl-gcard__av--org': m.role === 'organizador' }"
        >
          <UserAvatar :name="m.name" :src="m.avatarUrl" :size="28" />
        </span>
        <span v-if="stackExtra" class="pl-gcard__av pl-gcard__av--more pl-numeric">+{{ stackExtra }}</span>
      </button>

      <div :id="popId" class="pl-gcard__pop" role="tooltip">
        <ul class="pl-gcard__poplist">
          <li v-for="m in group.members" :key="m.id" class="pl-gcard__popitem">
            <UserAvatar :name="m.name" :src="m.avatarUrl" :size="24" />
            <span class="pl-gcard__popname">{{ m.name }}</span>
            <span v-if="m.role === 'organizador'" class="pl-gcard__poprole">Organizador</span>
          </li>
        </ul>
        <p v-if="popExtra" class="pl-gcard__popmore pl-numeric">y {{ popExtra }} más</p>
      </div>
    </div>

    <footer class="pl-gcard__foot">
      <div class="pl-gcard__code">
        <span class="pl-gcard__codelabel">Código</span>
        <code class="pl-display pl-gcard__value">{{ group.inviteCode }}</code>
        <button
          type="button"
          class="pl-gcard__copy pl-gcard__above"
          :class="{ 'pl-gcard__copy--done': copied }"
          :aria-label="`Copiar código ${group.inviteCode}`"
          :title="copied ? 'Copiado' : 'Copiar código'"
          @click.stop="copyCode"
        >
          <v-icon :icon="copied ? mdiCheck : mdiContentCopy" size="18" />
          <span class="d-sr-only" aria-live="polite">{{ copied ? 'Copiado' : '' }}</span>
        </button>
      </div>
      <NuxtLink
        :to="convocarTo"
        class="pl-gbtn pl-gcard__above"
        :class="{ 'pl-gbtn--primary': !next }"
        @click.stop
      >
        <v-icon :icon="mdiPlus" size="16" />
        <span>Armar partido</span>
      </NuxtLink>
    </footer>
  </article>
</template>

<style scoped>
.pl-gcard {
  position: relative;
  display: flex;
  flex-direction: column;
  container-type: inline-size;
  transition:
    border-color 140ms ease,
    background-color 140ms ease;
}

/* El popover se desborda sobre la tarjeta de abajo; esta tarjeta se eleva sobre sus vecinas. */
.pl-gcard:has(.pl-gcard__stack:focus-visible) {
  z-index: 4;
}
@media (hover: hover) {
  .pl-gcard:has(.pl-gcard__stack:hover) {
    z-index: 4;
  }
}

/* Toda la tarjeta es el área de clic del botón. */
.pl-gcard__open {
  all: unset;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.pl-gcard__open::after {
  content: '';
  position: absolute;
  inset: 0;
}
.pl-gcard__open:focus-visible {
  outline: none;
}

.pl-gcard:hover,
.pl-gcard:has(.pl-gcard__open:focus-visible) {
  border-color: rgba(var(--v-theme-primary), 0.45);
  background: rgba(var(--v-theme-primary), 0.03);
}
.pl-gcard:hover .pl-gcard__name,
.pl-gcard:has(.pl-gcard__open:focus-visible) .pl-gcard__name {
  color: var(--pl-accent);
}
.pl-gcard:has(.pl-gcard__open:focus-visible) {
  outline: 2px solid var(--pl-accent);
  outline-offset: 2px;
}

/* Los controles dentro de la tarjeta quedan por encima del botón estirado. */
.pl-gcard__above {
  position: relative;
  z-index: 1;
}

.pl-gcard__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem 0.9rem;
}

.pl-gcard__id {
  min-width: 0;
}

.pl-gcard__name {
  margin: 0;
  transition: color 140ms ease;
  font-family: var(--font-display);
  font-weight: 800;
  text-transform: uppercase;
  font-size: 1.5rem;
  line-height: 1.1;
  letter-spacing: 0.01em;
}

.pl-gcard__meta {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: var(--pl-ink-dim);
}

.pl-gcard__role--org {
  color: var(--pl-accent);
}

.pl-gcard__count {
  flex: none;
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.74rem;
  color: var(--pl-ink-dim);
  text-align: right;
  line-height: 1.1;
}

.pl-gcard__count strong {
  display: block;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: 0;
  color: var(--pl-ink);
}

/* --- Fila del próximo partido: mismo cuadro con o sin partido -------------- */

.pl-gcard__next {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: 22px 26px 18px;
  align-items: center;
  column-gap: 0.8rem;
  row-gap: 0.15rem;
  margin: 0 1.1rem 0.9rem;
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--pl-line);
  border-left: 3px solid var(--pl-ink-faint);
  background: rgba(var(--v-theme-on-background), 0.02);
  color: inherit;
  text-decoration: none;
}

.pl-gcard__next .pl-eyebrow {
  margin: 0;
  font-size: 0.66rem;
}

.pl-gcard__next--set {
  border-left-color: var(--pl-accent);
  transition:
    border-color 140ms ease,
    background-color 140ms ease;
}

.pl-gcard__next--set:hover {
  background: rgba(var(--v-theme-primary), 0.06);
  border-color: rgba(var(--v-theme-primary), 0.4);
  border-left-color: var(--pl-accent);
}

.pl-gcard__next--empty {
  border-style: dashed;
  border-left-style: solid;
  background: transparent;
}

.pl-gcard__none {
  grid-column: 1 / -1;
  grid-row: 2 / 4;
  align-self: center;
  font-size: 0.88rem;
  color: var(--pl-ink-faint);
}

.pl-gcard__when {
  font-size: 1.3rem;
  line-height: 1;
  white-space: nowrap;
}

.pl-gcard__when span {
  color: var(--pl-accent);
  margin-left: 0.25rem;
}

.pl-gcard__where {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  font-size: 0.8rem;
  color: var(--pl-ink-dim);
}

.pl-gcard__where > span {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pl-gcard__status {
  justify-self: end;
}

.pl-gcard__going {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  justify-self: end;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--pl-ink-dim);
}

.pl-gcard__arrow {
  color: var(--pl-ink-faint);
}

/* --- Miembros: una pila de tres, el resto al pasar el mouse ---------------- */

/* La fila se posiciona para el popover, que quedaría sobre el botón de apertura
   de toda la tarjeta; se deja pasar el clic en todo salvo la pila y su popover. */
.pl-gcard__people {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 1.1rem 1rem;
  pointer-events: none;
}

.pl-gcard__people > * {
  pointer-events: auto;
}

.pl-gcard__stack {
  all: unset;
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.pl-gcard__stack:focus-visible {
  outline: 2px solid var(--pl-accent);
  outline-offset: 3px;
}

.pl-gcard__av {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  box-sizing: border-box;
  padding: 1px;
  border: 1px solid var(--pl-surface);
  background: var(--pl-surface);
}

.pl-gcard__av + .pl-gcard__av {
  margin-left: -8px;
}

.pl-gcard__av--org {
  border-color: var(--pl-accent);
}

.pl-gcard__av--more {
  border-color: var(--pl-line-strong);
  background: var(--pl-raised);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--pl-ink-dim);
}

.pl-gcard__stack:hover .pl-gcard__av--more {
  color: var(--pl-ink);
}

.pl-gcard__pop {
  position: absolute;
  z-index: 5;
  top: calc(100% - 0.6rem);
  left: 1.1rem;
  min-width: 220px;
  max-width: calc(100% - 2.2rem);
  padding: 0.35rem 0;
  background: var(--pl-raised);
  border: 1px solid var(--pl-line-strong);
  border-top: 2px solid var(--pl-accent);
  box-shadow: 0 12px 30px rgba(var(--v-theme-background), 0.65);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition:
    opacity 140ms ease,
    transform 160ms ease,
    visibility 0s linear 160ms;
  pointer-events: none;
}

.pl-gcard__stack:focus-visible + .pl-gcard__pop {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition-delay: 0s;
}
@media (hover: hover) {
  .pl-gcard__stack:hover + .pl-gcard__pop {
    opacity: 1;
    visibility: visible;
    transform: none;
    transition-delay: 0s;
  }
}

.pl-gcard__poplist {
  list-style: none;
  margin: 0;
  padding: 0;
}

.pl-gcard__popitem {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
}

.pl-gcard__popname {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl-gcard__poprole {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.66rem;
  color: var(--pl-accent);
}

.pl-gcard__popmore {
  margin: 0.2rem 0 0;
  padding: 0.35rem 0.75rem 0.15rem;
  border-top: 1px solid var(--pl-line);
  font-size: 0.78rem;
  color: var(--pl-ink-faint);
}

/* --- Pie: código de invitación + acciones ---------------------------------- */

.pl-gcard__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-top: auto;
  padding: 0.75rem 1.1rem;
  border-top: 1px solid var(--pl-line);
  background: rgba(var(--v-theme-on-background), 0.015);
}

.pl-gcard__code {
  display: flex;
  align-items: stretch;
  height: 38px;
  min-width: 0;
  border: 1px solid var(--pl-line-strong);
}

.pl-gcard__codelabel {
  display: none;
  align-items: center;
  padding: 0 0 0 0.7rem;
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.68rem;
  color: var(--pl-ink-faint);
}

.pl-gcard__value {
  display: flex;
  align-items: center;
  padding: 0 0.7rem;
  font-size: 1.2rem;
  line-height: 1;
  letter-spacing: 0.16em;
  color: var(--pl-accent);
  white-space: nowrap;
}

.pl-gcard__copy {
  display: grid;
  place-items: center;
  flex: none;
  width: 38px;
  padding: 0;
  background: transparent;
  border: 0;
  border-left: 1px solid var(--pl-line-strong);
  color: var(--pl-ink-dim);
  cursor: pointer;
  transition:
    color 140ms ease,
    background-color 140ms ease;
}

.pl-gcard__copy:hover {
  color: var(--pl-ink);
  background: rgba(var(--v-theme-primary), 0.08);
}

.pl-gcard__copy:focus-visible {
  outline: 2px solid var(--pl-accent);
  outline-offset: -2px;
}

.pl-gcard__copy--done,
.pl-gcard__copy--done:hover {
  color: var(--pl-turf);
  background: rgba(var(--v-theme-success), 0.12);
}

@container (min-width: 380px) {
  .pl-gcard__codelabel {
    display: flex;
  }
  .pl-gcard__value {
    padding-left: 0.5rem;
  }
}

.pl-gbtn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  box-sizing: border-box;
  height: 38px;
  padding: 0 0.8rem;
  flex: none;
  background: transparent;
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.8rem;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    color 140ms ease,
    background-color 140ms ease;
}

.pl-gbtn:hover {
  border-color: var(--pl-accent);
}

.pl-gbtn--primary {
  background: var(--pl-accent);
  border-color: var(--pl-accent);
  color: var(--pl-pitch);
}

.pl-gbtn--primary:hover {
  background: rgba(var(--v-theme-primary), 0.85);
}
</style>
