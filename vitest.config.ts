import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

const r = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: { '~': r('./app') } },
        test: { name: 'unit', include: ['test/unit/utils/**/*.test.ts'], environment: 'node' },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/unit/composables/**/*.test.ts', 'test/integration/**/*.test.ts'],
          environment: 'nuxt',
          setupFiles: ['test/setup/nuxt.ts'],
          // Vitest 5 預設快取轉譯後的模組，但 @nuxt/test-utils 的虛擬進入點（nuxt-vitest-app-entry）
          // 從快取讀回後會解析失敗，導致第二次執行起所有 Nuxt 測試都無法啟動，所以關閉
          fsModuleCache: false,
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom',
              overrides: {
                alias: {
                  'firebase/app': r('./test/mocks/firebase-app.ts'),
                  'firebase/auth': r('./test/mocks/firebase-auth.ts'),
                  'firebase/firestore': r('./test/mocks/firebase-firestore.ts'),
                },
              },
            },
          },
        },
      }),
    ],
  },
})
