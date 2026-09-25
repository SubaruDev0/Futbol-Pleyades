const PUBLIC_ROUTES = ['/login', '/registro']

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  const isPublic = PUBLIC_ROUTES.includes(to.path)

  if (!loggedIn.value && !isPublic) {
    return navigateTo('/login')
  }

  if (loggedIn.value && isPublic) {
    return navigateTo('/')
  }
})
