import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth, useNuxtApp } from '#imports'
import { createUserWithEmailAndPassword, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth'
import { getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { listDocs, readDoc, seedAccount, seedDoc } from '../../mocks/firebase-backend'

const input = { name: '  小明 ', email: 'ming@example.com', password: 'secret123' }

describe('useAuth', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 12, 10, 0))
  })

  it('register 建立帳號、個人資料與預設清單', async () => {
    const { register, user } = useAuth()
    await register(input)

    expect(readDoc('users/uid-1')).toEqual({
      uid: 'uid-1',
      email: 'ming@example.com',
      name: '小明',
      createdAt: new Date(2026, 9, 12, 10, 0).toISOString(),
    })
    const sports = listDocs('users/uid-1/sports')
    expect(sports.map(s => s.data)).toEqual(expect.arrayContaining([
      { name: '桌球', color: '#10b981', order: 0 },
      { name: '其它', color: '#94a3b8', order: 0 },
    ]))
    expect(sports.find(s => s.data.name === '其它')!.id).toBe('other')
    expect(listDocs('users/uid-1/categories').map(c => [c.id === 'other', c.data.name]))
      .toEqual(expect.arrayContaining([[false, '練習'], [true, '其它']]))
    expect(user.value).toEqual({ uid: 'uid-1', email: 'ming@example.com', name: '小明', joinedAt: '2026 年 10 月' })
  })

  it('register 暱稱空白時不呼叫 Firebase', async () => {
    const { register, user } = useAuth()
    await expect(register({ ...input, name: '   ' })).rejects.toThrow('請輸入暱稱')
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled()
    expect(user.value).toBeNull()
  })

  it('register Email 重複時拋出 auth/email-already-in-use', async () => {
    seedAccount('ming@example.com', 'whatever')
    const { register, user } = useAuth()
    await expect(register(input)).rejects.toMatchObject({ code: 'auth/email-already-in-use' })
    expect(user.value).toBeNull()
  })

  it('register 寫入失敗時拋錯，user 維持 null', async () => {
    vi.mocked(writeBatch).mockImplementationOnce(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockRejectedValue(new Error('permission-denied')),
    }) as never)
    const { register, user } = useAuth()
    await expect(register(input)).rejects.toThrow('permission-denied')
    expect(user.value).toBeNull()
  })

  it('login 成功設定 user；密碼錯誤拋出 auth/invalid-credential', async () => {
    const uid = seedAccount('ming@example.com', 'secret123')
    seedDoc(`users/${uid}`, { uid, email: 'ming@example.com', name: '小明', createdAt: '2025-06-01T00:00:00.000Z' })
    const { login, user } = useAuth()

    await expect(login('ming@example.com', 'wrong')).rejects.toMatchObject({ code: 'auth/invalid-credential' })
    expect(user.value).toBeNull()

    await login(' ming@example.com ', 'secret123')
    expect(user.value).toEqual({ uid, email: 'ming@example.com', name: '小明', joinedAt: '2025 年 6 月' })
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('login 時沒有個人資料，用 Email 前綴補建', async () => {
    const uid = seedAccount('ming@example.com', 'secret123')
    const { login, user } = useAuth()
    await login('ming@example.com', 'secret123')
    expect(user.value?.name).toBe('ming')
    expect(readDoc(`users/${uid}`)?.name).toBe('ming')
    expect(listDocs(`users/${uid}/sports`)).toHaveLength(2)
  })

  it('logout 先停止同步再登出', async () => {
    const { register, logout, user } = useAuth()
    await register(input)
    const stop = vi.spyOn(useNuxtApp().$dataSync, 'stop')

    await logout()

    expect(stop).toHaveBeenCalledTimes(1)
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(stop.mock.invocationCallOrder[0]!).toBeLessThan(vi.mocked(signOut).mock.invocationCallOrder[0]!)
    expect(user.value).toBeNull()
    stop.mockRestore()
  })

  it('syncUser：null 清除 user；讀回文件；沒有文件時維持 null；同一個 uid 不重讀', async () => {
    const { syncUser, user } = useAuth()
    seedDoc('users/u1', { uid: 'u1', email: 'a@b.c', name: '阿華' })

    await syncUser({ uid: 'nobody', email: 'x@y.z' } as never)
    expect(user.value).toBeNull()

    await syncUser({ uid: 'u1', email: 'a@b.c' } as never)
    expect(user.value).toMatchObject({ uid: 'u1', name: '阿華', joinedAt: '2026 年 10 月' })

    vi.mocked(getDoc).mockClear()
    await syncUser({ uid: 'u1', email: 'a@b.c' } as never)
    expect(getDoc).not.toHaveBeenCalled()

    await syncUser(null)
    expect(user.value).toBeNull()
  })

  it('updateName 更新 Firestore 與本地狀態；空白時拋錯', async () => {
    const { register, updateName, user } = useAuth()
    await register(input)

    await updateName('  大明 ')
    expect(readDoc('users/uid-1')?.name).toBe('大明')
    expect(user.value?.name).toBe('大明')

    vi.mocked(updateDoc).mockClear()
    await expect(updateName('  ')).rejects.toThrow('暱稱不能空白')
    expect(updateDoc).not.toHaveBeenCalled()
  })

  it('changePassword 先重新驗證再更新；之後能用新密碼登入', async () => {
    const { register, changePassword, logout, login, user } = useAuth()
    await register(input)

    await expect(changePassword('wrong', 'newpass1')).rejects.toMatchObject({ code: 'auth/invalid-credential' })
    expect(updatePassword).not.toHaveBeenCalled()

    await changePassword('secret123', 'newpass1')
    expect(reauthenticateWithCredential).toHaveBeenCalled()
    expect(updatePassword).toHaveBeenCalledTimes(1)

    await logout()
    await login('ming@example.com', 'newpass1')
    expect(user.value?.name).toBe('小明')
  })
})
