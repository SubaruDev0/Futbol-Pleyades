<script setup lang="ts">
import { mdiInformationOutline } from '@mdi/js'

/**
 * Un pequeño botón de "¿qué es esto?" junto a un título o acción.
 * El hover lo abre con el mouse; un tap (o Enter/Espacio) lo alterna en el teléfono,
 * donde el hover no existe. Ambos caminos terminan en el mismo popover.
 */
const props = withDefaults(
  defineProps<{
    /** Encabezado corto que se muestra en el popover y se usa como label del botón. */
    title: string
    /** Una o dos frases. El slot por defecto lo reemplaza para texto más elaborado. */
    text?: string
    location?: 'top' | 'bottom' | 'start' | 'end'
  }>(),
  { location: 'top' },
)

const open = ref(false)
// Un tap lo fija abierto; un hover de mouse solo se asoma y se cierra al salir.
const pinned = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | undefined

function toggle() {
  pinned.value = !(open.value && pinned.value)
  open.value = pinned.value
}

function peek(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  clearTimeout(closeTimer)
  open.value = true
}

function unpeek(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || pinned.value) return
  closeTimer = setTimeout(() => (open.value = false), 120)
}

watch(open, (v) => {
  if (!v) pinned.value = false
})

onBeforeUnmount(() => clearTimeout(closeTimer))
</script>

<template>
  <span class="pl-tip">
    <button
      type="button"
      class="pl-tip__btn"
      :aria-label="`Qué es: ${props.title}`"
      :aria-expanded="open"
      @click.stop.prevent="toggle"
      @pointerenter="peek"
      @pointerleave="unpeek"
    >
      <v-icon :icon="mdiInformationOutline" size="17" />
    </button>

    <v-menu
      v-model="open"
      activator="parent"
      :open-on-click="false"
      :open-on-hover="false"
      :open-on-focus="false"
      :close-on-content-click="false"
      :location="props.location"
      offset="8"
      max-width="300"
      transition="scale-transition"
    >
      <div class="pl-tip__card" role="note">
        <p class="pl-tip__title">{{ props.title }}</p>
        <div class="pl-tip__body">
          <slot>{{ props.text }}</slot>
        </div>
      </div>
    </v-menu>
  </span>
</template>

<style scoped>
.pl-tip {
  display: inline-flex;
  vertical-align: middle;
  position: relative;
}

.pl-tip__btn {
  display: inline-grid;
  place-items: center;
  /* Área de clic de 32px para el pulgar, ícono de 17px para la vista. */
  width: 32px;
  height: 32px;
  margin: -6px -4px;
  padding: 0;
  background: none;
  border: 0;
  color: var(--pl-ink-faint);
  cursor: pointer;
  transition: color 120ms ease;
}

.pl-tip__btn:hover,
.pl-tip__btn[aria-expanded='true'] {
  color: var(--pl-accent);
}

.pl-tip__card {
  background: var(--pl-raised);
  border: 1px solid var(--pl-line-strong);
  border-left: 3px solid var(--pl-accent);
  padding: 0.75rem 0.9rem 0.8rem;
  color: var(--pl-ink);
  font-family: var(--font-body);
  text-transform: none;
  letter-spacing: 0.005em;
}

.pl-tip__title {
  margin: 0 0 0.3rem;
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.74rem;
  color: var(--pl-accent);
}

.pl-tip__body {
  font-size: 0.86rem;
  line-height: 1.45;
  font-weight: 400;
}

.pl-tip__body :deep(p) {
  margin: 0 0 0.4rem;
}

.pl-tip__body :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
