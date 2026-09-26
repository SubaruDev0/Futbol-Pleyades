<script setup lang="ts">
import { mdiCameraOutline, mdiCheck, mdiCropFree, mdiTrashCanOutline } from '@mdi/js'

/**
 * Foto y nombre en /perfil. Presentacional: la página es dueña de las subidas
 * y el guardado. El slot por defecto lleva el input de archivo y el recortador de la página.
 */
defineProps<{
  /** El nombre guardado, tal como lo muestra la planilla. */
  shownName: string | null | undefined
  avatarUrl: string | null | undefined
  /** Qué está haciendo la foto en este momento, si algo. */
  phase: null | 'prepare' | 'upload' | 'remove'
  progress: number
  busy: boolean
  error: string
  saved: boolean
  photoError: string
}>()
const name = defineModel<string>('name', { required: true })
const emit = defineEmits<{ avatar: [], edit: [], pick: [], remove: [], save: [] }>()
</script>

<template>
  <section class="pl-panel pl-card">
    <h2 class="pl-display pl-card__title pl-section-title">
      Tu perfil
      <InfoTip
        title="Tu perfil"
        text="Tu foto y tu nombre aparecen en la planilla de cada partido. Usa el nombre con que te conocen en la cancha."
      />
    </h2>
    <div class="pl-me">
      <div class="pl-me__id">
        <button
          type="button"
          class="pl-me__frame"
          :disabled="!!phase"
          :aria-label="avatarUrl ? 'Editar foto' : 'Subir foto'"
          @click="emit('avatar')"
        >
          <UserAvatar :name="shownName" :src="avatarUrl" :size="104" />
          <span v-if="!phase" class="pl-me__hover" aria-hidden="true">
            <v-icon :icon="avatarUrl ? mdiCropFree : mdiCameraOutline" size="26" />
          </span>
          <span v-else class="pl-me__busy" role="status">
            <v-progress-circular
              :indeterminate="phase !== 'upload' || !progress"
              :model-value="progress"
              size="34"
              width="3"
              color="primary"
            />
            <span class="d-sr-only">
              {{ phase === 'remove' ? 'Quitando foto' : phase === 'prepare' ? 'Preparando foto' : 'Subiendo foto' }}
            </span>
          </span>
        </button>
        <slot />
        <div class="pl-me__who">
          <p class="pl-eyebrow">Así te ven en la planilla</p>
          <p class="pl-display pl-me__name">{{ shownName }}</p>
          <div class="pl-me__actions">
            <template v-if="avatarUrl">
              <v-btn
                size="small"
                variant="outlined"
                :prepend-icon="mdiCropFree"
                :disabled="!!phase"
                @click="emit('edit')"
              >
                Editar foto
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                class="pl-me__quiet"
                :prepend-icon="mdiCameraOutline"
                :disabled="!!phase"
                @click="emit('pick')"
              >
                Cambiar
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                class="pl-me__quiet pl-me__remove"
                :icon="mdiTrashCanOutline"
                :disabled="!!phase"
                aria-label="Quitar foto"
                title="Quitar foto"
                @click="emit('remove')"
              />
            </template>
            <v-btn
              v-else
              size="small"
              variant="outlined"
              :prepend-icon="mdiCameraOutline"
              :disabled="!!phase"
              @click="emit('pick')"
            >
              Subir foto
            </v-btn>
          </div>
        </div>
      </div>

      <form class="pl-me__form" @submit.prevent="emit('save')">
        <div class="pl-me__row">
          <v-text-field
            v-model="name"
            label="Nombre o apodo"
            maxlength="40"
            autocomplete="nickname"
          />
          <v-btn type="submit" color="primary" :loading="busy">Guardar</v-btn>
        </div>
        <p v-if="error" class="pl-msg pl-msg--error">{{ error }}</p>
        <p v-else-if="saved" class="pl-msg pl-msg--ok">
          <v-icon :icon="mdiCheck" size="16" /> Guardado
        </p>
      </form>
    </div>
    <p v-if="photoError" class="pl-msg pl-msg--error pl-me__error">{{ photoError }}</p>
  </section>
</template>

<style scoped>
.pl-me {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.pl-me__id {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  min-width: 0;
}

.pl-me__who {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.pl-me__who .pl-eyebrow {
  margin: 0;
}

.pl-me__name {
  margin: 0 0 0.35rem;
  font-size: 2rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl-me__form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--pl-line);
}

.pl-me__row {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.pl-me__row .v-input {
  flex: 1;
  min-width: 0;
}

.pl-me__row .v-btn {
  flex: none;
  height: 48px;
}

.pl-me__frame {
  position: relative;
  display: block;
  flex: none;
  padding: 0;
  background: none;
  border: 1px solid var(--pl-line-strong);
  cursor: pointer;
  transition: border-color 120ms ease;
}

.pl-me__frame:hover:not(:disabled),
.pl-me__frame:focus-visible {
  border-color: var(--pl-accent);
  outline: none;
}

.pl-me__frame:disabled {
  cursor: progress;
}

.pl-me__hover {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--pl-ink);
  background: rgba(var(--v-theme-background), 0.55);
  opacity: 0;
  transition: opacity 140ms ease;
}

.pl-me__frame:hover .pl-me__hover,
.pl-me__frame:focus-visible .pl-me__hover {
  opacity: 1;
}

.pl-me__busy {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(var(--v-theme-background), 0.72);
}

.pl-me__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}

.pl-me__actions .v-btn {
  height: 34px;
}

.pl-me__quiet {
  color: var(--pl-ink-dim);
}

.pl-me__remove:hover {
  color: var(--pl-red);
}

.pl-me__error {
  margin-top: 0.8rem;
}

@media (max-width: 479px) {
  .pl-me__id {
    flex-direction: column;
    text-align: center;
  }
  .pl-me__who {
    align-items: center;
    max-width: 100%;
  }
  .pl-me__actions {
    justify-content: center;
  }
}
</style>
