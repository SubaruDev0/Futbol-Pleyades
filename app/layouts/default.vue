<script setup lang="ts">
import TourChooser from '~/components/TourChooser.vue'
import { mdiAccountOutline, mdiChevronDown, mdiHelpCircleOutline, mdiLogout } from '@mdi/js'

const { loggedIn, user, clear } = useUserSession()
const route = useRoute()
const tour = useTour()

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

// --- Oferta de primera visita -------------------------------------------------------
// Se ofrece una vez, nunca se fuerza: la persona puede tener apuro por responder "voy".
const offerTour = ref(false)
let offerTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  watch(
    [loggedIn, () => route.path],
    () => {
      clearTimeout(offerTimer)
      if (!loggedIn.value || route.path.startsWith(TOUR_PATH) || tour.seen()) {
        offerTour.value = false
        return
      }
      // Se deja que la página termine su entrada primero.
      offerTimer = setTimeout(() => {
        offerTour.value = !tour.seen()
      }, 900)
    },
    { immediate: true },
  )
})

onBeforeUnmount(() => clearTimeout(offerTimer))

function dismissTour() {
  offerTour.value = false
  tour.markSeen()
}

function openTour(slug: string) {
  offerTour.value = false
  tour.open(slug)
}

function toProfile() {
  dismissTour()
  navigateTo('/perfil')
}

function openChooser() {
  offerTour.value = false
  tour.chooser.value = true
}
</script>

<template>
  <v-app>
    <AppLoader />

    <header class="pl-topbar">
      <NuxtLink to="/" class="pl-brand">
        <PleyadesMark :size="22" />
        <span class="pl-display pl-brand__word">Pleyades</span>
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

      <button
        v-if="loggedIn"
        type="button"
        class="pl-help"
        aria-label="Ver tutoriales"
        @click="openChooser"
      >
        <v-icon :icon="mdiHelpCircleOutline" size="20" />
        <span class="pl-help__label">Tutorial</span>
      </button>

      <v-menu v-if="loggedIn" location="bottom end" offset="6" :transition="false">
        <template #activator="{ props: menu, isActive: open }">
          <button
            v-bind="menu"
            type="button"
            class="pl-user"
            :class="{ 'pl-user--open': open, 'pl-user--active': route.path === '/perfil' }"
            aria-label="Menú de tu cuenta"
          >
            <UserAvatar :name="user?.name" :src="user?.avatarUrl" :size="26" />
            <span class="pl-user__name">{{ user?.name }}</span>
            <v-icon :icon="mdiChevronDown" size="18" class="pl-user__chev" />
          </button>
        </template>

        <div class="pl-usermenu" role="menu">
          <NuxtLink to="/perfil" class="pl-usermenu__item" role="menuitem">
            <v-icon :icon="mdiAccountOutline" size="18" />
            Mi perfil
          </NuxtLink>
          <button type="button" class="pl-usermenu__item pl-usermenu__item--out" role="menuitem" @click="logout">
            <v-icon :icon="mdiLogout" size="18" />
            Cerrar sesión
          </button>
        </div>
      </v-menu>
    </header>

    <SkyBackdrop />

    <v-main class="pl-main">
      <div class="pl-page">
        <slot />
      </div>
      <footer class="pl-foot">
        <PleyadesMark :size="14" />
        <span class="pl-display pl-foot__word">Pleyades</span>
        <span class="pl-foot__sep" aria-hidden="true">/</span>
        <span>Fútbol 5, 6 y 7</span>
        <span class="pl-foot__sep" aria-hidden="true">/</span>
        <a href="https://subarudev.com/" target="_blank" rel="noopener" class="pl-foot__by">
          Hecho por <strong>SubaruDev</strong>
        </a>
      </footer>
    </v-main>

    <Transition name="pl-offer">
      <aside v-if="offerTour" class="pl-offer" role="status">
        <div class="pl-offer__text">
          <p class="pl-eyebrow">Primera vez</p>
          <p class="pl-offer__line">¿Cómo quieres empezar? Te mostramos cómo en unos pasos.</p>
        </div>
        <div class="pl-offer__paths">
          <v-btn size="small" color="primary" @click="openTour('unirme')">Unirme a un grupo</v-btn>
          <v-btn size="small" variant="outlined" @click="openTour('crear')">Crear un grupo</v-btn>
        </div>
        <div class="pl-offer__actions">
          <button type="button" class="pl-offer__link" @click="toProfile">Completar tu perfil</button>
          <v-btn size="small" variant="text" @click="dismissTour">Ahora no</v-btn>
        </div>
      </aside>
    </Transition>

    <TourOverlay />
    <TourChooser />
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
  background: rgba(var(--v-theme-background), 0.92);
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
  transition:
    color 140ms ease,
    border-color 140ms ease;
}

.pl-nav__link--active {
  color: var(--pl-ink);
  border-bottom-color: var(--pl-accent);
}

.pl-help {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  height: 34px;
  padding: 0 0.6rem;
  background: none;
  border: 1px solid var(--pl-line);
  color: var(--pl-ink-dim);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.78rem;
  cursor: pointer;
  transition:
    color 120ms ease,
    border-color 120ms ease;
}

.pl-help:hover {
  color: var(--pl-accent);
  border-color: var(--pl-accent);
}

.pl-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  height: 34px;
  padding: 0 0.35rem 0 0.2rem;
  background: none;
  border: 1px solid var(--pl-line);
  color: var(--pl-ink);
  cursor: pointer;
  transition: border-color 120ms ease;
}

.pl-user:hover,
.pl-user--open,
.pl-user--active {
  border-color: var(--pl-accent);
}

.pl-user__name {
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  font-size: 0.86rem;
}

.pl-user__chev {
  color: var(--pl-ink-dim);
  transition: transform 160ms ease;
}

.pl-user--open .pl-user__chev {
  transform: rotate(180deg);
}

.pl-usermenu {
  min-width: 190px;
  padding: 0.3rem 0;
  background: var(--pl-raised);
  border: 1px solid var(--pl-line-strong);
  border-top: 2px solid var(--pl-accent);
}

.pl-usermenu__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.65rem 0.9rem;
  background: none;
  border: 0;
  color: var(--pl-ink);
  font: inherit;
  font-size: 0.92rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.pl-usermenu__item:hover,
.pl-usermenu__item:focus-visible {
  background: rgba(255, 255, 255, 0.05);
}

.pl-usermenu__item .v-icon {
  color: var(--pl-ink-dim);
}

.pl-usermenu__item--out {
  border-top: 1px solid var(--pl-line);
  margin-top: 0.3rem;
  padding-top: 0.75rem;
}

.pl-usermenu__item--out:hover,
.pl-usermenu__item--out:hover .v-icon {
  color: var(--pl-red);
}

/* El contenido queda sobre el cielo fijo; el pie se empuja al fondo del
   viewport en páginas cortas para que la pantalla siempre termine en algún lado. */
.pl-main {
  position: relative;
  z-index: 1;
}

.pl-main :deep(.v-main__wrap),
.pl-main {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 58px);
}

.pl-page {
  flex: 1;
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
}

.pl-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  padding: 1.1rem 1rem calc(1.1rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--pl-line);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pl-ink-faint);
}

.pl-foot__word {
  font-size: 0.86rem;
  letter-spacing: 0.1em;
  color: var(--pl-ink-dim);
}

.pl-foot__sep {
  color: var(--pl-line-strong);
}

.pl-foot__by {
  color: inherit;
  text-decoration: none;
  transition: color 120ms ease;
}

.pl-foot__by strong {
  color: var(--pl-ink-dim);
  font-weight: 600;
  border-bottom: 1px solid transparent;
  transition: color 120ms ease, border-color 120ms ease;
}

.pl-foot__by:hover strong,
.pl-foot__by:focus-visible strong {
  color: var(--pl-accent);
  border-bottom-color: var(--pl-accent);
}

@media (min-width: 900px) {
  .pl-page {
    padding: 2.25rem 2rem 5rem;
  }
}

/* --- Oferta de primera visita ---------------------------------------------- */

.pl-offer {
  position: fixed;
  z-index: 20;
  left: 1rem;
  right: 1rem;
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  max-width: 460px;
  margin-left: auto;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 0.9rem 1rem;
  background: var(--pl-raised);
  border: 1px solid var(--pl-line-strong);
  border-left: 3px solid var(--pl-accent);
}

.pl-offer__line {
  margin: 0.2rem 0 0;
  font-size: 0.92rem;
}

.pl-offer__paths {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.pl-offer__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.pl-offer__link {
  padding: 0.3rem 0;
  background: none;
  border: 0;
  color: var(--pl-ink-dim);
  font-size: 0.84rem;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--pl-line-strong);
  cursor: pointer;
}

.pl-offer__link:hover {
  color: var(--pl-accent);
}

.pl-offer-enter-active,
.pl-offer-leave-active {
  transition:
    opacity 220ms ease,
    transform 260ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.pl-offer-enter-from,
.pl-offer-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

@media (max-width: 600px) {
  .pl-topbar {
    gap: 0.7rem;
    padding: 0 0.75rem;
  }
  .pl-nav {
    gap: 0.85rem;
  }
  .pl-brand__word,
  .pl-help__label {
    display: none;
  }
  .pl-help {
    width: 34px;
    padding: 0;
    justify-content: center;
  }
  .pl-user__name {
    display: none;
  }
  .pl-user {
    gap: 0.2rem;
  }
}

/* Teléfonos de 360px: todo en la barra tiene que caber en una línea. */
@media (max-width: 380px) {
  .pl-topbar {
    gap: 0.5rem;
  }
  .pl-nav {
    gap: 0.65rem;
  }
  .pl-nav__link {
    font-size: 0.8rem;
    letter-spacing: 0.06em;
  }
}
</style>
