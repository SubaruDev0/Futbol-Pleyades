<script setup lang="ts">
import { mdiEye, mdiEyeOff } from '@mdi/js'

useHead({ title: 'Entrar' })

const { fetch: refreshSession } = useUserSession()

const phone = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const showNoAccountDialog = ref(false)
const { display: phoneDisplay, onUpdate: onPhoneUpdate, blockNonDigitInput, pastePhoneDigits } = useDigitsOnlyInput(phone)

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
    // Un 401 cubre tanto "sin cuenta" como "contraseña incorrecta" a propósito
    // (el servidor nunca revela cuál, para no filtrar qué números de teléfono
    // están registrados) — así que se ofrece crear cuenta en cualquiera de los dos casos.
    if (e?.statusCode === 401) showNoAccountDialog.value = true
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
      Pleyades
    </h1>
    <p class="pl-auth__sub">
      Arma el partido, reparte el costo y sabe quién ya pagó.
    </p>

    <form class="pl-auth__form pl-panel" @submit.prevent="submit">
      <v-text-field
        :model-value="phoneDisplay"
        label="Teléfono"
        prefix="+56 9"
        placeholder="1234 5678"
        type="tel"
        autocomplete="tel"
        inputmode="numeric"
        maxlength="9"
        :disabled="loading"
        @update:model-value="onPhoneUpdate"
        @beforeinput="blockNonDigitInput"
        @paste="pastePhoneDigits"
      />
      <v-text-field
        v-model="password"
        label="Contraseña"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="current-password"
        :disabled="loading"
        :append-inner-icon="showPassword ? mdiEyeOff : mdiEye"
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

    <v-dialog v-model="showNoAccountDialog" max-width="380">
      <div class="pl-panel pl-dialog">
        <p class="pl-eyebrow">Teléfono o contraseña incorrectos</p>
        <h2 class="pl-display pl-dialog__title">¿Todavía no<br>tienes cuenta?</h2>
        <p class="pl-dialog__text">
          Si es tu primera vez, crea una cuenta con este número.
        </p>
        <v-btn
          color="primary"
          block
          :to="`/registro?phone=${phone}`"
        >
          Crear cuenta
        </v-btn>
        <v-btn variant="text" block @click="showNoAccountDialog = false">
          Reintentar
        </v-btn>
      </div>
    </v-dialog>
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
  color: var(--pl-accent);
  text-decoration: none;
  font-weight: 600;
}

.pl-dialog {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1.6rem;
}

.pl-dialog__title {
  font-size: 2rem;
  margin: 0.2rem 0 0.2rem;
}

.pl-dialog__text {
  color: var(--pl-ink-dim);
  margin: 0 0 0.6rem;
}
</style>
