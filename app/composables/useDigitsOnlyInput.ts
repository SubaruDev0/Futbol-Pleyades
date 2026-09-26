const MAX_DIGITS = 8

function groupPhone(digits: string): string {
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits
}

/** Reduce un número de celular chileno pegado a sus 8 dígitos locales,
 *  quitando el código de país +56 y el prefijo 9 de móvil cuando están
 *  presentes — la gente lo pega directo desde su app de contactos, "+56 9 5497 1044" y todo. */
function stripClPrefix(digits: string): string {
  let d = digits
  if (d.length > MAX_DIGITS && d.startsWith('56')) d = d.slice(2)
  if (d.length > MAX_DIGITS && d.startsWith('9')) d = d.slice(1)
  return d.slice(0, MAX_DIGITS)
}

/** Guardia de `beforeinput` para cualquier campo de solo dígitos. */
export function blockNonDigitInput(e: InputEvent) {
  if (e.data && !/^[0-9]*$/.test(e.data)) e.preventDefault()
}

/** Mantiene un campo de teléfono en 8 dígitos, agrupados "1234 5678" para
 *  legibilidad.
 *
 *  `model` se mantiene en dígitos puros (lo que espera el servidor); `display`
 *  es el string agrupado enlazado al input. Filtrar el valor crudo después del
 *  hecho ("+" -> "") es un no-op para la reactividad de Vue cuando el
 *  resultado coincide con el valor previo, dejando el carácter obsoleto en el
 *  DOM — así que el input inválido se bloquea en `beforeinput`, que (a
 *  diferencia de `keydown`) también captura teclas muertas (´, ~) y composición IME. */
export function useDigitsOnlyInput(model: Ref<string>) {
  const display = computed(() => groupPhone(model.value))

  function onUpdate(value: string) {
    model.value = digitsOnly(value).slice(0, MAX_DIGITS)
  }

  function pastePhoneDigits(e: ClipboardEvent) {
    e.preventDefault()
    model.value = stripClPrefix(digitsOnly(e.clipboardData?.getData('text') ?? ''))
  }

  return { display, onUpdate, blockNonDigitInput, pastePhoneDigits }
}
