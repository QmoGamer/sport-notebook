import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '#imports'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('success 顯示 2500 ms', () => {
    const toast = useToast()
    toast.success('好')
    vi.advanceTimersByTime(2499)
    expect(toast.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('error 顯示 4000 ms', () => {
    const toast = useToast()
    toast.error('壞')
    vi.advanceTimersByTime(3999)
    expect(toast.toasts.value[0]).toMatchObject({ message: '壞', type: 'error' })
    vi.advanceTimersByTime(1)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('可同時顯示多則，dismiss 只移除指定的那一則', () => {
    const toast = useToast()
    toast.success('一')
    toast.success('二')
    const [first, second] = toast.toasts.value
    expect(first!.id).not.toBe(second!.id)
    toast.dismiss(first!.id)
    expect(toast.toasts.value.map(t => t.message)).toEqual(['二'])
  })

  it('不同地方呼叫 useToast 共用同一份清單', () => {
    useToast().success('共用')
    expect(useToast().toasts.value.map(t => t.message)).toEqual(['共用'])
  })
})
