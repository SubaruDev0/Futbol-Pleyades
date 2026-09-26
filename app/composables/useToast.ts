export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  text: string
}

const timers = new Map<number, ReturnType<typeof setTimeout>>()
let seq = 0

/** Mensajes globales cortos. Renderizados una vez por <ToastHost /> en app.vue. */
export function useToast() {
  const toasts = useState<Toast[]>('pl-toasts', () => [])

  function dismiss(id: number) {
    clearTimeout(timers.get(id))
    timers.delete(id)
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function show(text: string, kind: ToastKind = 'info', ms = kind === 'error' ? 6000 : 3500) {
    const id = ++seq
    toasts.value = [...toasts.value.slice(-2), { id, kind, text }]
    if (import.meta.client) timers.set(id, setTimeout(() => dismiss(id), ms))
    return id
  }

  return {
    toasts,
    dismiss,
    show,
    success: (text: string) => show(text, 'success'),
    error: (text: string) => show(text, 'error'),
    info: (text: string) => show(text, 'info'),
  }
}
