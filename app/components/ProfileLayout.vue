<script setup lang="ts">
/** El marco de la pantalla de perfil: título, teléfono, y el grid donde van las tarjetas. */
defineProps<{ phone: string }>()
</script>

<template>
  <div class="pl-profile">
    <header class="pl-profile__head pl-rise">
      <p class="pl-eyebrow">Tu cuenta</p>
      <h1 class="pl-display pl-profile__title"><span class="pl-wipe">Perfil</span></h1>
      <p class="pl-profile__phone">
        <span class="pl-eyebrow">Teléfono</span>
        <span class="pl-numeric">{{ phone }}</span>
      </p>
    </header>

    <div class="pl-profile__grid">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.pl-profile__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  column-gap: 2rem;
  margin-bottom: 1.4rem;
}

.pl-profile__head .pl-eyebrow:first-child {
  flex-basis: 100%;
}

.pl-profile__title {
  font-size: clamp(2.2rem, 9vw, 3rem);
  margin: 0.1rem 0 0;
}

.pl-profile__phone {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin: 0.6rem 0 0.2rem;
  font-weight: 600;
}

.pl-profile__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
}

@media (min-width: 860px) {
  .pl-profile__grid {
    grid-template-columns: 1fr 1fr;
  }
  :slotted(.pl-card--wide) {
    grid-column: 1 / -1;
  }
}
</style>
