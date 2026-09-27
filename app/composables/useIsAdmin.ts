/**
 * Si la cuenta actual es la dueña. Sale de /api/me y no de la sesión sellada;
 * el servidor igual valida cada llamada a /api/admin, esto solo decide qué se muestra.
 */
export function useIsAdmin() {
  const { user } = useUserSession()
  // En SSR, $fetch a secas no reenvía la cookie de sesión.
  const request = useRequestFetch()

  return useAsyncData(
    'pl-is-admin',
    async () => {
      if (!user.value) return false
      const me = await request('/api/me').catch(() => null)
      return !!me?.isAdmin
    },
    { default: () => false, watch: [() => user.value?.id] },
  )
}
