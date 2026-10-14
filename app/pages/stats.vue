<script setup lang="ts">
import type { DateRange, PeriodMode } from '~/types/notebook'

definePageMeta({ middleware: 'auth' })
useHead({ title: '統計 · 運動筆記本' })

const MODES: { key: PeriodMode; label: string }[] = [
  { key: 'week', label: '週' },
  { key: 'month', label: '月' },
  { key: 'custom', label: '自訂' }
]

const { logs } = useLogs()
const { sports, categories, resolveSport, resolveCategory } = useCatalog()

const today = new Date()
const mode = ref<PeriodMode>('week')
const range = ref<DateRange>(lastWeekRange(today))
const sportId = ref('')
const categoryId = ref('')

const modalOpen = ref(false)
const activeDateKey = ref<string | null>(null)

function setMode(next: PeriodMode) {
  mode.value = next
  range.value = next === 'month' ? lastMonthRange(today) : lastWeekRange(today)
}

function shift(delta: number) {
  if (mode.value === 'custom') return
  range.value = shiftRange(mode.value, range.value, delta)
}

const rangeLabel = computed(() => (mode.value === 'custom' ? '' : formatRangeLabel(mode.value, range.value)))
const rangeInvalid = computed(() => !range.value.start || !range.value.end || range.value.start > range.value.end)

const entries = computed(() => (rangeInvalid.value
  ? []
  : filterLogs(logs.value, { range: range.value, sportId: sportId.value, categoryId: categoryId.value })))

const sportCounts = computed(() => countBy(entries.value, 'sportId', sports.value.map(s => s.id)))
const categoryCounts = computed(() => countBy(entries.value, 'categoryId', categories.value.map(c => c.id)))

const topSport = computed(() => (sportCounts.value[0] ? resolveSport(sportCounts.value[0].id).name : '—'))

function bars(counts: { id: string; count: number }[]) {
  const max = counts[0]?.count ?? 0
  return counts.map(item => ({ ...item, width: `${max ? (item.count / max) * 100 : 0}%` }))
}

const sportBars = computed(() => bars(sportCounts.value).map(bar => ({ ...bar, sport: resolveSport(bar.id) })))
const categoryBars = computed(() => bars(categoryCounts.value).map(bar => ({ ...bar, category: resolveCategory(bar.id) })))

function rowInfo(key: string) {
  const date = parseDateKey(key)
  return { day: pad2(date.getDate()), sub: `${date.getMonth() + 1}月・週${weekdayLabel(date)}` }
}

function openDay(key: string) {
  activeDateKey.value = key
  modalOpen.value = true
}

const selectClass = 'mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100'
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-10 sm:px-6">
    <p class="text-xs font-bold tracking-widest text-emerald-600">INSIGHTS · 統計</p>
    <h1 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">運動統計</h1>
    <p class="mt-2 text-slate-500">看看這段期間你都練了些什麼。</p>

    <!-- 期間與篩選 -->
    <div class="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            v-for="item in MODES"
            :key="item.key"
            type="button"
            class="rounded-lg px-4 py-1.5 text-sm font-semibold"
            :class="mode === item.key ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-700'"
            :aria-pressed="mode === item.key"
            @click="setMode(item.key)"
          >
            {{ item.label }}
          </button>
        </div>

        <div v-if="mode !== 'custom'" class="flex items-center gap-1">
          <button type="button" aria-label="上一期" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="shift(-1)">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <span class="min-w-[11rem] text-center text-sm font-bold text-slate-900">{{ rangeLabel }}</span>
          <button type="button" aria-label="下一期" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="shift(1)">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>

      <div v-if="mode === 'custom'" class="grid gap-3 sm:grid-cols-2">
        <div>
          <label for="range-start" class="text-sm font-semibold text-slate-700">開始日期</label>
          <input id="range-start" v-model="range.start" type="date" :class="selectClass">
        </div>
        <div>
          <label for="range-end" class="text-sm font-semibold text-slate-700">結束日期</label>
          <input id="range-end" v-model="range.end" type="date" :class="selectClass">
        </div>
        <p v-if="rangeInvalid" role="alert" class="text-sm text-red-500 sm:col-span-2">開始日期不能晚於結束日期</p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label for="stats-sport" class="text-sm font-semibold text-slate-700">運動</label>
          <select id="stats-sport" v-model="sportId" :class="selectClass">
            <option value="">全部運動</option>
            <option v-for="sport in sports" :key="sport.id" :value="sport.id">{{ sport.name }}</option>
          </select>
        </div>
        <div>
          <label for="stats-category" class="text-sm font-semibold text-slate-700">類型</label>
          <select id="stats-category" v-model="categoryId" :class="selectClass">
            <option value="">全部類型</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 摘要 -->
    <div class="mt-6 grid grid-cols-3 gap-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-4" data-stat="days">
        <p class="text-xs text-slate-500">運動天數</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ entries.length }}<span class="ml-1 text-sm font-medium text-slate-400">天</span></p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4" data-stat="period">
        <p class="text-xs text-slate-500">期間天數</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">
          <template v-if="rangeInvalid">—</template>
          <template v-else>{{ countDays(range) }}<span class="ml-1 text-sm font-medium text-slate-400">天</span></template>
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4" data-stat="top">
        <p class="text-xs text-slate-500">最常做的運動</p>
        <p class="mt-1 truncate text-2xl font-bold text-slate-900">{{ topSport }}</p>
      </div>
    </div>

    <!-- 長條圖 -->
    <div class="mt-6 grid gap-3 sm:grid-cols-2">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" data-chart="sport">
        <h2 class="font-bold text-slate-900">依運動</h2>
        <p v-if="!sportBars.length" class="mt-3 text-sm text-slate-400">沒有資料</p>
        <ul v-else class="mt-3 space-y-3">
          <li v-for="bar in sportBars" :key="bar.id">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-slate-700">{{ bar.sport.name }}</span>
              <span class="text-slate-500">{{ `${bar.count} 次` }}</span>
            </div>
            <div class="mt-1 h-2 rounded-full bg-slate-100">
              <div class="h-2 rounded-full" :style="{ width: bar.width, backgroundColor: bar.sport.color }" />
            </div>
          </li>
        </ul>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" data-chart="category">
        <h2 class="font-bold text-slate-900">依類型</h2>
        <p v-if="!categoryBars.length" class="mt-3 text-sm text-slate-400">沒有資料</p>
        <ul v-else class="mt-3 space-y-3">
          <li v-for="bar in categoryBars" :key="bar.id">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-slate-700">{{ bar.category.name }}</span>
              <span class="text-slate-500">{{ `${bar.count} 次` }}</span>
            </div>
            <div class="mt-1 h-2 rounded-full bg-slate-100">
              <div class="h-2 rounded-full bg-emerald-500" :style="{ width: bar.width }" />
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- 紀錄列表 -->
    <div class="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-baseline justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
        <h2 class="font-bold text-slate-900">紀錄列表</h2>
        <span class="text-sm text-slate-400">{{ `共 ${entries.length} 筆` }}</span>
      </div>
      <p v-if="!entries.length" class="px-6 py-12 text-center text-sm text-slate-400">這段期間沒有符合條件的紀錄</p>
      <ul v-else class="divide-y divide-slate-100">
        <li v-for="entry in entries" :key="entry.date">
          <button
            type="button"
            class="flex w-full items-start gap-4 px-4 py-4 text-left hover:bg-slate-50 sm:px-6"
            data-log-row
            @click="openDay(entry.date)"
          >
            <div class="w-14 shrink-0 text-center">
              <p class="text-2xl font-bold text-slate-900">{{ rowInfo(entry.date).day }}</p>
              <p class="text-xs text-slate-400">{{ rowInfo(entry.date).sub }}</p>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span
                  class="truncate rounded-md px-1.5 py-0.5 text-xs font-semibold"
                  :style="{ backgroundColor: resolveSport(entry.sportId).color, color: readableTextColor(resolveSport(entry.sportId).color) }"
                >
                  {{ resolveSport(entry.sportId).name }}
                </span>
                <span class="text-sm text-slate-500">{{ resolveCategory(entry.categoryId).name }}</span>
              </div>
              <p v-if="entry.note" class="mt-1 line-clamp-2 text-sm text-slate-500">{{ entry.note }}</p>
            </div>
          </button>
        </li>
      </ul>
    </div>

    <LogModal v-model="modalOpen" :date-key="activeDateKey" />
  </div>
</template>
