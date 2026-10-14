import type { Unsubscribe } from 'firebase/firestore'

/** 依登入的 uid 啟動或停止運動清單與紀錄的同步 */
export default defineNuxtPlugin({
  name: 'data',
  dependsOn: ['auth'],
  setup() {
    const { user } = useAuth()
    const catalog = useCatalog()
    const logs = useLogs()
    let unsubscribers: Unsubscribe[] = []
    let currentUid: string | null = null

    function stop() {
      unsubscribers.forEach(unsub => unsub())
      unsubscribers = []
      currentUid = null
      catalog.reset()
      logs.reset()
    }

    function start(uid: string) {
      if (currentUid === uid) return
      // 先清掉前一個帳號的資料，避免短暫顯示別人的紀錄
      stop()
      currentUid = uid
      unsubscribers = [catalog.startSync(uid), logs.startSync(uid)]
    }

    watch(() => user.value?.uid ?? null, uid => (uid ? start(uid) : stop()), { immediate: true })

    return { provide: { dataSync: { start, stop } } }
  }
})
