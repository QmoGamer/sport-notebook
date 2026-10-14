import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User
} from 'firebase/auth'
import { collection, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore'

export interface AppUser { uid: string; email: string; name: string; joinedAt: string }
export interface RegisterInput { name: string; email: string; password: string }

interface UserDoc { uid: string; email: string; name: string; createdAt?: string }

function formatJoinedAt(iso?: string): string {
  const date = iso ? new Date(iso) : new Date()
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`
}

function toAppUser(data: UserDoc): AppUser {
  return { uid: data.uid, email: data.email, name: data.name, joinedAt: formatJoinedAt(data.createdAt) }
}

export function useAuth() {
  const user = useState<AppUser | null>('auth-user', () => null)
  const nuxtApp = useNuxtApp()
  const { $fbAuth, $fbDb } = nuxtApp

  const userRef = (uid: string) => doc($fbDb, 'users', uid)

  /** 一次寫入個人資料與預設的運動、類型清單 */
  async function createProfile(uid: string, email: string, name: string): Promise<UserDoc> {
    const profile: UserDoc = { uid, email, name, createdAt: new Date().toISOString() }
    const batch = writeBatch($fbDb)
    batch.set(userRef(uid), profile)
    batch.set(doc(collection($fbDb, 'users', uid, 'sports')), { name: '桌球', color: DEFAULT_SPORT_COLOR, order: 0 })
    batch.set(doc($fbDb, 'users', uid, 'sports', OTHER_ID), { name: OTHER_NAME, color: OTHER_SPORT_COLOR, order: 0 })
    batch.set(doc(collection($fbDb, 'users', uid, 'categories')), { name: '練習', order: 0 })
    batch.set(doc($fbDb, 'users', uid, 'categories', OTHER_ID), { name: OTHER_NAME, order: 0 })
    await batch.commit()
    return profile
  }

  async function syncUser(fbUser: User | null) {
    if (!fbUser) {
      user.value = null
      return
    }
    // 註冊或登入時 onAuthStateChanged 會同時觸發；同一個 uid 不重讀，避免讀到尚未寫入的文件
    if (user.value?.uid === fbUser.uid) return
    const snap = await getDoc(userRef(fbUser.uid))
    // 文件不存在時不清除 user，交給 register / login 寫入後再設定
    if (snap.exists()) user.value = toAppUser(snap.data() as UserDoc)
  }

  async function register(input: RegisterInput) {
    const name = input.name.trim()
    const email = input.email.trim()
    if (!name) throw new Error('請輸入暱稱')
    const credential = await createUserWithEmailAndPassword($fbAuth, email, input.password)
    const profile = await createProfile(credential.user.uid, email, name)
    user.value = toAppUser(profile)
  }

  async function login(email: string, password: string) {
    const credential = await signInWithEmailAndPassword($fbAuth, email.trim(), password)
    const { uid } = credential.user
    const snap = await getDoc(userRef(uid))
    if (snap.exists()) {
      user.value = toAppUser(snap.data() as UserDoc)
      return
    }
    // 註冊時個人資料寫入失敗留下的帳號，登入時補建
    const accountEmail = credential.user.email ?? email.trim()
    const profile = await createProfile(uid, accountEmail, accountEmail.split('@')[0]!)
    user.value = toAppUser(profile)
  }

  async function logout() {
    // 先停止同步，否則登出後監聽器會收到 permission-denied
    nuxtApp.$dataSync.stop()
    await signOut($fbAuth)
    user.value = null
  }

  async function updateName(newName: string) {
    const name = newName.trim()
    if (!name) throw new Error('暱稱不能空白')
    if (!user.value) throw new Error('尚未登入')
    await updateDoc(userRef(user.value.uid), { name })
    user.value = { ...user.value, name }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const fbUser = $fbAuth.currentUser
    if (!fbUser) throw new Error('尚未登入')
    const credential = EmailAuthProvider.credential(fbUser.email ?? '', currentPassword)
    // Firebase 規定改密碼前要最近登入過
    await reauthenticateWithCredential(fbUser, credential)
    await updatePassword(fbUser, newPassword)
  }

  return { user, syncUser, register, login, logout, updateName, changePassword }
}
