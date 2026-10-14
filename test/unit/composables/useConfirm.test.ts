import { describe, expect, it } from 'vitest'
import { useConfirm } from '#imports'

describe('useConfirm', () => {
  it('confirm 會設定 request，預設按鈕文字是「刪除」', async () => {
    const { request, confirm, answer } = useConfirm()
    const result = confirm({ title: '刪除紀錄', message: '確定？' })
    expect(request.value).toMatchObject({ title: '刪除紀錄', message: '確定？', confirmLabel: '刪除' })
    answer(true)
    await expect(result).resolves.toBe(true)
    expect(request.value).toBeNull()
  })

  it('answer(false) 讓 Promise 回傳 false', async () => {
    const { confirm, answer } = useConfirm()
    const result = confirm({ title: 'a', message: 'b', confirmLabel: '確定' })
    answer(false)
    await expect(result).resolves.toBe(false)
  })

  it('前一個還沒回答又呼叫 confirm，前一個回傳 false', async () => {
    const { request, confirm, answer } = useConfirm()
    const first = confirm({ title: '一', message: '一' })
    const second = confirm({ title: '二', message: '二' })
    await expect(first).resolves.toBe(false)
    expect(request.value?.title).toBe('二')
    answer(true)
    await expect(second).resolves.toBe(true)
  })

  it('沒有 request 時 answer 不會出錯', () => {
    expect(() => useConfirm().answer(true)).not.toThrow()
  })
})
