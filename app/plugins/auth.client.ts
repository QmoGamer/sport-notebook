import { onAuthStateChanged } from 'firebase/auth'

export default defineNuxtPlugin({
  name: 'auth',
  dependsOn: ['firebase'],
  async setup(nuxtApp) {
    const { syncUser } = useAuth()

    // 等 Firebase 還原登入狀態後才繼續啟動，讓 middleware 第一次執行就拿得到 user
    await new Promise<void>((resolve) => {
      onAuthStateChanged(nuxtApp.$fbAuth, async (fbUser) => {
        try {
          await syncUser(fbUser)
        }
        catch (error) {
          console.error('[auth] 讀取使用者資料失敗', error)
        }
        finally {
          resolve()
        }
      })
    })
  }
})
