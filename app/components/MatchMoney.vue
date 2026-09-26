<script setup lang="ts">
import type { PaymentAccount } from '#shared/utils/bank-account'

/** Un lugar que paga quien mira: el propio, o un invitado que trajo. */
export interface MoneyPayment {
  id: string
  /** "Tu pago" o "Invitado: …"; se muestra solo cuando hay más de uno. */
  label: string
  paid: boolean
  receipt: { status: string, rejectReason?: string | null } | null
}

/** Adónde va la plata: la división, la cuenta de quien cobra y los pagos de quien mira. */
defineProps<{
  collectorName: string | null
  perPlayer: number | null
  totalCost: number
  account: PaymentAccount | null
  /** Por qué no se muestra cuenta: quien mira cobra y no tiene, o quien cobra no tiene. */
  missing?: 'mine' | 'theirs' | null
  payments: MoneyPayment[]
  hasCollector: boolean
}>()
const emit = defineEmits<{ upload: [id: string] }>()
</script>

<template>
  <section class="pl-panel pl-money">
    <div class="pl-money__head">
      <div>
        <p class="pl-eyebrow pl-section-title">
          Transferir a
          <InfoTip title="Dividir el costo">
            <p>
              El valor de la cancha se divide entre los que van. Mientras más se anoten, menos
              pone cada uno.
            </p>
            <p>
              Los datos de la cuenta los carga quien cobra desde su perfil. Solo los ven quienes
              juegan este partido.
            </p>
          </InfoTip>
        </p>
        <p class="pl-money__who">{{ collectorName ?? 'Sin definir' }}</p>
      </div>
      <div class="pl-money__amount">
        <span class="pl-display pl-numeric">{{ clp(perPlayer ?? 0) }}</span>
        <span class="pl-money__total pl-numeric">de {{ clp(totalCost) }}</span>
      </div>
    </div>

    <TransferCard v-if="account" :account="account" />
    <p v-else-if="missing" class="pl-money__missing">
      <template v-if="missing === 'mine'">
        Aún no cargas tus datos de transferencia.
        <NuxtLink to="/perfil">Agrégalos en tu perfil</NuxtLink>.
      </template>
      <template v-else>Quien cobra todavía no carga sus datos de transferencia.</template>
    </p>

    <div v-for="p in payments" :key="p.id" class="pl-mypay">
      <p v-if="payments.length > 1" class="pl-eyebrow pl-mypay__who">{{ p.label }}</p>
      <p v-if="p.paid" class="pl-mypay__state pl-mypay__state--paid">Pagado</p>
      <p v-else-if="p.receipt?.status === 'pendiente'" class="pl-mypay__state pl-mypay__state--review">
        En revisión
      </p>
      <template v-else>
        <p v-if="p.receipt?.status === 'rechazado'" class="pl-mypay__state pl-mypay__state--rejected">
          Rechazado<template v-if="p.receipt.rejectReason">: {{ p.receipt.rejectReason }}</template>
        </p>
        <v-btn color="primary" block class="pl-mypay__send" :disabled="!hasCollector" @click="emit('upload', p.id)">
          {{ p.receipt?.status === 'rechazado' ? 'Subir otro comprobante' : 'Ya transferí' }}
        </v-btn>
      </template>
    </div>
    <p v-if="payments.length && !hasCollector" class="pl-money__hint">
      Aún no hay nadie definido para cobrar.
    </p>
  </section>
</template>

<style scoped>
.pl-money {
  padding: 1.2rem;
  margin-bottom: 0.85rem;
}

.pl-money__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.pl-money__who {
  margin: 0.25rem 0 0;
  font-weight: 600;
}

.pl-money__missing {
  margin: 0 0 1rem;
  padding: 0.7rem 0.9rem;
  border: 1px dashed var(--pl-line-strong);
  color: var(--pl-ink-dim);
  font-size: 0.88rem;
}

.pl-money__missing a {
  color: var(--pl-accent);
}

.pl-money__amount {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.pl-money__amount > span:first-child {
  font-size: 2rem;
  color: var(--pl-accent);
}

.pl-money__total {
  font-size: 0.78rem;
  color: var(--pl-ink-faint);
}

.pl-money__hint {
  margin: 0.7rem 0 0;
  font-size: 0.84rem;
  color: var(--pl-ink-dim);
}

.pl-mypay + .pl-mypay {
  margin-top: 0.9rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--pl-line);
}

.pl-mypay__who {
  margin: 0 0 0.45rem;
}

.pl-mypay__state {
  margin: 0 0 0.6rem;
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--pl-line-strong);
  border-left-width: 3px;
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.9rem;
}

.pl-mypay__state:last-child {
  margin-bottom: 0;
}

.pl-mypay__state--paid {
  border-left-color: var(--pl-turf);
  color: var(--pl-turf);
}

.pl-mypay__state--review {
  border-left-color: var(--pl-amber);
  color: var(--pl-amber);
}

.pl-mypay__state--rejected {
  border-left-color: var(--pl-red);
  color: var(--pl-red);
  text-transform: none;
  letter-spacing: 0.02em;
  font-family: inherit;
  font-weight: 600;
}
</style>
