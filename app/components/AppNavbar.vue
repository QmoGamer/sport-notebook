<script setup lang="ts">
const NAV_LINKS = [
  { to: '/', label: '月曆' },
  { to: '/stats', label: '統計' },
  { to: '/settings', label: '設定' }
]

const { user, logout } = useAuth()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const mobileOpen = ref(false)
const loggingOut = ref(false)

watch(() => route.fullPath, () => {
  mobileOpen.value = false
})

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await logout()
    toast.success('已登出')
    await router.push('/login')
  }
  catch (error) {
    toast.error(`登出失敗：${errorMessage(error)}`)
  }
  finally {
    loggingOut.value = false
    mobileOpen.value = false
  }
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <NuxtLink to="/" class="flex items-center gap-2 text-lg font-bold text-slate-900">
        <AppLogoIcon class="shadow-sm" />
        <span>運動<span class="text-emerald-600">筆記本</span></span>
      </NuxtLink>

      <!-- 桌面版 -->
      <div class="hidden items-center gap-8 md:flex">
        <nav class="flex items-center gap-6">
          <NuxtLink
            v-for="link in NAV_LINKS"
            :key="link.to"
            :to="link.to"
            class="relative text-sm font-medium text-slate-500 hover:text-slate-900"
            exact-active-class="!text-slate-900 after:absolute after:inset-x-0 after:-bottom-[21px] after:h-0.5 after:bg-emerald-600"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <div v-if="user" class="group relative">
          <button type="button" class="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-slate-100">
            <UserAvatar :name="user.name" />
            <span class="text-sm font-semibold text-slate-700">{{ user.name }}</span>
          </button>
          <div class="invisible absolute right-0 top-full pt-1 opacity-0 transition group-hover:visible group-hover:opacity-100">
            <div class="w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <p class="truncate px-3 py-1 text-xs text-slate-400">{{ user.email }}</p>
              <button
                type="button"
                class="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-500 hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
                :disabled="loggingOut"
                @click="handleLogout"
              >
                <AppSpinner v-if="loggingOut" />
                {{ loggingOut ? '登出中…' : '登出' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 手機版 -->
      <button
        type="button"
        class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        aria-label="開啟選單"
        @click="mobileOpen = !mobileOpen"
      >
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path v-if="mobileOpen" d="M6 6l12 12M18 6L6 18" />
          <path v-else d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
    </div>

    <div v-if="mobileOpen" class="absolute inset-x-0 top-full border-b border-slate-200 bg-white px-4 py-3 shadow-lg md:hidden">
      <nav class="flex flex-col gap-1">
        <NuxtLink
          v-for="link in NAV_LINKS"
          :key="link.to"
          :to="link.to"
          class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600"
          exact-active-class="bg-emerald-50 !text-emerald-700"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
      <div v-if="user" class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div class="flex items-center gap-2">
          <UserAvatar :name="user.name" />
          <span class="text-sm font-semibold text-slate-700">{{ user.name }}</span>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 text-sm font-semibold text-red-500 disabled:cursor-wait disabled:opacity-70"
          :disabled="loggingOut"
          @click="handleLogout"
        >
          <AppSpinner v-if="loggingOut" />
          {{ loggingOut ? '登出中…' : '登出' }}
        </button>
      </div>
    </div>
  </header>
</template>
