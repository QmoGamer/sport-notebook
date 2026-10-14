import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useAuth, useCatalog, useLogs, useRouter, useToast } from '#imports'
import { signOut } from 'firebase/auth'
import AppNavbar from '~/components/AppNavbar.vue'
import AppToast from '~/components/AppToast.vue'
import { seedDoc, signInAs } from '../mocks/firebase-backend'
import { catalogIds, expectRoute, registerAs, seedLog, toastMessages } from './helpers'

describe('導覽列', () => {
  it('顯示導覽連結、暱稱與 Email', async () => {
    await registerAs()
    const wrapper = await mountSuspended(AppNavbar, { route: '/' })
    expect(wrapper.text()).toContain('月曆')
    expect(wrapper.find('a[href="/stats"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/settings"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('小明')
    expect(wrapper.text()).toContain('ming@example.com')
  })

  it('登出：清空狀態、顯示「已登出」並導到登入頁', async () => {
    const user = await registerAs()
    seedLog(user.uid, '2026-10-01', { ...catalogIds() })
    await flushPromises()
    const wrapper = await mountSuspended(AppNavbar, { route: '/' })

    await wrapper.findAll('button').find(b => b.text() === '登出')!.trigger('click')
    await flushPromises()

    expect(useAuth().user.value).toBeNull()
    expect(toastMessages()).toContain('已登出')
    expect(useCatalog().sports.value).toEqual([])
    expect(useLogs().logs.value).toEqual({})
    await expectRoute('/login')
  })

  it('登出失敗時維持登入', async () => {
    await registerAs()
    vi.mocked(signOut).mockRejectedValueOnce(new Error('network'))
    const wrapper = await mountSuspended(AppNavbar, { route: '/' })
    await wrapper.findAll('button').find(b => b.text() === '登出')!.trigger('click')
    await flushPromises()
    expect(toastMessages()).toContain('登出失敗：network')
    expect(useAuth().user.value).not.toBeNull()
  })

  it('手機選單：打開後出現第二組連結，換頁後收起', async () => {
    await registerAs()
    await useRouter().push('/')
    const wrapper = await mountSuspended(AppNavbar, { route: '/' })
    expect(wrapper.findAll('a[href="/stats"]')).toHaveLength(1)

    await wrapper.find('[aria-label="開啟選單"]').trigger('click')
    expect(wrapper.findAll('a[href="/stats"]')).toHaveLength(2)

    await useRouter().push('/settings')
    await flushPromises()
    expect(wrapper.findAll('a[href="/stats"]')).toHaveLength(1)
  })
})

describe('登入狀態與資料同步', () => {
  it('auth plugin 還原登入狀態後同步使用者與清單', async () => {
    seedDoc('users/uid-9', { uid: 'uid-9', email: 'hua@example.com', name: '阿華', createdAt: '2025-06-01T00:00:00.000Z' })
    seedDoc('users/uid-9/sports/other', { name: '其它', color: '#94a3b8', order: 0 })
    seedDoc('users/uid-9/categories/other', { name: '其它', order: 0 })
    signInAs('uid-9', 'hua@example.com')

    await vi.waitFor(() => expect(useAuth().user.value).toEqual({
      uid: 'uid-9',
      email: 'hua@example.com',
      name: '阿華',
      joinedAt: '2025 年 6 月',
    }))
    await vi.waitFor(() => expect(useCatalog().sports.value.map(s => s.name)).toEqual(['其它']))
  })

  it('沒有個人資料的帳號還原登入時，user 維持 null', async () => {
    signInAs('uid-404', 'ghost@example.com')
    await flushPromises()
    expect(useAuth().user.value).toBeNull()
  })

  it('換另一個帳號登入時看不到前一個帳號的紀錄', async () => {
    const first = await registerAs('小明', 'ming@example.com')
    seedLog(first.uid, '2026-10-01', { ...catalogIds() })
    await vi.waitFor(() => expect(useLogs().logFor('2026-10-01')).not.toBeNull())

    await useAuth().logout()
    await registerAs('阿華', 'hua@example.com')
    expect(useLogs().logFor('2026-10-01')).toBeNull()
    expect(useCatalog().sports.value.map(s => s.name)).toEqual(['桌球', '其它'])
  })
})

describe('AppToast', () => {
  it('顯示錯誤訊息，點擊後關閉', async () => {
    const wrapper = await mountSuspended(AppToast, { global: { stubs: { teleport: true } } })
    useToast().error('出錯了')
    await flushPromises()
    const toast = wrapper.find('[role="status"]')
    expect(toast.text()).toContain('出錯了')
    expect(toast.classes()).toContain('bg-red-500')
    await toast.trigger('click')
    expect(useToast().toasts.value).toEqual([])
  })
})
