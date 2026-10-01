<script setup lang="ts">
import { mdiClose } from '@mdi/js'
import MatchLayout from '~/components/MatchLayout.vue'
import MatchHero from '~/components/MatchHero.vue'
import RsvpPanel from '~/components/RsvpPanel.vue'
import MatchMoney from '~/components/MatchMoney.vue'
import ReceiptQueue from '~/components/ReceiptQueue.vue'
import MatchSheet from '~/components/MatchSheet.vue'
import ConfirmDelete from '~/components/ConfirmDelete.vue'
import type { MoneyPayment } from '~/components/MatchMoney.vue'
import type { SheetPlayer } from '~/components/MatchSheet.vue'

const route = useRoute()
const { user } = useUserSession()
const id = route.params.id as string

const { data, refresh, error } = await useFetch(`/api/matches/${id}`)

let interval: ReturnType<typeof setInterval> | undefined
onMounted(() => { interval = setInterval(refresh, 20_000) })
onUnmounted(() => clearInterval(interval))

const match = computed(() => data.value?.match)
const matchId = computed(() => match.value?.id ?? id)
const venue = computed(() => data.value?.venue ?? null)

// --- Editar cancha y datos --------------------------------------------------------
const { data: venues } = await useFetch('/api/venues')
const { data: groupMembers } = await useFetch(() => `/api/groups/${match.value?.groupId}/members`, {
  immediate: !!match.value,
})
const collectors = computed(() => (groupMembers.value ?? []).filter(m => m.hasPaymentAccount))

const editDetails = reactive({
  open: false,
  venueId: null as string | null,
  fieldLabel: '',
  format: 'f7' as 'f5' | 'f6' | 'f7' | 'libre',
  totalCost: '',
  collectorUserId: null as string | null,
  busy: false,
  error: '',
})

function openEditDetails() {
  const m = match.value
  if (!m) return
  Object.assign(editDetails, {
    open: true,
    venueId: m.venueId,
    fieldLabel: m.fieldLabel ?? '',
    format: m.format,
    totalCost: m.totalCost ? String(m.totalCost) : '',
    collectorUserId: m.collectorUserId,
    busy: false,
    error: '',
  })
}

async function saveDetails() {
  editDetails.busy = true
  editDetails.error = ''
  try {
    await $fetch(`/api/matches/${matchId.value}`, {
      method: 'PATCH',
      body: {
        venueId: editDetails.venueId,
        fieldLabel: editDetails.fieldLabel.trim() || null,
        format: editDetails.format,
        totalCost: editDetails.totalCost ? Number(editDetails.totalCost) : null,
        collectorUserId: editDetails.collectorUserId,
      },
    })
    editDetails.open = false
    await refresh()
  }
  catch (e) {
    editDetails.error = apiError(e)
  }
  finally {
    editDetails.busy = false
  }
}
const place = computed(() => {
  const name = venue.value?.name
  const field = match.value?.fieldLabel
  if (name && field) return `${name} · ${field}`
  return name ?? field ?? 'Por definir'
})
const mapsHref = computed(() => (venue.value ? mapsSearchUrl(venue.value.name, venue.value.address) : null))
const players = computed(() => data.value?.players ?? [])
const going = computed(() => players.value.filter(isPlaying))
const spectators = computed(() => players.value.filter(isSpectator))
const out = computed(() => players.value.filter(p => !isPlaying(p) && !isSpectator(p)))

const me = computed(() => players.value.find(p => p.userId === user.value?.id))
const isCollector = computed(() => !!user.value && match.value?.collectorUserId === user.value.id)
// Refleja la regla del servidor: solo los que juegan (y quien cobra) ven los datos.
const canSeeAccount = computed(() => (!!me.value && me.value.status !== 'no_voy' && (!isSpectator(me.value) || me.value.spectatorPays)) || isCollector.value)
const capacity = computed(() => match.value?.capacity ?? 0)

const busy = ref('')
const guestName = ref('')
const showGuest = ref(false)

const displayName = (p: any) => p.name ?? p.guestName ?? 'Sin nombre'

// --- Pagos ----------------------------------------------------------------------
const toast = useToast()
type Player = (typeof players.value)[number]

const canSettle = computed(() => !!data.value?.canSettle)
const hasCollector = computed(() => !!match.value?.collectorUserId)
const pendingReceipts = computed(() => data.value?.pendingReceipts ?? [])

// Lo que pago: mi propio cupo y los invitados que traje. Quien cobra recibe el pago, no paga.
const myPayments = computed(() => {
  const uid = user.value?.id
  if (!uid || isCollector.value) return []
  return players.value.filter(p => sharesCost(p) && (p.userId === uid || (!p.userId && p.invitedBy === uid)))
})
const payLabel = (p: Player) => (p.userId ? 'Tu pago' : `Invitado: ${displayName(p)}`)
const moneyPayments = computed<MoneyPayment[]>(() =>
  myPayments.value.map(p => ({ id: p.id, label: payLabel(p), paid: p.paid, receipt: p.receipt })))
const accountMissing = computed(() => {
  if (data.value?.collectorAccount || !canSeeAccount.value || !match.value?.collectorUserId) return null
  return isCollector.value ? 'mine' : 'theirs'
})

const upload = reactive({ open: false, player: null as null | { id: string, label: string } })
function openUpload(id: string) {
  const p = myPayments.value.find(x => x.id === id)
  if (!p) return
  upload.player = { id: p.id, label: payLabel(p) }
  upload.open = true
}

async function sendExternal(id: string) {
  try {
    await $fetch(`/api/matches/${matchId.value}/players/${id}/receipt-external`, { method: 'POST' })
    toast.success('Avisaste que lo enviaste por otro lugar')
    await refresh()
  }
  catch (e) {
    toast.error(apiError(e))
  }
}

const reviewing = reactive({ open: false, item: null as null | (typeof pendingReceipts.value)[number] })
function openReview(playerId: string) {
  const item = pendingReceipts.value.find(r => r.playerId === playerId)
  if (!item) return
  reviewing.item = item
  reviewing.open = true
}

async function setStatus(status: string, spectatorPays = false) {
  busy.value = status
  try {
    await $fetch(`/api/matches/${matchId.value}/rsvp`, { method: 'POST', body: { status, spectatorPays } })
    await refresh()
  }
  catch (e: any) {
    alert(apiError(e))
  }
  finally {
    busy.value = ''
  }
}

// El ajuste manual de quien cobra: pago en efectivo, o deshacer un error.
async function togglePaid(player: any) {
  busy.value = player.id
  try {
    await $fetch(`/api/matches/${matchId.value}/players/${player.id}`, {
      method: 'PATCH',
      body: { paid: !player.paid },
    })
    await refresh()
  }
  catch (e: any) {
    toast.error(apiError(e))
  }
  finally {
    busy.value = ''
  }
}

// El organizador pasa a alguien a espectador, lo devuelve a jugar o cambia si paga cancha.
async function setAttendance(player: SheetPlayer, patch: { status?: 'voy' | 'espectador', spectatorPays?: boolean }) {
  busy.value = player.id
  try {
    await $fetch(`/api/matches/${matchId.value}/players/${player.id}`, { method: 'PATCH', body: patch })
    await refresh()
  }
  catch (e: any) {
    toast.error(apiError(e))
  }
  finally {
    busy.value = ''
  }
}

// Liga a alguien con un grupo (o lo desliga): los del mismo grupo siempre caen en el mismo equipo.
async function setLink(player: SheetPlayer, linkGroup: number | null) {
  busy.value = player.id
  try {
    await $fetch(`/api/matches/${matchId.value}/players/${player.id}`, { method: 'PATCH', body: { linkGroup } })
    await refresh()
  }
  catch (e: any) {
    toast.error(apiError(e))
  }
  finally {
    busy.value = ''
  }
}

// Intercambia oscuro y claro sin tocar a los integrantes de cada equipo.
async function swapKits() {
  busy.value = 'swap'
  try {
    await $fetch(`/api/matches/${matchId.value}/teams/swap`, { method: 'POST' })
    await refresh()
  }
  catch (e: any) {
    toast.error(apiError(e))
  }
  finally {
    busy.value = ''
  }
}

async function draw() {
  busy.value = 'draw'
  try {
    await $fetch(`/api/matches/${matchId.value}/teams`, { method: 'POST' })
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
    await $fetch(`/api/matches/${matchId.value}/guests`, {
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

// --- Eliminaciones reales: un invitado, o el partido completo -------------------
// Quien trajo a un invitado puede quitarlo; quien administra el partido puede quitar a cualquiera.
const removable = computed(() => {
  const uid = user.value?.id
  return going.value
    .filter(p => !p.userId && (data.value?.canManage || p.invitedBy === uid))
    .map(p => p.id)
})

const removal = reactive({
  open: false,
  kind: 'guest' as 'guest' | 'match',
  player: null as SheetPlayer | null,
  loss: null as string | null,
  busy: false,
  error: '',
})
const removalTitle = computed(() =>
  removal.kind === 'match' ? 'Borrar partido' : `Quitar a ${removal.player ? displayName(removal.player) : ''}`)

function removalUrl() {
  return removal.kind === 'match'
    ? `/api/matches/${matchId.value}`
    : `/api/matches/${matchId.value}/players/${removal.player!.id}`
}

async function askRemoval(kind: 'guest' | 'match', player: SheetPlayer | null = null) {
  Object.assign(removal, { open: true, kind, player, loss: null, busy: false, error: '' })
  try {
    const { counts } = await $fetch<{ counts: DeletionCounts }>(removalUrl(), {
      method: 'DELETE',
      query: { dryRun: 1 },
    })
    removal.loss = kind === 'match'
      ? lossText({ ...counts, matches: 0 })
      : guestLossText(counts.receipts ?? 0)
  }
  catch (e) {
    removal.error = apiError(e)
  }
}

async function confirmRemoval() {
  removal.busy = true
  removal.error = ''
  try {
    await $fetch(removalUrl(), { method: 'DELETE' })
    removal.open = false
    if (removal.kind === 'match') {
      toast.success('Partido borrado')
      await navigateTo('/')
      return
    }
    toast.success('Invitado quitado')
    await refresh()
  }
  catch (e) {
    removal.error = apiError(e)
  }
  finally {
    removal.busy = false
  }
}

async function saveSchedule(patch: { kickoffAt: Date, status: 'convocado' | 'confirmado' }) {
  try {
    await $fetch(`/api/matches/${matchId.value}`, { method: 'PATCH', body: patch })
    await refresh()
  }
  catch (e) {
    toast.error(apiError(e))
  }
}

useHead({ title: () => (match.value ? matchDay(match.value.kickoffAt) : 'Partido') })
</script>

<template>
  <div v-if="error" class="pl-panel pl-missing">
    <h1 class="pl-display">Partido no encontrado</h1>
    <v-btn to="/">Volver</v-btn>
  </div>

  <MatchLayout v-else-if="match">
    <MatchHero
      class="pl-rise"
      :kickoff-at="match.kickoffAt"
      :status="match.status"
      :can-manage="!!data?.canManage"
      :players="players"
      :capacity="capacity"
      :seed="match.id"
      :place="place"
      :address="venue?.address"
      :maps-href="mapsHref"
      :format="match.format"
      :going="going.length"
      :per-player="data?.perPlayer"
      :total-cost="match.totalCost"
      :notes="match.notes"
      @save="saveSchedule"
      @edit-details="openEditDetails"
    />

    <RsvpPanel
      v-model:guest-open="showGuest"
      v-model:guest-name="guestName"
      class="pl-rise"
      style="--i: 1"
      :status="me?.status"
      :spectator-pays="me?.spectatorPays"
      :busy="busy"
      @answer="setStatus"
      @guest="addGuest"
    />

    <MatchMoney
      v-if="match.totalCost"
      class="pl-rise"
      style="--i: 2"
      :collector-name="data?.collectorName ?? null"
      :per-player="data?.perPlayer ?? null"
      :total-cost="match.totalCost"
      :account="data?.collectorAccount ?? null"
      :missing="accountMissing"
      :payments="moneyPayments"
      :has-collector="hasCollector"
      @upload="openUpload"
      @external="sendExternal"
    />

    <ReceiptQueue
      v-if="pendingReceipts.length"
      class="pl-rise"
      style="--i: 2"
      :items="pendingReceipts"
      :amount="data?.perPlayer ?? null"
      @open="openReview"
    />

    <ReceiptUploadDialog
      v-model="upload.open"
      :match-id="matchId"
      :player="upload.player"
      :amount="data?.perPlayer ?? null"
      :collector-name="data?.collectorName ?? null"
      @sent="refresh"
    />
    <ReceiptReviewDialog
      v-model="reviewing.open"
      :match-id="matchId"
      :item="reviewing.item"
      :amount="data?.perPlayer ?? null"
      @done="refresh"
    />

    <template #side>
      <MatchSheet
        class="pl-rise"
        style="--i: 3"
        :going="going"
        :spectators="spectators"
        :can-manage="!!data?.canManage"
        :out="out.map(displayName)"
        :capacity="capacity"
        :show-pay="!!match.totalCost"
        :can-settle="canSettle"
        :collector-user-id="match.collectorUserId"
        :can-draw="!!data?.canManage"
        :busy="busy"
        :removable="removable"
        @draw="draw"
        @toggle="togglePaid"
        @review="openReview"
        @remove="askRemoval('guest', $event)"
        @attendance="setAttendance"
        @link="setLink"
        @swap="swapKits"
      />

      <details v-if="data?.canManage" class="pl-danger">
        <summary class="pl-eyebrow">Más opciones</summary>
        <div class="pl-danger__body">
          <p>Borra el partido con su planilla, invitados y comprobantes.</p>
          <button type="button" class="pl-danger__btn" @click="askRemoval('match')">Borrar partido</button>
        </div>
      </details>
    </template>

    <ConfirmDelete
      v-model="removal.open"
      :title="removalTitle"
      :loss="removal.loss"
      :confirm-label="removal.kind === 'match' ? 'Borrar partido' : 'Quitar'"
      :busy="removal.busy"
      :error="removal.error"
      @confirm="confirmRemoval"
    />

    <v-dialog v-model="editDetails.open" max-width="440" :persistent="editDetails.busy" content-class="pl-editd-wrap">
      <section class="pl-panel pl-editd" role="dialog" aria-labelledby="pl-editdetails-title">
        <header class="pl-editd__head">
          <h2 id="pl-editdetails-title" class="pl-display pl-editd__title">Cancha y datos</h2>
          <button type="button" class="pl-editd__icon" aria-label="Cerrar" :disabled="editDetails.busy" @click="editDetails.open = false">
            <v-icon :icon="mdiClose" size="18" />
          </button>
        </header>

        <form class="pl-editd__form" @submit.prevent="saveDetails">
          <v-select
            v-model="editDetails.format"
            label="Formato"
            :items="[
              { title: '5v5 · 10 jugadores', value: 'f5' },
              { title: '6v6 · 12 jugadores', value: 'f6' },
              { title: '7v7 · 14 jugadores', value: 'f7' },
              { title: 'Libre · los que lleguen', value: 'libre' },
            ]"
          />
          <v-select
            v-model="editDetails.venueId"
            label="Recinto"
            :items="venues ?? []"
            item-title="name"
            item-value="id"
            clearable
          />
          <v-text-field v-model="editDetails.fieldLabel" label="Cancha" placeholder="Cancha 6" />
          <v-text-field
            v-model="editDetails.totalCost"
            label="Valor de la cancha"
            type="number"
            inputmode="numeric"
            prefix="$"
            placeholder="21000"
          />
          <v-select
            v-model="editDetails.collectorUserId"
            label="¿Quién recibe el dinero?"
            :items="collectors"
            item-title="name"
            item-value="id"
            clearable
          />

          <p v-if="editDetails.error" class="pl-editd__error" role="alert">{{ editDetails.error }}</p>

          <footer class="pl-editd__actions">
            <v-btn variant="text" :disabled="editDetails.busy" @click="editDetails.open = false">Cancelar</v-btn>
            <v-btn type="submit" color="primary" :loading="editDetails.busy">Guardar</v-btn>
          </footer>
        </form>
      </section>
    </v-dialog>
  </MatchLayout>
</template>

<style scoped>
.pl-danger {
  margin-top: 2rem;
  border-top: 1px solid var(--pl-line);
  padding-top: 0.8rem;
}

.pl-danger summary {
  cursor: pointer;
  color: var(--pl-ink-faint);
  list-style-position: inside;
}

.pl-danger__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.7rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(var(--v-theme-error), 0.4);
}

.pl-danger__body p {
  margin: 0;
  font-size: 0.88rem;
  color: var(--pl-ink-dim);
}

.pl-danger__btn {
  flex: none;
  height: 36px;
  padding: 0 0.9rem;
  background: transparent;
  border: 1px solid var(--pl-red);
  color: var(--pl-red);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.8rem;
  cursor: pointer;
}

.pl-danger__btn:hover {
  background: rgba(var(--v-theme-error), 0.12);
}

.pl-missing {
  padding: 3rem 1.5rem;
  text-align: center;
}

:global(.pl-editd-wrap:focus-visible) {
  outline: none;
}

.pl-editd {
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  padding: 1.1rem 1.2rem 1.2rem;
  border-top: 2px solid var(--pl-accent);
}

.pl-editd__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.pl-editd__title {
  margin: 0;
  font-size: 1.6rem;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.pl-editd__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink-dim);
  cursor: pointer;
}

.pl-editd__icon:hover:not(:disabled) {
  border-color: var(--pl-accent);
  color: var(--pl-accent);
}

.pl-editd__icon:disabled {
  opacity: 0.35;
  cursor: default;
}

.pl-editd__form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1.1rem;
}

.pl-editd__error {
  margin: 0;
  color: var(--pl-red);
  font-size: 0.9rem;
}

.pl-editd__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.3rem;
}
</style>
