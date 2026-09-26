<script setup lang="ts">
import { mdiClose } from '@mdi/js'

/**
 * Confirma una eliminación real. Indica qué se va con ella (`loss`, del dry run
 * del endpoint) y, para las más importantes, pide escribir un nombre primero.
 */
const props = defineProps<{
  title: string
  /** "Se borrarán 3 partidos, 12 anotados…"; null mientras cargan los conteos. */
  loss: string | null
  confirmLabel: string
  /** Si se define, el botón queda deshabilitado hasta escribir exactamente este texto. */
  typeToConfirm?: string
  busy?: boolean
  error?: string
  /** La acción no puede continuar; `loss` explica por qué y el botón queda deshabilitado. */
  blocked?: boolean
}>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ confirm: [] }>()

const typed = ref('')
watch(open, (v) => { if (v) typed.value = '' })

const ready = computed(() =>
  !!props.loss && !props.busy && !props.blocked && (!props.typeToConfirm || typed.value.trim() === props.typeToConfirm.trim()))
</script>

<template>
  <v-dialog v-model="open" max-width="460" :persistent="busy" content-class="pl-cdel-wrap">
    <section class="pl-panel pl-cdel" role="alertdialog" aria-labelledby="pl-cdel-title">
      <header class="pl-cdel__head">
        <h2 id="pl-cdel-title" class="pl-display pl-cdel__title">{{ title }}</h2>
        <button type="button" class="pl-cdel__close" aria-label="Cerrar" :disabled="busy" @click="open = false">
          <v-icon :icon="mdiClose" size="18" />
        </button>
      </header>

      <p class="pl-cdel__loss" aria-live="polite">{{ loss ?? 'Contando lo que se borrará…' }}</p>
      <slot />

      <label v-if="typeToConfirm" class="pl-cdel__type">
        <span>Escribe <strong>{{ typeToConfirm }}</strong> para confirmar</span>
        <input v-model="typed" type="text" autocomplete="off" spellcheck="false" :disabled="busy">
      </label>

      <p v-if="error" class="pl-cdel__error" role="alert">{{ error }}</p>

      <footer class="pl-cdel__actions">
        <button type="button" class="pl-cdel__btn" :disabled="busy" @click="open = false">{{ blocked ? 'Entendido' : 'Cancelar' }}</button>
        <button
          v-if="!blocked"
          type="button"
          class="pl-cdel__btn pl-cdel__btn--danger"
          :disabled="!ready"
          @click="emit('confirm')"
        >
          {{ busy ? 'Borrando…' : confirmLabel }}
        </button>
      </footer>
    </section>
  </v-dialog>
</template>

<style scoped>
/* Vuetify enfoca el propio cuadro de diálogo al abrir; el anillo de foco es para los controles. */
:global(.pl-cdel-wrap:focus-visible) {
  outline: none;
}

.pl-cdel {
  padding: 1.1rem 1.2rem 1.2rem;
  border-top: 2px solid var(--pl-red);
}

.pl-cdel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.pl-cdel__title {
  margin: 0;
  font-size: 1.6rem;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.pl-cdel__close {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  background: transparent;
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink);
  cursor: pointer;
}

.pl-cdel__loss {
  margin: 0.9rem 0 0;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--pl-line);
  border-left: 3px solid var(--pl-red);
  background: rgba(var(--v-theme-error), 0.08);
  font-size: 0.95rem;
  line-height: 1.45;
}

.pl-cdel__type {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 1rem;
  font-size: 0.88rem;
  color: var(--pl-ink-dim);
}

.pl-cdel__type strong {
  color: var(--pl-ink);
}

.pl-cdel__type input {
  height: 40px;
  padding: 0 0.7rem;
  background: transparent;
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink);
  font: inherit;
  font-size: 1rem;
}

.pl-cdel__type input:focus {
  outline: none;
  border-color: var(--pl-red);
}

.pl-cdel__error {
  margin: 0.8rem 0 0;
  color: var(--pl-red);
  font-size: 0.88rem;
}

.pl-cdel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1.2rem;
}

.pl-cdel__btn {
  height: 40px;
  padding: 0 1rem;
  background: transparent;
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.82rem;
  cursor: pointer;
}

.pl-cdel__btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.pl-cdel__btn--danger {
  border-color: var(--pl-red);
  background: var(--pl-red);
  color: rgb(var(--v-theme-on-error));
}

.pl-cdel__btn--danger:disabled {
  background: transparent;
  color: var(--pl-red);
}
</style>
