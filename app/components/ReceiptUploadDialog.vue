<script setup lang="ts">
import { mdiClose, mdiImagePlus } from '@mdi/js'
import { useDisplay } from 'vuetify'

/** Elige la captura de la transferencia, la muestra, la reduce y la envía a revisión. */
const props = defineProps<{
  matchId: string
  player: { id: string, label: string } | null
  amount: number | null
  collectorName: string | null
}>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ sent: [] }>()

const { smAndDown } = useDisplay()
const toast = useToast()

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 3 * 1024 * 1024

const input = ref<HTMLInputElement | null>(null)
const state = reactive({
  phase: null as null | 'prepare' | 'upload',
  progress: 0,
  error: '',
})
const file = shallowRef<Blob | null>(null)
const preview = ref<string | null>(null)
const uploading = computed(() => state.phase === 'upload')

function releasePreview() {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = null
}

function reset() {
  releasePreview()
  file.value = null
  state.error = ''
  state.progress = 0
}

watch(open, (isOpen) => {
  if (!isOpen && !uploading.value) reset()
})
onBeforeUnmount(releasePreview)

const isHeic = (f: File) => /image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name)

function pick() {
  state.error = ''
  input.value?.click()
}

async function onPicked(event: Event) {
  const el = event.target as HTMLInputElement
  const picked = el.files?.[0]
  el.value = ''
  if (!picked) return

  state.error = ''
  const heic = isHeic(picked)
  if (!heic && !ACCEPTED.includes(picked.type)) {
    state.error = 'Elige una imagen JPG, PNG o WebP.'
    return
  }
  if (picked.size > 30 * 1024 * 1024) {
    state.error = 'Esa imagen es demasiado grande. Elige una de menos de 30 MB.'
    return
  }

  state.phase = 'prepare'
  try {
    const small = await downscaleSource(picked)
    if (small.size > MAX_BYTES) {
      state.error = 'La imagen sigue pesando más de 3 MB. Prueba con una captura de pantalla.'
      return
    }
    releasePreview()
    file.value = small
    preview.value = URL.createObjectURL(small)
  }
  catch {
    state.error = heic
      ? 'Este navegador no puede abrir fotos HEIC. Conviértela a JPG o toma una captura de pantalla.'
      : 'No pudimos abrir esa imagen. Prueba con otra.'
  }
  finally {
    state.phase = null
  }
}

function upload(blob: Blob, url: string) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData()
    form.append('file', blob, `comprobante.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) state.progress = Math.round((e.loaded / e.total) * 100)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      reject({ statusCode: xhr.status, data: xhr.response })
    }
    xhr.onerror = () => reject(new Error('network'))
    xhr.send(form)
  })
}

async function send() {
  if (!file.value || !props.player) return
  state.error = ''
  state.phase = 'upload'
  state.progress = 0
  try {
    await upload(file.value, `/api/matches/${props.matchId}/players/${props.player.id}/receipt`)
    toast.success('Comprobante enviado')
    emit('sent')
    state.phase = null
    open.value = false
  }
  catch (e) {
    state.error = e instanceof Error
      ? 'No pudimos enviar el comprobante. Revisa tu conexión e inténtalo de nuevo.'
      : apiError(e)
  }
  finally {
    state.phase = null
  }
}
</script>

<template>
  <v-dialog
    v-model="open"
    :fullscreen="smAndDown"
    max-width="480"
    :persistent="uploading"
    transition="dialog-bottom-transition"
  >
    <section class="pl-modal" aria-labelledby="receipt-up-title">
      <header class="pl-modal__head">
        <div>
          <p class="pl-eyebrow">{{ player?.label ?? 'Tu pago' }}</p>
          <h2 id="receipt-up-title" class="pl-display pl-modal__title">Sube tu comprobante</h2>
        </div>
        <button
          type="button"
          class="pl-modal__close"
          aria-label="Cerrar"
          :disabled="uploading"
          @click="open = false"
        >
          <v-icon :icon="mdiClose" size="20" />
        </button>
      </header>

      <div class="pl-modal__body">
        <p class="pl-rup__meta">
          <template v-if="amount">
            <span class="pl-numeric">{{ clp(amount) }}</span>
            <template v-if="collectorName"> a {{ collectorName }}</template>.
          </template>
          Una captura de la transferencia.
        </p>

        <input
          ref="input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          class="d-none"
          @change="onPicked"
        >

        <button
          v-if="!preview"
          type="button"
          class="pl-rup__drop"
          :disabled="state.phase === 'prepare'"
          @click="pick"
        >
          <v-progress-circular
            v-if="state.phase === 'prepare'"
            indeterminate
            size="26"
            width="3"
            color="primary"
          />
          <v-icon v-else :icon="mdiImagePlus" size="30" />
          <span>{{ state.phase === 'prepare' ? 'Preparando…' : 'Elegir imagen' }}</span>
        </button>

        <figure v-else class="pl-rup__preview">
          <img :src="preview" alt="Vista previa del comprobante">
          <button
            type="button"
            class="pl-rup__change"
            :disabled="uploading"
            @click="pick"
          >
            Cambiar imagen
          </button>
        </figure>

        <v-progress-linear
          v-if="uploading"
          :model-value="state.progress"
          :indeterminate="!state.progress"
          color="primary"
          height="2"
        />
        <p v-if="state.error" class="pl-modal__error" role="alert">{{ state.error }}</p>
      </div>

      <footer class="pl-modal__foot">
        <v-btn variant="text" class="pl-rup__cancel" :disabled="uploading" @click="open = false">
          Cancelar
        </v-btn>
        <v-btn color="primary" :disabled="!file" :loading="uploading" @click="send">
          Enviar comprobante
        </v-btn>
      </footer>
    </section>
  </v-dialog>
</template>

<style scoped>
.pl-rup__meta {
  margin: 0;
  color: var(--pl-ink-dim);
  font-size: 0.9rem;
}

.pl-rup__meta .pl-numeric {
  color: var(--pl-ink);
  font-weight: 700;
}

.pl-rup__drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  min-height: 200px;
  background: var(--pl-surface);
  border: 1px dashed var(--pl-line-strong);
  color: var(--pl-ink-dim);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 140ms ease, color 140ms ease;
}

.pl-rup__drop:hover:not(:disabled) {
  border-color: var(--pl-accent);
  color: var(--pl-accent);
}

.pl-rup__preview {
  position: relative;
  margin: 0;
  background: var(--pl-pitch);
  border: 1px solid var(--pl-line-strong);
}

.pl-rup__preview img {
  display: block;
  width: 100%;
  max-height: 52dvh;
  object-fit: contain;
}

.pl-rup__change {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  padding: 0.35rem 0.7rem;
  background: var(--pl-raised);
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.76rem;
  cursor: pointer;
}

.pl-rup__cancel {
  color: var(--pl-ink-dim);
}
</style>
