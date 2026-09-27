<script setup lang="ts">
import { mdiArrowRight, mdiCheck, mdiClose, mdiContentCopy, mdiMapMarkerOutline, mdiPencilOutline, mdiPlus } from '@mdi/js'
import { useDisplay } from 'vuetify'
import GroupConstellation from '~/components/GroupConstellation.vue'
import ConfirmDelete from '~/components/ConfirmDelete.vue'

/** El detalle de un grupo: su cielo de miembros, el código de invitación y lo que viene. */
const props = defineProps<{
  group: { id: string, name: string, inviteCode: string, role: string, memberCount: number } | null
}>()
const open = defineModel<boolean>({ required: true })
/** El grupo cambió en el servidor (se salió alguien, se borró, hay nuevo organizador): la lista debe refrescarse. */
const emit = defineEmits<{ changed: [] }>()

interface Member { id: string, name: string, avatarUrl: string | null, role: string }
interface UpcomingMatch {
  id: string
  slug: string
  kickoffAt: string
  capacity: number
  going: number
  venueName: string | null
  fieldLabel: string | null
}

const { smAndDown } = useDisplay()

const members = ref<Member[]>([])
const matches = ref<UpcomingMatch[]>([])
const loading = ref(false)
const failed = ref('')

// --- Nombre del grupo ----------------------------------------------------------
const editingName = ref(false)
const nameDraft = ref('')
const nameBusy = ref(false)
const nameError = ref('')

// Se cargan solo al abrir: la página de lista se mantiene igual de liviana.
watch(
  () => (open.value ? props.group?.id : null),
  async (id) => {
    editingName.value = false
    if (!id) return
    loading.value = true
    failed.value = ''
    members.value = []
    matches.value = []
    try {
      const [m, u] = await Promise.all([
        $fetch<Member[]>(`/api/groups/${id}/members`),
        $fetch<UpcomingMatch[]>(`/api/groups/${id}/matches`),
      ])
      if (props.group?.id !== id) return
      members.value = m
      matches.value = u
    }
    catch (e) {
      failed.value = apiError(e)
    }
    finally {
      loading.value = false
    }
  },
)

function startEditName() {
  nameDraft.value = props.group?.name ?? ''
  nameError.value = ''
  editingName.value = true
}

async function saveName() {
  const g = props.group
  if (!g) return
  const next = nameDraft.value.trim()
  if (next.length < 2) {
    nameError.value = 'Escribe al menos 2 letras.'
    return
  }
  if (next === g.name) {
    editingName.value = false
    return
  }
  nameBusy.value = true
  nameError.value = ''
  try {
    await $fetch(`/api/groups/${g.id}`, { method: 'PATCH', body: { name: next } })
    editingName.value = false
    emit('changed')
  }
  catch (e) {
    nameError.value = apiError(e)
  }
  finally {
    nameBusy.value = false
  }
}

const organizer = computed(() => props.group?.role === 'organizador')
// El último que queda siempre puede cerrar el grupo, sea cual sea su rol.
const canDelete = computed(() => organizer.value || props.group?.memberCount === 1)
const { copied: copiedKey, copy } = useCopy()
const copied = computed(() => copiedKey.value === 'dialog-code')

// --- Miembros y zona de peligro -----------------------------------------------
const { user } = useUserSession()
const toast = useToast()
const promoting = ref('')

async function promote(m: Member) {
  if (!props.group) return
  promoting.value = m.id
  try {
    await $fetch(`/api/groups/${props.group.id}/members/${m.id}`, {
      method: 'PATCH',
      body: { role: 'organizador' },
    })
    m.role = 'organizador'
    toast.success(`${m.name} ahora es organizador`)
    emit('changed')
  }
  catch (e) {
    toast.error(apiError(e))
  }
  finally {
    promoting.value = ''
  }
}

type Danger = 'leave' | 'delete'
const danger = reactive({
  open: false,
  kind: 'leave' as Danger,
  loss: null as string | null,
  blocked: null as null | 'sole-organizer' | 'last-member',
  busy: false,
  error: '',
})

async function askDanger(kind: Danger) {
  const g = props.group
  if (!g) return
  Object.assign(danger, { open: true, kind, loss: null, blocked: null, busy: false, error: '' })
  try {
    if (kind === 'delete') {
      const { counts } = await $fetch<{ counts: DeletionCounts }>(`/api/groups/${g.id}`, {
        method: 'DELETE',
        query: { dryRun: 1 },
      })
      danger.loss = lossText(counts)
      return
    }
    const r = await $fetch<{
      counts: { rsvps: number, guests: number }
      blocked: null | 'sole-organizer' | 'last-member'
      message: string | null
    }>(`/api/groups/${g.id}/leave`, { method: 'POST', query: { dryRun: 1 } })
    danger.blocked = r.blocked
    danger.loss = r.message ?? leaveText(r.counts)
  }
  catch (e) {
    danger.error = apiError(e)
  }
}

function leaveText(c: { rsvps: number, guests: number }) {
  const spots = [
    c.rsvps ? `${c.rsvps} ${c.rsvps === 1 ? 'anotación tuya' : 'anotaciones tuyas'}` : '',
    c.guests ? `${c.guests} ${c.guests === 1 ? 'invitado tuyo' : 'invitados tuyos'}` : '',
  ].filter(Boolean)
  const upcoming = spots.length
    ? ` Se quitarán ${spots.join(' y ')} de los próximos partidos.`
    : ''
  return `Dejarás de ver sus partidos.${upcoming} Los partidos pasados y los pagos no cambian.`
}

async function confirmDanger() {
  const g = props.group
  if (!g) return
  danger.busy = true
  danger.error = ''
  try {
    if (danger.kind === 'delete') {
      await $fetch(`/api/groups/${g.id}`, { method: 'DELETE' })
      toast.success(`Grupo ${g.name} borrado`)
    }
    else {
      await $fetch(`/api/groups/${g.id}/leave`, { method: 'POST' })
      toast.success(`Saliste de ${g.name}`)
    }
    danger.open = false
    open.value = false
    emit('changed')
  }
  catch (e) {
    danger.error = apiError(e)
  }
  finally {
    danger.busy = false
  }
}

const place = (m: UpcomingMatch) =>
  m.venueName && m.fieldLabel
    ? `${m.venueName} · ${m.fieldLabel}`
    : m.venueName ?? m.fieldLabel ?? 'Cancha por definir'
</script>

<template>
  <v-dialog
    v-model="open"
    :fullscreen="smAndDown"
    max-width="620"
    transition="dialog-bottom-transition"
    content-class="pl-gdlg-wrap"
  >
    <section
      v-if="group"
      class="pl-panel pl-gdlg"
      role="document"
      :aria-labelledby="`gdlg-${group.id}`"
    >
      <header class="pl-gdlg__head">
        <div class="pl-gdlg__id">
          <p class="pl-eyebrow" :class="{ 'pl-gdlg__role--org': organizer }">
            {{ organizer ? 'Organizas este grupo' : 'Eres miembro' }}
          </p>
          <form v-if="editingName" class="pl-gdlg__nameform" @submit.prevent="saveName">
            <v-text-field
              v-model="nameDraft"
              autofocus
              maxlength="60"
              density="compact"
              hide-details
              @keyup.esc="editingName = false"
            />
            <v-btn type="submit" size="small" color="primary" :loading="nameBusy">
              <v-icon :icon="mdiCheck" size="18" />
            </v-btn>
            <v-btn size="small" variant="text" :disabled="nameBusy" @click="editingName = false">
              <v-icon :icon="mdiClose" size="18" />
            </v-btn>
          </form>
          <div v-else class="pl-gdlg__namerow">
            <h2 :id="`gdlg-${group.id}`" class="pl-display pl-gdlg__title">{{ group.name }}</h2>
            <button
              v-if="organizer"
              type="button"
              class="pl-gdlg__editname"
              aria-label="Editar nombre del grupo"
              title="Editar nombre"
              @click="startEditName"
            >
              <v-icon :icon="mdiPencilOutline" size="16" />
            </button>
          </div>
          <p v-if="nameError" class="pl-gdlg__nameerror" role="alert">{{ nameError }}</p>
        </div>
        <button type="button" class="pl-gdlg__close" aria-label="Cerrar" @click="open = false">
          <v-icon :icon="mdiClose" size="20" />
        </button>
      </header>

      <div class="pl-gdlg__sky">
        <GroupConstellation v-if="members.length" :group-id="group.id" :members="members" />
        <div v-else class="pl-gdlg__skyholder" aria-hidden="true" />
      </div>

      <div class="pl-gdlg__code">
        <div>
          <span class="pl-eyebrow">Código para invitar</span>
          <code class="pl-display pl-gdlg__value">{{ group.inviteCode }}</code>
        </div>
        <button
          type="button"
          class="pl-gdlg__btn"
          :class="{ 'pl-gdlg__btn--done': copied }"
          :aria-label="`Copiar código ${group.inviteCode}`"
          @click="copy(group.inviteCode, 'dialog-code')"
        >
          <v-icon :icon="copied ? mdiCheck : mdiContentCopy" size="16" />
          <span aria-live="polite">{{ copied ? 'Copiado' : 'Copiar' }}</span>
        </button>
      </div>

      <p v-if="failed" class="pl-gdlg__error" role="alert">{{ failed }}</p>

      <section class="pl-gdlg__block" aria-labelledby="gdlg-matches">
        <div class="pl-gdlg__blockhead">
          <h3 id="gdlg-matches" class="pl-eyebrow">Próximos partidos</h3>
          <NuxtLink :to="`/partido/nuevo?group=${group.id}`" class="pl-gdlg__btn" @click="open = false">
            <v-icon :icon="mdiPlus" size="16" />
            <span>Armar partido</span>
          </NuxtLink>
        </div>
        <p v-if="loading" class="pl-gdlg__muted">Cargando…</p>
        <p v-else-if="!matches.length" class="pl-gdlg__muted">No hay partidos armados.</p>
        <ul v-else class="pl-gdlg__matches">
          <li v-for="m in matches" :key="m.id">
            <NuxtLink :to="`/partido/${m.slug}`" class="pl-gdlg__match" @click="open = false">
              <span class="pl-display pl-numeric pl-gdlg__when">
                {{ matchDay(m.kickoffAt) }} <span>{{ matchTime(m.kickoffAt) }}</span>
              </span>
              <span class="pl-gdlg__going pl-numeric">
                {{ m.going }}/{{ m.capacity }}
                <v-icon :icon="mdiArrowRight" size="16" />
              </span>
              <span class="pl-gdlg__where">
                <v-icon :icon="mdiMapMarkerOutline" size="14" />{{ place(m) }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section class="pl-gdlg__block" aria-labelledby="gdlg-members">
        <h3 id="gdlg-members" class="pl-eyebrow">
          Miembros <span class="pl-numeric">· {{ group.memberCount }}</span>
        </h3>
        <p v-if="loading" class="pl-gdlg__muted">Cargando…</p>
        <ul v-else class="pl-gdlg__members">
          <li v-for="m in members" :key="m.id" class="pl-gdlg__member">
            <span class="pl-gdlg__av" :class="{ 'pl-gdlg__av--org': m.role === 'organizador' }">
              <UserAvatar :name="m.name" :src="m.avatarUrl" :size="28" />
            </span>
            <span class="pl-gdlg__mname">{{ m.name }}</span>
            <span v-if="m.role === 'organizador'" class="pl-gdlg__tag">Organizador</span>
            <button
              v-else-if="organizer && m.id !== user?.id"
              type="button"
              class="pl-gdlg__promote"
              :disabled="promoting === m.id"
              @click="promote(m)"
            >
              Hacer organizador
            </button>
          </li>
        </ul>
      </section>

      <section class="pl-gdlg__block pl-gdlg__danger" aria-labelledby="gdlg-danger">
        <h3 id="gdlg-danger" class="pl-eyebrow">Zona de peligro</h3>
        <div class="pl-gdlg__dangerrow">
          <p>Sales del grupo y dejas de ver sus partidos.</p>
          <button type="button" class="pl-gdlg__dbtn" @click="askDanger('leave')">Salir del grupo</button>
        </div>
        <div v-if="canDelete" class="pl-gdlg__dangerrow">
          <p>Borra el grupo, sus miembros y todos sus partidos con comprobantes.</p>
          <button type="button" class="pl-gdlg__dbtn pl-gdlg__dbtn--solid" @click="askDanger('delete')">
            Borrar grupo
          </button>
        </div>
      </section>

      <ConfirmDelete
        v-model="danger.open"
        :title="danger.kind === 'delete' ? `Borrar ${group.name}` : `Salir de ${group.name}`"
        :loss="danger.loss"
        :confirm-label="danger.kind === 'delete' ? 'Borrar grupo' : 'Salir'"
        :type-to-confirm="danger.kind === 'delete' ? group.name : undefined"
        :blocked="!!danger.blocked"
        :busy="danger.busy"
        :error="danger.error"
        @confirm="confirmDanger"
      >
        <button
          v-if="danger.blocked === 'last-member'"
          type="button"
          class="pl-gdlg__dbtn pl-gdlg__dbtn--solid pl-gdlg__instead"
          @click="askDanger('delete')"
        >
          Borrar el grupo
        </button>
      </ConfirmDelete>
    </section>
  </v-dialog>
</template>

<style scoped>
/* Vuetify enfoca el propio cuadro de diálogo al abrir; el anillo de foco es para los controles. */
:global(.pl-gdlg-wrap:focus-visible) {
  outline: none;
}

.pl-gdlg {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  border-top: 2px solid var(--pl-accent);
}

.v-dialog--fullscreen .pl-gdlg {
  max-height: none;
  height: 100%;
  border-left: 0;
  border-right: 0;
}

.pl-gdlg__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.2rem 0.4rem;
}

.pl-gdlg__id {
  min-width: 0;
}

.pl-gdlg__id .pl-eyebrow {
  margin: 0;
}

.pl-gdlg__role--org {
  color: var(--pl-accent);
}

.pl-gdlg__title {
  margin: 0;
  font-size: clamp(1.9rem, 7vw, 2.5rem);
  overflow-wrap: anywhere;
}

.pl-gdlg__namerow {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-top: 0.3rem;
}

.pl-gdlg__editname {
  display: grid;
  place-items: center;
  flex: none;
  width: 26px;
  height: 26px;
  background: transparent;
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink-dim);
  cursor: pointer;
  transition:
    border-color 140ms ease,
    color 140ms ease;
}

.pl-gdlg__editname:hover {
  border-color: var(--pl-accent);
  color: var(--pl-accent);
}

.pl-gdlg__nameform {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin-top: 0.3rem;
}

.pl-gdlg__nameform .v-input {
  flex: 1;
  min-width: 0;
}

.pl-gdlg__nameform .v-btn {
  flex: none;
  min-width: 36px;
  height: 40px;
  padding: 0;
}

.pl-gdlg__nameerror {
  margin: 0.4rem 0 0;
  color: var(--pl-red);
  font-size: 0.82rem;
}

.pl-gdlg__close {
  display: grid;
  place-items: center;
  flex: none;
  width: 38px;
  height: 38px;
  background: transparent;
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink);
  cursor: pointer;
  transition: border-color 140ms ease;
}

.pl-gdlg__close:hover {
  border-color: var(--pl-accent);
}

/* --- Cielo ------------------------------------------------------------------ */

.pl-gdlg__sky {
  padding: 0.6rem 1.2rem 0.9rem;
}

.pl-gdlg__skyholder {
  aspect-ratio: 400 / 190;
  max-height: 280px;
}

/* --- Código ----------------------------------------------------------------- */

.pl-gdlg__code {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 1.2rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--pl-line);
  border-left: 3px solid var(--pl-accent);
}

.pl-gdlg__code > div {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.pl-gdlg__code .pl-eyebrow {
  font-size: 0.64rem;
}

.pl-gdlg__value {
  font-size: 1.5rem;
  letter-spacing: 0.16em;
  color: var(--pl-accent);
}

.pl-gdlg__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 36px;
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
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    color 140ms ease,
    background-color 140ms ease;
}

.pl-gdlg__btn:hover {
  border-color: var(--pl-accent);
}

.pl-gdlg__btn--done {
  border-color: var(--pl-turf);
  color: var(--pl-turf);
  background: rgba(var(--v-theme-success), 0.12);
}

.pl-gdlg__error {
  margin: 0.8rem 1.2rem 0;
  color: var(--pl-red);
  font-size: 0.88rem;
}

/* --- Bloques --------------------------------------------------------------- */

.pl-gdlg__block {
  padding: 1.1rem 1.2rem 0;
}

.pl-gdlg__block:last-child {
  padding-bottom: 1.3rem;
}

.pl-gdlg__block h3 {
  margin: 0 0 0.6rem;
}

.pl-gdlg__blockhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.pl-gdlg__blockhead h3 {
  margin: 0;
}

.pl-gdlg__muted {
  margin: 0;
  color: var(--pl-ink-faint);
  font-size: 0.9rem;
}

.pl-gdlg__matches,
.pl-gdlg__members {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--pl-line);
}

.pl-gdlg__matches li + li,
.pl-gdlg__member + .pl-gdlg__member {
  border-top: 1px solid var(--pl-line);
}

.pl-gdlg__match {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.2rem 0.8rem;
  align-items: center;
  padding: 0.65rem 0.85rem;
  color: inherit;
  text-decoration: none;
  transition: background-color 140ms ease;
}

.pl-gdlg__match:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}

.pl-gdlg__when {
  font-size: 1.25rem;
  line-height: 1;
  white-space: nowrap;
}

.pl-gdlg__when span {
  color: var(--pl-accent);
  margin-left: 0.25rem;
}

.pl-gdlg__going {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--pl-ink-dim);
}

.pl-gdlg__where {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  font-size: 0.8rem;
  color: var(--pl-ink-dim);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pl-gdlg__member {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.85rem;
}

.pl-gdlg__av {
  display: inline-flex;
  padding: 1px;
  border: 1px solid transparent;
}

.pl-gdlg__av--org {
  border-color: var(--pl-accent);
}

.pl-gdlg__mname {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl-gdlg__tag {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.72rem;
  color: var(--pl-accent);
}
.pl-gdlg__promote {
  flex: none;
  height: 28px;
  padding: 0 0.6rem;
  background: transparent;
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink-dim);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.68rem;
  cursor: pointer;
}

.pl-gdlg__promote:hover {
  border-color: var(--pl-accent);
  color: var(--pl-accent);
}

/* --- Zona de peligro -------------------------------------------------------- */

.pl-gdlg__danger h3 {
  color: var(--pl-red);
}

.pl-gdlg__dangerrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid rgba(var(--v-theme-error), 0.35);
}

.pl-gdlg__dangerrow + .pl-gdlg__dangerrow {
  border-top: 0;
}

.pl-gdlg__dangerrow p {
  margin: 0;
  font-size: 0.86rem;
  color: var(--pl-ink-dim);
}

.pl-gdlg__dbtn {
  flex: none;
  height: 34px;
  padding: 0 0.8rem;
  background: transparent;
  border: 1px solid var(--pl-red);
  color: var(--pl-red);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.76rem;
  cursor: pointer;
}

.pl-gdlg__dbtn:hover {
  background: rgba(var(--v-theme-error), 0.12);
}

.pl-gdlg__dbtn--solid {
  background: var(--pl-red);
  color: rgb(var(--v-theme-on-error));
}

.pl-gdlg__dbtn--solid:hover {
  background: var(--pl-red);
}

.pl-gdlg__instead {
  margin-top: 0.8rem;
}
</style>
