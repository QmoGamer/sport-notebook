import { describe, expect, it, vi } from 'vitest'
import { useCatalog, useLogs } from '#imports'
import { writeBatch } from 'firebase/firestore'
import { listDocs, readDoc, seedDoc } from '../../mocks/firebase-backend'
import { catalogIds, registerAs, seedLog } from '../../integration/helpers'

describe('useCatalog', () => {
  it('startSync 依 sortCatalog 排序，「其它」在最後', async () => {
    const user = await registerAs()
    seedDoc(`users/${user.uid}/sports/z`, { name: '羽球', color: '#6366f1', order: 5 })
    const { sports, categories, ready } = useCatalog()
    await vi.waitFor(() => expect(sports.value.map(s => s.name)).toEqual(['桌球', '羽球', '其它']))
    expect(categories.value.map(c => c.name)).toEqual(['練習', '其它'])
    expect(ready.value).toBe(true)
  })

  it('resolveSport 找不到時退回「其它」；清單是空的也有預設值', async () => {
    const { resolveSport, resolveCategory } = useCatalog()
    expect(resolveSport('x')).toEqual({ id: 'other', name: '其它', color: '#94a3b8', order: 0 })
    expect(resolveCategory('x')).toEqual({ id: 'other', name: '其它', order: 0 })

    await registerAs()
    const { sportId } = catalogIds()
    expect(resolveSport(sportId).name).toBe('桌球')
    expect(resolveSport('deleted').id).toBe('other')
  })

  it('addSport：order 為最大值 + 1，並驗證名稱與顏色', async () => {
    const user = await registerAs()
    const { addSport } = useCatalog()
    await addSport(' 羽球 ', '#6366f1')
    expect(listDocs(`users/${user.uid}/sports`).find(s => s.data.name === '羽球')!.data).toEqual({ name: '羽球', color: '#6366f1', order: 1 })

    await expect(addSport('桌球', '#000000')).rejects.toThrow('已經有同名的運動')
    await expect(addSport('  ', '#000000')).rejects.toThrow('名稱不能空白')
    await expect(addSport('網球', 'red')).rejects.toThrow('顏色格式不正確')
  })

  it('updateSport：可以改名改色；「其它」只能改色', async () => {
    const user = await registerAs()
    const { updateSport } = useCatalog()
    const { sportId } = catalogIds()

    await updateSport(sportId, { name: '乒乓球', color: '#ef4444' })
    expect(readDoc(`users/${user.uid}/sports/${sportId}`)).toMatchObject({ name: '乒乓球', color: '#ef4444' })

    await updateSport('other', { color: '#000000' })
    expect(readDoc(`users/${user.uid}/sports/other`)?.color).toBe('#000000')
    await expect(updateSport('other', { name: '雜項' })).rejects.toThrow('「其它」不能修改名稱')
  })

  it('removeSport：使用中的紀錄改成「其它」後才刪除運動；不能刪「其它」', async () => {
    const user = await registerAs()
    const { removeSport } = useCatalog()
    const { sportId, categoryId } = catalogIds()
    // 同一天兩筆，確認是用紀錄 ID 改寫，不是用日期
    const a = seedLog(user.uid, '2026-10-01', { sportId, categoryId })
    const b = seedLog(user.uid, '2026-10-01', { sportId, categoryId })
    const untouched = seedLog(user.uid, '2026-10-01', { sportId: 'other', categoryId })
    await vi.waitFor(() => expect(useLogs().countUsing('sportId', sportId)).toBe(2))

    await removeSport(sportId)
    expect(readDoc(`users/${user.uid}/sports/${sportId}`)).toBeUndefined()
    expect(readDoc(`users/${user.uid}/logs/${a}`)?.sportId).toBe('other')
    expect(readDoc(`users/${user.uid}/logs/${b}`)?.sportId).toBe('other')
    expect(listDocs(`users/${user.uid}/logs`).map(d => d.id).sort()).toEqual([a, b, untouched].sort())

    await expect(removeSport('other')).rejects.toThrow('「其它」不能刪除')
  })

  it('removeSport 超過 400 筆時分批，運動在最後一個 batch 刪除', async () => {
    const user = await registerAs()
    const { sportId, categoryId } = catalogIds()
    for (let i = 0; i < 401; i++) {
      seedLog(user.uid, '2026-01-01', { sportId, categoryId })
    }
    await vi.waitFor(() => expect(useLogs().countUsing('sportId', sportId)).toBe(401))

    vi.mocked(writeBatch).mockClear()
    await useCatalog().removeSport(sportId)

    const batches = vi.mocked(writeBatch).mock.results.map(r => r.value)
    expect(batches).toHaveLength(2)
    expect(batches[0].update).toHaveBeenCalledTimes(400)
    expect(batches[0].delete).not.toHaveBeenCalled()
    expect(batches[1].update).toHaveBeenCalledTimes(1)
    expect(batches[1].delete).toHaveBeenCalledTimes(1)
    expect(useLogs().countUsing('sportId', 'other')).toBe(401)
  })

  it('類型：新增、改名、刪除；「其它」不能改名', async () => {
    const user = await registerAs()
    const { addCategory, updateCategory, removeCategory } = useCatalog()
    const { categoryId, sportId } = catalogIds()

    await addCategory('比賽')
    await expect(addCategory('比賽')).rejects.toThrow('已經有同名的類型')
    await updateCategory(categoryId, '課程')
    expect(readDoc(`users/${user.uid}/categories/${categoryId}`)?.name).toBe('課程')
    await expect(updateCategory('other', '其它')).rejects.toThrow('「其它」不能修改名稱')

    const logId = seedLog(user.uid, '2026-10-01', { sportId, categoryId })
    await vi.waitFor(() => expect(useLogs().countUsing('categoryId', categoryId)).toBe(1))
    await removeCategory(categoryId)
    expect(readDoc(`users/${user.uid}/logs/${logId}`)?.categoryId).toBe('other')
    await expect(removeCategory('other')).rejects.toThrow('「其它」不能刪除')
  })
})
