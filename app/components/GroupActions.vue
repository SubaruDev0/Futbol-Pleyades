<script setup lang="ts">
/**
 * Crea un grupo o únete con un código: un panel, dos pestañas. `local` (el
 * tutorial) no envía nada: los formularios solo emiten `local`.
 */
const props = withDefaults(defineProps<{ initial?: 'create' | 'join', local?: boolean }>(), {
  initial: 'create',
  local: false,
})
const emit = defineEmits<{ done: [], local: [kind: 'create' | 'join'] }>()

// Modelos opcionales: sin enlazar, se comportan como simple estado local.
const tabModel = defineModel<'create' | 'join'>('tab')
const newName = defineModel<string>('name', { default: '' })
const joinCode = defineModel<string>('code', { default: '' })

const tab = ref<'create' | 'join'>(tabModel.value ?? props.initial)
watch(tabModel, (t) => { if (t) tab.value = t })
watch(tab, (t) => { tabModel.value = t })
const error = ref('')
const busy = ref(false)
const uid = useId()
const toast = useToast()

watch(tab, () => (error.value = ''))

async function createGroup() {
  error.value = ''
  if (props.local) return emit('local', 'create')
  if (newName.value.trim().length < 2) {
    error.value = 'El nombre necesita al menos 2 letras.'
    return
  }
  busy.value = true
  try {
    const group = await $fetch('/api/groups', { method: 'POST', body: { name: newName.value.trim() } })
    newName.value = ''
    toast.success(`Creaste «${group.name}». Comparte el código ${group.inviteCode} para invitar.`)
    emit('done')
  }
  catch (e: any) {
    toast.error(apiError(e))
  }
  finally {
    busy.value = false
  }
}

async function joinGroup() {
  error.value = ''
  if (props.local) return emit('local', 'join')
  const code = joinCode.value.replace(/\s+/g, '')
  if (code.length < 4) {
    error.value = 'Escribe el código completo.'
    return
  }
  busy.value = true
  try {
    const group = await $fetch('/api/groups/join', { method: 'POST', body: { code } })
    joinCode.value = ''
    toast.success(`Te uniste a «${group.name}»`)
    emit('done')
  }
  catch (e: any) {
    toast.error(apiError(e))
  }
  finally {
    busy.value = false
  }
}

const nameLooksLikeCode = computed(() => looksLikeInviteCode(newName.value))

function switchToJoin() {
  joinCode.value = newName.value.trim().toUpperCase()
  newName.value = ''
  tab.value = 'join'
}

const TABS = [
  { key: 'create', label: 'Crear grupo' },
  { key: 'join', label: 'Unirme con código' },
] as const
</script>

<template>
  <div class="pl-ga">
    <div class="pl-tabs" role="tablist" aria-label="Crear o unirte a un grupo">
      <button
        v-for="t in TABS"
        :id="`${uid}-tab-${t.key}`"
        :key="t.key"
        type="button"
        role="tab"
        class="pl-tab"
        :aria-selected="tab === t.key"
        :aria-controls="`${uid}-panel`"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <div
      :id="`${uid}-panel`"
      class="pl-ga__body"
      role="tabpanel"
      :aria-labelledby="`${uid}-tab-${tab}`"
    >
      <Transition name="pl-swap" mode="out-in">
        <form v-if="tab === 'create'" key="create" class="pl-ga__form" @submit.prevent="createGroup">
          <p class="pl-ga__lead pl-section-title">
            Ponle nombre y te damos un código para invitar al resto.
            <InfoTip
              title="Crear un grupo"
              text="Quedas como organizador. Después compartes el código y cada uno entra con su propio teléfono."
            />
          </p>
          <v-text-field
            v-model="newName"
            label="Nombre del grupo"
            placeholder="Los del martes"
            maxlength="50"
          />
          <p v-if="nameLooksLikeCode" class="pl-ga__hint">
            Eso parece un código de invitación, no un nombre.
            <button type="button" class="pl-ga__hintlink" @click="switchToJoin">
              ¿Quieres unirte con ese código?
            </button>
          </p>
          <v-btn type="submit" color="primary" block :loading="busy">Crear grupo</v-btn>
        </form>

        <form v-else key="join" class="pl-ga__form" @submit.prevent="joinGroup">
          <p class="pl-ga__lead pl-section-title">
            Pide el código a quien organiza y escríbelo aquí.
            <InfoTip
              title="Unirte con código"
              text="Son 6 letras y números, por ejemplo K4M2PX. Al entrar verás los partidos de ese grupo y podrás anotarte."
            />
          </p>
          <v-text-field
            v-model="joinCode"
            label="Código"
            placeholder="K4M2PX"
            maxlength="12"
            autocapitalize="characters"
            autocomplete="off"
            spellcheck="false"
            class="pl-code-input"
          />
          <v-btn type="submit" color="primary" block :loading="busy">Unirme</v-btn>
        </form>
      </Transition>

      <p v-if="error" class="pl-ga__error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.pl-ga__body {
  padding: 1.2rem;
  overflow: hidden;
}

.pl-ga__form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.pl-ga__lead {
  margin: 0;
  color: var(--pl-ink-dim);
  font-size: 0.9rem;
  line-height: 1.4;
  align-items: flex-start;
}

.pl-code-input :deep(input) {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.2rem;
}

.pl-ga__error {
  color: var(--pl-red);
  font-size: 0.88rem;
  margin: 0.8rem 0 0;
}

.pl-ga__hint {
  margin: -0.35rem 0 0;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--pl-line);
  border-left: 3px solid var(--pl-amber);
  background: rgba(var(--v-theme-warning), 0.08);
  color: var(--pl-ink-dim);
  font-size: 0.86rem;
  line-height: 1.4;
}

.pl-ga__hintlink {
  display: block;
  margin-top: 0.15rem;
  padding: 0;
  background: none;
  border: 0;
  color: var(--pl-accent);
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}
</style>
