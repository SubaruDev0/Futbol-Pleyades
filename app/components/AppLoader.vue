<script setup lang="ts">
/** Un destello muy breve se lee como ruido, así que la carga pasiva solo aparece
 * después de ~150ms y se mantiene un poco una vez terminada, en lugar de
 * parpadear en navegaciones instantáneas. `flashing` (useAppLoadingFlash) se
 * salta ese retraso para una acción explícita que siempre debe sentirse reconocida. */
const loading = useAppLoading()
const { flashing } = useAppLoadingFlash()
const visible = ref(false)
let showTimer: ReturnType<typeof setTimeout> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined

watch(flashing, (isFlashing) => {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
  if (isFlashing) {
    visible.value = true
  }
  else if (!loading.value) {
    hideTimer = setTimeout(() => { visible.value = false }, 120)
  }
})

watch(loading, (isLoading) => {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
  if (isLoading) {
    showTimer = setTimeout(() => { visible.value = true }, 150)
  }
  else if (flashing.value) {
    // El piso mínimo propio del destello sigue controlando la visibilidad.
  }
  else if (visible.value) {
    hideTimer = setTimeout(() => { visible.value = false }, 120)
  }
  else {
    visible.value = false
  }
})

onBeforeUnmount(() => {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
})
</script>

<template>
  <Transition name="pl-loader">
    <div v-if="visible" class="pl-loader" role="status" aria-live="polite">
      <v-progress-circular indeterminate size="46" width="3" color="primary" />
      <span class="d-sr-only">Cargando…</span>
    </div>
  </Transition>
</template>

<style scoped>
.pl-loader {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(2, 2, 6, 0.35);
  backdrop-filter: blur(2px);
  pointer-events: none;
}

.pl-loader-enter-active,
.pl-loader-leave-active {
  transition: opacity 160ms ease;
}

.pl-loader-enter-from,
.pl-loader-leave-to {
  opacity: 0;
}
</style>
