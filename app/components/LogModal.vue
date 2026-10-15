<script setup lang="ts">
const props = defineProps<{ modelValue: boolean; dateKey: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const WEEKDAY_EN = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

const { sports, categories, ready, resolveSport, resolveCategory } = useCatalog()
const { logsOn, addLog, updateLog, removeLog } = useLogs()
const { confirm } = useConfirm()
const toast = useToast()

/** list：當天的紀錄列表；form：新增或編輯單筆 */
const view = ref<'list' | 'form'>('list')
/** 編輯中的紀錄 ID；null 表示新增 */
const editingId = ref<string | null>(null)
const form = reactive({ sportId: '', categoryId: '', note: '' })
const saving = ref(false)
const deletingId = ref<string | null>(null)

const visible = computed(() => props.modelValue && !!props.dateKey)
const dayLogs = computed(() => (props.dateKey ? logsOn(props.dateKey) : []))
const weekdayLabel = computed(() => (props.dateKey ? WEEKDAY_EN[parseDateKey(props.dateKey).getDay()] : ''))
const busy = computed(() => saving.value || deletingId.value !== null)
const formDisabled = computed(() => !ready.value || saving.value)
const eyebrow = computed(() => {
  if (view.value === 'list') return `${weekdayLabel.value} · LOGS`
  return `${weekdayLabel.value} · ${editingId.value ? 'EDIT' : 'NEW ENTRY'}`
})

function pickId(list: { id: string }[], id: string): string {
  return list.some(item => item.id === id) ? id : OTHER_ID
}

function openForm(id: string | null) {
  editingId.value = id
  const log = id ? dayLogs.value.find(entry => entry.id === id) : null
  if (log) {
    form.sportId = pickId(sports.value, log.sportId)
    form.categoryId = pickId(categories.value, log.categoryId)
    form.note = log.note
  }
  else {
    form.sportId = sports.value[0]?.id ?? OTHER_ID
    form.categoryId = categories.value[0]?.id ?? OTHER_ID
    form.note = ''
  }
  view.value = 'form'
}

/** 打開或換日期時重設：當天沒有紀錄就直接進入新增 */
function reset() {
  editingId.value = null
  if (dayLogs.value.length) view.value = 'list'
  else openForm(null)
}

watch(() => [props.modelValue, props.dateKey] as const, ([open]) => {
  if (open) reset()
}, { immediate: true })

// 清單還沒載入時，等載入完成再帶入預設值
watch(ready, (value) => {
  if (value && visible.value && view.value === 'form') openForm(editingId.value)
})

// 編輯中的紀錄被其他分頁刪掉時回到列表
watch(dayLogs, (logs) => {
  if (view.value === 'form' && editingId.value && !logs.some(log => log.id === editingId.value)) {
    editingId.value = null
    view.value = 'list'
  }
})

function close() {
  emit('update:modelValue', false)
}

function onBackdrop() {
  if (!busy.value) close()
}

async function save() {
  const key = props.dateKey
  if (!key || busy.value) return
  saving.value = true
  try {
    const input = { ...form }
    if (editingId.value) await updateLog(editingId.value, input)
    else await addLog(key, input)
    toast.success(`已儲存 ${formatDateLabel(key)} 的紀錄`)
    editingId.value = null
    view.value = 'list'
  }
  catch (error) {
    toast.error(`儲存失敗：${errorMessage(error)}`)
  }
  finally {
    saving.value = false
  }
}

async function remove(id: string) {
  const key = props.dateKey
  if (!key || busy.value) return
  const log = dayLogs.value.find(entry => entry.id === id)
  if (!log) return
  const sportName = resolveSport(log.sportId).name
  const ok = await confirm({ title: '刪除紀錄', message: `確定要刪除 ${formatDateLabel(key)} 的「${sportName}」紀錄嗎？` })
  if (!ok) return
  deletingId.value = id
  try {
    await removeLog(id)
    toast.success(`已刪除 ${formatDateLabel(key)} 的紀錄`)
  }
  catch (error) {
    toast.error(`刪除失敗：${errorMessage(error)}`)
  }
  finally {
    deletingId.value = null
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        @click.self="onBackdrop"
      >
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold tracking-widest text-emerald-600">{{ eyebrow }}</p>
              <h3 class="mt-1 text-xl font-bold text-slate-900">{{ `${dateKey} 運動紀錄` }}</h3>
            </div>
            <button
              type="button"
              aria-label="關閉"
              class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              @click="close"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <!-- 列表 -->
          <div v-if="view === 'list'" class="mt-5">
            <p v-if="!dayLogs.length" class="py-6 text-center text-sm text-slate-400">這天還沒有紀錄</p>
            <ul v-else class="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              <li v-for="log in dayLogs" :key="log.id" class="flex items-center gap-2" data-log-item>
                <button
                  type="button"
                  class="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-lg py-3 pr-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed"
                  :disabled="busy"
                  @click="openForm(log.id)"
                >
                  <span class="flex items-center gap-2">
                    <span
                      class="rounded-md px-1.5 py-0.5 text-xs font-semibold"
                      :style="{ backgroundColor: resolveSport(log.sportId).color, color: readableTextColor(resolveSport(log.sportId).color) }"
                    >
                      {{ resolveSport(log.sportId).name }}
                    </span>
                    <span class="text-sm text-slate-500">{{ resolveCategory(log.categoryId).name }}</span>
                  </span>
                  <span v-if="log.note" class="w-full truncate text-sm text-slate-400">{{ log.note }}</span>
                </button>
                <button
                  type="button"
                  aria-label="刪除這筆紀錄"
                  class="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="busy"
                  @click="remove(log.id)"
                >
                  <AppSpinner v-if="deletingId === log.id" />
                  <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                  </svg>
                </button>
              </li>
            </ul>
            <button
              type="button"
              class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="busy"
              @click="openForm(null)"
            >
              ＋ 新增一筆紀錄
            </button>
          </div>

          <!-- 表單 -->
          <form v-else class="mt-5 space-y-4" @submit.prevent="save">
            <div>
              <label for="log-sport" class="text-sm font-semibold text-slate-700">運動</label>
              <select
                id="log-sport"
                v-model="form.sportId"
                :disabled="formDisabled"
                class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option v-for="sport in sports" :key="sport.id" :value="sport.id">{{ sport.name }}</option>
              </select>
            </div>
            <div>
              <label for="log-category" class="text-sm font-semibold text-slate-700">類型</label>
              <select
                id="log-category"
                v-model="form.categoryId"
                :disabled="formDisabled"
                class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
              </select>
            </div>
            <div>
              <label for="log-note" class="text-sm font-semibold text-slate-700">筆記</label>
              <textarea
                id="log-note"
                v-model="form.note"
                rows="4"
                maxlength="1000"
                placeholder="今天練了什麼？有什麼心得？（選填）"
                :disabled="formDisabled"
                class="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div class="pt-2">
              <button
                type="submit"
                class="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
                :disabled="formDisabled"
              >
                <template v-if="saving">
                  <AppSpinner />儲存中…
                </template>
                <template v-else>{{ editingId ? '更新紀錄' : '儲存紀錄' }}</template>
              </button>
              <div v-if="dayLogs.length" class="text-center">
                <button
                  type="button"
                  class="mt-3 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-60"
                  :disabled="saving"
                  @click="view = 'list'"
                >
                  ← 返回列表
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
