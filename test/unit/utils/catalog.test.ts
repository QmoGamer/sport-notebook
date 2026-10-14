import { describe, expect, it } from 'vitest'
import { hasDuplicateName, nextOrder, sortCatalog } from '~/utils/catalog'

const other = { id: 'other', name: '其它', order: -100 }

describe('sortCatalog', () => {
  it('「其它」不論 order 多小都在最後，order 相同時依名稱', () => {
    const items = [other, { id: 'b', name: '羽球', order: 1 }, { id: 'a', name: '桌球', order: 0 }, { id: 'c', name: 'A 網球', order: 1 }]
    expect(sortCatalog(items).map(i => i.id)).toEqual(['a', 'c', 'b', 'other'])
  })

  it('不修改原陣列', () => {
    const items = [other, { id: 'a', name: '桌球', order: 0 }]
    sortCatalog(items)
    expect(items[0]!.id).toBe('other')
  })
})

describe('nextOrder', () => {
  it('只有「其它」時是 0，並忽略「其它」的 order', () => {
    expect(nextOrder([{ id: 'other', order: 99 }])).toBe(0)
    expect(nextOrder([{ id: 'other', order: 99 }, { id: 'a', order: 0 }, { id: 'b', order: 3 }])).toBe(4)
  })
})

describe('hasDuplicateName', () => {
  const items = [{ id: 'a', name: 'Tennis' }, { id: 'other', name: '其它' }]

  it('前後空白、英文大小寫都視為重複', () => {
    expect(hasDuplicateName(items, '  tennis ')).toBe(true)
    expect(hasDuplicateName(items, '羽球')).toBe(false)
  })

  it('排除自己，且「其它」也算重複', () => {
    expect(hasDuplicateName(items, 'Tennis', 'a')).toBe(false)
    expect(hasDuplicateName(items, '其它')).toBe(true)
  })
})
