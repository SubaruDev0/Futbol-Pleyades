<script setup lang="ts">
useHead({ title: 'Partidos' })

const { data: matches, pending, refresh } = await useFetch('/api/matches')
const { data: groups } = await useFetch('/api/groups')

// Someone marks a payment or drops out from their own phone; a short poll keeps
// the sheet honest without dragging a websocket into a twelve-person app.
const interval = setInterval(refresh, 30_000)
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div>
    <header class="pl-head">
      <div>
        <p class="pl-eyebrow">Próximos</p>
        <h1 class="pl-display pl-head__title">Partidos</h1>
      </div>
      <v-btn v-if="groups?.length" to="/partido/nuevo" color="primary">
        Convocar
      </v-btn>
    </header>

    <div v-if="pending" class="pl-empty pl-panel">
      <p>Cargando…</p>
    </div>

    <div v-else-if="!groups?.length" class="pl-empty pl-panel">
      <h2 class="pl-display pl-empty__title">Primero, tu grupo</h2>
      <p>Crea el grupo de tus partidos o entra a uno con el código que te pasaron.</p>
      <v-btn to="/grupos" color="primary">Ir a grupos</v-btn>
    </div>

    <div v-else-if="!matches?.length" class="pl-empty pl-panel">
      <h2 class="pl-display pl-empty__title">No hay nada agendado</h2>
      <p>Cuando alguien convoque, aparece aquí con la lista y el reparto de la cancha.</p>
      <v-btn to="/partido/nuevo" color="primary">Convocar partido</v-btn>
    </div>

    <div v-else class="pl-list">
      <MatchCard v-for="m in matches" :key="m.id" :match="m as any" />
    </div>
  </div>
</template>

<style scoped>
.pl-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.4rem;
}

.pl-head__title {
  font-size: clamp(2.2rem, 9vw, 3rem);
  margin: 0.1rem 0 0;
}

.pl-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.pl-empty {
  padding: 2.2rem 1.4rem;
  text-align: center;
}

.pl-empty__title {
  font-size: 1.6rem;
  margin: 0 0 0.5rem;
}

.pl-empty p {
  color: var(--pl-ink-dim);
  margin: 0 auto 1.4rem;
  max-width: 42ch;
}
</style>
