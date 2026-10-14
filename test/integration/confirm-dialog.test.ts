import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useConfirm } from '#imports'
import ConfirmDialog from '~/components/ConfirmDialog.vue'

async function mountDialog() {
  return mountSuspended(ConfirmDialog, { attachTo: document.body, global: { stubs: { teleport: true } } })
}

const options = { title: '刪除紀錄', message: '確定要刪除 10/20 的紀錄嗎？' }

describe('ConfirmDialog', () => {
  it('沒有 request 時不顯示', async () => {
    const wrapper = await mountDialog()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('顯示標題、內文與兩顆按鈕，焦點在「取消」', async () => {
    const wrapper = await mountDialog()
    useConfirm().confirm(options)
    await flushPromises()
    const dialog = wrapper.find('[role="alertdialog"]')
    expect(dialog.find('#confirm-title').text()).toBe('刪除紀錄')
    expect(dialog.find('#confirm-message').text()).toBe('確定要刪除 10/20 的紀錄嗎？')
    expect(dialog.findAll('button').map(b => b.text())).toEqual(['取消', '刪除'])
    expect(document.activeElement?.textContent?.trim()).toBe('取消')
  })

  it('按「刪除」回傳 true，按「取消」回傳 false', async () => {
    const wrapper = await mountDialog()
    const yes = useConfirm().confirm(options)
    await flushPromises()
    await wrapper.findAll('button')[1]!.trigger('click')
    await expect(yes).resolves.toBe(true)
    await flushPromises()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)

    const no = useConfirm().confirm(options)
    await flushPromises()
    await wrapper.findAll('button')[0]!.trigger('click')
    await expect(no).resolves.toBe(false)
  })

  it('點遮罩或按 Escape 等於取消，點卡片內部不會關閉', async () => {
    const wrapper = await mountDialog()
    const first = useConfirm().confirm(options)
    await flushPromises()
    await wrapper.find('[role="alertdialog"]').trigger('click')
    expect(useConfirm().request.value).not.toBeNull()
    await wrapper.find('.fixed').trigger('click')
    await expect(first).resolves.toBe(false)

    const second = useConfirm().confirm(options)
    await flushPromises()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await expect(second).resolves.toBe(false)
  })
})
