<script setup lang="ts">
import { mdiPin } from '@mdi/js'

/** Una fila de la planilla, tal como la devuelve la API del partido. */
export interface SheetPlayer {
  id: string
  userId: string | null
  name: string | null
  guestName: string | null
  avatarUrl: string | null
  kit: string | null
  /** La camiseta la fijó el organizador a mano; el sorteo la respeta. */
  kitLocked?: boolean
  paid: boolean
  spectatorPays?: boolean
  receipt: { id: string | null, status: string } | null
}

/**
 * La planilla: la lista numerada de quiénes van, o los dos equipos sorteados,
 * con el estado de pago de cada fila. Quien la usa es dueño de cada acción.
 */
const props = defineProps<{
  /** Todos los que dijeron "voy", en orden de llegada. */
  going: SheetPlayer[]
  /** Quienes miran sin jugar: no ocupan cupo ni entran al sorteo, y pueden o no repartir la cancha. */
  spectators?: SheetPlayer[]
  /** Quien mira es organizador: puede pasar filas a espectador y de vuelta. */
  canManage?: boolean
  /** Nombres de quienes dijeron que no vienen o que tal vez. */
  out: string[]
  capacity: number
  /** Muestra la columna de pago (el partido tiene costo). */
  showPay: boolean
  canSettle: boolean
  collectorUserId: string | null
  canDraw: boolean
  /** Id de la fila que se está actualizando, o 'draw'. */
  busy?: string
  /** Filas de invitados que quien mira puede quitar. Si se omite (como en el tutorial), no se muestra el control de quitar. */
  removable?: string[]
}>()
const emit = defineEmits<{
  toggle: [player: SheetPlayer]
  review: [id: string]
  draw: []
  remove: [player: SheetPlayer]
  team: [player: SheetPlayer, kit: 'oscuro' | 'claro']
  unpin: [player: SheetPlayer]
  attendance: [player: SheetPlayer, patch: { status?: 'voy' | 'espectador', spectatorPays?: boolean }]
}>()

const displayName = (p: SheetPlayer) => p.name ?? p.guestName ?? 'Sin nombre'

// Sorteado solo cuando todos tienen equipo; con equipos a medias (fijados a mano) se ve la lista.
const drawn = computed(() => props.going.length > 0 && props.going.every(p => p.kit))
const pinned = computed(() => props.going.filter(p => p.kitLocked && p.kit).length)

const teams = computed(() => [
  { key: 'dark', label: 'Oscuro', players: props.going.filter(p => p.kit === 'oscuro') },
  { key: 'light', label: 'Claro', players: props.going.filter(p => p.kit === 'claro') },
])
const starters = computed(() => props.going.slice(0, props.capacity))
const subs = computed(() => props.going.slice(props.capacity))
const canRemove = (p: SheetPlayer) => !p.userId && !!props.removable?.includes(p.id)
const collects = (p: SheetPlayer) => !!p.userId && p.userId === props.collectorUserId
</script>

<template>
  <section class="pl-sheet">
    <div class="pl-sheet__head">
      <h2 class="pl-display pl-sheet__title pl-section-title">
        Planilla
        <InfoTip title="Sorteo de equipos">
          <p>La lista de los que van, numerada. Los que llegan después del cupo quedan de suplentes.</p>
          <p>
            Quien organiza puede sortear los equipos al azar: oscuro contra claro. Si no
            convence, se puede sortear de nuevo.
          </p>
          <p>
            En el menú <strong>⋯</strong> de cada jugador puedes fijarlo en un equipo. El sorteo
            lo deja ahí y reparte al resto: sirve para dejar juntos a los que quieren jugar en el
            mismo equipo.
          </p>
        </InfoTip>
      </h2>
      <v-btn
        v-if="canDraw && going.length >= 2"
        size="small"
        variant="outlined"
        :loading="busy === 'draw'"
        @click="emit('draw')"
      >
        {{ drawn ? 'Sortear de nuevo' : pinned ? 'Sortear el resto' : 'Sortear equipos' }}
      </v-btn>
    </div>

    <!-- Sorteado: dos camisetas enfrentadas en la línea central -->
    <div v-if="drawn" class="pl-teams">
      <div v-for="team in teams" :key="team.key" class="pl-panel">
        <p class="pl-team__head"><span class="pl-kit" :class="`pl-kit--${team.key}`" /> {{ team.label }}</p>
        <div v-for="(p, i) in team.players" :key="p.id" class="pl-sheet-row pl-sheet-row--filled">
          <span class="pl-sheet-num">{{ i + 1 }}</span>
          <span class="pl-who">
            <UserAvatar v-if="p.userId" :name="p.name" :src="p.avatarUrl" :size="22" />
            <span class="pl-name" :class="{ 'pl-guest': !p.userId }" :title="displayName(p)">{{ shortName(displayName(p)) }}</span>
            <button
              v-if="canManage && p.kitLocked && p.kit"
              type="button"
              class="pl-pin"
              title="Fijado en este equipo: toca para desfijar"
              aria-label="Desfijar"
              @click="emit('unpin', p)"
            >
              <v-icon :icon="mdiPin" size="13" />
            </button>
            <SheetRowMenu
              v-if="canManage || canRemove(p)"
              mode="playing"
              :player="p"
              :can-manage="canManage"
              :can-remove="canRemove(p)"
              :busy="busy === p.id"
              @team="emit('team', p, $event)"
              @unpin="emit('unpin', p)"
              @attendance="emit('attendance', p, $event)"
              @remove="emit('remove', p)"
            />
          </span>
          <PayCell
            v-if="showPay"
            :paid="p.paid"
            :receipt="p.receipt"
            :can-settle="canSettle"
            :collects="collects(p)"
            :busy="busy === p.id"
            @toggle="emit('toggle', p)"
            @review="emit('review', p.id)"
          />
        </div>
      </div>
    </div>

    <!-- Aún no sorteado: la lista numerada, con los cupos vacíos aún visibles -->
    <div v-else class="pl-panel">
      <div v-for="(p, i) in starters" :key="p.id" class="pl-sheet-row pl-sheet-row--filled">
        <span class="pl-sheet-num">{{ i + 1 }}</span>
        <span class="pl-who">
          <UserAvatar v-if="p.userId" :name="p.name" :src="p.avatarUrl" :size="22" />
          <span class="pl-name" :class="{ 'pl-guest': !p.userId }" :title="displayName(p)">
            {{ shortName(displayName(p)) }}
            <span v-if="!p.userId" class="pl-invited">invitado</span>
          </span>
          <button
            v-if="canManage && p.kitLocked && p.kit"
            type="button"
            class="pl-pin"
            title="Fijado en este equipo: toca para desfijar"
            aria-label="Desfijar"
            @click="emit('unpin', p)"
          >
            <v-icon :icon="mdiPin" size="13" />
          </button>
          <SheetRowMenu
            v-if="canManage || canRemove(p)"
            mode="playing"
            :player="p"
            :can-manage="canManage"
            :can-remove="canRemove(p)"
            :busy="busy === p.id"
            @team="emit('team', p, $event)"
            @unpin="emit('unpin', p)"
            @attendance="emit('attendance', p, $event)"
            @remove="emit('remove', p)"
          />
        </span>
        <PayCell
          v-if="showPay"
          :paid="p.paid"
          :receipt="p.receipt"
          :can-settle="canSettle"
          :collects="collects(p)"
          :busy="busy === p.id"
          @toggle="emit('toggle', p)"
          @review="emit('review', p.id)"
        />
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
        <span class="pl-who">
          <UserAvatar v-if="p.userId" :name="p.name" :src="p.avatarUrl" :size="22" />
          <span class="pl-name" :class="{ 'pl-guest': !p.userId }" :title="displayName(p)">{{ shortName(displayName(p)) }}</span>
          <SheetRowMenu
            v-if="canManage || canRemove(p)"
            mode="playing"
            :player="p"
            :can-manage="canManage"
            :can-remove="canRemove(p)"
            :busy="busy === p.id"
            @team="emit('team', p, $event)"
            @unpin="emit('unpin', p)"
            @attendance="emit('attendance', p, $event)"
            @remove="emit('remove', p)"
          />
          <SheetRowMenu
            v-if="canManage || canRemove(p)"
            mode="playing"
            :player="p"
            :can-manage="canManage"
            :can-remove="canRemove(p)"
            :busy="busy === p.id"
            @team="emit('team', p, $event)"
            @unpin="emit('unpin', p)"
            @attendance="emit('attendance', p, $event)"
            @remove="emit('remove', p)"
          />
        </span>
        <span />
      </div>
    </div>

    <div v-if="spectators?.length" class="pl-subs pl-panel">
      <p class="pl-eyebrow">
        Espectadores
        <InfoTip title="Espectadores">
          <p>No juegan, no ocupan cupo y no entran al sorteo. Si pagan, entran al reparto de la cancha.</p>
        </InfoTip>
      </p>
      <div v-for="p in spectators" :key="p.id" class="pl-sheet-row">
        <span class="pl-sheet-num">—</span>
        <span class="pl-who">
          <UserAvatar v-if="p.userId" :name="p.name" :src="p.avatarUrl" :size="22" />
          <span class="pl-name" :class="{ 'pl-guest': !p.userId }" :title="displayName(p)">
            {{ shortName(displayName(p)) }}
            <span class="pl-invited">{{ p.spectatorPays ? 'paga cancha' : 'no paga' }}</span>
          </span>
          <SheetRowMenu
            v-if="canManage"
            mode="spectator"
            :player="p"
            can-manage
            :busy="busy === p.id"
            @attendance="emit('attendance', p, $event)"
          />
        </span>
        <PayCell
          v-if="showPay && p.spectatorPays"
          :paid="p.paid"
          :receipt="p.receipt"
          :can-settle="canSettle"
          :collects="collects(p)"
          :busy="busy === p.id"
          @toggle="emit('toggle', p)"
          @review="emit('review', p.id)"
        />
        <span v-else />
      </div>
    </div>

    <div v-if="out.length" class="pl-out">
      <p class="pl-eyebrow">No van</p>
      <p class="pl-out__names">{{ out.join(' · ') }}</p>
    </div>
  </section>
</template>

<style scoped>
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

.pl-who {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
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
.pl-pin {
  display: grid;
  place-items: center;
  flex: none;
  padding: 0;
  background: none;
  border: 0;
  color: var(--pl-accent);
  cursor: pointer;
}

.pl-pin:hover,
.pl-pin:focus-visible {
  color: var(--pl-red);
}
</style>
