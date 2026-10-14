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

  const logRef = (uid: string, key: string) => doc($fbDb, 'users', uid, 'logs', key)

  function startSync(uid: string): Unsubscribe {
    return onSnapshot(
      collection($fbDb, 'users', uid, 'logs'),
      (snapshot) => {
        const next: Record<string, LogEntry> = {}
        for (const d of snapshot.docs) {
          const data = d.data()
          next[d.id] = { date: data.date, sportId: data.sportId, categoryId: data.categoryId, note: data.note ?? '' }
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

  function logFor(key: string): LogEntry | null {
    return logs.value[key] ?? null
  }

  function countUsing(field: 'sportId' | 'categoryId', id: string): number {
    return Object.values(logs.value).filter(log => log[field] === id).length
  }

  async function saveLog(key: string, input: LogInput) {
    const uid = requireUid()
    const note = input.note.trim()
    const { sportId, categoryId } = input
    if (logFor(key)) {
      await updateDoc(logRef(uid, key), { sportId, categoryId, note, updatedAt: serverTimestamp() })
      return
    }
    await setDoc(logRef(uid, key), {
      date: key,
      sportId,
      categoryId,
      note,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }

  async function removeLog(key: string) {
    const uid = requireUid()
    await deleteDoc(logRef(uid, key))
  }

  return { logs, ready, startSync, reset, logFor, countUsing, saveLog, removeLog }
}
