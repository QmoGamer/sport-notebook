/** 假 Firebase 的共用記憶體狀態；掛在 globalThis，避免 vi.resetModules 產生多份 */
export interface FakeUser { uid: string; email: string }
type Data = Record<string, unknown>

interface Backend {
  store: Map<string, Data>
  accounts: Map<string, { uid: string; password: string }>
  currentUser: FakeUser | null
  authListeners: Set<(user: FakeUser | null) => void>
  collectionListeners: Map<string, Set<() => void>>
  uidSeq: number
  autoIdSeq: number
  clock: number
}

const KEY = '__FAKE_FIREBASE_BACKEND__'

function createBackend(): Backend {
  return {
    store: new Map(),
    accounts: new Map(),
    currentUser: null,
    authListeners: new Set(),
    collectionListeners: new Map(),
    uidSeq: 0,
    autoIdSeq: 0,
    clock: 0,
  }
}

const g = globalThis as unknown as Record<string, Backend>
export const backend: Backend = (g[KEY] ??= createBackend())

export function parentOf(path: string): string {
  return path.split('/').slice(0, -1).join('/')
}

export function nextUid(): string {
  return `uid-${++backend.uidSeq}`
}

export function nextAutoId(): string {
  return `auto-${++backend.autoIdSeq}`
}

export function notifyAuth() {
  for (const listener of [...backend.authListeners]) listener(backend.currentUser)
}

export function notifyCollection(path: string) {
  for (const listener of [...(backend.collectionListeners.get(path) ?? [])]) listener()
}

export function resetBackend() {
  const affected = new Set([...backend.store.keys()].map(parentOf))
  backend.store.clear()
  backend.accounts.clear()
  backend.currentUser = null
  backend.uidSeq = 0
  backend.autoIdSeq = 0
  backend.clock = 0
  // 保留監聽器，讓 plugin 註冊的 onSnapshot 收到清空後的結果
  affected.forEach(notifyCollection)
}

export function seedDoc(path: string, data: Data) {
  backend.store.set(path, { ...data })
  notifyCollection(parentOf(path))
}

export function readDoc(path: string): Data | undefined {
  const data = backend.store.get(path)
  return data ? { ...data } : undefined
}

export function listDocs(collectionPath: string): { id: string; data: Data }[] {
  return [...backend.store.entries()]
    .filter(([path]) => parentOf(path) === collectionPath)
    .map(([path, data]) => ({ id: path.split('/').pop()!, data: { ...data } }))
}

export function fakeTimestamp(millis: number) {
  return { toMillis: () => millis }
}

export function seedAccount(email: string, password: string): string {
  const uid = nextUid()
  backend.accounts.set(email, { uid, password })
  return uid
}

/** 模擬 Firebase 還原登入狀態 */
export function signInAs(uid: string, email: string) {
  backend.currentUser = { uid, email }
  notifyAuth()
}

export function fakeAuthError(code: string) {
  return Object.assign(new Error(code), { code })
}
