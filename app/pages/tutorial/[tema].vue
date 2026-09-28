<script setup lang="ts">
import GroupsView from '~/components/GroupsView.vue'
import MatchLayout from '~/components/MatchLayout.vue'
import MatchHero from '~/components/MatchHero.vue'
import RsvpPanel from '~/components/RsvpPanel.vue'
import MatchMoney from '~/components/MatchMoney.vue'
import ReceiptQueue from '~/components/ReceiptQueue.vue'
import MatchSheet from '~/components/MatchSheet.vue'
import ProfileLayout from '~/components/ProfileLayout.vue'
import ProfileMeCard from '~/components/ProfileMeCard.vue'
import PasswordCard from '~/components/PasswordCard.vue'
import PaymentAccountCard from '~/components/PaymentAccountCard.vue'
import ReceiptReviewPanel from '~/components/ReceiptReviewPanel.vue'
import DemoReceipt from '~/components/DemoReceipt.vue'
import { useDisplay } from 'vuetify'
import type { MoneyPayment } from '~/components/MatchMoney.vue'
import type { AccountDraft } from '~/components/PaymentAccountCard.vue'
import {
  DEMO_ACCOUNT,
  DEMO_CAPACITY,
  DEMO_CODE,
  DEMO_COLLECTOR,
  DEMO_GROUP_NAME,
  DEMO_SEED,
  DEMO_TOTAL,
  DEMO_VENUE,
  DEMO_YOU,
  DEMO_YOUR_ACCOUNT,
  demoGroup,
  demoKickoff,
  demoNewGroup,
  demoPending,
  demoRoster,
} from '~/utils/tour-demo'
import { tutorialBySlug } from '~/utils/tour-steps'

/**
 * Un tutorial: una copia de demo de una pantalla real, construida con los
 * mismos componentes y alimentada desde utils/tour-demo.ts. El paso del tour
 * decide qué tan avanzada va la historia; con el tour cerrado, se muestra el
 * estado del último paso. Nada aquí llama a la API.
 */
definePageMeta({ key: route => route.path })

const route = useRoute()
const router = useRouter()
const tour = useTour()
const { smAndDown } = useDisplay()

const tutorial = tutorialBySlug(String(route.params.tema))
if (!tutorial) throw createError({ statusCode: 404, statusMessage: 'Tutorial no encontrado' })
const lesson = tutorial

useHead({ title: `Tutorial · ${lesson.title}` })

// --- Estado de la historia -------------------------------------------------------

const running = computed(() => tour.active.value && tour.topic.value === lesson.slug)
const wanted = computed(() =>
  (running.value ? lesson.steps[tour.index.value] : lesson.steps[lesson.steps.length - 1])!.demo)

// Los jugadores llegan uno por uno mientras el conteo sube; volver atrás salta directo ahí.
const arrived = ref(wanted.value.arrived)
let popTimer: ReturnType<typeof setTimeout> | undefined
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

watch(() => wanted.value.arrived, (to) => {
  clearTimeout(popTimer)
  if (to <= arrived.value || reducedMotion()) {
    arrived.value = to
    return
  }
  const tick = () => {
    arrived.value++
    if (arrived.value < to) popTimer = setTimeout(tick, 260)
  }
  popTimer = setTimeout(tick, 420)
})

const state = computed(() => ({ ...wanted.value, arrived: arrived.value }))

// Con el tour cerrado el demo responde localmente, para que sus controles no se sientan muertos.
const local = reactive({
  groups: null as null | 'joined' | 'created',
  answer: null as string | null,
  review: false,
})
watch(running, (on) => {
  if (on) Object.assign(local, { groups: null, answer: null, review: false })
})

// --- Grupos ----------------------------------------------------------------------

const kickoff = demoKickoff()
const tab = ref(wanted.value.tab)
const groupName = ref('')
const joinCode = ref('')
watch(wanted, (s) => {
  tab.value = s.tab
  groupName.value = s.typed && s.tab === 'create' ? DEMO_GROUP_NAME : ''
  joinCode.value = s.typed && s.tab === 'join' ? DEMO_CODE : ''
}, { immediate: true })

const groups = computed(() => {
  const g = (!running.value && local.groups) || state.value.groups
  if (g === 'joined') return [demoGroup(9, kickoff)]
  if (g === 'created') return [demoNewGroup()]
  return []
})

function onLocal(kind: 'create' | 'join') {
  local.groups = kind === 'join' ? 'joined' : 'created'
}

// --- Partido -------------------------------------------------------------------------

const asCollector = lesson.view === 'cobrar'
const roster = computed(() => demoRoster(state.value, asCollector))
const place = `${DEMO_VENUE.name} · ${DEMO_VENUE.field}`
const mapsHref = mapsSearchUrl(DEMO_VENUE.name, DEMO_VENUE.address)

const answer = computed(() => {
  if (!running.value && local.answer) return local.answer
  return asCollector || roster.value.you ? 'voy' : null
})
const guestOpen = ref(false)
const guestName = ref('')

const payments = computed<MoneyPayment[]>(() => {
  if (asCollector || !roster.value.you) return []
  const pay = state.value.pay
  return [{
    id: DEMO_YOU.id,
    label: 'Tu pago',
    paid: pay === 'paid',
    receipt: pay === 'sent' ? { status: 'pendiente' } : null,
  }]
})

const pending = demoPending()
const reviewing = computed({
  get: () => (running.value ? state.value.review : local.review),
  set: (v: boolean) => { if (!running.value) local.review = v },
})
const reviewed = pending[0]!

// --- Perfil -------------------------------------------------------------------------

const myName = ref(DEMO_YOU.name)
const acc = reactive<AccountDraft>({
  holderName: DEMO_YOUR_ACCOUNT.holderName,
  rut: cleanRut(DEMO_YOUR_ACCOUNT.rut),
  bank: DEMO_YOUR_ACCOUNT.bank,
  accountType: DEMO_YOUR_ACCOUNT.accountType,
  accountNumber: DEMO_YOUR_ACCOUNT.accountNumber,
  email: '',
})
const noError = () => undefined

// --- Clicks muertos se leerían como una app rota, no como una de demo ------------------
const toast = useToast()
function demoNoop() {
  toast.info('Es de prueba: en tu grupo real esto sí hace efecto.')
}

// --- Los links del demo se quedan quietos ---------------------------------------------------------

/** Los links dentro del demo apuntan a cosas que no existen; se ignoran. */
function holdLinks(e: MouseEvent) {
  if ((e.target as HTMLElement | null)?.closest('a')) {
    e.preventDefault()
    e.stopPropagation()
  }
}

// --- Entrada ---------------------------------------------------------------------------

let startTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  if (route.query.start === undefined) return
  router.replace({ query: {} })
  // Se deja que la página se asiente antes de que se encienda el reflector.
  startTimer = setTimeout(() => tour.start(lesson.slug), 450)
})
onBeforeUnmount(() => {
  clearTimeout(startTimer)
  clearTimeout(popTimer)
})
</script>

<template>
  <div>
    <p class="tut-banner">
      <span class="tut-banner__tag">Ejemplo</span>
      <span>{{ lesson.title }} · datos inventados, nada se guarda.</span>
      <button type="button" class="tut-banner__again" @click="tour.start(lesson.slug)">
        {{ running ? 'Reiniciar' : 'Ver pasos' }}
      </button>
    </p>

    <div @click.capture="holdLinks">
      <!-- Grupos ---------------------------------------------------------------- -->
      <GroupsView v-if="lesson.view === 'grupos'" :groups="groups" @open="demoNoop">
        <template #actions>
          <GroupActions
            v-model:tab="tab"
            v-model:name="groupName"
            v-model:code="joinCode"
            local
            @local="onLocal"
          />
        </template>
      </GroupsView>

      <!-- Partido: como jugador, o como quien cobra ----------------------------- -->
      <MatchLayout v-else-if="lesson.view === 'partido' || lesson.view === 'cobrar'">
        <MatchHero
          :kickoff-at="kickoff"
          status="convocado"
          :players="roster.players"
          :capacity="DEMO_CAPACITY"
          :seed="DEMO_SEED"
          :place="place"
          :address="DEMO_VENUE.address"
          :maps-href="mapsHref"
          format="f7"
          :going="roster.going.length"
          :per-player="roster.perPlayer"
        />
        <RsvpPanel
          v-model:guest-open="guestOpen"
          v-model:guest-name="guestName"
          :status="answer"
          @answer="local.answer = $event"
          @guest="guestOpen = false; guestName = ''"
        />
        <MatchMoney
          :collector-name="DEMO_COLLECTOR.name"
          :collector-phone="null"
          :per-player="roster.perPlayer"
          :total-cost="DEMO_TOTAL"
          :account="DEMO_ACCOUNT"
          :payments="payments"
          :has-collector="true"
          @upload="demoNoop"
        />
        <ReceiptQueue
          v-if="asCollector"
          :items="pending"
          :amount="roster.perPlayer"
          @open="local.review = true"
        />

        <template #side>
          <MatchSheet
            :going="roster.going"
            :out="roster.out"
            :capacity="DEMO_CAPACITY"
            :show-pay="true"
            :can-settle="asCollector"
            :collector-user-id="DEMO_COLLECTOR.id"
            :can-draw="false"
            @review="local.review = true"
            @toggle="demoNoop"
          />
        </template>
      </MatchLayout>

      <!-- Perfil ---------------------------------------------------------------- -->
      <ProfileLayout v-else :phone="DEMO_YOU.phone">
        <ProfileMeCard
          v-model:name="myName"
          data-tour="me"
          :shown-name="DEMO_YOU.name"
          :avatar-url="null"
          :phase="null"
          :progress="0"
          :busy="false"
          error=""
          :saved="false"
          photo-error=""
          @avatar="demoNoop"
          @edit="demoNoop"
          @pick="demoNoop"
          @remove="demoNoop"
          @save="demoNoop"
        />
        <PasswordCard :busy="false" error="" :saved="false" @save="demoNoop" />
        <PaymentAccountCard
          data-tour="bank"
          class="pl-card--wide"
          :acc="acc"
          :error-for="noError"
          :busy="false"
          error=""
          :saved="false"
          :stored="true"
          @save="demoNoop"
          @remove="demoNoop"
        />
      </ProfileLayout>
    </div>

    <v-dialog
      v-if="asCollector"
      v-model="reviewing"
      :fullscreen="smAndDown"
      max-width="560"
      :retain-focus="false"
      content-class="pl-demo-review"
      transition="dialog-bottom-transition"
    >
      <ReceiptReviewPanel
        :name="reviewed.name"
        :guest="reviewed.guest"
        :created-at="reviewed.createdAt"
        :amount="roster.perPlayer"
        @close="reviewing = false"
        @accept="reviewing = false"
        @reject="reviewing = false"
      >
        <template #image>
          <DemoReceipt :amount="roster.perPlayer ?? 0" :payer="reviewed.name" :when="reviewed.createdAt" />
        </template>
      </ReceiptReviewPanel>
    </v-dialog>
  </div>
</template>

<style scoped>
/* "Ejemplo": una línea delgada bajo el encabezado, para que nadie la confunda con sus datos. */
.tut-banner {
  position: sticky;
  top: 58px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: -1.5rem -1rem 1.2rem;
  padding: 0.35rem 1rem 0.45rem;
  background: rgba(var(--v-theme-background), 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px dashed var(--pl-line-strong);
  font-size: 0.8rem;
  color: var(--pl-ink-dim);
}

.tut-banner > span:nth-child(2) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tut-banner__tag {
  flex: none;
  padding: 0.05rem 0.4rem;
  border: 1px solid var(--pl-amber);
  color: var(--pl-amber);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.66rem;
}

.tut-banner__again {
  flex: none;
  margin-left: auto;
  padding: 0.1rem 0;
  background: none;
  border: 0;
  color: var(--pl-accent);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.74rem;
  cursor: pointer;
}

@media (min-width: 900px) {
  .tut-banner {
    margin: -2.25rem -2rem 1.6rem;
    padding: 0.4rem 2rem 0.5rem;
  }
}
</style>
