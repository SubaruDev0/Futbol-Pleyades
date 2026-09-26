<script setup lang="ts">
import { mdiCheck, mdiEye, mdiEyeOff } from '@mdi/js'

/** Cambiar contraseña en /perfil. Presentacional: la página valida y envía. */
defineProps<{ busy: boolean, error: string, saved: boolean }>()
const current = defineModel<string>('current', { default: '' })
const fresh = defineModel<string>('fresh', { default: '' })
const confirm = defineModel<string>('confirm', { default: '' })
const emit = defineEmits<{ save: [] }>()

const show = reactive({ current: false, fresh: false, confirm: false })
const freshTooShort = computed(() => fresh.value.length > 0 && fresh.value.length < 8)
const mismatch = computed(() => confirm.value.length > 0 && confirm.value !== fresh.value)
</script>

<template>
  <section class="pl-panel pl-card">
    <h2 class="pl-display pl-card__title pl-section-title">
      Cambiar contraseña
      <InfoTip
        title="Contraseña"
        text="Te pedimos la actual para confirmar que eres tú. La nueva debe tener al menos 8 caracteres."
      />
    </h2>
    <form class="pl-card__form" @submit.prevent="emit('save')">
      <div class="pl-pass">
        <v-text-field
          v-model="current"
          label="Contraseña actual"
          :type="show.current ? 'text' : 'password'"
          autocomplete="current-password"
          :append-inner-icon="show.current ? mdiEyeOff : mdiEye"
          @click:append-inner="show.current = !show.current"
        />
        <v-text-field
          v-model="fresh"
          label="Contraseña nueva"
          :type="show.fresh ? 'text' : 'password'"
          autocomplete="new-password"
          :error-messages="freshTooShort ? 'Mínimo 8 caracteres' : undefined"
          :append-inner-icon="show.fresh ? mdiEyeOff : mdiEye"
          @click:append-inner="show.fresh = !show.fresh"
        />
        <v-text-field
          v-model="confirm"
          label="Repite la nueva"
          :type="show.confirm ? 'text' : 'password'"
          autocomplete="new-password"
          :error-messages="mismatch ? 'No coincide' : undefined"
          :append-inner-icon="show.confirm ? mdiEyeOff : mdiEye"
          @click:append-inner="show.confirm = !show.confirm"
        />
      </div>
      <p v-if="error" class="pl-msg pl-msg--error">{{ error }}</p>
      <div class="pl-card__foot pl-card__foot--split">
        <p class="pl-note">
          ¿Olvidaste tu contraseña? Pronto podrás recuperarla con un código por SMS.
        </p>
        <span v-if="saved" class="pl-msg pl-msg--ok">
          <v-icon :icon="mdiCheck" size="16" /> Contraseña cambiada
        </span>
        <v-btn type="submit" color="primary" :loading="busy">Cambiar</v-btn>
      </div>
    </form>
  </section>
</template>

<style scoped>
.pl-pass {
  display: grid;
  grid-template-columns: 1fr;
  align-items: start;
  gap: 0.8rem;
}
</style>
