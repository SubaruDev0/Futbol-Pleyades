<script setup lang="ts">
import { mdiEye, mdiEyeOff } from '@mdi/js'

useHead({ title: 'Crear cuenta' })

const { fetch: refreshSession } = useUserSession()
const route = useRoute()

const name = ref('')
const phone = ref(digitsOnly(String(route.query.phone ?? '')).slice(0, 8))
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const { display: phoneDisplay, onUpdate: onPhoneUpdate, blockNonDigitInput, pastePhoneDigits } = useDigitsOnlyInput(phone)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { name: name.value, phone: phone.value, password: password.value },
    })
    await refreshSession()
    await navigateTo('/grupos')
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
    <p class="pl-eyebrow">Crear cuenta</p>
    <h1 class="pl-display pl-auth__title">Anótate</h1>

    <form class="pl-auth__form pl-panel" @submit.prevent="submit">
      <v-text-field
        v-model="name"
        label="Cómo te dicen"
        placeholder="Subaru"
        autocomplete="nickname"
        hint="El nombre con el que te van a ver en la lista"
        :disabled="loading"
      />
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
        autocomplete="new-password"
        hint="Mínimo 8 caracteres"
        :disabled="loading"
        :append-inner-icon="showPassword ? mdiEyeOff : mdiEye"
        @click:append-inner="showPassword = !showPassword"
      />

      <p v-if="error" class="pl-auth__error">{{ error }}</p>

      <v-btn type="submit" color="primary" block :loading="loading">
        Crear cuenta
      </v-btn>

      <p class="pl-auth__alt">
        ¿Ya tienes cuenta?
        <NuxtLink to="/login">Entra aquí</NuxtLink>
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
  margin: 0.4rem 0 1.6rem;
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
</style>
