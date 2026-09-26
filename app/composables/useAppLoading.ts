/** Bandera compartida detrás del loader central en el layout. Manejada de forma pasiva por
 *  page:start/page:finish (app/plugins/loading.client.ts): AppLoader solo la
 *  muestra pasado un pequeño retraso, así una navegación rápida sin datos nunca parpadea. */
export function useAppLoading() {
  return useState('app-loading', () => false)
}

/**
 * Para una acción explícita que siempre debe sentirse reconocida (un click de
 * botón), no una carga de datos pasiva: muestra el mismo loader central de
 * inmediato, sin retraso, y lo mantiene al menos `minMs` aunque el trabajo
 * termine antes — la página de demo de un tutorial no tiene nada que buscar,
 * así que page:finish llegaría antes de que el loader tuviera oportunidad de aparecer.
 */
export function useAppLoadingFlash() {
  const flashing = useState('app-loading-flash', () => false)

  async function flash(work: () => Promise<void> | void, minMs = 350) {
    flashing.value = true
    const start = Date.now()
    try {
      await work()
    }
    finally {
      const wait = minMs - (Date.now() - start)
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
      flashing.value = false
    }
  }

  return { flashing, flash }
}
