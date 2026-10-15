import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore'
import type { LogEntry, LogInput } from '~/types/notebook'

export function useLogs() {
  const logs = useState<Record<string, LogEntry>>('logs', () => ({}))
  const ready = useState<boolean>('logs-ready', () => false)
  const { user } = useAuth()
  const { $fbDb } = useNuxtApp()

  function requireUid(): string {
    const uid = user.value?.uid
    if (!uid) throw new Error('尚未登入')
    return uid
  }

  const logsCollection = (uid: string) => collection($fbDb, 'users', uid, 'logs')
  const logRef = (uid: string, id: string) => doc($fbDb, 'users', uid, 'logs', id)

  function startSync(uid: string): Unsubscribe {
    return onSnapshot(
      logsCollection(uid),
      (snapshot) => {
        const next: Record<string, LogEntry> = {}
        for (const d of snapshot.docs) {
          // 剛寫入、還沒拿到伺服器時間的文件用本地估計值，排序不會閃動
          const data = d.data({ serverTimestamps: 'estimate' })
          next[d.id] = {
            id: d.id,
            date: data.date,
            sportId: data.sportId,
            categoryId: data.categoryId,
            note: data.note ?? '',
            createdAt: data.createdAt?.toMillis?.() ?? 0
          }
        }
        logs.value = next
        ready.value = true
      },
      error => console.error('[logs] 同步運動紀錄失敗', error)
    )
  }

  function reset() {
    logs.value = {}
    ready.value = false
  }

  /** 某一天的紀錄，依建立先後排序 */
  function logsOn(key: string): LogEntry[] {
    return Object.values(logs.value)
      .filter(log => log.date === key)
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  }

  function countUsing(field: 'sportId' | 'categoryId', id: string): number {
    return Object.values(logs.value).filter(log => log[field] === id).length
  }

  async function addLog(key: string, input: LogInput) {
    const uid = requireUid()
    await setDoc(doc(logsCollection(uid)), {
      date: key,
      sportId: input.sportId,
      categoryId: input.categoryId,
      note: input.note.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }

  async function updateLog(id: string, input: LogInput) {
    const uid = requireUid()
    await updateDoc(logRef(uid, id), {
      sportId: input.sportId,
      categoryId: input.categoryId,
      note: input.note.trim(),
      updatedAt: serverTimestamp()
    })
  }

  async function removeLog(id: string) {
    const uid = requireUid()
    await deleteDoc(logRef(uid, id))
  }

  return { logs, ready, startSync, reset, logsOn, countUsing, addLog, updateLog, removeLog }
}
