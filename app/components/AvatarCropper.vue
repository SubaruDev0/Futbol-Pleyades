<script setup lang="ts">
import { mdiMagnifyMinusOutline, mdiMagnifyPlusOutline } from '@mdi/js'

const props = defineProps<{
  src: string | null
  initialCrop?: AvatarCrop | null
  busy?: boolean
  progress?: number
  error?: string
}>()

const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ save: [{ blob: Blob, crop: AvatarCrop }] }>()

const viewEl = ref<HTMLElement | null>(null)
const imgEl = ref<HTMLImageElement | null>(null)
const viewSize = ref(0)
const natural = reactive({ w: 0, h: 0 })
const crop = reactive<AvatarCrop>({ ...DEFAULT_AVATAR_CROP })
const state = reactive({ ready: false, broken: false, dragging: false, rendering: false, error: '' })

const shownError = computed(() => state.error || props.error || '')
const locked = computed(() => !!props.busy || state.rendering)

watch(() => props.src, () => {
  state.ready = false
  state.broken = false
  state.error = ''
})

watch(open, (now) => {
  if (!now) return
  state.error = ''
  if (state.ready) {
    Object.assign(crop, clampAvatarCrop(props.initialCrop ?? DEFAULT_AVATAR_CROP, natural.w, natural.h))
  }
})

let observer: ResizeObserver | undefined
watch(viewEl, (el) => {
  observer?.disconnect()
  if (!el) return
  observer = new ResizeObserver(() => { viewSize.value = el.clientWidth })
  observer.observe(el)
  viewSize.value = el.clientWidth
})
onBeforeUnmount(() => observer?.disconnect())

function onImageLoad() {
  const img = imgEl.value
  if (!img) return
  natural.w = img.naturalWidth
  natural.h = img.naturalHeight
  Object.assign(crop, clampAvatarCrop(props.initialCrop ?? DEFAULT_AVATAR_CROP, natural.w, natural.h))
  state.ready = true
}

const scale = () => (viewSize.value / Math.min(natural.w, natural.h)) * crop.zoom

function settle(next: AvatarCrop) {
  Object.assign(crop, clampAvatarCrop(next, natural.w, natural.h))
}

function pan(dx: number, dy: number) {
  if (!state.ready) return
  const s = scale()
  settle({ cx: crop.cx - dx / (s * natural.w), cy: crop.cy - dy / (s * natural.h), zoom: crop.zoom })
}

// Hace zoom manteniendo el punto de la foto bajo `at` (px del viewport) donde está.
function zoomTo(zoom: number, at = { x: viewSize.value / 2, y: viewSize.value / 2 }) {
  if (!state.ready) return
  const half = viewSize.value / 2
  const s = scale()
  const ix = crop.cx * natural.w + (at.x - half) / s
  const iy = crop.cy * natural.h + (at.y - half) / s
  const z = Math.min(AVATAR_MAX_ZOOM, Math.max(1, zoom))
  const s2 = (viewSize.value / Math.min(natural.w, natural.h)) * z
  settle({ cx: (ix - (at.x - half) / s2) / natural.w, cy: (iy - (at.y - half) / s2) / natural.h, zoom: z })
}

const imageStyle = computed(() => {
  if (!state.ready || !viewSize.value) return { visibility: 'hidden' as const }
  const s = scale()
  const left = viewSize.value / 2 - crop.cx * natural.w * s
  const top = viewSize.value / 2 - crop.cy * natural.h * s
  return {
    width: `${natural.w * s}px`,
    height: `${natural.h * s}px`,
    transform: `translate3d(${left}px, ${top}px, 0)`,
  }
})

// --- Puntero: un dedo o el mouse desplaza, dos dedos hacen pinch ----------------
const pointers = new Map<number, { x: number, y: number }>()
let pinch: { dist: number, mid: { x: number, y: number } } | null = null

function local(e: PointerEvent | WheelEvent) {
  const rect = viewEl.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function measurePinch() {
  const [a, b] = [...pointers.values()] as [{ x: number, y: number }, { x: number, y: number }]
  return {
    dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  }
}

function onPointerDown(e: PointerEvent) {
  if (locked.value || !state.ready || pointers.size >= 2) return
  viewEl.value?.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, local(e))
  pinch = pointers.size === 2 ? measurePinch() : null
  state.dragging = true
}

function onPointerMove(e: PointerEvent) {
  const prev = pointers.get(e.pointerId)
  if (!prev) return
  const now = local(e)
  pointers.set(e.pointerId, now)
  if (pointers.size === 1) {
    pan(now.x - prev.x, now.y - prev.y)
    return
  }
  const next = measurePinch()
  if (pinch) {
    zoomTo(crop.zoom * (next.dist / pinch.dist), next.mid)
    pan(next.mid.x - pinch.mid.x, next.mid.y - pinch.mid.y)
  }
  pinch = next
}

function onPointerUp(e: PointerEvent) {
  pointers.delete(e.pointerId)
  pinch = pointers.size === 2 ? measurePinch() : null
  state.dragging = pointers.size > 0
}

function onWheel(e: WheelEvent) {
  if (locked.value || !state.ready) return
  zoomTo(crop.zoom * Math.exp(-e.deltaY * 0.0015), local(e))
}

function onKey(e: KeyboardEvent) {
  const step = e.shiftKey ? 40 : 12
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [step, 0],
    ArrowRight: [-step, 0],
    ArrowUp: [0, step],
    ArrowDown: [0, -step],
  }
  if (moves[e.key]) pan(...moves[e.key]!)
  else if (e.key === '+' || e.key === '=') zoomTo(crop.zoom * 1.15)
  else if (e.key === '-') zoomTo(crop.zoom / 1.15)
  else return
  e.preventDefault()
}

async function save() {
  if (!imgEl.value || !state.ready || locked.value) return
  state.error = ''
  state.rendering = true
  try {
    const framing = { cx: crop.cx, cy: crop.cy, zoom: crop.zoom }
    const blob = await renderAvatar(imgEl.value, framing)
    emit('save', { blob, crop: framing })
  }
  catch {
    state.error = 'No pudimos preparar la foto. Inténtalo de nuevo.'
  }
  finally {
    state.rendering = false
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="400" :persistent="locked" scrollable>
    <div class="pl-crop">
      <h2 class="pl-display pl-crop__title">Encuadra tu foto</h2>
      <p class="pl-crop__hint">
        Arrastra para moverla. Acerca con la barra, la rueda del mouse o pellizcando la pantalla.
      </p>

      <div
        ref="viewEl"
        class="pl-crop__view"
        :class="{ 'pl-crop__view--dragging': state.dragging }"
        tabindex="0"
        role="img"
        aria-label="Vista previa del encuadre. Usa las flechas para moverla y + o - para acercar."
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @wheel.prevent="onWheel"
        @keydown="onKey"
      >
        <img
          v-if="src"
          ref="imgEl"
          :key="src"
          :src="src"
          alt=""
          draggable="false"
          class="pl-crop__img"
          :style="imageStyle"
          @load="onImageLoad"
          @error="state.broken = true"
        >
        <div class="pl-crop__guide" aria-hidden="true" />
        <div v-if="!state.ready && !state.broken" class="pl-crop__wait">
          <v-progress-circular indeterminate size="28" width="3" color="primary" />
        </div>
        <p v-if="state.broken" class="pl-crop__wait pl-crop__broken">
          No pudimos cargar la foto.
        </p>
      </div>

      <div class="pl-crop__zoom">
        <v-btn
          icon
          size="small"
          variant="text"
          aria-label="Alejar"
          :disabled="!state.ready || locked || crop.zoom <= 1"
          @click="zoomTo(crop.zoom / 1.2)"
        >
          <v-icon :icon="mdiMagnifyMinusOutline" />
        </v-btn>
        <v-slider
          :model-value="crop.zoom"
          :min="1"
          :max="AVATAR_MAX_ZOOM"
          :step="0.01"
          :disabled="!state.ready || locked"
          color="primary"
          track-color="surface-variant"
          hide-details
          aria-label="Acercar o alejar"
          @update:model-value="zoomTo(Number($event))"
        />
        <v-btn
          icon
          size="small"
          variant="text"
          aria-label="Acercar"
          :disabled="!state.ready || locked || crop.zoom >= AVATAR_MAX_ZOOM"
          @click="zoomTo(crop.zoom * 1.2)"
        >
          <v-icon :icon="mdiMagnifyPlusOutline" />
        </v-btn>
      </div>

      <v-progress-linear
        v-if="busy"
        :model-value="progress"
        :indeterminate="!progress"
        color="primary"
        height="2"
      />
      <p v-if="shownError" class="pl-crop__error" role="alert">{{ shownError }}</p>

      <div class="pl-crop__foot">
        <v-btn variant="text" class="pl-crop__cancel" :disabled="locked" @click="open = false">
          Cancelar
        </v-btn>
        <v-btn color="primary" :loading="locked" :disabled="!state.ready" @click="save">
          Guardar foto
        </v-btn>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.pl-crop {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.2rem;
  background: var(--pl-raised);
  border: 1px solid var(--pl-line-strong);
  border-top: 2px solid var(--pl-accent);
}

.pl-crop__title {
  font-size: 1.3rem;
  margin: 0;
}

.pl-crop__hint {
  margin: -0.4rem 0 0;
  font-size: 0.84rem;
  color: var(--pl-ink-dim);
}

.pl-crop__view {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--pl-pitch);
  border: 1px solid var(--pl-line-strong);
  cursor: grab;
  touch-action: none;
  user-select: none;
  outline: none;
}

.pl-crop__view:focus-visible {
  border-color: var(--pl-accent);
}

.pl-crop__view--dragging {
  cursor: grabbing;
}

.pl-crop__img {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  transform-origin: 0 0;
  pointer-events: none;
}

/* Tercios, para ayudar a centrar una cara; más brillante mientras la foto se mueve. */
.pl-crop__guide {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.35;
  transition: opacity 160ms ease;
  background:
    linear-gradient(to right, transparent calc(33.333% - 0.5px), var(--pl-line-strong) calc(33.333% - 0.5px), var(--pl-line-strong) calc(33.333% + 0.5px), transparent calc(33.333% + 0.5px), transparent calc(66.666% - 0.5px), var(--pl-line-strong) calc(66.666% - 0.5px), var(--pl-line-strong) calc(66.666% + 0.5px), transparent calc(66.666% + 0.5px)),
    linear-gradient(to bottom, transparent calc(33.333% - 0.5px), var(--pl-line-strong) calc(33.333% - 0.5px), var(--pl-line-strong) calc(33.333% + 0.5px), transparent calc(33.333% + 0.5px), transparent calc(66.666% - 0.5px), var(--pl-line-strong) calc(66.666% - 0.5px), var(--pl-line-strong) calc(66.666% + 0.5px), transparent calc(66.666% + 0.5px));
  box-shadow: inset 0 0 0 1px var(--pl-line-strong);
}

.pl-crop__view--dragging .pl-crop__guide {
  opacity: 1;
}

.pl-crop__wait {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
}

.pl-crop__broken {
  color: var(--pl-ink-dim);
  font-size: 0.88rem;
}

.pl-crop__zoom {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.pl-crop__zoom .v-btn {
  color: var(--pl-ink-dim);
}

.pl-crop__error {
  margin: 0;
  font-size: 0.86rem;
  color: var(--pl-red);
}

.pl-crop__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.pl-crop__cancel {
  color: var(--pl-ink-dim);
}
</style>
