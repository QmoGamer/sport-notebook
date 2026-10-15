<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: '月曆 · 運動筆記本' })

const { logsOn } = useLogs()
const { resolveSport, resolveCategory } = useCatalog()

/** 每格最多顯示幾個運動標籤 */
const MAX_VISIBLE = 2

const today = new Date()
const todayKey = formatDateKey(today)
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

const modalOpen = ref(false)
const activeDateKey = ref<string | null>(null)

function shiftMonth(delta: number) {
  const next = new Date(viewYear.value, viewMonth.value + delta, 1)
  viewYear.value = next.getFullYear()
  viewMonth.value = next.getMonth()
}

function goToday() {
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth()
}

const cells = computed(() => buildMonthGrid(viewYear.value, viewMonth.value).map((cell) => {
  const logs = logsOn(cell.key)
  const only = logs.length === 1 ? logs[0]! : null
  return {
    ...cell,
    tags: logs.slice(0, MAX_VISIBLE).map(log => ({ id: log.id, sport: resolveSport(log.sportId) })),
    hiddenCount: Math.max(logs.length - MAX_VISIBLE, 0),
    // 只有一筆時才顯示類型與筆記，避免格子太擠
    only: only ? { category: resolveCategory(only.categoryId), note: only.note } : null,
    disabled: !cell.inCurrentMonth
  }
}))

function openDay(key: string) {
  activeDateKey.value = key
  modalOpen.value = true
}

function dayNumberClass(cell: { inCurrentMonth: boolean; key: string }) {
  if (!cell.inCurrentMonth) return 'text-slate-300'
  if (cell.key === todayKey) return 'bg-emerald-600 text-white'
  return 'text-slate-700'
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <p class="text-xs font-bold tracking-widest text-emerald-600">MY NOTEBOOK · 運動筆記本</p>
    <h1 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">今天動了嗎？</h1>
    <p class="mt-2 text-slate-500">點選任一天，記錄你的運動與心得。</p>

    <div class="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
        <div class="flex items-center gap-1">
          <button type="button" aria-label="上個月" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="shiftMonth(-1)">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <span class="w-28 text-center text-base font-bold text-slate-900 sm:w-32">{{ `${viewYear} 年 ${viewMonth + 1} 月` }}</span>
          <button type="button" aria-label="下個月" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="shiftMonth(1)">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
        <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50" @click="goToday">
          今天
        </button>
      </div>

      <div class="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-semibold">
        <div
          v-for="(weekday, index) in WEEKDAYS"
          :key="weekday"
          class="py-2"
          :class="index >= 5 ? 'text-slate-400' : 'text-slate-500'"
        >
          {{ weekday }}
        </div>
      </div>

      <div class="grid grid-cols-7">
        <div
          v-for="cell in cells"
          :key="cell.key"
          :aria-disabled="cell.disabled"
          class="min-h-[92px] overflow-hidden border-b border-r border-slate-100 p-1.5 sm:min-h-[130px] sm:p-2"
          :class="cell.disabled ? 'cursor-not-allowed bg-slate-50/60' : 'cursor-pointer hover:bg-slate-50'"
          @click="!cell.disabled && openDay(cell.key)"
        >
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold sm:h-7 sm:w-7 sm:text-sm"
            :class="dayNumberClass(cell)"
          >
            {{ cell.day }}
          </span>
          <template v-if="cell.inCurrentMonth && cell.tags.length">
            <div
              v-for="tag in cell.tags"
              :key="tag.id"
              class="mt-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold sm:text-xs"
              :style="{ backgroundColor: tag.sport.color, color: readableTextColor(tag.sport.color) }"
            >
              {{ tag.sport.name }}
            </div>
            <div v-if="cell.hiddenCount" class="mt-0.5 text-[11px] font-semibold text-emerald-600 sm:text-xs">{{ `+${cell.hiddenCount}` }}</div>
            <template v-if="cell.only">
              <div class="mt-0.5 truncate text-[11px] text-slate-500">{{ cell.only.category.name }}</div>
              <div v-if="cell.only.note" class="mt-0.5 hidden truncate text-[11px] text-slate-400 sm:block">{{ cell.only.note }}</div>
            </template>
          </template>
        </div>
      </div>
    </div>

    <LogModal v-model="modalOpen" :date-key="activeDateKey" />
  </div>
</template>
