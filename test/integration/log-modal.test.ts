import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { deleteDoc, setDoc, updateDoc } from 'firebase/firestore'
import LogModal from '~/components/LogModal.vue'
import { listDocs, readDoc } from '../mocks/firebase-backend'
import { answerConfirm, catalogIds, freezeToday, registerAs, seedLog, toastMessages } from './helpers'

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

async function mountModal(dateKey = '2026-10-20') {
  return mountSuspended(LogModal, {
    props: { 'modelValue': true, dateKey, 'onUpdate:modelValue': () => {} },
    global: { stubs: { teleport: true } },
  })
}

const selectValue = (wrapper: Wrapper, id: string) => (wrapper.find(id).element as HTMLSelectElement).value
const noteValue = (wrapper: Wrapper) => (wrapper.find('#log-note').element as HTMLTextAreaElement).value
const submitButton = (wrapper: Wrapper) => wrapper.find('button[type="submit"]')
const items = (wrapper: Wrapper) => wrapper.findAll('[data-log-item]')
const buttonByText = (wrapper: Wrapper, text: string) => wrapper.findAll('button').find(b => b.text() === text)

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('LogModal', () => {
  let uid: string

  beforeEach(async () => {
    freezeToday()
    uid = (await registerAs()).uid
  })

  it('當天沒有紀錄時直接進入新增畫面，帶入預設選項', async () => {
    const wrapper = await mountModal()
    expect(wrapper.text()).toContain('TUESDAY · NEW ENTRY')
    expect(wrapper.text()).toContain('2026-10-20 運動紀錄')
    const { sportId, categoryId } = catalogIds()
    expect(selectValue(wrapper, '#log-sport')).toBe(sportId)
    expect(selectValue(wrapper, '#log-category')).toBe(categoryId)
    expect(submitButton(wrapper).text()).toBe('儲存紀錄')
    expect(buttonByText(wrapper, '← 返回列表')).toBeUndefined()
  })

  it('儲存後回到當天列表，不關閉視窗，可以接著新增第二筆', async () => {
    const wrapper = await mountModal()
    await wrapper.find('#log-sport').setValue('other')
    await wrapper.find('#log-note').setValue('  早上跑步  ')
    await submit(wrapper)

    expect(toastMessages()).toContain('已儲存 10/20 的紀錄')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.text()).toContain('TUESDAY · LOGS')
    expect(items(wrapper)).toHaveLength(1)
    expect(items(wrapper)[0]!.text()).toContain('其它')
    expect(items(wrapper)[0]!.text()).toContain('早上跑步')

    await buttonByText(wrapper, '＋ 新增一筆紀錄')!.trigger('click')
    expect(noteValue(wrapper)).toBe('')
    expect(selectValue(wrapper, '#log-sport')).toBe(catalogIds().sportId)
    await wrapper.find('#log-note').setValue('晚上打球')
    await submit(wrapper)

    expect(items(wrapper)).toHaveLength(2)
    const docs = listDocs(`users/${uid}/logs`)
    expect(docs).toHaveLength(2)
    expect(docs.every(d => d.data.date === '2026-10-20')).toBe(true)
    expect(docs.map(d => d.data.note)).toEqual(['早上跑步', '晚上打球'])
  })

  it('已有紀錄時打開是列表，依建立先後排序', async () => {
    const { sportId, categoryId } = catalogIds()
    seedLog(uid, '2026-10-20', { sportId, categoryId, note: '第一筆' })
    seedLog(uid, '2026-10-20', { sportId: 'other', categoryId: 'other', note: '第二筆' })
    seedLog(uid, '2026-10-21', { sportId, categoryId, note: '隔天' })
    await flushPromises()
    const wrapper = await mountModal()

    expect(wrapper.text()).toContain('TUESDAY · LOGS')
    expect(items(wrapper).map(i => i.text())).toEqual([
      expect.stringContaining('第一筆'),
      expect.stringContaining('第二筆'),
    ])
    expect(wrapper.text()).not.toContain('隔天')
  })

  it('點列表的某一筆進入編輯，儲存時只更新那一筆', async () => {
    const { sportId, categoryId } = catalogIds()
    seedLog(uid, '2026-10-20', { sportId, categoryId, note: '第一筆' })
    const second = seedLog(uid, '2026-10-20', { sportId, categoryId: 'other', note: '第二筆' })
    await flushPromises()
    const wrapper = await mountModal()

    await items(wrapper)[1]!.find('button').trigger('click')
    expect(wrapper.text()).toContain('TUESDAY · EDIT')
    expect(selectValue(wrapper, '#log-category')).toBe('other')
    expect(noteValue(wrapper)).toBe('第二筆')
    expect(submitButton(wrapper).text()).toBe('更新紀錄')

    await wrapper.find('#log-note').setValue('改過了')
    await submit(wrapper)
    expect(updateDoc).toHaveBeenCalledTimes(1)
    expect(readDoc(`users/${uid}/logs/${second}`)?.note).toBe('改過了')
    expect(items(wrapper)[0]!.text()).toContain('第一筆')
    expect(wrapper.text()).toContain('TUESDAY · LOGS')
  })

  it('「返回列表」不儲存就回到列表', async () => {
    seedLog(uid, '2026-10-20', { ...catalogIds(), note: '原本' })
    await flushPromises()
    const wrapper = await mountModal()
    await items(wrapper)[0]!.find('button').trigger('click')
    await wrapper.find('#log-note').setValue('沒存')
    await buttonByText(wrapper, '← 返回列表')!.trigger('click')
    expect(updateDoc).not.toHaveBeenCalled()
    expect(items(wrapper)[0]!.text()).toContain('原本')
  })

  it('紀錄使用的運動已不存在時，下拉選單顯示「其它」', async () => {
    seedLog(uid, '2026-10-20', { sportId: 'deleted-sport', categoryId: 'deleted-category' })
    await flushPromises()
    const wrapper = await mountModal()
    expect(items(wrapper)[0]!.text()).toContain('其它')
    await items(wrapper)[0]!.find('button').trigger('click')
    expect(selectValue(wrapper, '#log-sport')).toBe('other')
    expect(selectValue(wrapper, '#log-category')).toBe('other')
  })

  it('關閉後換一天打開會重設畫面', async () => {
    seedLog(uid, '2026-10-20', { ...catalogIds(), note: '舊筆記' })
    await flushPromises()
    const wrapper = await mountModal()
    await items(wrapper)[0]!.find('button').trigger('click')
    expect(noteValue(wrapper)).toBe('舊筆記')

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true, dateKey: '2026-10-21' })
    expect(wrapper.text()).toContain('WEDNESDAY · NEW ENTRY')
    expect(noteValue(wrapper)).toBe('')
  })

  it('在列表刪除：確認後只刪除那一筆；取消則不刪除', async () => {
    const { sportId, categoryId } = catalogIds()
    const keep = seedLog(uid, '2026-10-20', { sportId: 'other', categoryId })
    const drop = seedLog(uid, '2026-10-20', { sportId, categoryId })
    await flushPromises()
    const wrapper = await mountModal()
    const deleteButtons = () => wrapper.findAll('[aria-label="刪除這筆紀錄"]')
    expect(deleteButtons()).toHaveLength(2)

    await deleteButtons()[1]!.trigger('click')
    await answerConfirm(false)
    expect(deleteDoc).not.toHaveBeenCalled()

    await deleteButtons()[1]!.trigger('click')
    const request = await answerConfirm(true)
    expect(request).toMatchObject({ title: '刪除紀錄', message: '確定要刪除 10/20 的「桌球」紀錄嗎？', confirmLabel: '刪除' })
    expect(readDoc(`users/${uid}/logs/${drop}`)).toBeUndefined()
    expect(readDoc(`users/${uid}/logs/${keep}`)).toBeDefined()
    expect(toastMessages()).toContain('已刪除 10/20 的紀錄')
    expect(items(wrapper)).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('刪除最後一筆後顯示「這天還沒有紀錄」', async () => {
    seedLog(uid, '2026-10-20', catalogIds())
    await flushPromises()
    const wrapper = await mountModal()
    await wrapper.find('[aria-label="刪除這筆紀錄"]').trigger('click')
    await answerConfirm(true)
    expect(wrapper.text()).toContain('這天還沒有紀錄')
    expect(buttonByText(wrapper, '＋ 新增一筆紀錄')).toBeDefined()
  })

  it('刪除失敗時顯示錯誤，紀錄仍在', async () => {
    const id = seedLog(uid, '2026-10-20', catalogIds())
    await flushPromises()
    vi.mocked(deleteDoc).mockRejectedValueOnce(new Error('offline'))
    const wrapper = await mountModal()
    await wrapper.find('[aria-label="刪除這筆紀錄"]').trigger('click')
    await answerConfirm(true)
    expect(toastMessages()).toContain('刪除失敗：offline')
    expect(readDoc(`users/${uid}/logs/${id}`)).toBeDefined()
  })

  it('儲存失敗時顯示錯誤，停留在表單', async () => {
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('quota exceeded'))
    const wrapper = await mountModal()
    await submit(wrapper)
    expect(toastMessages()).toContain('儲存失敗：quota exceeded')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(submitButton(wrapper).text()).toBe('儲存紀錄')
  })

  it('處理中按鈕 disabled 並顯示「儲存中…」', async () => {
    let finish!: () => void
    const original = vi.mocked(setDoc).getMockImplementation()!
    vi.mocked(setDoc).mockImplementationOnce((...args) => new Promise<void>((resolve) => {
      finish = () => { void original(...args).then(resolve) }
    }))
    const wrapper = await mountModal()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
    expect(submitButton(wrapper).text()).toBe('儲存中…')

    finish()
    await flushPromises()
    expect(items(wrapper)).toHaveLength(1)
  })

  it('按關閉按鈕會 emit false', async () => {
    const wrapper = await mountModal()
    await wrapper.find('[aria-label="關閉"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })
})
