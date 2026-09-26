/**
 * Un 4xx trae un mensaje escrito para la persona que lo lee. Un 5xx trae
 * "Server Error", que no le dice nada — la causa real pertenece a los logs.
 */
export function apiError(e: unknown): string {
  const err = e as { statusCode?: number, data?: { statusMessage?: string } }
  const status = err?.statusCode
  const message = err?.data?.statusMessage

  if (status && status < 500 && message) return message

  return 'No pudimos conectar con el servidor. Inténtalo de nuevo en un momento.'
}
