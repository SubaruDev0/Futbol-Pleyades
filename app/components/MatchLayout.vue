<script setup lang="ts">
/** El grid de la pantalla del partido: la columna hero (sticky en desktop) y la planilla al lado. */
</script>

<template>
  <div class="pl-match">
    <div class="pl-match__col">
      <slot />
    </div>
    <div class="pl-match__col">
      <slot name="side" />
    </div>
  </div>
</template>

<style scoped>
.pl-match {
  display: grid;
  grid-template-columns: 1fr;
}

.pl-match__col {
  min-width: 0;
}

@media (min-width: 1000px) {
  .pl-match {
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    gap: 1.6rem;
    align-items: start;
  }
  .pl-match > .pl-match__col:first-child {
    position: sticky;
    top: 80px;
  }
  /* Lado a lado, la planilla se alinea con la parte superior del hero. */
  .pl-match :deep(.pl-sheet__head) {
    margin-top: 0;
  }
}
</style>
