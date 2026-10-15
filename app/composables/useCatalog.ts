import { collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch, type Unsubscribe } from 'firebase/firestore'
import type { Category, Sport } from '~/types/notebook'

/** Firestore 單一 batch 上限 500 次寫入，保留餘裕 */
const BATCH_SIZE = 400

type CatalogKind = 'sports' | 'categories'

export function useCatalog() {
  const sports = useState<Sport[]>('sports', () => [])
  const categories = useState<Category[]>('categories', () => [])
  const ready = useState<boolean>('catalog-ready', () => false)
  const { user } = useAuth()
  const { logs } = useLogs()
  const { $fbDb } = useNuxtApp()

  function requireUid(): string {
    const uid = user.value?.uid
    if (!uid) throw new Error('尚未登入')
    return uid
  }

  function validName(items: { id: string; name: string }[], name: string, duplicateMessage: string, excludeId?: string): string {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('名稱不能空白')
    if (hasDuplicateName(items, trimmed, excludeId)) throw new Error(duplicateMessage)
    return trimmed
  }

  function validColor(color: string): string {
    if (!isHexColor(color)) throw new Error('顏色格式不正確')
    return color
  }

  function startSync(uid: string): Unsubscribe {
    let sportsLoaded = false
    let categoriesLoaded = false
    const markReady = () => {
      if (sportsLoaded && categoriesLoaded) ready.value = true
    }
    const onError = (error: unknown) => console.error('[catalog] 同步運動清單失敗', error)

    const unsubSports = onSnapshot(collection($fbDb, 'users', uid, 'sports'), (snapshot) => {
      sports.value = sortCatalog(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Sport, 'id'>) })))
      sportsLoaded = true
      markReady()
    }, onError)

    const unsubCategories = onSnapshot(collection($fbDb, 'users', uid, 'categories'), (snapshot) => {
      categories.value = sortCatalog(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) })))
      categoriesLoaded = true
      markReady()
    }, onError)

    return () => {
      unsubSports()
      unsubCategories()
    }
  }

  function reset() {
    sports.value = []
    categories.value = []
    ready.value = false
  }

  function resolveSport(id: string): Sport {
    return sports.value.find(s => s.id === id)
      ?? sports.value.find(s => s.id === OTHER_ID)
      ?? { id: OTHER_ID, name: OTHER_NAME, color: OTHER_SPORT_COLOR, order: 0 }
  }

  function resolveCategory(id: string): Category {
    return categories.value.find(c => c.id === id)
      ?? categories.value.find(c => c.id === OTHER_ID)
      ?? { id: OTHER_ID, name: OTHER_NAME, order: 0 }
  }

  function nextSportColor(): string {
    return SPORT_COLOR_PRESETS[sports.value.length % SPORT_COLOR_PRESETS.length]!
  }

  /** 先把使用中的紀錄改成「其它」，最後一個 batch 才刪除項目本身 */
  async function removeItem(kind: CatalogKind, field: 'sportId' | 'categoryId', id: string) {
    const uid = requireUid()
    if (id === OTHER_ID) throw new Error('「其它」不能刪除')
    const affected = Object.values(logs.value).filter(log => log[field] === id)
    const chunks: typeof affected[] = []
    for (let i = 0; i < affected.length; i += BATCH_SIZE) chunks.push(affected.slice(i, i + BATCH_SIZE))
    if (!chunks.length) chunks.push([])

    for (const [index, chunk] of chunks.entries()) {
      const batch = writeBatch($fbDb)
      for (const log of chunk) {
        batch.update(doc($fbDb, 'users', uid, 'logs', log.id), { [field]: OTHER_ID, updatedAt: serverTimestamp() })
      }
      if (index === chunks.length - 1) batch.delete(doc($fbDb, 'users', uid, kind, id))
      await batch.commit()
    }
  }

  async function addSport(name: string, color: string) {
    const uid = requireUid()
    const data = {
      name: validName(sports.value, name, '已經有同名的運動'),
      color: validColor(color),
      order: nextOrder(sports.value)
    }
    await setDoc(doc(collection($fbDb, 'users', uid, 'sports')), data)
  }

  async function updateSport(id: string, patch: { name?: string; color?: string }) {
    const uid = requireUid()
    const data: { name?: string; color?: string } = {}
    if (patch.name !== undefined) {
      const current = sports.value.find(s => s.id === id)
      if (id === OTHER_ID) {
        if (patch.name.trim() !== (current?.name ?? OTHER_NAME)) throw new Error('「其它」不能修改名稱')
      }
      else {
        data.name = validName(sports.value, patch.name, '已經有同名的運動', id)
      }
    }
    if (patch.color !== undefined) data.color = validColor(patch.color)
    if (!Object.keys(data).length) return
    await updateDoc(doc($fbDb, 'users', uid, 'sports', id), data)
  }

  async function addCategory(name: string) {
    const uid = requireUid()
    const data = {
      name: validName(categories.value, name, '已經有同名的類型'),
      order: nextOrder(categories.value)
    }
    await setDoc(doc(collection($fbDb, 'users', uid, 'categories')), data)
  }

  async function updateCategory(id: string, name: string) {
    const uid = requireUid()
    if (id === OTHER_ID) throw new Error('「其它」不能修改名稱')
    await updateDoc(doc($fbDb, 'users', uid, 'categories', id), {
      name: validName(categories.value, name, '已經有同名的類型', id)
    })
  }

  return {
    sports,
    categories,
    ready,
    startSync,
    reset,
    resolveSport,
    resolveCategory,
    nextSportColor,
    addSport,
    updateSport,
    removeSport: (id: string) => removeItem('sports', 'sportId', id),
    addCategory,
    updateCategory,
    removeCategory: (id: string) => removeItem('categories', 'categoryId', id)
  }
}
