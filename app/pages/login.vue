<script setup lang="ts">
useHead({ title: 'Entrar' })

const { fetch: refreshSession } = useUserSession()

const phone = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { phone: phone.value, password: password.value },
    })
    await refreshSession()
    await navigateTo('/')
  }
  catch (e: any) {
    error.value = apiError(e)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="pl-auth">
    <p class="pl-eyebrow">Fútbol 5, 6 y 7</p>
    <h1 class="pl-display pl-auth__title">
      Deja de<br>organizar<br>por chat
    </h1>
    <p class="pl-auth__sub">
      Quién juega, dónde, a qué hora y quién ya transfirió. En un solo lugar.
    </p>

    <form class="pl-auth__form pl-panel" @submit.prevent="submit">
      <v-text-field
        v-model="phone"
        label="Teléfono"
        prefix="+56 9"
        placeholder="1234 5678"
        type="tel"
        autocomplete="tel"
        inputmode="numeric"
        maxlength="8"
        :disabled="loading"
      />
      <v-text-field
        v-model="password"
        label="Contraseña"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="current-password"
        :disabled="loading"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        @click:append-inner="showPassword = !showPassword"
      />

      <p v-if="error" class="pl-auth__error">{{ error }}</p>

      <v-btn type="submit" color="primary" block :loading="loading">
        Entrar
      </v-btn>

      <p class="pl-auth__alt">
        ¿Primera vez?
        <NuxtLink to="/registro">Crea tu cuenta</NuxtLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.pl-auth {
  max-width: 420px;
  margin: 2rem auto 0;
}

.pl-auth__title {
  font-size: clamp(2.8rem, 12vw, 4rem);
  margin: 0.4rem 0 0.9rem;
}

.pl-auth__sub {
  color: var(--pl-ink-dim);
  margin-bottom: 2rem;
  max-width: 34ch;
}

.pl-auth__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.4rem;
}

.pl-auth__error {
  color: var(--pl-red);
  font-size: 0.88rem;
  margin: 0;
}

.pl-auth__alt {
  margin: 0.2rem 0 0;
  font-size: 0.88rem;
  color: var(--pl-ink-dim);
}

.pl-auth__alt a {
  color: var(--pl-lime);
  text-decoration: none;
  font-weight: 600;
}
</style>
