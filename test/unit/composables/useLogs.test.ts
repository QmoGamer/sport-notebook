import { describe, expect, it, vi } from 'vitest'
import { useLogs } from '#imports'
import { setDoc, updateDoc } from 'firebase/firestore'
import { listDocs, readDoc, seedDoc, fakeTimestamp } from '../../mocks/firebase-backend'
import { registerAs, seedLog } from '../../integration/helpers'

describe('useLogs', () => {
  it('startSync 以文件 ID 為 key，帶入日期與建立時間，ready 變成 true', async () => {
    const user = await registerAs()
    const { logs, ready } = useLogs()
    const id = seedLog(user.uid, '2026-10-20', { sportId: 's1', categoryId: 'c1', note: '好累' })
    await vi.waitFor(() => expect(logs.value[id]).toMatchObject({ id, date: '2026-10-20', sportId: 's1', categoryId: 'c1', note: '好累' }))
    expect(logs.value[id]!.createdAt).toBeLessThan(0)
    expect(ready.value).toBe(true)
  })

  it('舊資料（文件 ID 就是日期）也能正常讀取', async () => {
    const user = await registerAs()
    seedDoc(`users/${user.uid}/logs/2026-10-01`, { date: '2026-10-01', sportId: 's1', categoryId: 'c1', note: '', createdAt: fakeTimestamp(1) })
    await vi.waitFor(() => expect(useLogs().logsOn('2026-10-01').map(l => l.id)).toEqual(['2026-10-01']))
  })

  it('logsOn 只回傳當天的紀錄，依建立先後排序', async () => {
    const user = await registerAs()
    const first = seedLog(user.uid, '2026-10-20', { sportId: 's1', categoryId: 'c1' })
    seedLog(user.uid, '2026-10-21', { sportId: 's1', categoryId: 'c1' })
    const second = seedLog(user.uid, '2026-10-20', { sportId: 's2', categoryId: 'c1' })
    const { logsOn, addLog } = useLogs()
    await addLog('2026-10-20', { sportId: 's3', categoryId: 'c1', note: '' })
    await vi.waitFor(() => expect(logsOn('2026-10-20')).toHaveLength(3))
    expect(logsOn('2026-10-20').map(l => l.sportId)).toEqual(['s1', 's2', 's3'])
    expect(logsOn('2026-10-20').slice(0, 2).map(l => l.id)).toEqual([first, second])
    expect(logsOn('2026-10-22')).toEqual([])
  })

  it('addLog 用自動 ID 新增，同一天可以有多筆，有 createdAt、updatedAt，note 已 trim', async () => {
    const user = await registerAs()
    const { addLog } = useLogs()
    await addLog('2026-10-20', { sportId: 's1', categoryId: 'c1', note: '  早上  ' })
    await addLog('2026-10-20', { sportId: 's1', categoryId: 'c1', note: '晚上' })
    expect(setDoc).toHaveBeenCalledTimes(2)
    const docs = listDocs(`users/${user.uid}/logs`)
    expect(docs).toHaveLength(2)
    expect(docs.map(d => d.id).every(id => id.startsWith('auto-'))).toBe(true)
    expect(docs.map(d => d.data.note)).toEqual(['早上', '晚上'])
    expect(docs[0]!.data).toMatchObject({ date: '2026-10-20', sportId: 's1', categoryId: 'c1' })
    expect(docs[0]!.data.createdAt).toHaveProperty('toMillis')
    expect(docs[0]!.data.updatedAt).toHaveProperty('toMillis')
  })

  it('updateLog 用 updateDoc 更新指定紀錄，不覆寫 date 與 createdAt', async () => {
    const user = await registerAs()
    const id = seedLog(user.uid, '2026-10-20', { sportId: 's1', categoryId: 'c1' })
    const before = readDoc(`users/${user.uid}/logs/${id}`)!

    await useLogs().updateLog(id, { sportId: 's2', categoryId: 'c2', note: ' 改過 ' })
    expect(updateDoc).toHaveBeenCalled()
    const after = readDoc(`users/${user.uid}/logs/${id}`)!
    expect(after).toMatchObject({ date: '2026-10-20', sportId: 's2', categoryId: 'c2', note: '改過' })
    expect(after.createdAt).toBe(before.createdAt)
  })

  it('removeLog 只刪除指定的那一筆', async () => {
    const user = await registerAs()
    const keep = seedLog(user.uid, '2026-10-20', { sportId: 's1', categoryId: 'c1' })
    const drop = seedLog(user.uid, '2026-10-20', { sportId: 's2', categoryId: 'c1' })
    await useLogs().removeLog(drop)
    expect(readDoc(`users/${user.uid}/logs/${drop}`)).toBeUndefined()
    expect(readDoc(`users/${user.uid}/logs/${keep}`)).toBeDefined()
  })

  it('未登入時 addLog、updateLog、removeLog 拋出「尚未登入」', async () => {
    const { addLog, updateLog, removeLog } = useLogs()
    const input = { sportId: 's', categoryId: 'c', note: '' }
    await expect(addLog('2026-10-20', input)).rejects.toThrow('尚未登入')
    await expect(updateLog('x', input)).rejects.toThrow('尚未登入')
    await expect(removeLog('x')).rejects.toThrow('尚未登入')
  })

  it('countUsing 計算使用某個運動或類型的紀錄數（同一天多筆分別計算）', async () => {
    const user = await registerAs()
    seedLog(user.uid, '2026-10-01', { sportId: 's1', categoryId: 'c1' })
    seedLog(user.uid, '2026-10-01', { sportId: 's1', categoryId: 'c2' })
    seedLog(user.uid, '2026-10-03', { sportId: 's2', categoryId: 'c2' })
    const { countUsing } = useLogs()
    await vi.waitFor(() => expect(countUsing('sportId', 's1')).toBe(2))
    expect(countUsing('categoryId', 'c2')).toBe(2)
    expect(countUsing('sportId', 'none')).toBe(0)
  })
})
