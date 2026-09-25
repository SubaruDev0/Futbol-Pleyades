<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()
const route = useRoute()

const NAV = [
  { to: '/', label: 'Partidos' },
  { to: '/grupos', label: 'Grupos' },
]

const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <v-app>
    <header class="pl-topbar">
      <NuxtLink to="/" class="pl-brand">
        <PleyadesMark :size="22" />
        <span class="pl-display pl-brand__word">Pléyades</span>
      </NuxtLink>

      <nav v-if="loggedIn" class="pl-nav">
        <NuxtLink
          v-for="item in NAV"
          :key="item.to"
          :to="item.to"
          class="pl-nav__link"
          :class="{ 'pl-nav__link--active': isActive(item.to) }"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <button v-if="loggedIn" class="pl-user" type="button" @click="logout">
        <span class="pl-user__name">{{ user?.name }}</span>
        <span class="pl-user__out">Salir</span>
      </button>
    </header>

    <v-main>
      <div class="pl-page">
        <slot />
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.pl-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  height: 58px;
  padding: 0 1rem;
  padding-top: env(safe-area-inset-top, 0px);
  background: rgba(10, 11, 10, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--pl-line);
}

.pl-brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  text-decoration: none;
  color: inherit;
}

.pl-brand__word {
  font-size: 1.32rem;
  letter-spacing: 0.04em;
}

.pl-nav {
  display: flex;
  gap: 1.25rem;
  margin-left: auto;
}

.pl-nav__link {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.88rem;
  color: var(--pl-ink-dim);
  text-decoration: none;
  padding: 0.35rem 0;
  border-bottom: 2px solid transparent;
}

.pl-nav__link--active {
  color: var(--pl-ink);
  border-bottom-color: var(--pl-lime);
}

.pl-user {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.1;
  background: none;
  border: 0;
  cursor: pointer;
  padding: 0;
  color: inherit;
}

.pl-user__name {
  font-weight: 600;
  font-size: 0.86rem;
}

.pl-user__out {
  font-size: 0.7rem;
  color: var(--pl-ink-faint);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pl-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
}

@media (max-width: 600px) {
  .pl-topbar {
    gap: 0.75rem;
  }
  .pl-nav {
    gap: 0.9rem;
  }
  .pl-brand__word {
    display: none;
  }
}
</style>
