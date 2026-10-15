import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useAuth } from '#imports'
import { writeBatch } from 'firebase/firestore'
import { updatePassword } from 'firebase/auth'
import SettingsPage from '~/pages/settings.vue'
import { listDocs, readDoc } from '../mocks/firebase-backend'
import { answerConfirm, catalogIds, registerAs, seedLog, toastMessages } from './helpers'

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

async function mountSettings() {
  const wrapper = await mountSuspended(SettingsPage, { route: '/settings' })
  await flushPromises()
  return wrapper
}

/** 第 index 個 CatalogEditor（0 = 運動、1 = 類型）所在的 section */
const editor = (wrapper: Wrapper, index: number) => wrapper.findAll('section')[index + 1]!
const rowOf = (wrapper: Wrapper, index: number, name: string) => editor(wrapper, index).findAll('li').find(li => li.text().includes(name))!
const buttonIn = (el: ReturnType<Wrapper['find']>, text: string) => el.findAll('button').find(b => b.text() === text)!

async function addItem(wrapper: Wrapper, index: number, name: string) {
  const section = editor(wrapper, index)
  await section.find('input[type="text"]').setValue(name)
  await section.find('form').trigger('submit')
  await flushPromises()
}

describe('設定頁', () => {
  let uid: string

  beforeEach(async () => {
    uid = (await registerAs()).uid
  })

  it('顯示暱稱、Email 與加入時間', async () => {
    const wrapper = await mountSettings()
    expect(wrapper.text()).toContain('小明')
    expect(wrapper.text()).toContain('ming@example.com')
    expect(wrapper.text()).toMatch(/加入於 \d{4} 年 \d{1,2} 月/)
  })

  it('修改暱稱；沒有變更時按鈕 disabled', async () => {
    const wrapper = await mountSettings()
    const button = wrapper.findAll('section')[0]!.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.find('#settings-name').setValue('大明')
    await wrapper.findAll('section')[0]!.find('form').trigger('submit')
    await flushPromises()
    expect(toastMessages()).toContain('暱稱已更新')
    expect(useAuth().user.value?.name).toBe('大明')
  })

  it('運動清單：「其它」有「固定」標記且不能編輯刪除', async () => {
    const wrapper = await mountSettings()
    expect(editor(wrapper, 0).findAll('li').map(li => li.text().replace(/\s+/g, ''))).toEqual(['桌球編輯刪除', '其它固定'])
  })

  it('新增運動，重複名稱時顯示錯誤', async () => {
    const wrapper = await mountSettings()
    await addItem(wrapper, 0, '羽球')
    expect(toastMessages()).toContain('已新增「羽球」')
    expect(editor(wrapper, 0).findAll('li').map(li => li.text().split(/\s/)[0])).toEqual(['桌球', '羽球', '其它'])

    await addItem(wrapper, 0, '桌球')
    expect(toastMessages()).toContain('新增失敗：已經有同名的運動')
  })

  it('運動改名與改顏色', async () => {
    const wrapper = await mountSettings()
    const { sportId } = catalogIds()

    await buttonIn(rowOf(wrapper, 0, '桌球'), '編輯').trigger('click')
    await rowOf(wrapper, 0, '儲存').find('input[aria-label="運動名稱"]').setValue('乒乓球')
    await buttonIn(rowOf(wrapper, 0, '儲存'), '儲存').trigger('click')
    await flushPromises()
    expect(toastMessages()).toContain('已更新「乒乓球」')
    expect(readDoc(`users/${uid}/sports/${sportId}`)?.name).toBe('乒乓球')

    const color = wrapper.find('input[aria-label="乒乓球 的顏色"]')
    ;(color.element as HTMLInputElement).value = '#123456'
    await color.trigger('change')
    await flushPromises()
    expect(readDoc(`users/${uid}/sports/${sportId}`)?.color).toBe('#123456')
  })

  it('刪除使用中的運動：確認後紀錄改為「其它」', async () => {
    const { sportId, categoryId } = catalogIds()
    const first = seedLog(uid, '2026-10-01', { sportId, categoryId })
    seedLog(uid, '2026-10-01', { sportId, categoryId })
    const wrapper = await mountSettings()

    await buttonIn(rowOf(wrapper, 0, '桌球'), '刪除').trigger('click')
    const request = await answerConfirm(true)
    expect(request.title).toBe('刪除運動')
    expect(request.message).toBe('確定要刪除「桌球」嗎？有 2 筆紀錄會改為「其它」。')
    expect(readDoc(`users/${uid}/sports/${sportId}`)).toBeUndefined()
    expect(readDoc(`users/${uid}/logs/${first}`)?.sportId).toBe('other')
    expect(toastMessages()).toContain('已刪除「桌球」')
  })

  it('取消刪除時運動仍在', async () => {
    const wrapper = await mountSettings()
    vi.mocked(writeBatch).mockClear()
    await buttonIn(rowOf(wrapper, 0, '桌球'), '刪除').trigger('click')
    const request = await answerConfirm(false)
    expect(request.message).toBe('確定要刪除「桌球」嗎？')
    expect(writeBatch).not.toHaveBeenCalled()
    expect(listDocs(`users/${uid}/sports`)).toHaveLength(2)
  })

  it('類型：新增、改名、刪除', async () => {
    const wrapper = await mountSettings()
    await addItem(wrapper, 1, '比賽')
    expect(toastMessages()).toContain('已新增「比賽」')

    await buttonIn(rowOf(wrapper, 1, '比賽'), '編輯').trigger('click')
    await rowOf(wrapper, 1, '儲存').find('input[aria-label="類型名稱"]').setValue('友誼賽')
    await buttonIn(rowOf(wrapper, 1, '儲存'), '儲存').trigger('click')
    await flushPromises()
    expect(toastMessages()).toContain('已更新「友誼賽」')

    await buttonIn(rowOf(wrapper, 1, '友誼賽'), '刪除').trigger('click')
    const request = await answerConfirm(true)
    expect(request.title).toBe('刪除類型')
    expect(listDocs(`users/${uid}/categories`).map(c => c.data.name)).not.toContain('友誼賽')
  })

  describe('修改密碼', () => {
    async function submitPassword(wrapper: Wrapper, current: string, next: string, confirm = next) {
      await wrapper.find('#current-password').setValue(current)
      await wrapper.find('#new-password').setValue(next)
      await wrapper.find('#new-password-confirm').setValue(confirm)
      await wrapper.findAll('section')[3]!.find('form').trigger('submit')
      await flushPromises()
    }

    it.each([
      ['', 'newpass1', 'newpass1', '請輸入目前密碼'],
      ['secret123', '12345', '12345', '密碼長度至少需要 6 個字元'],
      ['secret123', 'newpass1', 'newpass2', '兩次輸入的密碼不一致'],
      ['secret123', 'secret123', 'secret123', '新密碼不能與目前密碼相同'],
    ])('前端驗證：(%s, %s, %s) 顯示「%s」', async (current, next, confirm, message) => {
      const wrapper = await mountSettings()
      await submitPassword(wrapper, current, next, confirm)
      expect(wrapper.find('[role="alert"]').text()).toBe(message)
      expect(updatePassword).not.toHaveBeenCalled()
    })

    it('目前密碼錯誤時顯示錯誤', async () => {
      const wrapper = await mountSettings()
      await submitPassword(wrapper, 'wrong-pass', 'newpass1')
      expect(toastMessages()).toContain('更新密碼失敗：Email 或密碼錯誤')
    })

    it('成功後清空欄位', async () => {
      const wrapper = await mountSettings()
      await submitPassword(wrapper, 'secret123', 'newpass1')
      expect(toastMessages()).toContain('密碼已更新')
      for (const id of ['#current-password', '#new-password', '#new-password-confirm']) {
        expect((wrapper.find(id).element as HTMLInputElement).value).toBe('')
      }
    })
  })
})
