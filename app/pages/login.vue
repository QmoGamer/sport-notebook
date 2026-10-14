<script setup lang="ts">
definePageMeta({ layout: 'blank', middleware: 'guest' })
useHead({ title: '登入 · 運動筆記本' })

const { user, login } = useAuth()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const submitting = ref(false)

const registerLink = computed(() => ({
  path: '/register',
  query: typeof route.query.redirect === 'string' ? { redirect: route.query.redirect } : {}
}))

async function submit() {
  if (submitting.value) return
  submitting.value = true
  try {
    await login(email.value, password.value)
    toast.success(`歡迎回來，${user.value?.name}！`)
    await router.push(safeRedirect(route.query.redirect))
  }
  catch (error) {
    toast.error(`登入失敗：${authErrorMessage(error)}`)
    password.value = ''
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
    <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div class="flex items-center gap-2 text-lg font-bold text-slate-900">
        <AppLogoIcon />
        <span>運動筆記本</span>
      </div>

      <p class="mt-8 text-xs font-bold tracking-widest text-emerald-600">WELCOME BACK</p>
      <h1 class="mt-2 text-2xl font-bold text-slate-900">登入運動筆記本</h1>
      <p class="mt-2 text-slate-500">記錄每一次練習，看見自己的進步。</p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label for="email" class="text-sm font-semibold text-slate-700">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
            :disabled="submitting"
            class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
        </div>
        <div>
          <label for="password" class="text-sm font-semibold text-slate-700">密碼</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="輸入密碼"
            required
            :disabled="submitting"
            class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
        </div>
        <button
          type="submit"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
          :disabled="submitting"
        >
          <template v-if="submitting">
            <AppSpinner />登入中…
          </template>
          <template v-else>登入 →</template>
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-500">
        還沒有帳號？<NuxtLink :to="registerLink" class="font-semibold text-emerald-600 hover:text-emerald-700">建立帳號</NuxtLink>
      </p>
    </div>
  </div>
</template>
