<script setup lang="ts">
import { DEMO_ACCOUNT } from '~/utils/tour-demo'

/** Una captura de transferencia para los tutoriales, dibujada en SVG para no necesitar un archivo de imagen. */
defineProps<{ amount: number, payer: string, when: string | Date }>()
</script>

<template>
  <svg class="dr" viewBox="0 0 300 330" role="img" aria-label="Comprobante de ejemplo">
    <rect class="dr__paper" x="0" y="0" width="300" height="330" />
    <circle class="dr__ok" cx="150" cy="44" r="18" />
    <path class="dr__tick" d="M141 44 l6 6 l12 -13" />
    <text x="150" y="88" class="dr__title">Transferencia exitosa</text>
    <text x="150" y="128" class="dr__amount">{{ clp(amount) }}</text>
    <line x1="24" y1="148" x2="276" y2="148" class="dr__rule" />
    <g class="dr__rows">
      <text x="24" y="176">Para</text>
      <text x="276" y="176" class="dr__v">{{ DEMO_ACCOUNT.holderName }}</text>
      <text x="24" y="202">RUT</text>
      <text x="276" y="202" class="dr__v">{{ formatRut(DEMO_ACCOUNT.rut) }}</text>
      <text x="24" y="228">Banco</text>
      <text x="276" y="228" class="dr__v">{{ bankName(DEMO_ACCOUNT.bank) }}</text>
      <text x="24" y="254">Desde</text>
      <text x="276" y="254" class="dr__v">{{ payer }}</text>
      <text x="24" y="280">Fecha</text>
      <text x="276" y="280" class="dr__v">{{ matchDay(when) }} · {{ matchTime(when) }}</text>
      <text x="24" y="306">N° operación</text>
      <text x="276" y="306" class="dr__v">004815162342</text>
    </g>
  </svg>
</template>

<style scoped>
.dr {
  display: block;
  width: 100%;
  max-width: 340px;
  height: auto;
}

.dr__paper {
  fill: var(--pl-ink);
}

.dr__ok {
  fill: var(--pl-turf);
}

.dr__tick {
  fill: none;
  stroke: var(--pl-pitch);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dr text {
  fill: var(--pl-pitch);
}

.dr__title {
  font-size: 15px;
  font-weight: 700;
  text-anchor: middle;
}

.dr__amount {
  font-size: 30px;
  font-weight: 800;
  text-anchor: middle;
}

.dr__rule {
  stroke: var(--pl-ink-faint);
  stroke-width: 1;
}

.dr__rows text {
  font-size: 12px;
}

.dr__rows .dr__v {
  text-anchor: end;
  font-weight: 600;
}
</style>
