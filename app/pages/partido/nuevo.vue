<script setup lang="ts">
useHead({ title: 'Armar partido' })

const { data: groups } = await useFetch('/api/groups')
const { data: venues } = await useFetch('/api/venues')

const groupId = ref<string | null>(null)
const date = ref('')
const time = ref('')
const format = ref<'f5' | 'f6' | 'f7' | 'libre'>('f7')
const venueId = ref<string | null>(null)
const fieldLabel = ref('')
const totalCost = ref<string>('')
const collectorUserId = ref<string | null>(null)
const notes = ref('')
const error = ref('')
const loading = ref(false)

const route = useRoute()

watchEffect(() => {
  const wanted = groups.value?.find(g => g.id === route.query.group)
  const first = wanted ?? groups.value?.[0]
  if (!groupId.value && first) {
    groupId.value = first.id
    format.value = first.defaultFormat
  }
})

const { data: members } = await useFetch(() => `/api/groups/${groupId.value}/members`, {
  // El grupo ya puede estar preseleccionado (arriba) para cuando esto se crea, así que
  // "watch" solo alcanzaría un cambio posterior: sin esto, la primera carga se queda vacía.
  immediate: !!groupId.value,
  watch: [groupId],
})

// Solo quienes ya cargaron sus datos de transferencia pueden cobrar un partido.
const collectors = computed(() => (members.value ?? []).filter(m => m.hasPaymentAccount))

const CAPACITY: Record<'f5' | 'f6' | 'f7' | 'libre', number> = {
  f5: 10,
  f6: 12,
  f7: 14,
  libre: 14,
}

const perPlayer = computed(() => {
  const cost = Number(totalCost.value)
  return cost > 0 ? Math.ceil(cost / CAPACITY[format.value]) : null
})

async function submit() {
  error.value = ''

  if (!groupId.value || !date.value || !time.value) {
    error.value = 'Falta el grupo, la fecha o la hora.'
    return
  }

  const kickoffAt = new Date(`${date.value}T${time.value}`)
  if (Number.isNaN(kickoffAt.getTime())) {
    error.value = 'La fecha o la hora no son válidas.'
    return
  }

  loading.value = true
  try {
    const match = await $fetch('/api/matches', {
      method: 'POST',
      body: {
        groupId: groupId.value,
        kickoffAt,
        format: format.value,
        venueId: venueId.value ?? undefined,
        fieldLabel: fieldLabel.value.trim() || undefined,
        totalCost: totalCost.value ? Number(totalCost.value) : undefined,
        collectorUserId: collectorUserId.value ?? undefined,
        notes: notes.value.trim() || undefined,
      },
    })
    await navigateTo(`/partido/${match.slug}`)
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
  <div class="pl-new">
    <header class="pl-rise">
      <p class="pl-eyebrow">Nuevo partido</p>
      <h1 class="pl-display pl-new__title pl-section-title">
        <span class="pl-wipe">Armar partido</span>
        <InfoTip title="Armar un partido">
          <p>Lo ven todos los miembros del grupo que elijas y cada uno se anota desde su teléfono.</p>
          <p>Solo el grupo, el día y la hora son obligatorios.</p>
        </InfoTip>
      </h1>
    </header>

    <form
      class="pl-panel pl-new__form pl-rise"
      style="--i: 1"
      @submit.prevent="submit"
    >
      <v-select
        v-model="groupId"
        label="Grupo"
        :items="groups ?? []"
        item-title="name"
        item-value="id"
      />

      <div class="pl-new__pair">
        <v-text-field v-model="date" label="Día" type="date" />
        <v-text-field v-model="time" label="Hora" type="time" />
      </div>

      <v-select
        v-model="format"
        label="Formato"
        :items="[
          { title: '5v5 · 10 jugadores', value: 'f5' },
          { title: '6v6 · 12 jugadores', value: 'f6' },
          { title: '7v7 · 14 jugadores', value: 'f7' },
          { title: 'Libre · los que lleguen', value: 'libre' },
        ]"
      />

      <div class="pl-new__pair">
        <v-select
          v-model="venueId"
          label="Recinto"
          :items="venues ?? []"
          item-title="name"
          item-value="id"
          clearable
        />
        <v-text-field v-model="fieldLabel" label="Cancha" placeholder="Cancha 6" />
      </div>

      <p class="pl-eyebrow pl-section-title pl-new__section">
        Costo de la cancha
        <InfoTip title="Dividir el costo">
          <p>
            Pon lo que cuesta la cancha y la app lo divide entre los que van. Si se suma más
            gente, a cada uno le toca menos.
          </p>
          <p>
            Quien recibe el dinero debe tener sus datos de transferencia en su perfil para que
            aparezcan en el partido.
          </p>
        </InfoTip>
      </p>

      <div class="pl-new__pair">
        <v-text-field
          v-model="totalCost"
          label="Valor de la cancha"
          type="number"
          inputmode="numeric"
          prefix="$"
          placeholder="21000"
        />
        <v-select
          v-model="collectorUserId"
          label="¿Quién recibe el dinero?"
          :items="collectors"
          item-title="name"
          item-value="id"
          clearable
        />
      </div>

      <p v-if="perPlayer" class="pl-new__hint pl-numeric">
        Sale {{ clp(perPlayer) }} por cabeza si se llena.
      </p>

      <v-textarea v-model="notes" label="Notas" rows="2" placeholder="Llevar peto claro" />

      <p v-if="error" class="pl-new__error">{{ error }}</p>

      <v-btn type="submit" color="primary" block :loading="loading">
        Armar partido
      </v-btn>
    </form>
  </div>
</template>

<style scoped>
.pl-new {
  max-width: 560px;
  margin: 0 auto;
}

.pl-new__title {
  font-size: clamp(2.2rem, 9vw, 3rem);
  margin: 0.1rem 0 1.2rem;
}

.pl-new__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.4rem;
}

.pl-new__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
  gap: 0.8rem;
}

.pl-new__section {
  margin: 0.2rem 0 -0.3rem;
}

.pl-new__hint {
  margin: -0.3rem 0 0;
  font-size: 0.85rem;
  color: var(--pl-accent);
}

.pl-new__error {
  color: var(--pl-red);
  font-size: 0.88rem;
  margin: 0;
}

@media (max-width: 480px) {
  .pl-new__pair {
    grid-template-columns: 1fr;
  }
}
</style>
