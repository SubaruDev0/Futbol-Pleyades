<script setup lang="ts">
import ReceiptReviewPanel from '~/components/ReceiptReviewPanel.vue'
import { useDisplay } from 'vuetify'

export interface ReceiptToReview {
  receiptId: string
  name: string
  guest: boolean
  createdAt: string
}

/** Quien cobra mira un comprobante y lo acepta o lo devuelve. */
const props = defineProps<{
  matchId: string
  item: ReceiptToReview | null
  amount: number | null
}>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ done: [] }>()

const { smAndDown } = useDisplay()
const toast = useToast()

const busy = ref<null | 'aceptar' | 'rechazar'>(null)
const error = ref('')

// Se incrementa en cada apertura: remonta el panel para que el zoom y el formulario de rechazo partan limpios.
const opening = ref(0)
watch(() => (open.value ? props.item?.receiptId : null), (id) => {
  error.value = ''
  if (id) opening.value++
})

const src = computed(() =>
  props.item ? `/api/matches/${props.matchId}/receipts/${props.item.receiptId}/image` : '',
)

async function review(action: 'aceptar' | 'rechazar', reason = '') {
  if (!props.item) return
  busy.value = action
  error.value = ''
  try {
    await $fetch(`/api/matches/${props.matchId}/receipts/${props.item.receiptId}/review`, {
      method: 'POST',
      body: action === 'aceptar' ? { action } : { action, reason: reason || undefined },
    })
    toast.success(action === 'aceptar' ? 'Pago aceptado' : 'Comprobante rechazado')
    emit('done')
    open.value = false
  }
  catch (e) {
    error.value = apiError(e)
  }
  finally {
    busy.value = null
  }
}
</script>

<template>
  <v-dialog
    v-model="open"
    :fullscreen="smAndDown"
    max-width="560"
    :persistent="!!busy"
    transition="dialog-bottom-transition"
  >
    <ReceiptReviewPanel
      v-if="item"
      :key="`${item.receiptId}-${opening}`"
      :name="item.name"
      :guest="item.guest"
      :created-at="item.createdAt"
      :amount="amount"
      :src="src"
      :busy="busy"
      :error="error"
      @close="open = false"
      @accept="review('aceptar')"
      @reject="review('rechazar', $event)"
    />
  </v-dialog>
</template>
