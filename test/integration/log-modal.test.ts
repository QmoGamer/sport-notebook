import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { deleteDoc, setDoc, updateDoc } from 'firebase/firestore'
import LogModal from '~/components/LogModal.vue'
import { readDoc } from '../mocks/firebase-backend'
import { answerConfirm, catalogIds, freezeToday, registerAs, seedLog, toastMessages } from './helpers'

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

async function mountModal(dateKey = '2026-10-20') {
  return mountSuspended(LogModal, {
    props: { 'modelValue': true, dateKey, 'onUpdate:modelValue': () => {} },
    global: { stubs: { teleport: true } },
  })
}

const selectValue = (wrapper: Wrapper, id: string) => (wrapper.find(id).element as HTMLSelectElement).value
const submitButton = (wrapper: Wrapper) => wrapper.find('button[type="submit"]')
const deleteButton = (wrapper: Wrapper) => wrapper.findAll('button').find(b => b.text() === '刪除這筆紀錄')

describe('LogModal', () => {
  let uid: string

  beforeEach(async () => {
    freezeToday()
    uid = (await registerAs()).uid
  })

  it('新增：顯示日期、預設選項與「儲存紀錄」，沒有刪除按鈕', async () => {
    const wrapper = await mountModal()
    expect(wrapper.text()).toContain('TUESDAY · NEW ENTRY')
    expect(wrapper.text()).toContain('2026-10-20 運動紀錄')
    const { sportId, categoryId } = catalogIds()
    expect(selectValue(wrapper, '#log-sport')).toBe(sportId)
    expect(selectValue(wrapper, '#log-category')).toBe(categoryId)
    expect(submitButton(wrapper).text()).toBe('儲存紀錄')
    expect(deleteButton(wrapper)).toBeUndefined()
  })

  it('選擇「其它」並寫筆記後儲存', async () => {
    const wrapper = await mountModal()
    await wrapper.find('#log-sport').setValue('other')
    await wrapper.find('#log-note').setValue('  跑了 5 公里  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(readDoc(`users/${uid}/logs/2026-10-20`)).toMatchObject({
      date: '2026-10-20',
      sportId: 'other',
      categoryId: catalogIds().categoryId,
      note: '跑了 5 公里',
    })
    expect(toastMessages()).toContain('已儲存 10/20 的紀錄')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('編輯：帶入原本的值，按鈕是「更新紀錄」，儲存時用 updateDoc', async () => {
    const { sportId } = catalogIds()
    seedLog(uid, '2026-10-20', { sportId, categoryId: 'other', note: '舊筆記' })
    await flushPromises()
    const wrapper = await mountModal()

    expect(wrapper.text()).toContain('TUESDAY · EDIT')
    expect(selectValue(wrapper, '#log-category')).toBe('other')
    expect((wrapper.find('#log-note').element as HTMLTextAreaElement).value).toBe('舊筆記')
    expect(submitButton(wrapper).text()).toBe('更新紀錄')
    expect(deleteButton(wrapper)).toBeDefined()

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(updateDoc).toHaveBeenCalled()
  })

  it('紀錄使用的運動已不存在時，下拉選單顯示「其它」', async () => {
    seedLog(uid, '2026-10-20', { sportId: 'deleted-sport', categoryId: 'deleted-category' })
    await flushPromises()
    const wrapper = await mountModal()
    expect(selectValue(wrapper, '#log-sport')).toBe('other')
    expect(selectValue(wrapper, '#log-category')).toBe('other')
  })

  it('換一天打開時表單重設，不會殘留上一天的筆記', async () => {
    const { sportId, categoryId } = catalogIds()
    seedLog(uid, '2026-10-20', { sportId: 'other', categoryId, note: '舊筆記' })
    await flushPromises()
    const wrapper = await mountModal()
    expect((wrapper.find('#log-note').element as HTMLTextAreaElement).value).toBe('舊筆記')

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true, dateKey: '2026-10-21' })
    expect((wrapper.find('#log-note').element as HTMLTextAreaElement).value).toBe('')
    expect(selectValue(wrapper, '#log-sport')).toBe(sportId)
  })

  it('刪除：確認後刪除文件；取消則不刪除', async () => {
    const { sportId, categoryId } = catalogIds()
    seedLog(uid, '2026-10-20', { sportId, categoryId })
    await flushPromises()
    const wrapper = await mountModal()

    await deleteButton(wrapper)!.trigger('click')
    await answerConfirm(false)
    expect(deleteDoc).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await deleteButton(wrapper)!.trigger('click')
    const request = await answerConfirm(true)
    expect(request).toMatchObject({ title: '刪除紀錄', message: '確定要刪除 10/20 的紀錄嗎？', confirmLabel: '刪除' })
    expect(readDoc(`users/${uid}/logs/2026-10-20`)).toBeUndefined()
    expect(toastMessages()).toContain('已刪除 10/20 的紀錄')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('儲存失敗時顯示錯誤，不關閉視窗', async () => {
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('quota exceeded'))
    const wrapper = await mountModal()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(toastMessages()).toContain('儲存失敗：quota exceeded')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(submitButton(wrapper).text()).toBe('儲存紀錄')
  })

  it('處理中按鈕 disabled 並顯示「儲存中…」', async () => {
    let finish!: () => void
    vi.mocked(setDoc).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
    const wrapper = await mountModal()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
    expect(submitButton(wrapper).text()).toBe('儲存中…')

    finish()
    await flushPromises()
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('按關閉按鈕會 emit false', async () => {
    const wrapper = await mountModal()
    await wrapper.find('[aria-label="關閉"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })
})
