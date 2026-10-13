import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

export default defineNuxtPlugin({
  name: 'firebase',
  setup() {
    const config = useRuntimeConfig().public

    // 設定值來自 .env 的 NUXT_PUBLIC_FIREBASE_*（見 .env.example）
    const app = initializeApp({
      apiKey: config.firebaseApiKey,
      authDomain: config.firebaseAuthDomain,
      projectId: config.firebaseProjectId,
      storageBucket: config.firebaseStorageBucket,
      messagingSenderId: config.firebaseMessagingSenderId,
      appId: config.firebaseAppId
    })

    return {
      provide: {
        fbAuth: getAuth(app),
        fbDb: getFirestore(app)
      }
    }
  }
})
