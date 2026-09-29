<script setup lang="ts">
/** "¿Vas?": las tres respuestas y el formulario de invitado. Quien lo usa es dueño de cada acción. */
const props = defineProps<{
  /** La respuesta actual de quien mira, si tiene alguna. */
  status?: string | null
  /** Si quien mira, siendo espectador, reparte la cancha. */
  spectatorPays?: boolean
  /** Alguna acción en curso: los botones esperan; 'guest' hace girar el botón de invitado. */
  busy?: string
}>()
const guestOpen = defineModel<boolean>('guestOpen', { default: false })
const guestName = defineModel<string>('guestName', { default: '' })
const emit = defineEmits<{ answer: [status: string, spectatorPays?: boolean], guest: [] }>()

const OPTIONS = [
  { key: 'voy', label: 'Voy' },
  { key: 'quizas', label: 'Quizás' },
  { key: 'no_voy', label: 'No voy' },
]
</script>

<template>
  <section class="pl-panel pl-answer">
    <p class="pl-eyebrow pl-section-title">
      ¿Vas?
      <InfoTip title="Anotarse">
        <p><strong>Voy</strong> te suma a la planilla y ocupas un cupo.</p>
        <p><strong>Quizás</strong> avisa que puede ser, pero no ocupa cupo.</p>
        <p>
          <strong>Espectador</strong> no juega ni ocupa cupo ni entra al sorteo. Tú decides si
          igual pagas tu parte de la cancha.
        </p>
        <p><strong>No voy</strong> deja claro que no cuenten contigo. Puedes cambiarlo cuando quieras.</p>
      </InfoTip>
    </p>
    <div class="pl-answer__row">
      <button
        v-for="opt in OPTIONS"
        :key="opt.key"
        type="button"
        class="pl-answer__btn"
        :class="{ 'pl-answer__btn--on': status === opt.key }"
        :disabled="!!busy"
        @click="emit('answer', opt.key)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div class="pl-answer__spectate">
      <button
        type="button"
        class="pl-link"
        :class="{ 'pl-link--on': status === 'espectador' }"
        :disabled="!!busy"
        @click="emit('answer', 'espectador', props.spectatorPays ?? false)"
      >
        {{ status === 'espectador' ? 'Vas de espectador' : 'Voy de espectador' }}
      </button>
      <label v-if="status === 'espectador'" class="pl-answer__pays">
        <input
          type="checkbox"
          :checked="spectatorPays"
          :disabled="!!busy"
          @change="emit('answer', 'espectador', ($event.target as HTMLInputElement).checked)"
        >
        Pago mi parte de la cancha
      </label>
    </div>

    <div class="pl-answer__extra">
      <span v-if="!guestOpen" class="pl-section-title">
        <button type="button" class="pl-link" @click="guestOpen = true">
          + Llevo a alguien
        </button>
        <InfoTip
          title="Invitados"
          text="Suma a alguien que no tiene cuenta. Aparece en la planilla como invitado y su pago queda a tu cargo."
        />
      </span>
      <form v-else class="pl-guest-form" @submit.prevent="emit('guest')">
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
</template>

<style scoped>
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
  transition:
    background-color 200ms ease,
    color 200ms ease;
}

.pl-answer__btn:last-child {
  border-right: 0;
}

.pl-answer__btn--on {
  background: var(--pl-accent);
  color: var(--pl-pitch);
}

.pl-answer__spectate {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 1rem;
  margin-top: 0.75rem;
}

.pl-link--on {
  color: var(--pl-ink);
}

.pl-answer__pays {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
  color: var(--pl-ink-dim);
  cursor: pointer;
}

.pl-answer__extra {
  margin-top: 0.9rem;
}

.pl-link {
  background: none;
  border: 0;
  padding: 0;
  color: var(--pl-accent);
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
}

.pl-guest-form {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
}
</style>
