import { afterEach, beforeEach, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { useNuxtApp, useState } from '#imports'
import { resetBackend } from '../mocks/firebase-backend'

enableAutoUnmount(afterEach)

beforeEach(() => {
  // 先停掉上一個測試的同步，避免監聽器殘留
  useNuxtApp().$dataSync.stop()
  resetBackend()
  // 設回初始值，不要用 clearNuxtState()：設成 undefined 會讓仍在監聽的 computed 出錯
  useState('auth-user').value = null
  useState('sports').value = []
  useState('categories').value = []
  useState('catalog-ready').value = false
  useState('logs').value = {}
  useState('logs-ready').value = false
  useState('toasts').value = []
  useState('confirm').value = null
  vi.clearAllMocks() // 只清呼叫紀錄；不要用 resetAllMocks，否則假實作會被清掉
})

afterEach(() => {
  vi.useRealTimers()
})
