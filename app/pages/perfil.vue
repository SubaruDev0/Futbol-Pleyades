<script setup lang="ts">
import ProfileLayout from '~/components/ProfileLayout.vue'
import ProfileMeCard from '~/components/ProfileMeCard.vue'
import PasswordCard from '~/components/PasswordCard.vue'
import PaymentAccountCard from '~/components/PaymentAccountCard.vue'
import type { AccountType } from '#shared/utils/bank-account'
import type { AccountDraft, AccountField } from '~/components/PaymentAccountCard.vue'

useHead({ title: 'Perfil' })

const { fetch: refreshSession } = useUserSession()
const { data: me, refresh: refreshMe } = await useFetch('/api/me')

// --- Nombre ------------------------------------------------------------------
const name = ref(me.value?.name ?? '')
const nameState = reactive({ busy: false, error: '', saved: false })
watch(name, () => { nameState.saved = false })

async function saveName() {
  nameState.error = ''
  nameState.saved = false
  if (name.value.trim().length < 2) {
    nameState.error = 'Escribe al menos 2 letras.'
    return
  }
  nameState.busy = true
  try {
    await $fetch('/api/me', { method: 'PATCH', body: { name: name.value.trim() } })
    // El encabezado lee el nombre de la sesión, que el servidor acaba de reescribir.
    await Promise.all([refreshMe(), refreshSession()])
    nameState.saved = true
  }
  catch (e: any) {
    nameState.error = apiError(e)
  }
  finally {
    nameState.busy = false
  }
}

// --- Foto -------------------------------------------------------------------
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const photoInput = ref<HTMLInputElement | null>(null)
const photo = reactive({
  phase: null as null | 'prepare' | 'upload' | 'remove',
  progress: 0,
  error: '',
})

// "new": un archivo elegido, subido junto con su original. "recrop": el original
// guardado, solo viaja el recorte. "legacy": una foto guardada antes de que se conservaran los originales.
const editor = reactive({
  open: false,
  mode: 'new' as 'new' | 'recrop' | 'legacy',
  src: null as string | null,
  source: null as Blob | null,
  crop: null as AvatarCrop | null,
  error: '',
})
const hasPhoto = computed(() => !!me.value?.avatarUrl)
const uploading = computed(() => photo.phase === 'upload')

let objectUrl: string | null = null
function releaseObjectUrl() {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
}
onBeforeUnmount(releaseObjectUrl)

watch(() => editor.open, (open) => {
  if (!open && !uploading.value) editor.source = null
})

const isHeic = (file: File) =>
  /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)

const fileName = (blob: Blob, base: string) =>
  `${base}.${blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg'}`

function sendAvatar(method: 'POST' | 'PUT', parts: { avatar: Blob, crop: AvatarCrop, source?: Blob }) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData()
    form.append('avatar', parts.avatar, fileName(parts.avatar, 'avatar'))
    form.append('crop', JSON.stringify(parts.crop))
    if (parts.source) form.append('source', parts.source, fileName(parts.source, 'source'))
    const xhr = new XMLHttpRequest()
    xhr.open(method, '/api/me/avatar')
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) photo.progress = Math.round((e.loaded / e.total) * 100)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      reject({ statusCode: xhr.status, data: xhr.response })
    }
    xhr.onerror = () => reject(new Error('network'))
    xhr.send(form)
  })
}

function pickPhoto() {
  photo.error = ''
  photoInput.value?.click()
}

function editPhoto() {
  const current = me.value
  if (!current?.avatarUrl) return pickPhoto()
  photo.error = ''
  releaseObjectUrl()
  Object.assign(editor, current.avatarSourceUrl
    ? { mode: 'recrop', src: current.avatarSourceUrl, crop: current.avatarCrop ?? null }
    : { mode: 'legacy', src: current.avatarUrl, crop: null })
  editor.source = null
  editor.error = ''
  editor.open = true
}

const onAvatarClick = () => (hasPhoto.value ? editPhoto() : pickPhoto())

async function onPhotoPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  photo.error = ''
  const heic = isHeic(file)
  if (!heic && !PHOTO_TYPES.includes(file.type)) {
    photo.error = 'Elige una foto JPG, PNG o WebP.'
    return
  }
  if (file.size > 30 * 1024 * 1024) {
    photo.error = 'Esa foto es demasiado grande. Elige una de menos de 30 MB.'
    return
  }

  photo.phase = 'prepare'
  try {
    const source = await downscaleSource(file)
    releaseObjectUrl()
    objectUrl = URL.createObjectURL(source)
    Object.assign(editor, { mode: 'new', src: objectUrl, source, crop: null, error: '', open: true })
  }
  catch {
    photo.error = heic
      ? 'Este navegador no puede abrir fotos HEIC. Conviértela a JPG o elige otra.'
      : 'No pudimos abrir esa imagen. Prueba con otra foto.'
  }
  finally {
    photo.phase = null
  }
}

async function onCropSave({ blob, crop }: { blob: Blob, crop: AvatarCrop }) {
  editor.error = ''
  photo.phase = 'upload'
  photo.progress = 0
  try {
    if (editor.mode === 'recrop') {
      await sendAvatar('PUT', { avatar: blob, crop })
    }
    else {
      const source = editor.mode === 'new'
        ? editor.source
        : await (await fetch(editor.src!)).blob()
      if (!source) throw new Error('source')
      await sendAvatar('POST', { avatar: blob, crop, source })
    }
    await Promise.all([refreshMe(), refreshSession()])
    editor.open = false
    editor.source = null
  }
  catch (e) {
    editor.error = e instanceof Error
      ? 'No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.'
      : apiError(e)
  }
  finally {
    photo.phase = null
  }
}

async function removePhoto() {
  photo.error = ''
  photo.phase = 'remove'
  try {
    await $fetch('/api/me/avatar', { method: 'DELETE' })
    await Promise.all([refreshMe(), refreshSession()])
  }
  catch (e: any) {
    photo.error = apiError(e)
  }
  finally {
    photo.phase = null
  }
}

// --- Datos de transferencia --------------------------------------------------------
const { data: account, refresh: refreshAccount } = await useFetch('/api/me/payment')

const acc = reactive<AccountDraft>({
  holderName: account.value?.holderName ?? '',
  rut: cleanRut(account.value?.rut ?? ''),
  bank: (account.value?.bank ?? null) as string | null,
  accountType: (account.value?.accountType ?? null) as AccountType | null,
  accountNumber: account.value?.accountNumber ?? '',
  email: account.value?.email ?? '',
})
const accState = reactive({ busy: false, error: '', saved: false, tried: false })

const cuentaRut = computed(() => isCuentaRut(acc.bank, acc.accountType))
const numberShown = computed(() =>
  derivedAccountNumber(acc.bank, acc.accountType, acc.rut, acc.accountNumber),
)

watch(() => acc.bank, (bank) => {
  if (acc.accountType && !accountTypesFor(bank).includes(acc.accountType)) acc.accountType = null
})

// Salir de una Cuenta RUT no debería entregar el número derivado como si se hubiera tecleado.
watch(cuentaRut, (now, before) => {
  if (before && !now) acc.accountNumber = ''
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const accErrors = computed(() => ({
  holderName: acc.holderName.trim().length < 2 ? 'Ingresa el nombre del titular.' : '',
  rut: !acc.rut
    ? 'Ingresa el RUT.'
    : !isValidRut(acc.rut) ? 'El RUT no es válido. Revisa el dígito verificador.' : '',
  bank: acc.bank ? '' : 'Elige el banco.',
  accountType: acc.accountType ? '' : 'Elige el tipo de cuenta.',
  accountNumber: cuentaRut.value
    ? ''
    : !acc.accountNumber
        ? 'Ingresa el número de cuenta.'
        : acc.accountNumber.length < 4 ? 'El número parece incompleto.' : '',
  email: acc.email.trim() && !EMAIL_RE.test(acc.email.trim()) ? 'El correo no es válido.' : '',
}))

// Los errores aparecen una vez que se intenta guardar, o apenas un campo ya completado queda mal.
function accError(field: AccountField): string | undefined {
  const msg = accErrors.value[field]
  if (!msg) return undefined
  if (accState.tried) return msg
  if (field === 'rut' && acc.rut.length >= 8) return msg
  if (field === 'email' && acc.email.trim()) return msg
  return undefined
}

watch(acc, () => { accState.saved = false })

async function saveAccount() {
  accState.error = ''
  accState.saved = false
  accState.tried = true
  if (Object.values(accErrors.value).some(Boolean)) return
  accState.busy = true
  try {
    await $fetch('/api/me/payment', {
      method: 'PUT',
      body: {
        holderName: acc.holderName.trim(),
        rut: acc.rut,
        bank: acc.bank,
        accountType: acc.accountType,
        accountNumber: numberShown.value,
        email: acc.email.trim() || null,
      },
    })
    await refreshAccount()
    accState.tried = false
    accState.saved = true
  }
  catch (e: any) {
    accState.error = apiError(e)
  }
  finally {
    accState.busy = false
  }
}

async function removeAccount() {
  accState.error = ''
  accState.busy = true
  try {
    await $fetch('/api/me/payment', { method: 'DELETE' })
    await refreshAccount()
    Object.assign(acc, {
      holderName: '',
      rut: '',
      bank: null,
      accountType: null,
      accountNumber: '',
      email: '',
    })
    accState.tried = false
  }
  catch (e: any) {
    accState.error = apiError(e)
  }
  finally {
    accState.busy = false
  }
}

// --- Contraseña ----------------------------------------------------------------
const current = ref('')
const fresh = ref('')
const confirm = ref('')
const passState = reactive({ busy: false, error: '', saved: false })

async function savePassword() {
  passState.error = ''
  passState.saved = false
  if (!current.value) {
    passState.error = 'Escribe tu contraseña actual.'
    return
  }
  if (fresh.value.length < 8) {
    passState.error = 'La contraseña nueva debe tener al menos 8 caracteres.'
    return
  }
  if (fresh.value !== confirm.value) {
    passState.error = 'Las contraseñas nuevas no coinciden.'
    return
  }
  passState.busy = true
  try {
    await $fetch('/api/me/password', {
      method: 'POST',
      body: { currentPassword: current.value, newPassword: fresh.value },
    })
    current.value = ''
    fresh.value = ''
    confirm.value = ''
    passState.saved = true
  }
  catch (e: any) {
    passState.error = apiError(e)
  }
  finally {
    passState.busy = false
  }
}

const phoneDisplay = computed(() => formatPhone(me.value?.phone ?? ''))
</script>

<template>
  <ProfileLayout :phone="phoneDisplay">
    <ProfileMeCard
      v-model:name="name"
      class="pl-rise"
      style="--i: 1"
      :shown-name="me?.name"
      :avatar-url="me?.avatarUrl"
      :phase="photo.phase"
      :progress="photo.progress"
      :busy="nameState.busy"
      :error="nameState.error"
      :saved="nameState.saved"
      :photo-error="photo.error"
      @avatar="onAvatarClick"
      @edit="editPhoto"
      @pick="pickPhoto"
      @remove="removePhoto"
      @save="saveName"
    >
      <input
        ref="photoInput"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        class="pl-me__input"
        tabindex="-1"
        aria-hidden="true"
        @change="onPhotoPicked"
      >
      <AvatarCropper
        v-model="editor.open"
        :src="editor.src"
        :initial-crop="editor.crop"
        :busy="uploading"
        :progress="photo.progress"
        :error="editor.error"
        @save="onCropSave"
      />
    </ProfileMeCard>

    <PasswordCard
      v-model:current="current"
      v-model:fresh="fresh"
      v-model:confirm="confirm"
      class="pl-rise"
      style="--i: 2"
      :busy="passState.busy"
      :error="passState.error"
      :saved="passState.saved"
      @save="savePassword"
    />

    <PaymentAccountCard
      class="pl-card--wide pl-rise"
      style="--i: 3"
      :acc="acc"
      :error-for="accError"
      :busy="accState.busy"
      :error="accState.error"
      :saved="accState.saved"
      :stored="!!account"
      @save="saveAccount"
      @remove="removeAccount"
    />
  </ProfileLayout>
</template>

<style scoped>
.pl-me__input {
  display: none;
}
</style>
