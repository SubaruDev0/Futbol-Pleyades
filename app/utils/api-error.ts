/**
 * A 4xx carries a message written for the person reading it. A 5xx carries
 * "Server Error", which tells them nothing — the real cause belongs in the logs.
 */
export function apiError(e: unknown): string {
  const err = e as { statusCode?: number, data?: { statusMessage?: string } }
  const status = err?.statusCode
  const message = err?.data?.statusMessage

  if (status && status < 500 && message) return message

  return 'No pudimos conectar con el servidor. Inténtalo de nuevo en un momento.'
}
