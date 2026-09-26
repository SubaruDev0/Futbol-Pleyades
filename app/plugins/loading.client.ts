export default defineNuxtPlugin((nuxtApp) => {
  const loading = useAppLoading()
  nuxtApp.hook('page:start', () => { loading.value = true })
  nuxtApp.hook('page:finish', () => { loading.value = false })
})
