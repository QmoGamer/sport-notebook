export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // 登入狀態只存在瀏覽器（Firebase Auth），關閉 SSR 避免伺服器端誤判未登入
  ssr: false,
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // 由 .env 的 NUXT_PUBLIC_FIREBASE_* 覆寫
      firebaseApiKey: '',
      firebaseAuthDomain: '',
      firebaseProjectId: '',
      firebaseStorageBucket: '',
      firebaseMessagingSenderId: '',
      firebaseAppId: ''
    }
  },
  app: {
    head: {
      title: '運動筆記本',
      htmlAttrs: { lang: 'zh-Hant' }
    }
  }
})
