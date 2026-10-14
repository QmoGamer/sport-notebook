<script setup lang="ts">
definePageMeta({ layout: 'blank', middleware: 'guest' })
useHead({ title: '註冊 · 運動筆記本' })

const { user, register } = useAuth()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const form = reactive({ name: '', email: '', password: '', passwordConfirm: '' })
const formError = ref('')
const submitting = ref(false)

const loginLink = computed(() => ({
  path: '/login',
  query: typeof route.query.redirect === 'string' ? { redirect: route.query.redirect } : {}
}))

function validate(): string {
  if (!form.name.trim()) return '請輸入暱稱'
  if (form.password.length < 6) return '密碼長度至少需要 6 個字元'
  if (form.password !== form.passwordConfirm) return '兩次輸入的密碼不一致'
  return ''
}

async function submit() {
  if (submitting.value) return
  formError.value = validate()
  if (formError.value) return
  submitting.value = true
  try {
    await register({ name: form.name, email: form.email, password: form.password })
    toast.success(`歡迎，${user.value?.name}！`)
    await router.push(safeRedirect(route.query.redirect))
  }
  catch (error) {
    toast.error(`註冊失敗：${authErrorMessage(error)}`)
  }
  finally {
    submitting.value = false
  }
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100'
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
    <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div class="flex items-center gap-2 text-lg font-bold text-slate-900">
        <AppLogoIcon />
        <span>運動筆記本</span>
      </div>

      <p class="mt-8 text-xs font-bold tracking-widest text-emerald-600">GET STARTED</p>
      <h1 class="mt-2 text-2xl font-bold text-slate-900">建立帳號</h1>
      <p class="mt-2 text-slate-500">只要一分鐘，開始你的運動筆記。</p>

      <form class="mt-6 space-y-4" novalidate @submit.prevent="submit">
        <div>
          <label for="nickname" class="text-sm font-semibold text-slate-700">暱稱</label>
          <input id="nickname" v-model="form.name" type="text" maxlength="20" placeholder="顯示在導覽列的名字" :disabled="submitting" :class="inputClass">
        </div>
        <div>
          <label for="email" class="text-sm font-semibold text-slate-700">Email</label>
          <input id="email" v-model="form.email" type="email" autocomplete="email" placeholder="you@example.com" :disabled="submitting" :class="inputClass">
        </div>
        <div>
          <label for="password" class="text-sm font-semibold text-slate-700">密碼</label>
          <input id="password" v-model="form.password" type="password" autocomplete="new-password" placeholder="至少 6 個字元" :disabled="submitting" :class="inputClass">
        </div>
        <div>
          <label for="password-confirm" class="text-sm font-semibold text-slate-700">確認密碼</label>
          <input id="password-confirm" v-model="form.passwordConfirm" type="password" autocomplete="new-password" placeholder="再次輸入密碼" :disabled="submitting" :class="inputClass">
        </div>

        <p v-if="formError" role="alert" class="text-sm text-red-500">{{ formError }}</p>

        <button
          type="submit"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
          :disabled="submitting"
        >
          <template v-if="submitting">
            <AppSpinner />建立中…
          </template>
          <template v-else>建立帳號 →</template>
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-500">
        已經有帳號了？<NuxtLink :to="loginLink" class="font-semibold text-emerald-600 hover:text-emerald-700">登入</NuxtLink>
      </p>
    </div>
  </div>
</template>
