<script setup lang="ts">
import { mdiCheck, mdiContentCopy } from '@mdi/js'
import type { PaymentAccount } from '#shared/utils/bank-account'

const props = defineProps<{ account: PaymentAccount }>()

const { copied, copy } = useCopy()

const rows = computed(() => {
  const a = props.account
  return [
    { key: 'name', label: 'Nombre', value: a.holderName, copyValue: a.holderName },
    { key: 'rut', label: 'RUT', value: formatRut(a.rut), copyValue: formatRut(a.rut) },
    { key: 'bank', label: 'Banco', value: bankName(a.bank), copyValue: bankName(a.bank) },
    {
      key: 'type',
      label: 'Tipo de cuenta',
      value: ACCOUNT_TYPE_LABEL[a.accountType],
      copyValue: ACCOUNT_TYPE_LABEL[a.accountType],
    },
    { key: 'number', label: 'N° de cuenta', value: a.accountNumber, copyValue: a.accountNumber },
    ...(a.email ? [{ key: 'email', label: 'Correo', value: a.email, copyValue: a.email }] : []),
  ]
})

const numeric = new Set(['rut', 'number'])

const status = computed(() => {
  if (!copied.value) return ''
  if (copied.value === 'all') return 'Datos de transferencia copiados'
  return `${rows.value.find(r => r.key === copied.value)?.label ?? ''} copiado`
})
</script>

<template>
  <div class="pl-transfer">
    <dl class="pl-transfer__list">
      <div v-for="row in rows" :key="row.key" class="pl-transfer__row">
        <dt class="pl-eyebrow">{{ row.label }}</dt>
        <dd :class="['pl-transfer__value', { 'pl-numeric': numeric.has(row.key) }]">
          {{ row.value }}
        </dd>
        <button
          type="button"
          class="pl-transfer__copy"
          :class="{ 'pl-transfer__copy--done': copied === row.key }"
          :aria-label="`Copiar ${row.label.toLowerCase()}`"
          @click="copy(row.copyValue, row.key)"
        >
          <v-icon :icon="copied === row.key ? mdiCheck : mdiContentCopy" size="16" />
        </button>
      </div>
    </dl>

    <v-btn
      variant="text"
      color="primary"
      block
      class="pl-transfer__all"
      :prepend-icon="copied === 'all' ? mdiCheck : mdiContentCopy"
      @click="copy(paymentAccountText(account), 'all')"
    >
      {{ copied === 'all' ? 'Datos copiados' : 'Copiar todo' }}
    </v-btn>
    <p class="pl-transfer__status" aria-live="polite">{{ status }}</p>
  </div>
</template>

<style scoped>
.pl-transfer {
  position: relative;
  border: 1px solid var(--pl-line);
  border-left: 3px solid var(--pl-accent);
  background: var(--pl-raised);
  margin-bottom: 1rem;
}

.pl-transfer__list {
  margin: 0;
}

.pl-transfer__row {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 0.75rem;
  padding: 0.35rem 0.4rem 0.35rem 0.9rem;
  border-bottom: 1px solid var(--pl-line);
}

.pl-transfer__row dt {
  margin: 0;
}

.pl-transfer__value {
  margin: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.pl-transfer__copy {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: none;
  border: 1px solid transparent;
  color: var(--pl-ink-dim);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.pl-transfer__copy:hover,
.pl-transfer__copy:focus-visible {
  color: var(--pl-accent);
  border-color: var(--pl-line-strong);
}

.pl-transfer__copy--done,
.pl-transfer__copy--done:hover {
  color: var(--pl-turf);
}

.pl-transfer__status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 420px) {
  .pl-transfer__row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'label copy' 'value copy';
  }
  .pl-transfer__row dt {
    grid-area: label;
  }
  .pl-transfer__value {
    grid-area: value;
  }
  .pl-transfer__copy {
    grid-area: copy;
  }
}
</style>
