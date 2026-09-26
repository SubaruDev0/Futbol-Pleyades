<script setup lang="ts">
import { mdiCheck, mdiLockOutline } from '@mdi/js'
import type { AccountType } from '#shared/utils/bank-account'

/** Los campos del formulario de cuenta, editados en el sitio por esta tarjeta. */
export interface AccountDraft {
  holderName: string
  rut: string
  bank: string | null
  accountType: AccountType | null
  accountNumber: string
  email: string
}
export type AccountField = 'holderName' | 'rut' | 'bank' | 'accountType' | 'accountNumber' | 'email'

/**
 * Datos de transferencia en /perfil. Edita el borrador de la página en el
 * sitio; la página valida (`errorFor`) y guarda.
 */
const props = defineProps<{
  acc: AccountDraft
  errorFor: (field: AccountField) => string | undefined
  busy: boolean
  error: string
  saved: boolean
  /** Hay una cuenta guardada para borrar. */
  stored: boolean
}>()
const emit = defineEmits<{ save: [], remove: [] }>()

const { display: rutDisplay, onUpdate: onRutUpdate, blockInvalidRutInput, pasteRut } =
  useRutInput(toRef(props.acc, 'rut'))

const bankItems = BANKS.map(b => ({ title: b.name, value: b.code }))
const typeItems = computed(() =>
  accountTypesFor(props.acc.bank).map(t => ({ title: ACCOUNT_TYPE_LABEL[t], value: t })),
)
const cuentaRut = computed(() => isCuentaRut(props.acc.bank, props.acc.accountType))
const numberShown = computed(() =>
  derivedAccountNumber(props.acc.bank, props.acc.accountType, props.acc.rut, props.acc.accountNumber),
)
</script>

<template>
  <section class="pl-panel pl-card">
    <h2 class="pl-display pl-card__title pl-section-title">
      Datos de transferencia
      <InfoTip title="Datos de transferencia">
        <p>
          Solo los ven quienes juegan un partido donde tú cobras la cancha. Nadie más del
          grupo puede verlos.
        </p>
      </InfoTip>
    </h2>
    <p class="pl-card__sub">
      Los jugadores los copian campo por campo o todos juntos desde el partido.
    </p>
    <form class="pl-card__form" novalidate @submit.prevent="emit('save')">
      <div class="pl-bank">
        <v-text-field
          v-model="acc.holderName"
          label="Nombre del titular"
          maxlength="80"
          autocomplete="name"
          :error-messages="errorFor('holderName')"
        />
        <v-text-field
          :model-value="rutDisplay"
          label="RUT"
          placeholder="12.345.678-9"
          inputmode="text"
          autocomplete="off"
          spellcheck="false"
          class="pl-numeric"
          :error-messages="errorFor('rut')"
          @update:model-value="onRutUpdate"
          @beforeinput="blockInvalidRutInput"
          @paste="pasteRut"
        />
        <v-autocomplete
          v-model="acc.bank"
          :items="bankItems"
          label="Banco"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          auto-select-first
          no-data-text="No encontramos ese banco"
          :error-messages="errorFor('bank')"
        />
        <v-select
          v-model="acc.accountType"
          :items="typeItems"
          label="Tipo de cuenta"
          :disabled="!acc.bank"
          :hint="acc.bank ? undefined : 'Primero elige el banco'"
          persistent-hint
          :error-messages="errorFor('accountType')"
        />
        <v-text-field
          v-if="cuentaRut"
          :model-value="numberShown"
          label="Número de cuenta"
          readonly
          class="pl-numeric pl-bank__locked"
          :append-inner-icon="mdiLockOutline"
          hint="En la Cuenta RUT es tu RUT sin el dígito verificador."
          persistent-hint
        />
        <v-text-field
          v-else
          v-model="acc.accountNumber"
          label="Número de cuenta"
          inputmode="numeric"
          maxlength="20"
          autocomplete="off"
          class="pl-numeric"
          :error-messages="errorFor('accountNumber')"
          @update:model-value="acc.accountNumber = digitsOnly($event)"
          @beforeinput="blockNonDigitInput"
        />
        <v-text-field
          v-model="acc.email"
          label="Correo (opcional)"
          type="email"
          inputmode="email"
          maxlength="120"
          autocomplete="email"
          :error-messages="errorFor('email')"
        />
      </div>
      <p v-if="error" class="pl-msg pl-msg--error">{{ error }}</p>
      <div class="pl-card__foot pl-card__foot--split">
        <v-btn
          v-if="stored"
          variant="text"
          class="pl-bank__remove"
          :disabled="busy"
          @click="emit('remove')"
        >
          Borrar datos
        </v-btn>
        <span v-if="saved" class="pl-msg pl-msg--ok">
          <v-icon :icon="mdiCheck" size="16" /> Guardado
        </span>
        <v-btn type="submit" color="primary" :loading="busy">Guardar</v-btn>
      </div>
    </form>
  </section>
</template>

<style scoped>
.pl-bank {
  display: grid;
  grid-template-columns: 1fr;
  align-items: start;
  gap: 0.8rem;
}

.pl-bank__locked :deep(input) {
  color: var(--pl-ink-dim);
  cursor: default;
}

.pl-bank__remove {
  margin-right: auto;
  color: var(--pl-ink-dim);
}

@media (min-width: 860px) {
  .pl-bank {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 600px) and (max-width: 859px) {
  .pl-bank {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
