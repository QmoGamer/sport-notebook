export default defineNuxtRouteMiddleware((to) => {
  const { user } = useAuth()
  if (user.value) return
  return navigateTo(to.fullPath === '/'
    ? '/login'
    : { path: '/login', query: { redirect: to.fullPath } })
})
