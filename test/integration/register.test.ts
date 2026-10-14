import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useRouter } from '#imports'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import RegisterPage from '~/pages/register.vue'
import { listDocs, readDoc, seedAccount } from '../mocks/firebase-backend'
import { expectRoute, toastMessages } from './helpers'

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

async function fill(wrapper: Wrapper, values: Partial<Record<'nickname' | 'email' | 'password' | 'password-confirm', string>> = {}) {
  const merged = { 'nickname': '小明', 'email': 'ming@example.com', 'password': 'secret123', 'password-confirm': 'secret123', ...values }
  for (const [id, value] of Object.entries(merged)) await wrapper.find(`#${id}`).setValue(value)
}

describe('註冊頁', () => {
  it('註冊成功：建立個人資料與預設清單，並導到首頁', async () => {
    const wrapper = await mountSuspended(RegisterPage, { route: '/register' })
    await fill(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(readDoc('users/uid-1')?.name).toBe('小明')
    expect(listDocs('users/uid-1/sports')).toHaveLength(2)
    expect(listDocs('users/uid-1/categories')).toHaveLength(2)
    expect(toastMessages()).toContain('歡迎，小明！')
    await expectRoute('/')
  })

  it.each([
    [{ nickname: '  ' }, '請輸入暱稱'],
    [{ 'password': '12345', 'password-confirm': '12345' }, '密碼長度至少需要 6 個字元'],
    [{ 'password-confirm': 'different' }, '兩次輸入的密碼不一致'],
  ])('前端驗證：%o 顯示「%s」且不呼叫 API', async (values, message) => {
    const wrapper = await mountSuspended(RegisterPage, { route: '/register' })
    await fill(wrapper, values)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toBe(message)
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled()
  })

  it('Email 已註冊時顯示錯誤並停留在註冊頁', async () => {
    seedAccount('ming@example.com', 'whatever')
    const wrapper = await mountSuspended(RegisterPage, { route: '/register' })
    await fill(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(toastMessages()).toContain('註冊失敗：這個 Email 已經註冊過了')
    expect(useRouter().currentRoute.value.path).toBe('/register')
  })

  it('處理中按鈕 disabled 並顯示「建立中…」', async () => {
    let finish!: (value: unknown) => void
    const original = createUserWithEmailAndPassword.getMockImplementation()!
    createUserWithEmailAndPassword.mockImplementationOnce((...args) => new Promise((resolve) => {
      finish = () => resolve(original(...args))
    }) as never)

    const wrapper = await mountSuspended(RegisterPage, { route: '/register' })
    await fill(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('建立中…')

    finish(undefined)
    await flushPromises()
    await expectRoute('/')
  })
})
