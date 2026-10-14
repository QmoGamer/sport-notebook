export const OTHER_ID = 'other'
export const OTHER_NAME = '其它'

/** 「其它」永遠最後；其他依 order 升冪，相同時依名稱 */
export function sortCatalog<T extends { id: string; name: string; order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.id === OTHER_ID) return 1
    if (b.id === OTHER_ID) return -1
    return a.order - b.order || a.name.localeCompare(b.name)
  })
}

export function nextOrder(items: { id: string; order: number }[]): number {
  const orders = items.filter(item => item.id !== OTHER_ID).map(item => item.order)
  return orders.length ? Math.max(...orders) + 1 : 0
}

export function hasDuplicateName(items: { id: string; name: string }[], name: string, excludeId?: string): boolean {
  const target = name.trim().toLowerCase()
  return items.some(item => item.id !== excludeId && item.name.trim().toLowerCase() === target)
}
