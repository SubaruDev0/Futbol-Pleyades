<script setup lang="ts">
import { mdiCheck, mdiClose, mdiMapMarkerOutline, mdiOpenInNew, mdiPencilOutline } from '@mdi/js'
import type { ConstellationPlayer } from '~/utils/constellation'

/** El marcador del partido: cuándo, la constelación de quiénes van, y los datos. */
const props = defineProps<{
  kickoffAt: string | Date
  status: string
  canManage?: boolean
  players: ConstellationPlayer[]
  capacity: number
  seed: string
  place: string
  address?: string | null
  mapsHref?: string | null
  format: string
  going: number
  perPlayer?: number | null
  totalCost?: number | null
  notes?: string | null
}>()

// Lo que tocaría si se llena la cancha: para que "por jugador" no lea como el precio final
// mientras todavía faltan confirmar.
const atCapacity = computed(() =>
  props.totalCost && props.capacity ? Math.ceil(props.totalCost / props.capacity) : null)
const emit = defineEmits<{
  save: [patch: { kickoffAt: Date, status: 'convocado' | 'confirmado' }]
  'edit-details': []
}>()

const toLocalParts = (v: string | Date) => {
  const d = new Date(v)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

const editing = ref(false)
const draftDate = ref('')
const draftTime = ref('')
const draftConfirmed = ref(false)
const saveError = ref('')

function startEdit() {
  const parts = toLocalParts(props.kickoffAt)
  draftDate.value = parts.date
  draftTime.value = parts.time
  draftConfirmed.value = props.status === 'confirmado'
  saveError.value = ''
  editing.value = true
}

function saveEdit() {
  const kickoffAt = new Date(`${draftDate.value}T${draftTime.value}`)
  if (!draftDate.value || !draftTime.value || Number.isNaN(kickoffAt.getTime())) {
    saveError.value = 'La fecha o la hora no son válidas.'
    return
  }
  emit('save', { kickoffAt, status: draftConfirmed.value ? 'confirmado' : 'convocado' })
  editing.value = false
}
</script>

<template>
  <header class="pl-panel pl-hero">
    <div v-if="!editing" class="pl-hero__when">
      <span
        v-if="status === 'convocado' || status === 'confirmado'"
        class="pl-hero__tag"
        :class="status === 'confirmado' ? 'pl-hero__tag--ok' : 'pl-hero__tag--pending'"
      >
        {{ status === 'confirmado' ? 'Confirmado' : 'Por confirmar' }}
      </span>
      <span class="pl-display pl-hero__day"><span class="pl-wipe">{{ matchDay(kickoffAt) }}</span></span>
      <span class="pl-display pl-hero__time pl-numeric">{{ matchTime(kickoffAt) }}</span>
      <button v-if="canManage" type="button" class="pl-hero__editbtn" aria-label="Editar día y hora" title="Editar día y hora" @click="startEdit">
        <v-icon :icon="mdiPencilOutline" size="16" />
      </button>
    </div>

    <form v-else class="pl-hero__editform" @submit.prevent="saveEdit">
      <div class="pl-hero__editfields">
        <input v-model="draftDate" type="date" required>
        <input v-model="draftTime" type="time" required>
      </div>
      <label class="pl-hero__confirmed">
        <input v-model="draftConfirmed" type="checkbox">
        <span>Confirmado</span>
      </label>
      <p v-if="saveError" class="pl-hero__editerror" role="alert">{{ saveError }}</p>
      <div class="pl-hero__editactions">
        <button type="button" class="pl-hero__editbtn" aria-label="Cancelar" @click="editing = false">
          <v-icon :icon="mdiClose" size="16" />
        </button>
        <button type="submit" class="pl-hero__editbtn pl-hero__editbtn--ok" aria-label="Guardar">
          <v-icon :icon="mdiCheck" size="16" />
        </button>
      </div>
    </form>

    <MatchConstellation :players="players" :capacity="capacity" :seed="seed" />

    <dl class="pl-facts">
      <div>
        <dt class="pl-eyebrow">
          Cancha
          <button v-if="canManage" type="button" class="pl-hero__editbtn pl-hero__editbtn--inline" aria-label="Editar cancha y datos" title="Editar cancha y datos" @click="emit('edit-details')">
            <v-icon :icon="mdiPencilOutline" size="14" />
          </button>
        </dt>
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
        <dd v-if="atCapacity && going < capacity" class="pl-facts__sub">
          Si se llena ({{ capacity }}): {{ clp(atCapacity) }}
        </dd>
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

.pl-hero__tag {
  flex: 0 0 100%;
  order: -1;
  align-self: flex-start;
  padding: 0.2rem 0.55rem;
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  border: 1px solid currentColor;
}

.pl-hero__tag--pending {
  color: #e6b800;
}

.pl-hero__tag--ok {
  color: var(--pl-turf);
}

.pl-hero__editbtn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  background: transparent;
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink-dim);
  cursor: pointer;
}

.pl-hero__editbtn:hover {
  border-color: var(--pl-accent);
  color: var(--pl-accent);
}

.pl-hero__editbtn--inline {
  width: 20px;
  height: 20px;
  border: none;
  vertical-align: middle;
  margin-left: 0.15rem;
}

.pl-hero__editbtn--ok {
  border-color: var(--pl-accent);
  color: var(--pl-accent);
}

.pl-hero__editform {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.pl-hero__editfields {
  display: flex;
  gap: 0.5rem;
}

.pl-hero__editfields input {
  height: 36px;
  padding: 0 0.5rem;
  background: transparent;
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink);
  font: inherit;
}

.pl-hero__confirmed {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--pl-ink-dim);
}

.pl-hero__editactions {
  display: flex;
  gap: 0.4rem;
}

.pl-hero__editerror {
  flex: 0 0 100%;
  margin: 0;
  color: var(--pl-red);
  font-size: 0.82rem;
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
