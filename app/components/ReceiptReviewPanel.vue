<script setup lang="ts">
import { mdiClose } from '@mdi/js'

/**
 * Lo que ve quien cobra para un comprobante: la imagen y Aceptar / Rechazar.
 * Presentacional: quien lo usa envía la decisión. Se remonta (key) por
 * comprobante para que el zoom y el formulario de rechazo partan limpios.
 */
defineProps<{
  name: string
  guest: boolean
  /** El pago se avisó por otro medio: no hay imagen que mirar. */
  external?: boolean
  createdAt: string | Date
  amount: number | null
  /** URL de la imagen; sin ella, el slot `image` dibuja el comprobante. */
  src?: string
  busy?: 'aceptar' | 'rechazar' | null
  error?: string
}>()
const emit = defineEmits<{ close: [], accept: [], reject: [reason: string] }>()

const zoomed = ref(false)
const broken = ref(false)
const rejecting = ref(false)
const reason = ref('')

const reject = () => emit('reject', reason.value.trim())
</script>

<template>
  <section class="pl-modal" aria-labelledby="receipt-rev-title">
    <header class="pl-modal__head">
      <div>
        <p class="pl-eyebrow">
          Comprobante · {{ ago(createdAt) }}
        </p>
        <h2 id="receipt-rev-title" class="pl-display pl-modal__title">
          {{ name }}<span v-if="guest" class="pl-rrev__guest"> · invitado</span>
        </h2>
        <p v-if="amount" class="pl-rrev__amount pl-numeric">Debe {{ clp(amount) }}</p>
      </div>
      <button
        type="button"
        class="pl-modal__close"
        aria-label="Cerrar"
        :disabled="!!busy"
        @click="emit('close')"
      >
        <v-icon :icon="mdiClose" size="20" />
      </button>
    </header>

    <div class="pl-modal__body">
      <div v-if="external" class="pl-rrev__external">
        <p class="pl-rrev__external-title">Dice haberlo enviado por otro medio</p>
        <p>No hay imagen en la app. Revisa tu banco o tus mensajes antes de aceptar.</p>
      </div>
      <button
        v-else
        type="button"
        class="pl-rrev__frame"
        :class="{ 'pl-rrev__frame--zoomed': zoomed }"
        :aria-label="zoomed ? 'Ver completo' : 'Ampliar'"
        @click="zoomed = !zoomed"
      >
        <slot v-if="!src" name="image" />
        <img
          v-else-if="!broken"
          :key="src"
          :src="src"
          alt="Comprobante de transferencia"
          @error="broken = true"
        >
        <span v-else class="pl-rrev__broken">No pudimos cargar la imagen.</span>
      </button>
      <p v-if="!external" class="pl-rrev__hint">{{ zoomed ? 'Toca para ver completo.' : 'Toca la imagen para ampliar.' }}</p>

      <v-text-field
        v-if="rejecting"
        v-model="reason"
        label="Motivo (opcional)"
        placeholder="Ej: el monto no calza"
        counter="140"
        maxlength="140"
        autofocus
        @keyup.enter="reject"
      />
      <p v-if="error" class="pl-modal__error" role="alert">{{ error }}</p>
    </div>

    <footer class="pl-modal__foot">
      <template v-if="rejecting">
        <v-btn variant="text" class="pl-rrev__muted" :disabled="!!busy" @click="rejecting = false">
          Volver
        </v-btn>
        <v-btn color="error" :loading="busy === 'rechazar'" @click="reject">
          Confirmar rechazo
        </v-btn>
      </template>
      <template v-else>
        <v-btn variant="outlined" :disabled="!!busy" @click="rejecting = true">Rechazar</v-btn>
        <v-btn color="success" :loading="busy === 'aceptar'" @click="emit('accept')">
          Aceptar
        </v-btn>
      </template>
    </footer>
  </section>
</template>

<style scoped>
.pl-rrev__guest {
  color: var(--pl-ink-dim);
  font-size: 0.7em;
}

.pl-rrev__amount {
  margin: 0.3rem 0 0;
  color: var(--pl-accent);
  font-weight: 700;
}

.pl-rrev__frame {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 200px;
  max-height: 58dvh;
  padding: 0;
  overflow: hidden;
  background: var(--pl-pitch);
  border: 1px solid var(--pl-line-strong);
  cursor: zoom-in;
}

.pl-rrev__frame img,
.pl-rrev__frame :slotted(svg) {
  display: block;
  max-width: 100%;
  max-height: 58dvh;
  object-fit: contain;
}

.pl-rrev__frame--zoomed {
  display: block;
  overflow: auto;
  cursor: zoom-out;
}

.pl-rrev__frame--zoomed img,
.pl-rrev__frame--zoomed :slotted(svg) {
  max-width: none;
  max-height: none;
  width: 200%;
}

.pl-rrev__external {
  padding: 1rem;
  border: 1px dashed var(--pl-line-strong);
  border-left: 3px solid var(--pl-amber);
  color: var(--pl-ink-dim);
  font-size: 0.9rem;
}

.pl-rrev__external p {
  margin: 0;
}

.pl-rrev__external-title {
  margin-bottom: 0.35rem !important;
  color: var(--pl-ink);
  font-weight: 700;
}

.pl-rrev__broken {
  color: var(--pl-ink-dim);
  font-size: 0.88rem;
}

.pl-rrev__hint {
  margin: -0.4rem 0 0;
  font-size: 0.8rem;
  color: var(--pl-ink-faint);
}

.pl-rrev__muted {
  color: var(--pl-ink-dim);
}
</style>
