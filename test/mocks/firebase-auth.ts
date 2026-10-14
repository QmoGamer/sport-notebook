import { vi } from 'vitest'
import { backend, fakeAuthError, nextUid, notifyAuth, type FakeUser } from './firebase-backend'

export type User = FakeUser

const auth = {
  get currentUser() {
    return backend.currentUser
  },
}

export const getAuth = vi.fn(() => auth)

export const createUserWithEmailAndPassword = vi.fn(async (_auth: unknown, email: string, password: string) => {
  if (backend.accounts.has(email)) throw fakeAuthError('auth/email-already-in-use')
  if (password.length < 6) throw fakeAuthError('auth/weak-password')
  const uid = nextUid()
  backend.accounts.set(email, { uid, password })
  backend.currentUser = { uid, email }
  notifyAuth()
  return { user: backend.currentUser }
})

export const signInWithEmailAndPassword = vi.fn(async (_auth: unknown, email: string, password: string) => {
  const account = backend.accounts.get(email)
  if (!account || account.password !== password) throw fakeAuthError('auth/invalid-credential')
  backend.currentUser = { uid: account.uid, email }
  notifyAuth()
  return { user: backend.currentUser }
})

export const signOut = vi.fn(async () => {
  backend.currentUser = null
  notifyAuth()
})

export const onAuthStateChanged = vi.fn((_auth: unknown, listener: (user: FakeUser | null) => void) => {
  backend.authListeners.add(listener)
  queueMicrotask(() => listener(backend.currentUser))
  return () => {
    backend.authListeners.delete(listener)
  }
})

export const EmailAuthProvider = {
  credential: vi.fn((email: string, password: string) => ({ email, password })),
}

export const reauthenticateWithCredential = vi.fn(async (_user: FakeUser, credential: { email: string; password: string }) => {
  const account = backend.accounts.get(credential.email)
  if (!account || account.password !== credential.password) throw fakeAuthError('auth/invalid-credential')
  return { user: backend.currentUser }
})

export const updatePassword = vi.fn(async (user: FakeUser, newPassword: string) => {
  const account = backend.accounts.get(user.email)
  if (account) account.password = newPassword
})
