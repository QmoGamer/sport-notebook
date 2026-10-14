import { expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useAuth, useCatalog, useConfirm, useRouter, useToast } from '#imports'
import { fakeTimestamp, seedDoc } from '../mocks/firebase-backend'

/** 把今天固定在 2026-10-15（週四），只假造 Date */
export function freezeToday() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 15, 12, 0))
}

export async function registerAs(name = '小明', email = 'ming@example.com', password = 'secret123') {
  const { register, user } = useAuth()
  await register({ name, email, password })
  await vi.waitFor(() => expect(useCatalog().ready.value).toBe(true))
  return user.value!
}

export function seedLog(uid: string, date: string, input: { sportId: string; categoryId: string; note?: string }) {
  seedDoc(`users/${uid}/logs/${date}`, {
    date,
    sportId: input.sportId,
    categoryId: input.categoryId,
    note: input.note ?? '',
    createdAt: fakeTimestamp(0),
    updatedAt: fakeTimestamp(0),
  })
}

/** 預設「桌球」、「練習」的自動 ID */
export function catalogIds() {
  const { sports, categories } = useCatalog()
  return {
    sportId: sports.value.find(s => s.name === '桌球')!.id,
    categoryId: categories.value.find(c => c.name === '練習')!.id,
    otherSportId: 'other',
    otherCategoryId: 'other',
  }
}

/** 等確認 dialog 出現後回答，回傳當時的 request */
export async function answerConfirm(value: boolean) {
  const { request, answer } = useConfirm()
  await vi.waitFor(() => expect(request.value).not.toBeNull())
  const current = { ...request.value! }
  answer(value)
  await flushPromises()
  return current
}

export function toastMessages() {
  return useToast().toasts.value.map(t => t.message)
}

export async function expectRoute(fullPath: string) {
  await vi.waitFor(() => expect(useRouter().currentRoute.value.fullPath).toBe(fullPath))
}
