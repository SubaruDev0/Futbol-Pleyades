<script setup lang="ts">
import { mdiCheck, mdiDotsHorizontal } from '@mdi/js'
import type { SheetPlayer } from '~/components/MatchSheet.vue'

/**
 * Las acciones de una fila de la planilla, plegadas en un solo menú para que la
 * fila no se llene de botones. Quien lo usa es dueño de cada acción.
 */
const props = defineProps<{
  player: SheetPlayer
  /** Un jugador que va, o un espectador: cada uno tiene sus propias acciones. */
  mode: 'playing' | 'spectator'
  /** Quien mira es organizador: equipos y espectadores. */
  canManage?: boolean
  /** Quien mira puede quitar a este invitado. */
  canRemove?: boolean
  busy?: boolean
}>()
const emit = defineEmits<{
  link: [group: number | null]
  attendance: [patch: { status?: 'voy' | 'espectador', spectatorPays?: boolean }]
  remove: []
}>()

const GROUPS = [1, 2, 3, 4, 5]
const pick = (group: number) => emit('link', props.player.linkGroup === group ? null : group)
</script>

<template>
  <v-menu location="bottom end" offset="6" :transition="false">
    <template #activator="{ props: menu, isActive: open }">
      <button
        v-bind="menu"
        type="button"
        class="pl-rowmenu__btn"
        :class="{ 'pl-rowmenu__btn--open': open }"
        aria-label="Más acciones"
        title="Más acciones"
        :disabled="busy"
      >
        <v-icon :icon="mdiDotsHorizontal" size="18" />
      </button>
    </template>

    <div class="pl-rowmenu" role="menu">
      <template v-if="mode === 'playing' && canManage">
        <p class="pl-rowmenu__label">Ligar con</p>
        <button
          v-for="g in GROUPS"
          :key="g"
          type="button"
          class="pl-rowmenu__item"
          role="menuitem"
          :title="player.linkGroup === g
            ? 'Toca para desligarlo'
            : `Todos los del grupo ${g} quedan siempre en el mismo equipo, salgan donde salgan en el sorteo`"
          @click="pick(g)"
        >
          <span class="pl-link">{{ g }}</span>
          {{ player.linkGroup === g ? `Grupo ${g} · desligar` : `Grupo ${g}` }}
          <v-icon v-if="player.linkGroup === g" :icon="mdiCheck" size="16" class="pl-rowmenu__check" />
        </button>
        <button
          type="button"
          class="pl-rowmenu__item pl-rowmenu__item--sep"
          role="menuitem"
          title="No juega ni ocupa cupo, y pierde su equipo del sorteo"
          @click="emit('attendance', { status: 'espectador' })"
        >
          Pasar a espectador
        </button>
      </template>

      <template v-if="mode === 'spectator' && canManage">
        <button
          type="button"
          class="pl-rowmenu__item"
          role="menuitem"
          :title="player.spectatorPays
            ? 'Deja de repartir la cancha: baja su parte y el resto paga más'
            : 'Entra al reparto de la cancha: el valor por persona baja y puede subir comprobante'"
          @click="emit('attendance', { spectatorPays: !player.spectatorPays })"
        >
          {{ player.spectatorPays ? 'Que no pague cancha' : 'Que pague cancha' }}
        </button>
        <button
          type="button"
          class="pl-rowmenu__item"
          role="menuitem"
          title="Vuelve a jugar: ocupa cupo y entra al sorteo de equipos"
          @click="emit('attendance', { status: 'voy', spectatorPays: false })"
        >
          Pasar a jugador
        </button>
      </template>

      <button
        v-if="canRemove"
        type="button"
        class="pl-rowmenu__item pl-rowmenu__item--danger"
        :class="{ 'pl-rowmenu__item--sep': canManage }"
        role="menuitem"
        @click="emit('remove')"
      >
        Quitar invitado
      </button>
    </div>
  </v-menu>
</template>

<style scoped>
.pl-rowmenu__btn {
  display: grid;
  place-items: center;
  flex: none;
  width: 26px;
  height: 26px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--pl-line);
  color: var(--pl-ink-faint);
  cursor: pointer;
  transition:
    border-color 140ms ease,
    color 140ms ease;
}

.pl-rowmenu__btn:hover,
.pl-rowmenu__btn:focus-visible,
.pl-rowmenu__btn--open {
  border-color: var(--pl-accent);
  color: var(--pl-ink);
}

.pl-rowmenu__btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.pl-rowmenu {
  min-width: 210px;
  padding: 0.3rem 0;
  background: var(--pl-raised);
  border: 1px solid var(--pl-line-strong);
  border-top: 2px solid var(--pl-accent);
}

.pl-rowmenu__label {
  margin: 0;
  padding: 0.4rem 0.9rem 0.2rem;
  color: var(--pl-ink-faint);
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.pl-rowmenu__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.6rem 0.9rem;
  background: none;
  border: 0;
  color: var(--pl-ink);
  font: inherit;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
}

.pl-rowmenu__item:hover,
.pl-rowmenu__item:focus-visible {
  background: rgba(255, 255, 255, 0.05);
}

.pl-rowmenu__item--sep {
  border-top: 1px solid var(--pl-line);
  margin-top: 0.3rem;
  padding-top: 0.75rem;
}

.pl-rowmenu__item--danger:hover,
.pl-rowmenu__item--danger:focus-visible {
  color: var(--pl-red);
}

.pl-link {
  display: inline-grid;
  place-items: center;
  width: 1.15rem;
  height: 1.15rem;
  border: 1px solid var(--pl-accent);
  color: var(--pl-accent);
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 700;
}

.pl-rowmenu__check {
  margin-left: auto;
  color: var(--pl-accent);
}
</style>
