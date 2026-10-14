/** 已登入就離開登入頁、註冊頁 */
export default defineNuxtRouteMiddleware((to) => {
  const { user } = useAuth()
  if (user.value) return navigateTo(safeRedirect(to.query.redirect))
})
