<script setup lang="ts">
useHead({ title: 'Grupos' })

const { data: groups, refresh } = await useFetch('/api/groups')
const { data: me, refresh: refreshMe } = await useFetch('/api/me')

const newName = ref('')
const joinCode = ref('')
const alias = ref('')
const error = ref('')
const busy = ref('')

watchEffect(() => {
  if (me.value && alias.value === '') alias.value = me.value.paymentAlias ?? ''
})

async function createGroup() {
  if (newName.value.trim().length < 2) return
  busy.value = 'create'
  error.value = ''
  try {
    await $fetch('/api/groups', { method: 'POST', body: { name: newName.value.trim() } })
    newName.value = ''
    await refresh()
  }
  catch (e: any) {
    error.value = apiError(e)
  }
  finally {
    busy.value = ''
  }
}

async function joinGroup() {
  if (!joinCode.value.trim()) return
  busy.value = 'join'
  error.value = ''
  try {
    await $fetch('/api/groups/join', { method: 'POST', body: { code: joinCode.value.trim() } })
    joinCode.value = ''
    await refresh()
  }
  catch (e: any) {
    error.value = apiError(e)
  }
  finally {
    busy.value = ''
  }
}

async function saveAlias() {
  busy.value = 'alias'
  try {
    await $fetch('/api/me', {
      method: 'PATCH',
      body: { paymentAlias: alias.value.trim() || null },
    })
    await refreshMe()
  }
  finally {
    busy.value = ''
  }
}
</script>

<template>
  <div>
    <p class="pl-eyebrow">Tus grupos</p>
    <h1 class="pl-display pl-title">Grupos</h1>

    <div v-if="groups?.length" class="pl-groups">
      <article v-for="g in groups" :key="g.id" class="pl-panel pl-group">
        <div>
          <h2 class="pl-group__name">{{ g.name }}</h2>
          <p class="pl-group__meta">
            {{ FORMAT_LABEL[g.defaultFormat] }} ·
            {{ g.role === 'organizador' ? 'Organizas' : 'Juegas' }}
          </p>
        </div>
        <div class="pl-group__code">
          <span class="pl-eyebrow">Código</span>
          <code class="pl-display pl-group__value">{{ g.inviteCode }}</code>
        </div>
      </article>
    </div>

    <div class="pl-forms">
      <section class="pl-panel pl-form">
        <h2 class="pl-display pl-form__title">Crear grupo</h2>
        <p class="pl-form__sub">Te va a dar un código para que se sumen los demás.</p>
        <form class="pl-form__row" @submit.prevent="createGroup">
          <v-text-field v-model="newName" label="Nombre" placeholder="Los del sábado" />
          <v-btn type="submit" color="primary" :loading="busy === 'create'">Crear</v-btn>
        </form>
      </section>

      <section class="pl-panel pl-form">
        <h2 class="pl-display pl-form__title">Entrar a un grupo</h2>
        <p class="pl-form__sub">Con el código que te pasaron.</p>
        <form class="pl-form__row" @submit.prevent="joinGroup">
          <v-text-field
            v-model="joinCode"
            label="Código"
            placeholder="K4M2PX"
            class="pl-code-input"
          />
          <v-btn type="submit" :loading="busy === 'join'">Entrar</v-btn>
        </form>
      </section>
    </div>

    <section class="pl-panel pl-form pl-alias">
      <h2 class="pl-display pl-form__title">Tus datos de transferencia</h2>
      <p class="pl-form__sub">
        Solo los ven quienes juegan un partido donde tú recibes el dinero. Así dejas de
        pegar tu cuenta en el grupo de WhatsApp.
      </p>
      <form class="pl-form__row" @submit.prevent="saveAlias">
        <v-textarea
          v-model="alias"
          label="Cuenta"
          rows="2"
          placeholder="Banco Estado · Cuenta RUT 12.345.678-9 · Juan Pérez"
        />
        <v-btn type="submit" :loading="busy === 'alias'">Guardar</v-btn>
      </form>
    </section>

    <p v-if="error" class="pl-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.pl-title {
  font-size: clamp(2.2rem, 9vw, 3rem);
  margin: 0.1rem 0 1.3rem;
}

.pl-groups {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin-bottom: 2rem;
}

.pl-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
}

.pl-group__name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.pl-group__meta {
  margin: 0.2rem 0 0;
  font-size: 0.84rem;
  color: var(--pl-ink-dim);
}

.pl-group__code {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
}

.pl-group__value {
  font-size: 1.3rem;
  letter-spacing: 0.14em;
  color: var(--pl-lime);
}

.pl-forms {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.pl-form {
  padding: 1.2rem;
}

.pl-form__title {
  font-size: 1.25rem;
  margin: 0 0 0.3rem;
}

.pl-form__sub {
  color: var(--pl-ink-dim);
  font-size: 0.86rem;
  margin: 0 0 1rem;
}

.pl-form__row {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
}

.pl-code-input :deep(input) {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-family: var(--font-display);
}

.pl-alias {
  margin-top: 0.85rem;
}

.pl-error {
  color: var(--pl-red);
  margin-top: 1rem;
}

@media (max-width: 640px) {
  .pl-forms {
    grid-template-columns: 1fr;
  }
}
</style>
