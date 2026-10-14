import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useRouter } from '#imports'
import LoginPage from '~/pages/login.vue'
import { seedAccount, seedDoc } from '../mocks/firebase-backend'
import { expectRoute, registerAs, toastMessages } from './helpers'

function seedMing() {
  const uid = seedAccount('ming@example.com', 'secret123')
  seedDoc(`users/${uid}`, { uid, email: 'ming@example.com', name: '小明', createdAt: '2026-10-01T00:00:00.000Z' })
}

async function fillAndSubmit(wrapper: Awaited<ReturnType<typeof mountSuspended>>, password = 'secret123') {
  await wrapper.find('#email').setValue('ming@example.com')
  await wrapper.find('#password').setValue(password)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('登入頁', () => {
  it('登入成功後回到 redirect 指定的頁面', async () => {
    seedMing()
    const wrapper = await mountSuspended(LoginPage, { route: '/login?redirect=/stats' })
    await fillAndSubmit(wrapper)
    expect(toastMessages()).toContain('歡迎回來，小明！')
    await expectRoute('/stats')
  })

  it('沒有 redirect 或 redirect 是外部網址時導到首頁', async () => {
    seedMing()
    const wrapper = await mountSuspended(LoginPage, { route: '/login?redirect=//evil.com' })
    await fillAndSubmit(wrapper)
    await expectRoute('/')
  })

  it('密碼錯誤時顯示錯誤、清空密碼並停留在登入頁', async () => {
    seedMing()
    const wrapper = await mountSuspended(LoginPage, { route: '/login' })
    await fillAndSubmit(wrapper, 'wrong-pass')
    expect(toastMessages()).toContain('登入失敗：Email 或密碼錯誤')
    expect(useRouter().currentRoute.value.path).toBe('/login')
    expect((wrapper.find('#password').element as HTMLInputElement).value).toBe('')
    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).toBe('登入 →')
  })

  it('已登入時進入登入頁會直接被導到 redirect 指定的頁面', async () => {
    await registerAs()
    await useRouter().push('/login?redirect=/settings')
    await expectRoute('/settings')
  })

  it('「建立帳號」連結保留 redirect', async () => {
    const wrapper = await mountSuspended(LoginPage, { route: '/login?redirect=/stats' })
    expect(wrapper.find('a[href="/register?redirect=/stats"]').exists()).toBe(true)
  })
})
