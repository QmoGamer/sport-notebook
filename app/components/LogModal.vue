<script setup lang="ts">
const props = defineProps<{ modelValue: boolean; dateKey: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const WEEKDAY_EN = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

const { sports, categories, ready } = useCatalog()
const { logFor, saveLog, removeLog } = useLogs()
const { confirm } = useConfirm()
const toast = useToast()

const form = reactive({ sportId: '', categoryId: '', note: '' })
const pending = ref<'save' | 'delete' | null>(null)

const visible = computed(() => props.modelValue && !!props.dateKey)
const existing = computed(() => (props.dateKey ? logFor(props.dateKey) : null))
const isEdit = computed(() => !!existing.value)
const weekdayLabel = computed(() => (props.dateKey ? WEEKDAY_EN[parseDateKey(props.dateKey).getDay()] : ''))
const disabled = computed(() => !ready.value || pending.value !== null)

function pickId(list: { id: string }[], id: string): string {
  return list.some(item => item.id === id) ? id : OTHER_ID
}

/** 每次打開或換日期都重設表單，避免殘留上一天的內容 */
function initForm() {
  if (!ready.value) return
  const log = existing.value
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
}

watch(() => [props.modelValue, props.dateKey] as const, ([open]) => {
  if (open) initForm()
}, { immediate: true })

// 清單還沒載入時，等載入完成再初始化
watch(ready, (value) => {
  if (value && visible.value) initForm()
})

function close() {
  emit('update:modelValue', false)
}

function onBackdrop() {
  if (pending.value === null) close()
}

async function save() {
  const key = props.dateKey
  if (!key || pending.value !== null) return
  pending.value = 'save'
  try {
    await saveLog(key, { ...form })
    toast.success(`已儲存 ${formatDateLabel(key)} 的紀錄`)
    close()
  }
  catch (error) {
    toast.error(`儲存失敗：${errorMessage(error)}`)
  }
  finally {
    pending.value = null
  }
}

async function remove() {
  const key = props.dateKey
  if (!key || pending.value !== null) return
  const ok = await confirm({ title: '刪除紀錄', message: `確定要刪除 ${formatDateLabel(key)} 的紀錄嗎？` })
  if (!ok) return
  pending.value = 'delete'
  try {
    await removeLog(key)
    toast.success(`已刪除 ${formatDateLabel(key)} 的紀錄`)
    close()
  }
  catch (error) {
    toast.error(`刪除失敗：${errorMessage(error)}`)
  }
  finally {
    pending.value = null
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
              <p class="text-xs font-bold tracking-widest text-emerald-600">
                {{ `${weekdayLabel} · ${isEdit ? 'EDIT' : 'NEW ENTRY'}` }}
              </p>
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

          <form class="mt-5 space-y-4" @submit.prevent="save">
            <div>
              <label for="log-sport" class="text-sm font-semibold text-slate-700">運動</label>
              <select
                id="log-sport"
                v-model="form.sportId"
                :disabled="disabled"
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
                :disabled="disabled"
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
                :disabled="disabled"
                class="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div class="pt-2">
              <button
                type="submit"
                class="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
                :disabled="disabled"
              >
                <template v-if="pending === 'save'">
                  <AppSpinner />儲存中…
                </template>
                <template v-else>{{ isEdit ? '更新紀錄' : '儲存紀錄' }}</template>
              </button>
              <div v-if="isEdit" class="text-center">
                <button
                  type="button"
                  class="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-500 disabled:cursor-wait disabled:opacity-70"
                  :disabled="pending !== null"
                  @click="remove"
                >
                  <template v-if="pending === 'delete'">
                    <AppSpinner />刪除中…
                  </template>
                  <template v-else>刪除這筆紀錄</template>
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
