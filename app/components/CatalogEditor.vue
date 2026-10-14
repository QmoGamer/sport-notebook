<script setup lang="ts">
const props = defineProps<{ kind: 'sport' | 'category' }>()

const catalog = useCatalog()
const { countUsing, ready: logsReady } = useLogs()
const { confirm } = useConfirm()
const toast = useToast()

const isSport = computed(() => props.kind === 'sport')
const items = computed(() => (isSport.value ? catalog.sports.value : catalog.categories.value))
const copy = computed(() => isSport.value
  ? { noun: '運動', placeholder: '新增運動，例如：羽球', addLabel: '新增運動名稱', editLabel: '運動名稱' }
  : { noun: '類型', placeholder: '新增類型，例如：比賽', addLabel: '新增類型名稱', editLabel: '類型名稱' })

/** 正在處理的操作，例如 'add'、'rename:xxx'、'delete:xxx'、'color:xxx' */
const busy = ref<string | null>(null)
const editingId = ref<string | null>(null)
const editingName = ref('')
const newName = ref('')
const newColor = ref(catalog.nextSportColor())
const otherId = OTHER_ID

// 清單載入或變動後，新增欄位的預設顏色跟著輪替
watch(() => catalog.sports.value.length, () => {
  newColor.value = catalog.nextSportColor()
})

async function run(key: string, action: () => Promise<void>, failPrefix: string): Promise<boolean> {
  if (busy.value) return false
  busy.value = key
  try {
    await action()
    return true
  }
  catch (error) {
    toast.error(`${failPrefix}：${errorMessage(error)}`)
    return false
  }
  finally {
    busy.value = null
  }
}

async function add() {
  const name = newName.value.trim()
  if (!name) return
  const ok = await run('add', () => (isSport.value
    ? catalog.addSport(name, newColor.value)
    : catalog.addCategory(name)), '新增失敗')
  if (!ok) return
  toast.success(`已新增「${name}」`)
  newName.value = ''
  newColor.value = catalog.nextSportColor()
}

function startEdit(id: string, name: string) {
  editingId.value = id
  editingName.value = name
}

function cancelEdit() {
  editingId.value = null
  editingName.value = ''
}

async function saveEdit(id: string) {
  const name = editingName.value.trim()
  const ok = await run(`rename:${id}`, () => (isSport.value
    ? catalog.updateSport(id, { name })
    : catalog.updateCategory(id, name)), '更新失敗')
  if (!ok) return
  toast.success(`已更新「${name}」`)
  cancelEdit()
}

async function changeColor(id: string, event: Event) {
  const color = (event.target as HTMLInputElement).value
  await run(`color:${id}`, () => catalog.updateSport(id, { color }), '更新失敗')
}

async function remove(id: string, name: string) {
  if (busy.value) return
  const count = countUsing(isSport.value ? 'sportId' : 'categoryId', id)
  const message = count > 0
    ? `確定要刪除「${name}」嗎？有 ${count} 筆紀錄會改為「其它」。`
    : `確定要刪除「${name}」嗎？`
  const ok = await confirm({ title: `刪除${copy.value.noun}`, message })
  if (!ok) return
  const done = await run(`delete:${id}`, () => (isSport.value
    ? catalog.removeSport(id)
    : catalog.removeCategory(id)), '刪除失敗')
  if (done) toast.success(`已刪除「${name}」`)
}
</script>

<template>
  <div>
    <ul class="divide-y divide-slate-100">
      <li v-for="item in items" :key="item.id" class="flex items-center gap-3 py-3">
        <input
          v-if="isSport && 'color' in item"
          type="color"
          :value="item.color"
          :aria-label="`${item.name} 的顏色`"
          :disabled="!!busy"
          class="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-slate-200"
          @change="changeColor(item.id, $event)"
        >

        <template v-if="editingId === item.id">
          <input
            v-model="editingName"
            type="text"
            maxlength="20"
            :aria-label="copy.editLabel"
            :disabled="!!busy"
            class="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            @keydown.enter.prevent="saveEdit(item.id)"
          >
          <button
            type="button"
            class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 disabled:cursor-wait disabled:opacity-60"
            :disabled="!!busy || !editingName.trim()"
            @click="saveEdit(item.id)"
          >
            <AppSpinner v-if="busy === `rename:${item.id}`" />儲存
          </button>
          <button type="button" class="text-sm text-slate-500" :disabled="!!busy" @click="cancelEdit">取消</button>
        </template>

        <template v-else>
          <span class="flex-1 text-sm font-medium text-slate-700">
            {{ item.name }}
            <span v-if="item.id === otherId" class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">固定</span>
          </span>
          <template v-if="item.id !== otherId">
            <button
              type="button"
              class="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-60"
              :disabled="!!busy"
              @click="startEdit(item.id, item.name)"
            >
              編輯
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1 text-sm text-red-500 disabled:opacity-60"
              :disabled="!!busy || !logsReady"
              @click="remove(item.id, item.name)"
            >
              <AppSpinner v-if="busy === `delete:${item.id}`" />刪除
            </button>
          </template>
        </template>
      </li>
    </ul>

    <form class="mt-3 flex gap-2" @submit.prevent="add">
      <input
        v-if="isSport"
        v-model="newColor"
        type="color"
        aria-label="新運動的顏色"
        :disabled="!!busy"
        class="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200"
      >
      <input
        v-model="newName"
        type="text"
        maxlength="20"
        :placeholder="copy.placeholder"
        :aria-label="copy.addLabel"
        :disabled="!!busy"
        class="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
      >
      <button
        type="submit"
        class="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!!busy || !newName.trim()"
      >
        <AppSpinner v-if="busy === 'add'" />新增
      </button>
    </form>
  </div>
</template>
