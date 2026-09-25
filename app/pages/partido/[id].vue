<script setup lang="ts">
const route = useRoute()
const { user } = useUserSession()
const id = route.params.id as string

const { data, refresh, error } = await useFetch(`/api/matches/${id}`)

const interval = setInterval(refresh, 20_000)
onUnmounted(() => clearInterval(interval))

const match = computed(() => data.value?.match)
const players = computed(() => data.value?.players ?? [])
const going = computed(() => players.value.filter(p => p.status === 'voy'))
const out = computed(() => players.value.filter(p => p.status !== 'voy'))

const me = computed(() => players.value.find(p => p.userId === user.value?.id))
const drawn = computed(() => going.value.some(p => p.kit))

const dark = computed(() => going.value.filter(p => p.kit === 'oscuro'))
const light = computed(() => going.value.filter(p => p.kit === 'claro'))

const capacity = computed(() => match.value?.capacity ?? 0)
const starters = computed(() => going.value.slice(0, capacity.value))
const subs = computed(() => going.value.slice(capacity.value))

const busy = ref('')
const guestName = ref('')
const showGuest = ref(false)

const displayName = (p: any) => p.name ?? p.guestName ?? 'Sin nombre'

async function setStatus(status: string) {
  busy.value = status
  try {
    await $fetch(`/api/matches/${id}/rsvp`, { method: 'POST', body: { status } })
    await refresh()
  }
  catch (e: any) {
    alert(apiError(e))
  }
  finally {
    busy.value = ''
  }
}

async function togglePaid(player: any) {
  busy.value = player.id
  try {
    await $fetch(`/api/matches/${id}/players/${player.id}`, {
      method: 'PATCH',
      body: { paid: !player.paid },
    })
    await refresh()
  }
  catch (e: any) {
    alert(apiError(e))
  }
  finally {
    busy.value = ''
  }
}

async function draw() {
  busy.value = 'draw'
  try {
    await $fetch(`/api/matches/${id}/teams`, { method: 'POST' })
    await refresh()
  }
  catch (e: any) {
    alert(apiError(e))
  }
  finally {
    busy.value = ''
  }
}

async function addGuest() {
  if (guestName.value.trim().length < 2) return
  busy.value = 'guest'
  try {
    await $fetch(`/api/matches/${id}/guests`, {
      method: 'POST',
      body: { name: guestName.value.trim() },
    })
    guestName.value = ''
    showGuest.value = false
    await refresh()
  }
  catch (e: any) {
    alert(apiError(e))
  }
  finally {
    busy.value = ''
  }
}

useHead({ title: () => (match.value ? matchDay(match.value.kickoffAt) : 'Partido') })
</script>

<template>
  <div v-if="error" class="pl-panel pl-missing">
    <h1 class="pl-display">Partido no encontrado</h1>
    <v-btn to="/">Volver</v-btn>
  </div>

  <div v-else-if="match">
    <!-- Scoreboard header ------------------------------------------------ -->
    <header class="pl-panel pl-hero">
      <div class="pl-hero__when">
        <span class="pl-display pl-hero__day">{{ matchDay(match.kickoffAt) }}</span>
        <span class="pl-display pl-hero__time pl-numeric">{{ matchTime(match.kickoffAt) }}</span>
      </div>

      <dl class="pl-facts">
        <div>
          <dt class="pl-eyebrow">Cancha</dt>
          <dd>
            {{ data?.venue?.name ?? 'Por definir' }}
            <span v-if="match.fieldLabel">· {{ match.fieldLabel }}</span>
          </dd>
        </div>
        <div>
          <dt class="pl-eyebrow">Formato</dt>
          <dd>{{ FORMAT_LABEL[match.format] }} · {{ going.length }}/{{ capacity }}</dd>
        </div>
        <div v-if="data?.perPlayer">
          <dt class="pl-eyebrow">Por jugador</dt>
          <dd class="pl-numeric">{{ clp(data.perPlayer) }}</dd>
        </div>
      </dl>

      <p v-if="match.notes" class="pl-hero__notes">{{ match.notes }}</p>
    </header>

    <!-- My answer --------------------------------------------------------- -->
    <section class="pl-panel pl-answer">
      <p class="pl-eyebrow">¿Vas?</p>
      <div class="pl-answer__row">
        <button
          v-for="opt in [
            { key: 'voy', label: 'Voy' },
            { key: 'quizas', label: 'Quizás' },
            { key: 'no_voy', label: 'No voy' },
          ]"
          :key="opt.key"
          type="button"
          class="pl-answer__btn"
          :class="{ 'pl-answer__btn--on': me?.status === opt.key }"
          :disabled="!!busy"
          @click="setStatus(opt.key)"
        >
          {{ opt.label }}
        </button>
      </div>

      <div class="pl-answer__extra">
        <button v-if="!showGuest" type="button" class="pl-link" @click="showGuest = true">
          + Llevo a alguien
        </button>
        <form v-else class="pl-guest-form" @submit.prevent="addGuest">
          <v-text-field
            v-model="guestName"
            label="Nombre del invitado"
            density="compact"
            autofocus
          />
          <v-btn type="submit" color="primary" :loading="busy === 'guest'">Sumar</v-btn>
        </form>
      </div>
    </section>

    <!-- Where the money goes ---------------------------------------------- -->
    <section v-if="match.totalCost" class="pl-panel pl-money">
      <div class="pl-money__head">
        <div>
          <p class="pl-eyebrow">Transferir a</p>
          <p class="pl-money__who">{{ data?.collectorName ?? 'Sin definir' }}</p>
          <p v-if="data?.collectorAlias" class="pl-money__alias pl-numeric">
            {{ data.collectorAlias }}
          </p>
        </div>
        <div class="pl-money__amount">
          <span class="pl-display pl-numeric">{{ clp(data?.perPlayer ?? 0) }}</span>
          <span class="pl-money__total pl-numeric">de {{ clp(match.totalCost) }}</span>
        </div>
      </div>

      <v-btn
        v-if="me"
        :color="me.paid ? undefined : 'primary'"
        :variant="me.paid ? 'outlined' : 'flat'"
        block
        :loading="busy === me.id"
        @click="togglePaid(me)"
      >
        {{ me.paid ? 'Ya transferí ✓' : 'Marcar que transferí' }}
      </v-btn>
    </section>

    <!-- Team sheet -------------------------------------------------------- -->
    <section class="pl-sheet">
      <div class="pl-sheet__head">
        <h2 class="pl-display pl-sheet__title">Planilla</h2>
        <v-btn
          v-if="data?.canManage && going.length >= 2"
          size="small"
          variant="outlined"
          :loading="busy === 'draw'"
          @click="draw"
        >
          {{ drawn ? 'Sortear de nuevo' : 'Sortear equipos' }}
        </v-btn>
      </div>

      <!-- Drawn: two kits facing each other across the halfway line -->
      <div v-if="drawn" class="pl-teams">
        <div class="pl-panel">
          <p class="pl-team__head"><span class="pl-kit pl-kit--dark" /> Oscuro</p>
          <div v-for="(p, i) in dark" :key="p.id" class="pl-sheet-row pl-sheet-row--filled">
            <span class="pl-sheet-num">{{ i + 1 }}</span>
            <span class="pl-name" :class="{ 'pl-guest': !p.userId }">{{ displayName(p) }}</span>
            <span v-if="p.paid" class="pl-paid">Pagó</span>
          </div>
        </div>

        <div class="pl-panel">
          <p class="pl-team__head"><span class="pl-kit pl-kit--light" /> Claro</p>
          <div v-for="(p, i) in light" :key="p.id" class="pl-sheet-row pl-sheet-row--filled">
            <span class="pl-sheet-num">{{ i + 1 }}</span>
            <span class="pl-name" :class="{ 'pl-guest': !p.userId }">{{ displayName(p) }}</span>
            <span v-if="p.paid" class="pl-paid">Pagó</span>
          </div>
        </div>
      </div>

      <!-- Not drawn yet: the numbered list, with the empty slots still visible -->
      <div v-else class="pl-panel">
        <div v-for="(p, i) in starters" :key="p.id" class="pl-sheet-row pl-sheet-row--filled">
          <span class="pl-sheet-num">{{ i + 1 }}</span>
          <span class="pl-name" :class="{ 'pl-guest': !p.userId }">
            {{ displayName(p) }}
            <span v-if="!p.userId" class="pl-invited">invitado</span>
          </span>
          <button
            v-if="match.totalCost && (data?.canManage || p.userId === user?.id)"
            type="button"
            class="pl-paid-toggle"
            :class="{ 'pl-paid-toggle--on': p.paid }"
            :disabled="busy === p.id"
            @click="togglePaid(p)"
          >
            {{ p.paid ? 'Pagó' : 'Debe' }}
          </button>
          <span v-else-if="p.paid" class="pl-paid">Pagó</span>
          <span v-else />
        </div>

        <div
          v-for="n in Math.max(0, capacity - starters.length)"
          :key="`empty-${n}`"
          class="pl-sheet-row"
        >
          <span class="pl-sheet-num">{{ starters.length + n }}</span>
          <span class="pl-slot-free">Cupo libre</span>
          <span />
        </div>
      </div>

      <div v-if="subs.length" class="pl-subs pl-panel">
        <p class="pl-eyebrow">Suplentes</p>
        <div v-for="p in subs" :key="p.id" class="pl-sheet-row">
          <span class="pl-sheet-num">—</span>
          <span class="pl-name">{{ displayName(p) }}</span>
          <span />
        </div>
      </div>

      <div v-if="out.length" class="pl-out">
        <p class="pl-eyebrow">No van</p>
        <p class="pl-out__names">
          {{ out.map(displayName).join(' · ') }}
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pl-missing {
  padding: 3rem 1.5rem;
  text-align: center;
}

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

.pl-hero__notes {
  margin: 1rem 0 0;
  color: var(--pl-ink-dim);
  font-size: 0.9rem;
}

.pl-answer {
  padding: 1.1rem 1.2rem;
  margin-bottom: 0.85rem;
}

.pl-answer__row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  margin-top: 0.7rem;
  border: 1px solid var(--pl-line-strong);
}

.pl-answer__btn {
  padding: 0.75rem 0.4rem;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--pl-line);
  color: var(--pl-ink-dim);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.95rem;
  cursor: pointer;
}

.pl-answer__btn:last-child {
  border-right: 0;
}

.pl-answer__btn--on {
  background: var(--pl-lime);
  color: var(--pl-pitch);
}

.pl-answer__extra {
  margin-top: 0.9rem;
}

.pl-link {
  background: none;
  border: 0;
  padding: 0;
  color: var(--pl-lime);
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
}

.pl-guest-form {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
}

.pl-money {
  padding: 1.2rem;
  margin-bottom: 0.85rem;
}

.pl-money__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.pl-money__who {
  margin: 0.25rem 0 0;
  font-weight: 600;
}

.pl-money__alias {
  margin: 0.1rem 0 0;
  color: var(--pl-ink-dim);
  font-size: 0.9rem;
}

.pl-money__amount {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.pl-money__amount > span:first-child {
  font-size: 2rem;
  color: var(--pl-lime);
}

.pl-money__total {
  font-size: 0.78rem;
  color: var(--pl-ink-faint);
}

.pl-sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 1.6rem 0 0.7rem;
}

.pl-sheet__title {
  font-size: 1.7rem;
  margin: 0;
}

.pl-teams {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.pl-team__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid var(--pl-line-strong);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.9rem;
}

.pl-invited {
  font-size: 0.72rem;
  color: var(--pl-ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-left: 0.4rem;
}

.pl-slot-free {
  color: var(--pl-ink-faint);
  font-size: 0.9rem;
}

.pl-paid {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pl-turf);
  font-weight: 700;
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
  background: rgba(47, 168, 79, 0.12);
}

.pl-subs {
  margin-top: 0.85rem;
  padding-top: 0.7rem;
}

.pl-subs .pl-eyebrow {
  padding: 0 0.9rem 0.5rem;
}

.pl-out {
  margin-top: 1.2rem;
}

.pl-out__names {
  margin: 0.4rem 0 0;
  color: var(--pl-ink-faint);
  font-size: 0.88rem;
}

@media (max-width: 560px) {
  .pl-teams {
    grid-template-columns: 1fr;
  }
}
</style>
