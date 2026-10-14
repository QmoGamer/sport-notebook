<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: '設定 · 運動筆記本' })

const { user, updateName, changePassword } = useAuth()
const toast = useToast()

// 基本資料
const displayName = ref(user.value?.name ?? '')
const savingName = ref(false)
watch(() => user.value?.name, (name) => {
  displayName.value = name ?? ''
})
const nameUnchanged = computed(() => !displayName.value.trim() || displayName.value.trim() === user.value?.name)

async function saveName() {
  if (savingName.value || nameUnchanged.value) return
  savingName.value = true
  try {
    await updateName(displayName.value)
    toast.success('暱稱已更新')
  }
  catch (error) {
    toast.error(`更新失敗：${errorMessage(error)}`)
  }
  finally {
    savingName.value = false
  }
}

// 修改密碼
const passwords = reactive({ current: '', next: '', confirm: '' })
const passwordError = ref('')
const savingPassword = ref(false)

function validatePassword(): string {
  if (!passwords.current) return '請輸入目前密碼'
  if (passwords.next.length < 6) return '密碼長度至少需要 6 個字元'
  if (passwords.next !== passwords.confirm) return '兩次輸入的密碼不一致'
  if (passwords.next === passwords.current) return '新密碼不能與目前密碼相同'
  return ''
}

async function savePassword() {
  if (savingPassword.value) return
  passwordError.value = validatePassword()
  if (passwordError.value) return
  savingPassword.value = true
  try {
    await changePassword(passwords.current, passwords.next)
    passwords.current = ''
    passwords.next = ''
    passwords.confirm = ''
    toast.success('密碼已更新')
  }
  catch (error) {
    passwords.current = ''
    toast.error(`更新密碼失敗：${authErrorMessage(error)}`)
  }
  finally {
    savingPassword.value = false
  }
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100'
const buttonClass = 'inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60'
</script>

<template>
  <div v-if="user" class="mx-auto max-w-4xl px-4 py-10 sm:px-6">
    <p class="text-xs font-bold tracking-widest text-emerald-600">SETTINGS</p>
    <h1 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">設定</h1>
    <p class="mt-2 text-slate-500">管理你的個人資料、運動項目與密碼。</p>

    <div class="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center gap-4 border-b border-slate-100 p-6">
        <UserAvatar :name="user.name" class="!h-14 !w-14 !text-xl" />
        <div class="min-w-0">
          <p class="text-lg font-bold text-slate-900">{{ user.name }}</p>
          <p class="truncate text-sm text-slate-500">{{ user.email }}</p>
          <p class="text-xs text-slate-400">加入於 {{ user.joinedAt }}</p>
        </div>
      </div>

      <div class="divide-y divide-slate-100">
        <!-- ① 基本資料 -->
        <section class="grid gap-4 p-6 sm:grid-cols-[200px_1fr]">
          <div>
            <h2 class="font-bold text-slate-900">基本資料</h2>
            <p class="mt-1 text-sm text-slate-500">暱稱會顯示在導覽列。</p>
          </div>
          <form class="space-y-3" @submit.prevent="saveName">
            <div>
              <label for="settings-name" class="text-sm font-semibold text-slate-700">暱稱</label>
              <input id="settings-name" v-model="displayName" type="text" maxlength="20" :disabled="savingName" :class="inputClass">
            </div>
            <button type="submit" :class="buttonClass" :disabled="savingName || nameUnchanged">
              <template v-if="savingName">
                <AppSpinner />儲存中…
              </template>
              <template v-else>儲存暱稱</template>
            </button>
          </form>
        </section>

        <!-- ② 運動項目 -->
        <section class="grid gap-4 p-6 sm:grid-cols-[200px_1fr]">
          <div>
            <h2 class="font-bold text-slate-900">運動項目</h2>
            <p class="mt-1 text-sm text-slate-500">新增紀錄時可選擇的運動，顏色會顯示在月曆上。</p>
          </div>
          <CatalogEditor kind="sport" />
        </section>

        <!-- ③ 運動類型 -->
        <section class="grid gap-4 p-6 sm:grid-cols-[200px_1fr]">
          <div>
            <h2 class="font-bold text-slate-900">運動類型</h2>
            <p class="mt-1 text-sm text-slate-500">用來標記運動的性質，方便之後篩選。</p>
          </div>
          <CatalogEditor kind="category" />
        </section>

        <!-- ④ 修改密碼 -->
        <section class="grid gap-4 p-6 sm:grid-cols-[200px_1fr]">
          <div>
            <h2 class="font-bold text-slate-900">修改密碼</h2>
            <p class="mt-1 text-sm text-slate-500">修改後，下次登入請使用新密碼。</p>
          </div>
          <form class="space-y-3" novalidate @submit.prevent="savePassword">
            <div>
              <label for="current-password" class="text-sm font-semibold text-slate-700">目前密碼</label>
              <input id="current-password" v-model="passwords.current" type="password" autocomplete="current-password" :disabled="savingPassword" :class="inputClass">
            </div>
            <div>
              <label for="new-password" class="text-sm font-semibold text-slate-700">新密碼</label>
              <input id="new-password" v-model="passwords.next" type="password" autocomplete="new-password" placeholder="至少 6 個字元" :disabled="savingPassword" :class="inputClass">
            </div>
            <div>
              <label for="new-password-confirm" class="text-sm font-semibold text-slate-700">確認新密碼</label>
              <input id="new-password-confirm" v-model="passwords.confirm" type="password" autocomplete="new-password" placeholder="再次輸入新密碼" :disabled="savingPassword" :class="inputClass">
            </div>
            <p v-if="passwordError" role="alert" class="text-sm text-red-500">{{ passwordError }}</p>
            <button type="submit" :class="buttonClass" :disabled="savingPassword">
              <template v-if="savingPassword">
                <AppSpinner />更新中…
              </template>
              <template v-else>更新密碼</template>
            </button>
          </form>
        </section>
      </div>
    </div>
  </div>
</template>
