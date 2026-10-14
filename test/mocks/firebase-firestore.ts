import { vi } from 'vitest'
import { backend, fakeTimestamp, listDocs, nextAutoId, notifyCollection, parentOf } from './firebase-backend'

type Data = Record<string, unknown>
export type Timestamp = { toMillis(): number }
export type Unsubscribe = () => void

interface CollectionRef { type: 'collection'; path: string }
interface DocRef { type: 'doc'; id: string; path: string; parentPath: string }

const SERVER_TIMESTAMP = Symbol('serverTimestamp')

function docRef(path: string): DocRef {
  return { type: 'doc', id: path.split('/').pop()!, path, parentPath: parentOf(path) }
}

/** 把 serverTimestamp sentinel 換成遞增的假時間 */
function resolveSentinels(data: Data): Data {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [
    key,
    value === SERVER_TIMESTAMP ? fakeTimestamp(++backend.clock) : value,
  ]))
}

export const getFirestore = vi.fn(() => ({}))

export const collection = vi.fn((_db: unknown, ...segments: string[]): CollectionRef => ({
  type: 'collection',
  path: segments.join('/'),
}))

export const doc = vi.fn((parent: unknown, ...segments: string[]): DocRef => {
  const ref = parent as CollectionRef | undefined
  if (segments.length === 0 && ref?.type === 'collection') return docRef(`${ref.path}/${nextAutoId()}`)
  return docRef(segments.join('/'))
})

export const serverTimestamp = vi.fn(() => SERVER_TIMESTAMP)

export const getDoc = vi.fn(async (ref: DocRef) => {
  const data = backend.store.get(ref.path)
  return { id: ref.id, exists: () => !!data, data: () => (data ? { ...data } : undefined) }
})

export const setDoc = vi.fn(async (ref: DocRef, data: Data) => {
  backend.store.set(ref.path, resolveSentinels(data))
  notifyCollection(ref.parentPath)
})

export const updateDoc = vi.fn(async (ref: DocRef, data: Data) => {
  const existing = backend.store.get(ref.path)
  if (!existing) throw new Error(`No document to update: ${ref.path}`)
  backend.store.set(ref.path, { ...existing, ...resolveSentinels(data) })
  notifyCollection(ref.parentPath)
})

export const deleteDoc = vi.fn(async (ref: DocRef) => {
  backend.store.delete(ref.path)
  notifyCollection(ref.parentPath)
})

type BatchOp =
  | { kind: 'set'; ref: DocRef; data: Data }
  | { kind: 'update'; ref: DocRef; data: Data }
  | { kind: 'delete'; ref: DocRef }

export const writeBatch = vi.fn((_db: unknown) => {
  const ops: BatchOp[] = []
  return {
    set: vi.fn((ref: DocRef, data: Data) => { ops.push({ kind: 'set', ref, data }) }),
    update: vi.fn((ref: DocRef, data: Data) => { ops.push({ kind: 'update', ref, data }) }),
    delete: vi.fn((ref: DocRef) => { ops.push({ kind: 'delete', ref }) }),
    commit: vi.fn(async () => {
      // 先在副本上套用，任何一步失敗就整批不生效
      const next = new Map(backend.store)
      for (const op of ops) {
        if (op.kind === 'set') next.set(op.ref.path, resolveSentinels(op.data))
        else if (op.kind === 'delete') next.delete(op.ref.path)
        else {
          const existing = next.get(op.ref.path)
          if (!existing) throw new Error(`No document to update: ${op.ref.path}`)
          next.set(op.ref.path, { ...existing, ...resolveSentinels(op.data) })
        }
      }
      backend.store.clear()
      next.forEach((value, key) => backend.store.set(key, value))
      new Set(ops.map(op => op.ref.parentPath)).forEach(notifyCollection)
    }),
  }
})

export const onSnapshot = vi.fn((
  ref: CollectionRef,
  next: (snapshot: { docs: { id: string; data: () => Data }[] }) => void,
  _error?: (error: unknown) => void,
): Unsubscribe => {
  const listener = () => next({
    docs: listDocs(ref.path).map(({ id, data }) => ({ id, data: () => ({ ...data }) })),
  })
  if (!backend.collectionListeners.has(ref.path)) backend.collectionListeners.set(ref.path, new Set())
  backend.collectionListeners.get(ref.path)!.add(listener)
  listener()
  return () => {
    backend.collectionListeners.get(ref.path)?.delete(listener)
  }
})
