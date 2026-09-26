function prospectiveValue(el: HTMLInputElement, data: string): string {
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? start
  return el.value.slice(0, start) + data + el.value.slice(end)
}

/** Mantiene un campo de RUT en dígitos y K, mostrado como "21.347.032-9"
 *  mientras se escribe.
 *
 *  `model` guarda los caracteres limpios ("213470329"); `display` es lo que
 *  muestra el input. Igual que en useDigitsOnlyInput, los caracteres inválidos
 *  y el desborde se detienen en `beforeinput`. Los separadores son la otra
 *  trampa: escribir "." o borrar el "-" deja el valor limpio sin cambios, así
 *  que Vue no tiene nada que parchar y la edición suelta quedaría en el DOM —
 *  esos casos se reescriben de vuelta. */
export function useRutInput(model: Ref<string>) {
  const display = computed(() => formatRut(model.value))
  let input: HTMLInputElement | null = null

  function onUpdate(value: string) {
    model.value = cleanRut(value).slice(0, RUT_MAX_CHARS)
    const el = input
    if (el && el.value !== display.value) {
      nextTick(() => {
        if (el.value !== display.value) el.value = display.value
      })
    }
  }

  function blockInvalidRutInput(e: InputEvent) {
    input = e.target instanceof HTMLInputElement ? e.target : null
    if (!e.data || !input) return
    if (!/^[0-9kK]*$/.test(e.data)) {
      e.preventDefault()
      return
    }
    const next = cleanRut(prospectiveValue(input, e.data))
    if (next.length > RUT_MAX_CHARS || next === model.value) e.preventDefault()
  }

  function pasteRut(e: ClipboardEvent) {
    e.preventDefault()
    model.value = cleanRut(e.clipboardData?.getData('text') ?? '').slice(0, RUT_MAX_CHARS)
  }

  return { display, onUpdate, blockInvalidRutInput, pasteRut }
}
