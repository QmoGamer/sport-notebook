import { describe, expect, it, vi } from 'vitest'
import { useLogs } from '#imports'
import { setDoc, updateDoc } from 'firebase/firestore'
import { readDoc } from '../../mocks/firebase-backend'
import { registerAs, seedLog } from '../../integration/helpers'

describe('useLogs', () => {
  it('startSync 以日期為 key，ready 變成 true', async () => {
    const user = await registerAs()
    const { logs, ready } = useLogs()
    seedLog(user.uid, '2026-10-20', { sportId: 's1', categoryId: 'c1', note: '好累' })
    await vi.waitFor(() => expect(logs.value['2026-10-20']).toEqual({ date: '2026-10-20', sportId: 's1', categoryId: 'c1', note: '好累' }))
    expect(ready.value).toBe(true)
  })

  it('saveLog 新紀錄用 setDoc，有 createdAt、updatedAt，note 已 trim', async () => {
    const user = await registerAs()
    const { saveLog } = useLogs()
    await saveLog('2026-10-20', { sportId: 's1', categoryId: 'c1', note: '  好累  ' })
    expect(setDoc).toHaveBeenCalled()
    const saved = readDoc(`users/${user.uid}/logs/2026-10-20`)!
    expect(saved).toMatchObject({ date: '2026-10-20', sportId: 's1', categoryId: 'c1', note: '好累' })
    expect(saved.createdAt).toHaveProperty('toMillis')
    expect(saved.updatedAt).toHaveProperty('toMillis')
  })

  it('saveLog 已有紀錄時用 updateDoc，不覆寫 createdAt', async () => {
    const user = await registerAs()
    const { saveLog, logFor } = useLogs()
    seedLog(user.uid, '2026-10-20', { sportId: 's1', categoryId: 'c1' })
    await vi.waitFor(() => expect(logFor('2026-10-20')).not.toBeNull())
    const before = readDoc(`users/${user.uid}/logs/2026-10-20`)!.createdAt

    vi.mocked(setDoc).mockClear()
    await saveLog('2026-10-20', { sportId: 's2', categoryId: 'c1', note: '' })
    expect(updateDoc).toHaveBeenCalled()
    expect(setDoc).not.toHaveBeenCalled()
    const after = readDoc(`users/${user.uid}/logs/2026-10-20`)!
    expect(after.sportId).toBe('s2')
    expect(after.createdAt).toBe(before)
  })

  it('removeLog 刪除指定日期的文件', async () => {
    const user = await registerAs()
    seedLog(user.uid, '2026-10-20', { sportId: 's1', categoryId: 'c1' })
    await useLogs().removeLog('2026-10-20')
    expect(readDoc(`users/${user.uid}/logs/2026-10-20`)).toBeUndefined()
  })

  it('未登入時 saveLog、removeLog 拋出「尚未登入」', async () => {
    const { saveLog, removeLog } = useLogs()
    await expect(saveLog('2026-10-20', { sportId: 's', categoryId: 'c', note: '' })).rejects.toThrow('尚未登入')
    await expect(removeLog('2026-10-20')).rejects.toThrow('尚未登入')
  })

  it('countUsing 計算使用某個運動或類型的紀錄數', async () => {
    const user = await registerAs()
    seedLog(user.uid, '2026-10-01', { sportId: 's1', categoryId: 'c1' })
    seedLog(user.uid, '2026-10-02', { sportId: 's1', categoryId: 'c2' })
    seedLog(user.uid, '2026-10-03', { sportId: 's2', categoryId: 'c2' })
    const { countUsing } = useLogs()
    await vi.waitFor(() => expect(countUsing('sportId', 's1')).toBe(2))
    expect(countUsing('categoryId', 'c2')).toBe(2)
    expect(countUsing('sportId', 'none')).toBe(0)
  })
})
