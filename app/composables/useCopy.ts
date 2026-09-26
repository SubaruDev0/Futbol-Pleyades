/** Copia texto y recuerda qué se copió por un momento, para que el botón que
 *  lo hizo pueda indicarlo. `key` distingue entre varios botones. */
export function useCopy(feedbackMs = 1800) {
  const copied = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  async function copy(text: string, key = 'default') {
    try {
      await navigator.clipboard.writeText(text)
    }
    catch {
      // Los WebView de Android antiguos y los hosts de dev sin HTTPS no tienen clipboard asíncrono.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      }
      finally {
        ta.remove()
      }
    }
    copied.value = key
    clearTimeout(timer)
    timer = setTimeout(() => (copied.value = null), feedbackMs)
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return { copied, copy }
}
