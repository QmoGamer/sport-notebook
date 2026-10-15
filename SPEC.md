# 運動筆記本（sport-notebook）軟體設計規格書

> 版本：v1.2 規格（2026-10-15），對應程式碼 v0.1.0 之後的「一天多筆紀錄」改版；由「群組預約系統（book-play-ball）v0.4.4」規格改寫而來
> 讀者：負責從零實作本專案的 AI 開發代理

## 0. 如何使用這份文件

- 照章節順序實作：先建專案骨架與設定（§2–§4），再寫資料層（§5–§7），然後是 UI（§8–§9），最後是測試（§11），並用 §12 的驗收清單自我檢查。
- 用詞約定：**MUST** 表示必須照做；**SHOULD** 表示建議照做，偏離時要有理由；**MAY** 可自行決定。
- 文件中用「」或 `code` 包起來的畫面文字是**精確文案**，MUST 逐字照抄，包括全形標點、空格、emoji 與 `…`（單一字元 U+2026，不是三個點）。測試會比對這些字串。
- 所有程式碼註解、文件、commit 訊息使用繁體中文（臺灣用語）；程式碼識別字使用英文。

---

## 1. 產品概述

一個**個人的運動筆記本**：在月曆上記錄每一天做了什麼運動、屬於哪種類型，再寫一點筆記。

- 使用 Email + 密碼登入（Firebase Email/Password 驗證），可自行註冊，註冊時填暱稱。
- 每個人的資料只有自己看得到。未登入只能看到登入頁和註冊頁。
- 首頁是月曆（一週從**週一**開始）。點選當月任何一天（過去、今天、未來都可以）會打開紀錄視窗：
  - 當天沒有紀錄 → 直接進入新增畫面
  - 當天已有紀錄 → 顯示當天的紀錄列表，可以再新增一筆、點某一筆編輯，或在列表上刪除
  - 未來的日期可以拿來記預約的課程
- 一筆紀錄包含：**運動**（下拉選單，必填）、**類型**（下拉選單，必填）、**筆記**（textarea，選填）。**同一天可以有多筆紀錄**，也可以重複同一種運動（例如早上、晚上各打一次桌球）。
- 「設定」頁可以管理運動與類型清單（每個人各自一份，不和別人共用），運動可以設定顏色，月曆上會用這個顏色顯示。
- 「統計」頁可以依期間（週、月、自訂）以及運動、類型篩選紀錄，看次數統計與紀錄列表。
- 資料存在 Firestore，用 onSnapshot 即時同步；同一個帳號開兩個分頁也會同步。

### 1.1 使用者角色

| 角色 | 能做的事 |
|------|---------|
| 訪客（未登入） | 只能進入 `/login`、`/register`；進入其他頁面會被導去登入頁 |
| 已登入使用者 | 管理自己的紀錄、運動、類型；看統計；修改暱稱與密碼；登出 |

### 1.2 「其它」選項

- 運動清單和類型清單各有一個固定的「其它」選項，文件 ID 固定是 `other`。
- 「其它」**不能刪除、不能改名**，排序永遠在清單**最後一個**。
- 運動的「其它」**可以改顏色**，預設 `#94a3b8`。
- 刪除某個運動或類型時，原本使用它的紀錄會**自動改成「其它」**。

### 1.3 不在範圍內

- 忘記密碼、Email 驗證信、第三方登入、刪除帳號
- 多人共享、群組、好友（原 book-play-ball 的共享看板功能全部移除）
- 時段、時長、強度等額外欄位；同一天內的手動排序（依建立先後排列）
- 運動與類型的排序調整（依建立順序排列，「其它」固定最後）
- 伺服器端渲染（SSR 關閉，純 SPA）、後端 API（直接從瀏覽器讀寫 Firestore）

---

## 2. 技術堆疊

| 類別 | 套件 | `package.json` 版本範圍 | 實際安裝（v0.1.0） |
|------|------|-----------|-----------|
| 框架 | `nuxt` | ^4.5.2 | 4.6.1 |
| | `vue` | ^3.5.43 | 3.5.44 |
| | `vue-router` | ^5.3.1 | 5.4.0 |
| 樣式 | `@nuxtjs/tailwindcss`（Tailwind v3 語法） | ^6.14.0（devDependency） | 6.14.0（tailwindcss 3.4.19） |
| 後端服務 | `firebase`（使用 `firebase/app`、`firebase/auth`、`firebase/firestore` 的 modular API） | ^12.19.0 | 12.19.0 |
| 測試 | `vitest` | ^5.0.3 | 5.0.4 |
| | `@nuxt/test-utils` | ^4.3.3 | 4.3.3 |
| | `@vue/test-utils` | ^2.5.1 | 2.5.1 |
| | `happy-dom` | ^21.0.1 | 21.0.1 |

- `firebase` 已有 13.x，但 MUST 維持 `^12.19.0`，不要升級主版號。
- 型別檢查不在依賴清單內，需要時用 `npx -p vue-tsc@3 -p typescript@5 vue-tsc -b --noEmit` 臨時執行（要先 `nuxt prepare` 產生 `.nuxt/tsconfig.*.json`）。

- Node.js v22。
- 語言：TypeScript + Vue SFC `<script setup lang="ts">`。
- 套件管理：npm（有 `package-lock.json`）。
- `package.json` MUST 設定 `"name": "sport-notebook"`、`"type": "module"`、`"private": true`。
- 不使用任何圖表套件；統計頁的長條圖用 Tailwind 的 `div` 畫。

### 2.1 npm scripts

```json
{
  "build": "nuxt build",
  "dev": "nuxt dev",
  "generate": "nuxt generate",
  "preview": "nuxt preview",
  "postinstall": "nuxt prepare",
  "test": "vitest run",
  "test:unit": "vitest run test/unit",
  "test:integration": "vitest run test/integration",
  "test:watch": "vitest"
}
```

---

## 3. 專案結構

使用 Nuxt 4 的 `app/` 目錄慣例。composables、utils、components 都依賴 Nuxt **auto-import**：除了 Firebase 函式與 `~/types/notebook` 的型別要自己 import 之外，`ref`、`computed`、`useState`、`useAuth`、`formatDateKey` 等都不需要手動 import。

```
.
├── app/
│   ├── app.vue
│   ├── spa-loading-template.html
│   ├── assets/css/main.css
│   ├── components/
│   │   ├── AppLogoIcon.vue
│   │   ├── AppNavbar.vue
│   │   ├── AppSpinner.vue
│   │   ├── AppToast.vue
│   │   ├── CatalogEditor.vue     # 設定頁共用的「運動／類型」清單編輯器
│   │   ├── ConfirmDialog.vue     # 刪除前的確認 dialog
│   │   ├── LogModal.vue          # 當日紀錄視窗：列表（含刪除）與新增／編輯表單
│   │   └── UserAvatar.vue
│   ├── composables/
│   │   ├── useAuth.ts
│   │   ├── useCatalog.ts         # 運動與類型清單
│   │   ├── useConfirm.ts         # 以 Promise 呼叫確認 dialog
│   │   ├── useLogs.ts            # 運動紀錄
│   │   └── useToast.ts
│   ├── layouts/
│   │   ├── blank.vue
│   │   └── default.vue
│   ├── middleware/
│   │   ├── auth.ts               # 需要登入
│   │   └── guest.ts              # 已登入就離開登入頁／註冊頁
│   ├── pages/
│   │   ├── index.vue             # 月曆
│   │   ├── login.vue
│   │   ├── register.vue
│   │   ├── settings.vue
│   │   └── stats.vue
│   ├── plugins/
│   │   ├── firebase.client.ts
│   │   ├── auth.client.ts
│   │   └── data.client.ts        # 依登入狀態啟動／停止資料同步
│   ├── types/
│   │   └── notebook.ts
│   └── utils/
│       ├── catalog.ts
│       ├── colors.ts
│       ├── date.ts
│       ├── error.ts
│       ├── redirect.ts
│       └── stats.ts
├── public/
│   ├── favicon.ico       # 暫用 Vue 預設圖示（取自 vuejs/create-vue 範本），之後可直接覆蓋
│   └── robots.txt        # User-Agent: * / Disallow:（允許全部）
├── test/                 （見 §11）
├── firestore.rules       （見 §5.6）
├── .env.example
├── nuxt.config.ts
├── vitest.config.ts
├── tsconfig.json         （Nuxt 預設：references 指向 .nuxt/tsconfig.{app,server,shared,node}.json）
├── README.md
└── VERSION-LOG.md
```

`.gitignore` MUST 包含 `.env`。

---

## 4. 全域設定

### 4.1 `nuxt.config.ts`

```ts
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
```

**為什麼 `ssr: false`（MUST）：** 登入狀態只存在瀏覽器端。開著 SSR 的話，伺服器端拿不到 user，`auth` middleware 會在伺服器端把已登入的使用者導回登入頁。

### 4.2 `.env.example`

```
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=
```

### 4.3 `app/assets/css/main.css`

```css
html {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', system-ui, sans-serif;
}
```

### 4.4 `app/spa-loading-template.html`

在 plugins 還原登入狀態之前顯示的全螢幕載入畫面：淺灰背景（`#f8fafc`），正中央一個 32px 的旋轉圓圈（外框 3px `#d1fae5`、上緣 `#059669`，0.8 秒轉一圈）。

```html
<div style="display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f8fafc">
  <div style="width:32px;height:32px;border:3px solid #d1fae5;border-top-color:#059669;border-radius:50%;animation:spa-spin .8s linear infinite"></div>
</div>
<style>@keyframes spa-spin{to{transform:rotate(360deg)}}</style>
```

### 4.5 Firebase 專案設定

在 Firebase 主控台：

1. **Authentication → Sign-in method**：啟用「電子郵件/密碼」。匿名登入不需要啟用。
2. 建立 **Firestore** 資料庫。
3. 把 repo 裡的 `firestore.rules`（§5.6）貼到 Firestore → 規則並發布，或用 Firebase CLI `firebase deploy --only firestore:rules` 部署。**沒有部署規則就不能上線**（MUST）。
4. 專案設定 → 一般 → 網頁應用程式，把設定值填進 `.env`。

---

## 5. 資料模型（Firestore）

所有資料都放在 `users/{uid}` 底下，方便用 Security Rules 限制只有本人能讀寫。

### 5.1 `users/{uid}`（個人資料）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `uid` | string | 與文件 ID 相同 |
| `email` | string | 註冊時的 Email |
| `name` | string | 暱稱（已 trim，1–20 字） |
| `createdAt` | string | 建立時間，ISO 8601 字串（`new Date().toISOString()`） |

### 5.2 `users/{uid}/sports/{sportId}`（運動）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `name` | string | 運動名稱（已 trim，1–20 字，同一份清單內不能重複） |
| `color` | string | 十六進位色碼，格式 `#rrggbb` |
| `order` | number | 排序用；新增時是「現有非 `other` 項目的最大 order + 1」，清單只有 `other` 時是 0 |

- `sportId` 由 Firestore 自動產生（`doc(collection(...))`），只有「其它」固定為 `other`。

### 5.3 `users/{uid}/categories/{categoryId}`（類型）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `name` | string | 類型名稱（規則同運動） |
| `order` | number | 規則同運動 |

類型沒有顏色。

### 5.4 `users/{uid}/logs/{logId}`（運動紀錄）

一筆紀錄一份文件，`logId` 由 Firestore 自動產生（`doc(collection(...))`）。同一天可以有多份文件，用 `date` 欄位分組。

| 欄位 | 型別 | 說明 |
|------|------|------|
| `date` | string | date key，格式 `YYYY-MM-DD` |
| `sportId` | string | 對應 `sports` 的文件 ID |
| `categoryId` | string | 對應 `categories` 的文件 ID |
| `note` | string | 筆記（已 trim），沒寫就是 `''`，最多 1000 字 |
| `createdAt` | Timestamp | `serverTimestamp()`，只在新增時寫入；同一天的紀錄依它排先後 |
| `updatedAt` | Timestamp | `serverTimestamp()`，每次寫入都更新 |

**舊資料相容（MUST）：** 一天一筆的舊版本把文件 ID 設成日期（例如 `logs/2026-10-20`）。這些文件不需要搬移，因為裡面本來就有 `date` 欄位。程式一律把文件 ID 當成不透明的識別碼，日期只讀 `date` 欄位，不可以從 ID 推日期，也不可以用日期組文件路徑。

紀錄只存 ID，不存名稱快照。畫面上的名稱和顏色一律從目前的運動、類型清單查。這樣改名之後，所有舊紀錄會跟著顯示新名稱。

### 5.5 註冊時寫入的預設資料

用**一個** `writeBatch` 一次寫入（MUST，確保不會只寫一半）：

| 路徑 | 內容 |
|------|------|
| `users/{uid}` | `{ uid, email, name, createdAt }` |
| `users/{uid}/sports/{自動 ID}` | `{ name: '桌球', color: '#10b981', order: 0 }` |
| `users/{uid}/sports/other` | `{ name: '其它', color: '#94a3b8', order: 0 }` |
| `users/{uid}/categories/{自動 ID}` | `{ name: '練習', order: 0 }` |
| `users/{uid}/categories/other` | `{ name: '其它', order: 0 }` |

`other` 的 `order` 不參與排序，固定寫 0。

### 5.6 `firestore.rules`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    match /users/{uid} {
      allow read, write: if isOwner(uid);

      match /sports/{sportId} {
        allow read, create: if isOwner(uid);
        // 「其它」只能改顏色，不能改名
        allow update: if isOwner(uid)
          && (sportId != 'other' || request.resource.data.name == resource.data.name);
        allow delete: if isOwner(uid) && sportId != 'other';
      }

      match /categories/{categoryId} {
        allow read, create: if isOwner(uid);
        allow update: if isOwner(uid) && categoryId != 'other';
        allow delete: if isOwner(uid) && categoryId != 'other';
      }

      match /logs/{logId} {
        allow read, write: if isOwner(uid);
      }
    }
  }
}
```

前端也要擋住這些操作（§7.7）。前端擋的是使用體驗，真正的權限由規則保證。

### 5.7 Date key 約定

整個系統用 `YYYY-MM-DD` 字串代表「某一天」，全部以**瀏覽器當地時區**計算。兩個 key 可以直接用字串比較大小。`<input type="date">` 的 value 也是這個格式，可以直接使用。

---

## 6. 執行期架構

### 6.1 Plugins 啟動順序

三個 plugin 都只在 client 端執行（檔名 `.client.ts`），並用 `defineNuxtPlugin({ name, dependsOn, setup })` 物件語法宣告相依關係：

1. **`firebase`**（`firebase.client.ts`）：從 `useRuntimeConfig().public` 組出設定物件後 `initializeApp(config)`，然後 `provide` 出 `fbAuth: getAuth(app)` 和 `fbDb: getFirestore(app)`。之後全站透過 `useNuxtApp().$fbAuth`、`$fbDb` 取用。
2. **`auth`**（`auth.client.ts`，`dependsOn: ['firebase']`，**async**）：
   - `await` 一個 Promise。Promise 內呼叫 `onAuthStateChanged($fbAuth, cb)`，`cb` 會先 `await syncUser(fbUser)`；失敗時 `console.error('[auth] 讀取使用者資料失敗', error)`，不論成功與否都 `resolve()`。
   - 目的（MUST）：等 Firebase 還原登入狀態之後，app 才繼續啟動。這樣 route middleware 第一次執行時就能拿到正確的 user。
   - 監聽器不取消，之後每次登入狀態變化都會再呼叫 `syncUser`。
3. **`data`**（`data.client.ts`，`dependsOn: ['auth']`）：依登入的 uid 啟動或停止資料同步。
   ```ts
   const { user } = useAuth()
   const catalog = useCatalog()
   const logs = useLogs()
   let unsubscribers: Unsubscribe[] = []
   let currentUid: string | null = null

   function stop() {
     unsubscribers.forEach(unsub => unsub())
     unsubscribers = []
     currentUid = null
     catalog.reset()
     logs.reset()
   }

   function start(uid: string) {
     if (currentUid === uid) return
     stop()
     currentUid = uid
     unsubscribers = [catalog.startSync(uid), logs.startSync(uid)]
   }

   watch(() => user.value?.uid ?? null, uid => (uid ? start(uid) : stop()), { immediate: true })

   return { provide: { dataSync: { start, stop } } }
   ```
   - `logout()` MUST 先呼叫 `useNuxtApp().$dataSync.stop()` 再 `signOut`（原因見 §13）。

### 6.2 全域狀態（`useState` keys）

| key | 型別 | 初始值 | 擁有者 |
|-----|------|--------|--------|
| `'auth-user'` | `AppUser \| null` | `null` | `useAuth` |
| `'sports'` | `Sport[]` | `[]` | `useCatalog` |
| `'categories'` | `Category[]` | `[]` | `useCatalog` |
| `'catalog-ready'` | `boolean` | `false` | `useCatalog` |
| `'logs'` | `Record<string, LogEntry>`（key 是文件 ID） | `{}` | `useLogs` |
| `'logs-ready'` | `boolean` | `false` | `useLogs` |
| `'toasts'` | `Toast[]` | `[]` | `useToast` |
| `'confirm'` | `ConfirmRequest \| null` | `null` | `useConfirm` |

---

## 7. 模組規格

### 7.1 `app/types/notebook.ts`

```ts
export interface Sport { id: string; name: string; color: string; order: number }
export interface Category { id: string; name: string; order: number }
export interface LogEntry {
  id: string          // Firestore 文件 ID（舊資料是日期、新資料是自動 ID，一律當不透明字串）
  date: string
  sportId: string
  categoryId: string
  note: string
  createdAt: number   // createdAt 的毫秒數，排同一天的先後；尚未取得時為 0
}
export interface LogInput { sportId: string; categoryId: string; note: string }
export interface DateRange { start: string; end: string }   // 皆為 date key，含頭含尾
export type PeriodMode = 'week' | 'month' | 'custom'
```

### 7.2 `app/utils/date.ts`

```ts
export const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']   // 月曆星期列，index 0 = 週一
export function pad2(n: number): string                // 7 -> '07'，123 -> '123'
export function formatDateKey(date: Date): string      // 當地時間 -> 'YYYY-MM-DD'
export function parseDateKey(key: string): Date        // '2026-10-20' -> new Date(2026, 9, 20)（當地午夜）
export function formatDateLabel(key: string): string   // '2026-10-20' -> '10/20'；'2026-01-05' -> '1/5'
export function weekdayLabel(date: Date): string       // 依 getDay()：0 -> '日'、1 -> '一' … 6 -> '六'
export function addDays(date: Date, amount: number): Date   // 回傳新的 Date，不修改原物件
export interface CalendarCell { date: Date; key: string; day: number; inCurrentMonth: boolean }
export function buildMonthGrid(year: number, month: number): CalendarCell[]  // month 從 0 開始

export function startOfWeek(date: Date): Date          // 該週週一的當地午夜（週日屬於前一個週一開始的那週）
export function lastWeekRange(today: Date): DateRange  // 上週一 ~ 上週日
export function lastMonthRange(today: Date): DateRange // 上個月 1 日 ~ 上個月最後一天
export function shiftRange(mode: 'week' | 'month', range: DateRange, delta: number): DateRange
export function countDays(range: DateRange): number    // 含頭含尾的天數
export function formatRangeLabel(mode: 'week' | 'month', range: DateRange): string
```

**`buildMonthGrid` 規則（一週從週一開始）：**
- 網格起點是「當月 1 日往前推到最近的週一」。前置格數 `offset = (當月1日.getDay() + 6) % 7`。
- 總格數 = `Math.ceil((offset + 當月天數) / 7) * 7`，所以只會是 28、35 或 42 格。
- 前後補上的上個月、下個月日期 `inCurrentMonth = false`。
- 範例：
  - 2026/10 → 35 格，第一格 `2026-09-28`、最後一格 `2026-11-01`
  - 2027/02 → 28 格（1 日剛好是週一），全部是當月
  - 2026/08 → 42 格，第一格 `2026-07-27`、最後一格 `2026-09-06`

**期間函式範例（today = 2026-10-15，週四）：**
- `startOfWeek` → 2026-10-12；傳入 2026-10-18（週日）也是 2026-10-12；傳入 2026-10-12（週一）也是 2026-10-12
- `lastWeekRange` → `{ start: '2026-10-05', end: '2026-10-11' }`
- `lastMonthRange` → `{ start: '2026-09-01', end: '2026-09-30' }`
- 跨年：today = 2026-01-07 → `lastWeekRange` = `2025-12-29 ~ 2026-01-04`；`lastMonthRange` = `2025-12-01 ~ 2025-12-31`
- `shiftRange('week', r, 1)`：start、end 各加 7 天
- `shiftRange('month', r, -1)`：以 start 的年月往前一個月，回傳整個月；例如 `2026-03-01 ~ 2026-03-31` → `2026-02-01 ~ 2026-02-28`
- `countDays({ start: '2026-10-05', end: '2026-10-11' })` → 7
- `formatRangeLabel('week', …)` → `2026/10/5 – 2026/10/11`（月、日不補零；中間是**前後各一個半形空格的 en dash `–`（U+2013）**）
- `formatRangeLabel('month', …)` → `2026 年 9 月`

### 7.3 `app/utils/colors.ts`

```ts
export const DEFAULT_SPORT_COLOR = '#10b981'
export const OTHER_SPORT_COLOR = '#94a3b8'
export const SPORT_COLOR_PRESETS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#0ea5e9', '#ec4899', '#8b5cf6', '#14b8a6']
export function isHexColor(value: string): boolean        // /^#[0-9a-fA-F]{6}$/
export function readableTextColor(hex: string): '#ffffff' | '#0f172a'
```

- `readableTextColor`：用 YIQ 亮度 `(r * 299 + g * 587 + b * 114) / 1000`，**≥ 150** 回傳 `'#0f172a'`（深色字），否則回傳 `'#ffffff'`（白字）。
  - `#10b981` → `#ffffff`；`#94a3b8` → `#0f172a`；`#f59e0b` → `#0f172a`；`#000000` → `#ffffff`；`#ffffff` → `#0f172a`
- 運動顏色由使用者自訂，所以月曆標籤 MUST 用 inline style（`backgroundColor` + `color: readableTextColor(...)`），不能用 Tailwind class。

### 7.4 `app/utils/catalog.ts`

```ts
export const OTHER_ID = 'other'
export const OTHER_NAME = '其它'
export function sortCatalog<T extends { id: string; name: string; order: number }>(items: T[]): T[]
export function nextOrder(items: { id: string; order: number }[]): number
export function hasDuplicateName(items: { id: string; name: string }[], name: string, excludeId?: string): boolean
```

- `sortCatalog`：回傳新陣列。`other` 永遠最後；其他依 `order` 升冪，`order` 相同時依 `name` 的 `localeCompare`。
- `nextOrder`：排除 `other` 後取最大 `order` + 1；沒有其他項目時回傳 0。
- `hasDuplicateName`：把 `name.trim()` 和每個項目名稱比較，大小寫不同也算重複（英文用 `toLowerCase()` 比較）；`excludeId` 的那一項不算。「其它」也在比對範圍內。

### 7.5 `app/utils/error.ts`

```ts
/** 從 catch 到的任意值取出可顯示的錯誤訊息 */
export function errorMessage(error: unknown): string   // Error -> error.message；其他 -> String(error)
/** Firebase Auth 錯誤轉成中文訊息；不認得的錯誤碼交給 errorMessage */
export function authErrorMessage(error: unknown): string
```

`authErrorMessage` 讀取 `(error as { code?: unknown })?.code`：

| code | 訊息 |
|------|------|
| `auth/invalid-credential`、`auth/wrong-password`、`auth/user-not-found` | `Email 或密碼錯誤` |
| `auth/email-already-in-use` | `這個 Email 已經註冊過了` |
| `auth/invalid-email` | `Email 格式不正確` |
| `auth/weak-password` | `密碼長度至少需要 6 個字元` |
| `auth/too-many-requests` | `嘗試次數過多，請稍後再試` |
| `auth/network-request-failed` | `網路連線失敗，請檢查網路` |
| `auth/requires-recent-login` | `請重新登入後再試` |
| 其他 | `errorMessage(error)` |

Auth 相關的 toast（登入、註冊、修改密碼）用 `authErrorMessage`，其他 toast 一律用 `errorMessage`。

### 7.6 `app/utils/redirect.ts`

```ts
/** 只接受站內路徑，避免 open redirect */
export function safeRedirect(value: unknown): string
```

`value` 是字串、以 `/` 開頭而且不是以 `//` 開頭 → 原樣回傳；其他情況一律回傳 `'/'`。

### 7.7 `app/utils/stats.ts`

```ts
export interface StatsFilter { range: DateRange; sportId: string; categoryId: string }  // '' 表示全部
export interface CountItem { id: string; count: number }
export interface DateGroup { date: string; entries: LogEntry[] }
export function filterLogs(logs: Record<string, LogEntry>, filter: StatsFilter): LogEntry[]
export function countDates(entries: LogEntry[]): number
export function groupByDate(entries: LogEntry[]): DateGroup[]
export function countBy(entries: LogEntry[], field: 'sportId' | 'categoryId', order: string[]): CountItem[]
```

- `filterLogs`：保留 `range.start <= date <= range.end`，並符合 sportId、categoryId 篩選的紀錄。依 `date` **降冪**排序；同一天依 `createdAt` 升冪，再依 `id`。`range.start > range.end` 時回傳 `[]`。
- `countDates`：不重複的 `date` 數量（運動天數）。
- `groupByDate`：把相鄰同日期的紀錄分成一組，保留傳入的順序（搭配 `filterLogs` 的排序使用）。
- `countBy`：依指定欄位計數，只回傳 count > 0 的項目，依 count **降冪**排序；count 相同時依 `order`（排好序的 ID 陣列）中的位置排序，不在陣列內的排最後。

### 7.8 `app/composables/useToast.ts`

```ts
export interface Toast { id: number; message: string; type: 'success' | 'error' }
export function useToast(): {
  toasts: Ref<Toast[]>
  dismiss(id: number): void
  success(message: string): void   // 顯示 2500 ms
  error(message: string): void     // 顯示 4000 ms
}
```

- `id` 由模組層級的計數器 `let nextId = 0` 產生，每次 `++nextId`。
- `show` 用 `toasts.value = [...toasts.value, newToast]`（不可變更新），再 `setTimeout(() => dismiss(id), duration)`。
- `dismiss` 用 `filter` 移除。

### 7.8.1 `app/composables/useConfirm.ts`

```ts
export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string   // 預設「刪除」
}
export interface ConfirmRequest extends Required<ConfirmOptions> {
  resolve: (value: boolean) => void
}
export function useConfirm(): {
  request: Ref<ConfirmRequest | null>
  confirm(options: ConfirmOptions): Promise<boolean>
  answer(value: boolean): void
}
```

- `confirm(options)`：回傳一個 Promise，並把 `{ ...options, confirmLabel ?? '刪除', resolve }` 指定給 `request.value`，`ConfirmDialog` 看到 request 就會顯示。
  - 如果已經有一個 request 還沒回答，先把舊的以 `false` 結束，再顯示新的。
- `answer(value)`：沒有 request 就 return；否則先把 `request.value` 設為 null，再呼叫 `resolve(value)`。
- 使用方式：`if (!(await confirm({ title, message }))) return`。

### 7.9 `app/composables/useAuth.ts`

```ts
export interface AppUser { uid: string; email: string; name: string; joinedAt: string }
export interface RegisterInput { name: string; email: string; password: string }
export function useAuth(): {
  user: Ref<AppUser | null>
  syncUser(fbUser: User | null): Promise<void>
  register(input: RegisterInput): Promise<void>
  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
  updateName(newName: string): Promise<void>
  changePassword(currentPassword: string, newPassword: string): Promise<void>
}
```

內部 helper：
- `userRef(uid)` = `doc($fbDb, 'users', uid)`
- `formatJoinedAt(iso?)`：有 iso 就用 iso，沒有就用現在時間，輸出 `` `${年} 年 ${月} 月` ``（例如 `2026 年 10 月`，月份不補零）。
- `toAppUser(data)`：`{ uid, email, name, joinedAt: formatJoinedAt(createdAt) }`
- `createProfile(uid, email, name)`：照 §5.5 用一個 `writeBatch` 寫入個人資料與預設清單，回傳寫入的個人資料。

**`syncUser(fbUser)`**
1. `fbUser` 為 null → `user.value = null`，結束。
2. `user.value?.uid === fbUser.uid` → 直接 return，**不重新讀取**。（MUST，原因見 §13 第 1 點）
3. `getDoc(userRef(uid))`：文件存在 → `user.value = toAppUser(data)`；文件不存在 → **不修改 user**。

**`register({ name, email, password })`**
1. `name = name.trim()`、`email = email.trim()`；name 是空字串就 `throw new Error('請輸入暱稱')`（不呼叫任何 Firebase API）。
2. `credential = await createUserWithEmailAndPassword($fbAuth, email, password)`。
3. `await createProfile(uid, email, name)`，然後設定 `user.value`。
4. 任何一步丟出錯誤都直接往外拋，此時 `user.value` 不能被設定。

**`login(email, password)`**
1. `credential = await signInWithEmailAndPassword($fbAuth, email.trim(), password)`。
2. `getDoc(userRef(uid))`：存在 → 設定 `user.value`。
3. 不存在（註冊時寫入個人資料失敗留下的帳號）→ `createProfile(uid, email, email.split('@')[0])` 補建，再設定 `user.value`。
4. 錯誤直接往外拋。

**`logout()`**：`useNuxtApp().$dataSync.stop()` → `await signOut($fbAuth)` → `user.value = null`。

**`updateName(newName)`**：trim 後是空字串就 `throw new Error('暱稱不能空白')`；未登入就 `throw new Error('尚未登入')`；否則 `updateDoc(userRef, { name })` 並以不可變方式更新 `user.value`。

**`changePassword(currentPassword, newPassword)`**
1. `fbUser = $fbAuth.currentUser`；沒有就 `throw new Error('尚未登入')`。
2. `credential = EmailAuthProvider.credential(fbUser.email, currentPassword)`。
3. `await reauthenticateWithCredential(fbUser, credential)`（Firebase 規定改密碼前要最近登入過）。
4. `await updatePassword(fbUser, newPassword)`。
5. 錯誤直接往外拋。

### 7.10 `app/composables/useCatalog.ts`

```ts
export function useCatalog(): {
  sports: Ref<Sport[]>           // 已用 sortCatalog 排好
  categories: Ref<Category[]>    // 已用 sortCatalog 排好
  ready: Ref<boolean>            // 兩個集合都收到第一次 snapshot 後為 true
  startSync(uid: string): Unsubscribe
  reset(): void                  // 三個 state 設回初始值
  resolveSport(id: string): Sport
  resolveCategory(id: string): Category
  nextSportColor(): string
  addSport(name: string, color: string): Promise<void>
  updateSport(id: string, patch: { name?: string; color?: string }): Promise<void>
  removeSport(id: string): Promise<void>
  addCategory(name: string): Promise<void>
  updateCategory(id: string, name: string): Promise<void>
  removeCategory(id: string): Promise<void>
}
```

**`startSync(uid)`**：對 `users/{uid}/sports`、`users/{uid}/categories` 各註冊一個 `onSnapshot`。每次收到 snapshot，就把文件轉成 `{ id: d.id, ...d.data() }`，經過 `sortCatalog` 後**整個**指定給對應的 state。兩邊都至少收到一次後 `ready = true`。錯誤回呼 `console.error('[catalog] 同步運動清單失敗', error)`。回傳的函式會同時取消兩個監聽器。

**`resolveSport(id)`**：在 `sports` 裡找；找不到就回傳 `other`；連 `other` 都沒有（清單還沒載入）就回傳 `{ id: 'other', name: '其它', color: OTHER_SPORT_COLOR, order: 0 }`。`resolveCategory` 規則相同（沒有 color）。

**`nextSportColor()`**：`SPORT_COLOR_PRESETS[sports.length % SPORT_COLOR_PRESETS.length]`。

**驗證規則**（新增、修改前檢查，失敗時 `throw new Error(訊息)`，不呼叫 Firestore）：

| 情況 | 訊息 |
|------|------|
| 未登入 | `尚未登入` |
| 名稱 trim 後為空 | `名稱不能空白` |
| 名稱重複（`hasDuplicateName`） | `已經有同名的運動`／`已經有同名的類型` |
| 修改 `other` 的名稱 | `「其它」不能修改名稱` |
| 刪除 `other` | `「其它」不能刪除` |
| 顏色不是 `#rrggbb` | `顏色格式不正確` |

- `addSport`：`setDoc(doc(collection(db, 'users', uid, 'sports')), { name, color, order: nextOrder(sports) })`。
- `updateSport`：只寫入有傳的欄位（`updateDoc`）。`other` 傳了 `color` 可以；傳了和原本不同的 `name` 要拋錯。
- `addCategory`、`updateCategory` 同理。`updateCategory('other', ...)` 一律拋 `「其它」不能修改名稱`。

**`removeSport(id)`**（`removeCategory` 相同，欄位換成 `categoryId`）：
1. 驗證（不能是 `other`、要登入）。
2. 從 `useLogs().logs` 找出 `sportId === id` 的紀錄。
3. 用 `writeBatch` 把這些紀錄改成 `{ sportId: 'other', updatedAt: serverTimestamp() }`，最後一個 batch 再 `delete` 該運動文件。紀錄的文件路徑 MUST 用 `log.id`（`users/{uid}/logs/{log.id}`），不能用 `log.date`。
4. Firestore 單一 batch 最多 500 次寫入：每 400 筆紀錄 commit 一次，運動文件的刪除放在**最後一個** batch（MUST）。中途失敗時運動還在，不會出現孤兒紀錄。

### 7.11 `app/composables/useLogs.ts`

```ts
export function useLogs(): {
  logs: Ref<Record<string, LogEntry>>   // key 是文件 ID
  ready: Ref<boolean>
  startSync(uid: string): Unsubscribe
  reset(): void
  logsOn(key: string): LogEntry[]
  countUsing(field: 'sportId' | 'categoryId', id: string): number
  addLog(key: string, input: LogInput): Promise<void>
  updateLog(id: string, input: LogInput): Promise<void>
  removeLog(id: string): Promise<void>
}
```

- `startSync(uid)`：`onSnapshot(collection(db, 'users', uid, 'logs'), next, error)`。`next` 對每份文件呼叫 `d.data({ serverTimestamps: 'estimate' })`（剛寫入、還沒拿到伺服器時間的文件用本地估計值，同一天的排序才不會閃動），轉成 `LogEntry`（`createdAt` 取 `createdAt?.toMillis?.() ?? 0`），以**文件 ID** 為 key **整個**指定給 `logs.value`，並設定 `ready = true`。`error`：`console.error('[logs] 同步運動紀錄失敗', error)`。
- `logsOn(key)`：`date === key` 的紀錄，依 `createdAt` 升冪、再依 `id` 排序；沒有就回傳 `[]`。
- `countUsing(field, id)`：計算使用某個運動或類型的紀錄數（同一天多筆分別計算）。
- 以下三個函式未登入時都 `throw new Error('尚未登入')`，`note` 一律 `trim()`；不手動更新本地狀態，畫面由 onSnapshot 同步回來：
  - `addLog(key, input)`：`setDoc(doc(collection(db, 'users', uid, 'logs')), { date: key, sportId, categoryId, note, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })`。
  - `updateLog(id, input)`：`updateDoc(logRef(id), { sportId, categoryId, note, updatedAt: serverTimestamp() })`，不改 `date`、`createdAt`。
  - `removeLog(id)`：`deleteDoc(logRef(id))`。

### 7.12 Middleware

**`auth.ts`**（需要登入的頁面用 `definePageMeta({ middleware: 'auth' })`）：

```ts
export default defineNuxtRouteMiddleware((to) => {
  const { user } = useAuth()
  if (user.value) return
  return navigateTo(to.fullPath === '/'
    ? '/login'
    : { path: '/login', query: { redirect: to.fullPath } })
})
```

**`guest.ts`**（登入頁、註冊頁使用）：已登入就 `navigateTo(safeRedirect(to.query.redirect))`。

---

## 8. UI 規格

### 8.1 設計語彙

- 主色 emerald：主要按鈕 `bg-emerald-600 hover:bg-emerald-700`、強調文字 `text-emerald-600`。
- 中性色 slate：頁面背景 `bg-slate-50`、卡片 `bg-white border border-slate-200 rounded-2xl shadow-sm`、標題 `text-slate-900`、內文 `text-slate-500`、次要文字 `text-slate-400`。
- 危險操作用 red：`text-red-500`、`bg-red-50`、`bg-red-500`。
- 每頁頂端都有「小眉標 + 大標 + 副標」：
  - 眉標 `text-xs font-bold tracking-widest text-emerald-600`
  - 大標 `mt-2 text-2xl sm:text-3xl font-bold text-slate-900`
  - 副標 `mt-2 text-slate-500`
- 表單欄位：`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100`。label 和欄位 MUST 用 `for`/`id` 關聯。
- 表單驗證錯誤：`<p role="alert" class="text-sm text-red-500">`。
- 載入中的按鈕：`disabled`，加上 `disabled:cursor-wait disabled:opacity-70`，內容換成 `<AppSpinner />` + 進度文字。
- 需要確認的刪除操作一律用 `useConfirm().confirm(...)` 打開 `ConfirmDialog`（§8.5.1），回傳 false 就什麼都不做。不要用 `window.confirm`。
- 響應式斷點：`sm`（640px）、`md`（768px）。導覽列在 `md` 以下切換為手機版。

### 8.2 `app.vue`

```vue
<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <AppToast />
    <ConfirmDialog />
  </NuxtLayout>
</template>
```

### 8.3 Layouts

- `default.vue`：`<div class="min-h-screen bg-slate-50"><AppNavbar /><main><slot /></main></div>`
- `blank.vue`：同上，但**沒有** `<AppNavbar />`。登入頁、註冊頁使用這個 layout。

### 8.4 小型元件

**`AppLogoIcon.vue`**：`span.flex.h-9.w-9.shrink-0.items-center.justify-center.rounded-xl.bg-emerald-600.text-white`，裡面是 24×24 的 inline SVG（`h-5 w-5`），畫一個放射狀的球形圖示：8 條 stroke 放射線，路徑為 `M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5L19 19M19 5l-2.5 2.5M7.5 16.5L5 19`，加上中心 `circle r=3` 實心。

**`AppSpinner.vue`**：`h-4 w-4 animate-spin` 的 SVG，`aria-hidden="true"`。一個 `opacity-25` 的完整圓（r=9、stroke 3），加上一段 `M21 12a9 9 0 0 0-9-9` 的弧線。

**`UserAvatar.vue`**：props `{ name: string }`。`span.h-8.w-8.rounded-full.bg-emerald-500.text-sm.font-semibold.text-white`（置中），內容是 `name.charAt(0)`。

### 8.5 `AppToast.vue`

- `<Teleport to="body">`，容器 `pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2 px-4`。
- `<TransitionGroup name="toast">`，scoped CSS：`.toast-enter-active, .toast-leave-active { transition: all 0.2s ease }`，`.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px) }`。
- 每則 toast：`pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg`，`role="status"`，點擊會呼叫 `dismiss(id)`。
  - success：`bg-emerald-600`，前面加上 `✓`
  - error：`bg-red-500`，前面加上 `!`

### 8.5.1 `ConfirmDialog.vue`

一個簡易的確認 dialog，畫面上同時只會有一個，放在 `app.vue`，由 `useConfirm` 驅動。

- `<Teleport to="body">` 加上 `<Transition name="modal-fade">`（opacity 0.15s ease），`request` 有值時才顯示。
- 遮罩：`fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/50 p-4`。z-index 要高於 `LogModal`（`z-50`），低於 toast（`z-[60]`），因為會從 LogModal 裡面打開。點遮罩本身（`@click.self`）等於按「取消」。
- 卡片：`w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl`，加上 `role="alertdialog"`、`aria-modal="true"`、`aria-labelledby="confirm-title"`、`aria-describedby="confirm-message"`。
  - 標題：`<h3 id="confirm-title" class="text-lg font-bold text-slate-900">`，文字是 `title`
  - 內文：`<p id="confirm-message" class="mt-2 text-sm text-slate-500">`，文字是 `message`
  - 按鈕列 `mt-6 flex justify-end gap-2`：
    - 「取消」：`rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100` → `answer(false)`
    - 確認按鈕：`rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600`，文字是 `confirmLabel` → `answer(true)`
- 鍵盤：打開時把焦點移到「取消」按鈕（避免按 Enter 就誤刪）；按 `Escape` 等於「取消」。

### 8.6 `AppNavbar.vue`

結構：`header.sticky.top-0.z-30.border-b.border-slate-200.bg-white/90.backdrop-blur`，內層 `mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6`。

- 左側 Logo：`<NuxtLink to="/">`，內容是 `<AppLogoIcon class="shadow-sm" />` 加上文字「運動」與綠色的「筆記本」（`<span class="text-emerald-600">`）。
- 導覽連結 `NAV_LINKS`（固定陣列，navbar 只出現在需要登入的頁面）：
  ```ts
  [
    { to: '/', label: '月曆' },
    { to: '/stats', label: '統計' },
    { to: '/settings', label: '設定' },
  ]
  ```
- **桌面版（`hidden md:flex`）**：
  - 連結 `text-sm font-medium text-slate-500`。目前頁面的連結用 `exact-active-class` 變成 `text-slate-900`，底部加一條 `h-0.5` 的 emerald 底線（用 `after:` 偽元素定位在 header 底邊，`after:-bottom-[21px]`）。
  - 使用者區塊（`group relative`，只在 `user` 有值時顯示），按鈕內是 `<UserAvatar>` 加暱稱。滑鼠移上去（`group-hover:visible group-hover:opacity-100`）會從右下方出現下拉選單：上方小字顯示 `user.email`（`text-xs text-slate-400 truncate`），下方一個紅色的「登出」按鈕。下拉選單外層要有 `pt-1`，讓滑鼠從頭像移到選單時不會中斷 hover。
- **手機版**：
  - 右側漢堡按鈕 `aria-label="開啟選單"`，點擊會切換 `mobileOpen`。圖示在三條線和 X 之間切換。
  - 展開的面板 `absolute inset-x-0 top-full ... shadow-lg md:hidden`。**要浮在頁面內容上方，不能把內容往下推**（MUST）。
  - 面板內容：垂直排列的導覽連結（目前頁面加上 `bg-emerald-50 text-emerald-700`）；下方用分隔線隔開，放「頭像 + 暱稱」，右側放紅色的「登出」文字按鈕。
  - `watch(() => route.fullPath)`：一換頁就把 `mobileOpen` 設為 false。
- **登出 `handleLogout`**：
  - `loggingOut` 已經是 true 就 return（防止連點）。
  - 設定 `loggingOut = true`，按鈕 disabled，文字變成「登出中…」。
  - 成功：toast success「已登出」，然後 `router.push('/login')`；失敗：toast error `` `登出失敗：${errorMessage(error)}` ``。
  - `finally` 中把 `loggingOut` 設回 false，並把 `mobileOpen` 設為 false。

### 8.7 `pages/login.vue`

- `definePageMeta({ layout: 'blank', middleware: 'guest' })`；`useHead({ title: '登入 · 運動筆記本' })`。
- 版面：全螢幕置中（`flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12`），卡片 `w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm`。
- 卡片內容：
  - 頂部：`<AppLogoIcon />` 加文字「運動筆記本」
  - 眉標「WELCOME BACK」（`mt-8`）、大標「登入運動筆記本」、副標「記錄每一次練習，看見自己的進步。」
  - 表單 `@submit.prevent="submit"`：
    - 「Email」：`<input id="email" type="email" autocomplete="email" placeholder="you@example.com" required>`
    - 「密碼」：`<input id="password" type="password" autocomplete="current-password" placeholder="輸入密碼" required>`
    - 送出中兩個欄位都 disabled
    - 提交按鈕 `type="submit"` 滿寬，文字「登入 →」；送出中變成 `<AppSpinner />` 加「登入中…」
  - 表單下方置中小字：「還沒有帳號？」加上 emerald 連結「建立帳號」→ `/register`，**保留目前的 `redirect` query**。
- `submit()`：
  1. `submitting` 是 true 就 return。
  2. 設定 `submitting = true`，`await login(email, password)`。
  3. 成功：toast success `` `歡迎回來，${user.value.name}！` ``，再 `await router.push(safeRedirect(route.query.redirect))`。
  4. 失敗：toast error `` `登入失敗：${authErrorMessage(error)}` ``，清空密碼欄，停留在登入頁。
  5. `finally` 中設定 `submitting = false`。

### 8.8 `pages/register.vue`

- `definePageMeta({ layout: 'blank', middleware: 'guest' })`；`useHead({ title: '註冊 · 運動筆記本' })`。
- 版面同登入頁。
- 卡片內容：
  - 頂部同登入頁
  - 眉標「GET STARTED」、大標「建立帳號」、副標「只要一分鐘，開始你的運動筆記。」
  - 表單欄位（依序）：
    - 「暱稱」：`id="nickname"`，`maxlength="20"`，placeholder「顯示在導覽列的名字」
    - 「Email」：`id="email"`，`type="email"`，`autocomplete="email"`，placeholder「you@example.com」
    - 「密碼」：`id="password"`，`type="password"`，`autocomplete="new-password"`，placeholder「至少 6 個字元」
    - 「確認密碼」：`id="password-confirm"`，`type="password"`，`autocomplete="new-password"`，placeholder「再次輸入密碼」
  - 驗證錯誤顯示在按鈕上方（`role="alert"`）。
  - 提交按鈕「建立帳號 →」；送出中變成 `<AppSpinner />` 加「建立中…」。
  - 表單下方置中小字：「已經有帳號了？」加上連結「登入」→ `/login`（保留 `redirect` query）。
- `submit()`：
  1. `submitting` 是 true 就 return；清空錯誤訊息。
  2. 前端驗證，依序檢查，第一個失敗就顯示訊息並 return（不呼叫 API）。表單加上 `novalidate`，讓這裡的驗證訊息一定會出現，不被瀏覽器內建的欄位檢查攔下：
     - 暱稱 trim 後為空 →「請輸入暱稱」
     - 密碼長度 < 6 →「密碼長度至少需要 6 個字元」
     - 兩次密碼不一致 →「兩次輸入的密碼不一致」
  3. `await register({ name, email, password })`。
  4. 成功：toast success `` `歡迎，${user.value.name}！` ``，`await router.push(safeRedirect(route.query.redirect))`。
  5. 失敗：toast error `` `註冊失敗：${authErrorMessage(error)}` ``，停留在註冊頁。
  6. `finally` 中設定 `submitting = false`。

### 8.9 `pages/index.vue`（月曆）

- `definePageMeta({ middleware: 'auth' })`；`useHead({ title: '月曆 · 運動筆記本' })`。
- 外層 `mx-auto max-w-6xl px-4 py-10 sm:px-6`。
- 標頭：
  - 眉標「MY NOTEBOOK · 運動筆記本」
  - 大標「今天動了嗎？」
  - 副標「點選任一天，記錄你的運動與心得。」
- 月曆卡片（`mt-8 overflow-hidden rounded-2xl border bg-white shadow-sm`）：
  - **工具列**：
    - 左側：「上個月」按鈕（`aria-label="上個月"`，左箭頭）、月份文字 `` `${viewYear} 年 ${viewMonth + 1} 月` ``（固定寬度 `w-28 sm:w-32` 置中）、「下個月」按鈕（`aria-label="下個月"`）
    - 右側：「今天」按鈕，按下後回到今天所在的月份
  - **星期列**：7 欄，顯示 `WEEKDAYS`（一、二…日）。「六」「日」用 `text-slate-400`，其他用 `text-slate-500`。
  - **日期格**：`grid grid-cols-7`，每格 `min-h-[92px] sm:min-h-[130px] p-1.5 sm:p-2 border-b border-r border-slate-100`
- 狀態：
  - `todayKey = formatDateKey(new Date())` 在 setup 時計算一次。
  - `viewYear`、`viewMonth` 預設是今天所在的年月。
  - `shiftMonth(delta)` 用 `new Date(viewYear, viewMonth + delta, 1)` 計算，可以跨年。
- `MAX_VISIBLE = 2`：每格最多顯示幾個運動標籤。
- `cells`（computed）：`buildMonthGrid(...)` 的每一格再加上（`logs = logsOn(key)`）：
  - `tags`：前 `MAX_VISIBLE` 筆紀錄，各自是 `{ id, sport: resolveSport(log.sportId) }`
  - `hiddenCount = max(logs.length - MAX_VISIBLE, 0)`
  - `only`：剛好 1 筆時是 `{ category: resolveCategory(...), note }`，否則 null
  - `disabled = !inCurrentMonth`（**過去、今天、未來都可以點**，只有非當月不能點）
- 每一格：
  - `:aria-disabled="cell.disabled"`；disabled 時 `cursor-not-allowed bg-slate-50/60`，否則 `cursor-pointer hover:bg-slate-50`
  - 點擊：`!cell.disabled && openDay(cell.key)`
  - 日期數字（圓形 `h-6 w-6 sm:h-7 sm:w-7`）的顏色：非當月 → `text-slate-300`；今天 → `bg-emerald-600 text-white`；其他 → `text-slate-700`
  - 有紀錄而且是當月時，在數字下方依序顯示：
    1. 每個 `tag` 一個運動標籤（依建立先後）：`mt-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold sm:text-xs`，inline style `{ backgroundColor: sport.color, color: readableTextColor(sport.color) }`，文字是 `sport.name`
    2. `hiddenCount > 0` 時：`mt-0.5 text-[11px] font-semibold text-emerald-600 sm:text-xs`，文字 `` `+${hiddenCount}` ``（例如「+2」）
    3. **只在當天剛好 1 筆時**才顯示類型（`mt-0.5 truncate text-[11px] text-slate-500`）與筆記（`note` 不是空字串才顯示，`mt-0.5 hidden truncate text-[11px] text-slate-400 sm:block`），避免格子太擠
- `openDay(key)`：設定 `activeDateKey = key`、`modalOpen = true`。
- 頁面底部放 `<LogModal v-model="modalOpen" :date-key="activeDateKey" />`。

### 8.10 `LogModal.vue`（當日紀錄視窗）

Props：`{ modelValue: boolean; dateKey: string | null }`；emits：`'update:modelValue'`。用 `v-model` 綁定。

**顯示條件**：`modelValue && dateKey` 都成立時才顯示。用 `<Teleport to="body">` 包住，再包一層 `<Transition name="modal-fade">`（opacity 0.15s ease）。

視窗有兩種畫面，在同一個視窗內切換：**列表**（當天所有紀錄）與**表單**（新增或編輯一筆）。

**狀態**：
- `view: 'list' | 'form'`
- `editingId: string | null`：表單在編輯哪一筆；null 表示新增
- `form = reactive({ sportId: '', categoryId: '', note: '' })`
- `saving: boolean`、`deletingId: string | null`；`busy = saving || deletingId !== null`
- `dayLogs = computed(() => logsOn(dateKey))`

**`openForm(id)`**：設定 `editingId = id`、`view = 'form'`，並帶入表單：
- 編輯（找得到那一筆）：帶入紀錄的值；`sportId`、`categoryId` 已經不在清單裡時改用 `other`
- 新增：`sportId = sports[0].id`、`categoryId = categories[0].id`、`note = ''`（清單第一個，一開始是桌球、練習）

**開啟時重設（MUST）**：`watch(() => [props.modelValue, props.dateKey], ...)`，每次「打開」或「換日期」時：`editingId = null`；`dayLogs` 有資料 → `view = 'list'`，沒有 → `openForm(null)`。另外：
- 清單還沒載入（`ready` 為 false）而停在表單時，等 `ready` 變成 true 再 `openForm(editingId)` 一次
- 編輯中的那一筆被其他分頁刪掉（不在 `dayLogs` 裡了）→ 回到列表

**共同結構**：
- 遮罩：`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4`，`@click.self="close"`。`busy` 時點遮罩不關閉。
- 卡片：`w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7`。
- 標頭左側：
  - 小眉標：列表是 `` `${WEEKDAY_EN} · LOGS` ``；表單是 `` `${WEEKDAY_EN} · ${editingId ? 'EDIT' : 'NEW ENTRY'}` ``。`WEEKDAY_EN` 依 `parseDateKey(dateKey).getDay()` 取 `SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY`。
  - `h3`：`` `${dateKey} 運動紀錄` ``（例如「2026-10-20 運動紀錄」），兩種畫面相同。
- 標頭右側：關閉按鈕 `aria-label="關閉"`（X 圖示）。

**列表畫面**（`mt-5`）：
- 沒有紀錄時：置中小字「這天還沒有紀錄」（`py-6 text-sm text-slate-400`）。
- 有紀錄時：`ul.max-h-72.divide-y.overflow-y-auto`，每列 `li[data-log-item]`（`flex items-center gap-2`）：
  - 左側整塊是按鈕（點擊 → `openForm(log.id)`）：第一行是運動標籤（同月曆樣式，`text-xs`）加類型名稱（`text-sm text-slate-500`）；有筆記時第二行顯示筆記（`truncate text-sm text-slate-400`）
  - 右側刪除按鈕：垃圾桶圖示，`aria-label="刪除這筆紀錄"`，`text-slate-400 hover:bg-red-50 hover:text-red-500`；這一列正在刪除時換成 `<AppSpinner />`
  - `busy` 時所有列的按鈕都 disabled
- 列表下方滿寬虛線按鈕「＋ 新增一筆紀錄」（`border border-dashed border-emerald-300 text-emerald-600`，`＋` 是全形）→ `openForm(null)`；`busy` 時 disabled。

**表單畫面**（`@submit.prevent="save"`，`mt-5 space-y-4`）：
- 「運動」：`<select id="log-sport">`，選項是 `sports`，option 文字是名稱
- 「類型」：`<select id="log-category">`，選項是 `categories`
- 「筆記」：`<textarea id="log-note" rows="4" maxlength="1000" placeholder="今天練了什麼？有什麼心得？（選填）">`
- 清單還沒載入或 `saving` 時，所有欄位與主要按鈕 disabled
- 主要按鈕（`type="submit"`，滿寬，`rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white`）：新增時「儲存紀錄」，編輯時「更新紀錄」；`saving` 時是 `<AppSpinner />` 加「儲存中…」
- 當天已有紀錄時，主要按鈕下方置中顯示文字按鈕「← 返回列表」（`mt-3 text-sm font-semibold text-slate-500`），不儲存直接回到列表；當天沒有紀錄時不顯示
- 表單畫面**沒有**刪除按鈕，刪除只在列表

**`save()`**：
1. 沒有 `dateKey` 或 `busy` 就 return。
2. `saving = true`；`editingId` 有值 → `await updateLog(editingId, { ...form })`，否則 `await addLog(dateKey, { ...form })`。
3. 成功：toast success `` `已儲存 ${formatDateLabel(dateKey)} 的紀錄` ``，`editingId = null`、`view = 'list'`。**不關閉視窗**，方便連續新增。
4. 失敗：停留在表單，toast error `` `儲存失敗：${errorMessage(error)}` ``。
5. `finally`：`saving = false`。

**`remove(id)`**（列表上的刪除按鈕）：
1. 沒有 `dateKey` 或 `busy` 就 return；在 `dayLogs` 找不到這筆也 return。
2. `await confirm({ title: '刪除紀錄', message: `確定要刪除 ${formatDateLabel(dateKey)} 的「${resolveSport(log.sportId).name}」紀錄嗎？` })` 為 false 就 return。內文帶運動名稱，同一天有多筆時才分得出是哪一筆。
3. `deletingId = id`，`await removeLog(id)`。
4. 成功：toast success `` `已刪除 ${formatDateLabel(dateKey)} 的紀錄` ``，停留在列表（不關閉視窗）。
5. 失敗：toast error `` `刪除失敗：${errorMessage(error)}` ``。
6. `finally`：`deletingId = null`。

### 8.11 `pages/settings.vue`

- `definePageMeta({ middleware: 'auth' })`；`useHead({ title: '設定 · 運動筆記本' })`。
- 整頁用 `v-if="user"` 包住；外層 `mx-auto max-w-4xl px-4 py-10 sm:px-6`。
- 標頭：眉標「SETTINGS」、大標「設定」、副標「管理你的個人資料、運動項目與密碼。」
- 卡片頂部：`UserAvatar`（放大成 `h-14 w-14 text-xl`）、暱稱、Email、「加入於 {joinedAt}」。
- 四個區塊，各自獨立儲存，用 `sm:grid-cols-[200px_1fr]` 排成「左說明、右內容」，區塊之間用分隔線隔開：

**① 基本資料**（「基本資料」／「暱稱會顯示在導覽列。」）
- 「暱稱」：`id="settings-name"`、`maxlength="20"`，初始值取自 user，`watch` 跟著 user 更新。
- 按鈕「儲存暱稱」：trim 後為空或和目前暱稱相同時 disabled；送出中顯示「儲存中…」。
- 成功 toast「暱稱已更新」；失敗 toast `` `更新失敗：${errorMessage(error)}` ``。

**② 運動項目**（「運動項目」／「新增紀錄時可選擇的運動，顏色會顯示在月曆上。」）
- `<CatalogEditor kind="sport" />`

**③ 運動類型**（「運動類型」／「用來標記運動的性質，方便之後篩選。」）
- `<CatalogEditor kind="category" />`

**④ 修改密碼**（「修改密碼」／「修改後，下次登入請使用新密碼。」）
- 「目前密碼」`id="current-password"`（`autocomplete="current-password"`）
- 「新密碼」`id="new-password"`（placeholder「至少 6 個字元」，`autocomplete="new-password"`）
- 「確認新密碼」`id="new-password-confirm"`（placeholder「再次輸入新密碼」）
- 按鈕「更新密碼」；送出中顯示「更新中…」。
- 前端驗證（依序，失敗就顯示 `role="alert"` 訊息並 return；表單加上 `novalidate`）：
  - 目前密碼為空 →「請輸入目前密碼」
  - 新密碼長度 < 6 →「密碼長度至少需要 6 個字元」
  - 兩次不一致 →「兩次輸入的密碼不一致」
  - 新密碼和目前密碼相同 →「新密碼不能與目前密碼相同」
- 呼叫 `changePassword`。成功：清空三個欄位，toast「密碼已更新」；失敗：toast `` `更新密碼失敗：${authErrorMessage(error)}` ``，只清空「目前密碼」。

### 8.12 `CatalogEditor.vue`

Props：`{ kind: 'sport' | 'category' }`。依 kind 對應 `useCatalog` 的 sport 或 category 系列函式，下表的 `{名詞}` 是「運動」或「類型」。

| | sport | category |
|---|---|---|
| 清單 | `sports` | `categories` |
| 有顏色 | 是 | 否 |
| 新增欄位 placeholder | `新增運動，例如：羽球` | `新增類型，例如：比賽` |
| 新增欄位 aria-label | `新增運動名稱` | `新增類型名稱` |
| 編輯欄位 aria-label | `運動名稱` | `類型名稱` |

**清單**（`divide-y divide-slate-100`），每列 `flex items-center gap-3 py-3`：
- sport 才有：`<input type="color" :aria-label="`${item.name} 的顏色`" class="h-8 w-8 cursor-pointer rounded-lg border border-slate-200">`。顏色在 `change` 事件（不是 `input`）時呼叫 `updateSport(id, { color })`，成功不跳 toast，失敗 toast `` `更新失敗：${msg}` ``。
- 名稱（`flex-1 text-sm font-medium text-slate-700`）。
- `other` 那一列：名稱後面加一個膠囊「固定」（`rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500`），**沒有**編輯、刪除按鈕（運動的「其它」仍可改顏色）。
- 其他列：右側「編輯」（`text-sm text-slate-500`）、「刪除」（`text-sm text-red-500`）文字按鈕。
- 編輯模式（同時只有一列能編輯）：名稱變成輸入框（`maxlength="20"`，預設帶入原名稱，按 Enter 等同儲存），右側按鈕變成「儲存」、「取消」。輸入框 trim 後為空時「儲存」disabled。
  - 儲存成功 toast `` `已更新「${newName}」` ``，離開編輯模式；失敗 toast `` `更新失敗：${msg}` ``，維持編輯模式。

**新增列**（清單下方，`mt-3 flex gap-2`）：
- sport 才有：顏色選擇器 `aria-label="新運動的顏色"`，預設 `nextSportColor()`，每次新增成功後重設；另外 `watch` 運動清單的長度，清單載入或變動時也重設（元件掛載時清單可能還沒載入，只在 setup 取一次會一直是第一個顏色）。
- 名稱輸入框（`maxlength="20"`，按 Enter 等同新增）。
- 按鈕「新增」：trim 後為空時 disabled。
- 成功 toast `` `已新增「${name}」` ``，清空輸入框；失敗 toast `` `新增失敗：${msg}` ``。

**刪除**：
1. `count = countUsing(kind === 'sport' ? 'sportId' : 'categoryId', id)`
2. 打開確認 dialog：
   - 標題：sport 是「刪除運動」，category 是「刪除類型」
   - 內文：`count > 0` 時是 `` `確定要刪除「${name}」嗎？有 ${count} 筆紀錄會改為「其它」。` ``，否則是 `` `確定要刪除「${name}」嗎？` ``
3. 按「刪除」後才呼叫 remove；按「取消」、點遮罩或按 Escape 就什麼都不做。成功 toast `` `已刪除「${name}」` ``；失敗 toast `` `刪除失敗：${msg}` ``。
4. 紀錄還沒載入（`useLogs().ready` 為 false）時，刪除按鈕 disabled，避免算錯要改的紀錄。

**處理中**：用 `busy` 狀態（例如 `'add'`、`` `rename:${id}` ``、`` `delete:${id}` ``、`` `color:${id}` ``）鎖住整個編輯器，同一個編輯器同時只能有一個操作進行中，期間所有按鈕和輸入框 disabled，正在處理的那顆按鈕顯示 `<AppSpinner />`。

上表的 `{msg}` 一律是 `errorMessage(error)`。

### 8.13 `pages/stats.vue`

- `definePageMeta({ middleware: 'auth' })`；`useHead({ title: '統計 · 運動筆記本' })`。
- 外層 `mx-auto max-w-4xl px-4 py-10 sm:px-6`。
- 標頭：眉標「INSIGHTS · 統計」、大標「運動統計」、副標「看看這段期間你都練了些什麼。」

**期間控制列**（卡片內）：
- 模式切換（分段按鈕，選中的用 `bg-emerald-600 text-white`，按鈕加 `:aria-pressed`）：「週」、「月」、「自訂」。預設「週」。
- 切換模式時，期間重設為該模式的預設值：
  - 週 → `lastWeekRange(today)`（上週一 ~ 上週日）
  - 月 → `lastMonthRange(today)`（上個月）
  - 自訂 → `lastWeekRange(today)`
- 週、月模式：「上一期」按鈕（`aria-label="上一期"`）、期間文字 `formatRangeLabel(mode, range)`、「下一期」按鈕（`aria-label="下一期"`），用 `shiftRange` 切換。可以切到未來。
- 自訂模式：「開始日期」`<input id="range-start" type="date">`、「結束日期」`<input id="range-end" type="date">`。開始晚於結束、或任一欄位被清空時，顯示 `role="alert"` 訊息「開始日期不能晚於結束日期」，下方統計全部以空資料呈現。
- 篩選：「運動」`<select id="stats-sport">`，第一個選項「全部運動」（value `''`），其餘是 `sports`；「類型」`<select id="stats-category">`，第一個選項「全部類型」，其餘是 `categories`。預設都是全部。

**計算**：
- `entries = filterLogs(logs, { range, sportId, categoryId })`
- `sportCounts = countBy(entries, 'sportId', sports.map(s => s.id))`
- `categoryCounts = countBy(entries, 'categoryId', categories.map(c => c.id))`
- `groups = groupByDate(entries)`、`activeDays = countDates(entries)`

**摘要卡**（`grid grid-cols-2 gap-3 sm:grid-cols-4`，每張 `rounded-2xl border bg-white p-4`，依序加上 `data-stat="count"`、`data-stat="days"`、`data-stat="period"`、`data-stat="top"` 供測試定位）：

| 標題 | 數值 |
|------|------|
| 運動次數 | `entries.length`（紀錄筆數），後面加小字「次」 |
| 運動天數 | `activeDays`（有紀錄的日期數），後面加小字「天」 |
| 期間天數 | `countDays(range)`，後面加小字「天」；自訂期間無效時顯示「—」 |
| 最常做的運動 | `sportCounts[0]` 對應的運動名稱（依**次數**）；沒有資料時顯示「—」 |

**長條圖**（兩張卡片，`sm:grid-cols-2`，分別加上 `data-chart="sport"`、`data-chart="category"`）：「依運動」、「依類型」。
- 每列：上方是名稱和 `` `${count} 次` ``，下方是 `h-2 rounded-full bg-slate-100` 的軌道，裡面的長條寬度 `` `${count / 最大 count * 100}%` ``。
- 「依運動」的長條顏色用運動顏色（inline style）；「依類型」用 `bg-emerald-500`。
- 沒有資料時顯示「沒有資料」（`text-sm text-slate-400`）。

**紀錄列表**（「紀錄列表」標題，加上 `` `共 ${entries.length} 筆` ``）：
- 依日期分組，每個日期一列（`button`，加上 `data-day-row`，點擊打開該天的 `LogModal` 列表）：
  - 左側日期區塊（寬 `w-14` 置中）：大字是日期補零兩位（例如 `05`），小字是 `` `${month}月・週${weekdayLabel(date)}` ``（例如「10月・週一」；`・` 是全形中點 U+30FB，月份不補零）
  - 右側（`space-y-2`）：當天每一筆紀錄一個區塊（加上 `data-log-row`，依建立先後）：運動標籤（同月曆的樣式）加上類型名稱；下一行是筆記，`line-clamp-2 text-sm text-slate-500`，沒有筆記時不顯示
- 空清單：「這段期間沒有符合條件的紀錄」。
- 頁面底部放 `<LogModal v-model="modalOpen" :date-key="activeDateKey" />`。在 modal 裡修改或刪除後，統計會由 onSnapshot 即時更新。

---

## 9. 關鍵使用流程

### 9.1 註冊

1. 訪客打開 `/` → `auth` middleware 導到 `/login`。
2. 點「建立帳號」→ `/register`，填暱稱、Email、密碼 → `createUserWithEmailAndPassword`。
3. 一個 batch 寫入 `users/{uid}`、預設運動（桌球、其它）、預設類型（練習、其它）。
4. toast「歡迎，小明！」→ 導到 `/`。`data` plugin 看到 uid 出現，開始同步清單與紀錄。

### 9.2 登入後回到原本的頁面

1. 未登入時打開 `/stats` → 導到 `/login?redirect=/stats`。
2. 登入成功 → toast「歡迎回來，小明！」→ `router.push('/stats')`。

### 9.3 新增、編輯與刪除紀錄

1. 在月曆點 10/20（當天沒有紀錄）→ `LogModal` 直接顯示「TUESDAY · NEW ENTRY」，下拉選單預設是桌球、練習。
2. 寫筆記 → 按「儲存紀錄」→ `setDoc(users/{uid}/logs/{自動 ID})` → toast「已儲存 10/20 的紀錄」→ 視窗切到列表「TUESDAY · LOGS」，出現剛才那一筆。
3. 按「＋ 新增一筆紀錄」→ 改選「其它」→ 儲存 → 列表有 2 筆，依建立先後排列。
4. 關閉視窗 → 月曆的 10/20 出現兩個運動標籤（不顯示類型與筆記，因為不只一筆）。
5. 再點 10/20 → 直接是列表；點第一筆 → 「TUESDAY · EDIT」，表單帶入原本的值，按鈕是「更新紀錄」，下方有「← 返回列表」。
6. 在列表按第二筆右側的垃圾桶 → 確認 dialog「確定要刪除 10/20 的「其它」紀錄嗎？」→ 按「刪除」→ toast「已刪除 10/20 的紀錄」，列表剩 1 筆。

### 9.4 刪除運動項目

1. 設定頁刪除「桌球」，這個運動有 3 筆紀錄 → 跳出「刪除運動」dialog，內文「確定要刪除「桌球」嗎？有 3 筆紀錄會改為「其它」。」
2. 按「刪除」→ 先批次把 3 筆紀錄的 `sportId` 改為 `other`，再刪除「桌球」→ toast「已刪除「桌球」」。
3. 月曆上那 3 天變成灰底的「其它」。

### 9.5 重新整理後維持登入

1. App 啟動時先顯示 SPA 載入畫面。
2. `auth` plugin 等 `onAuthStateChanged` 回傳已登入的 user → `syncUser` 讀 `users/{uid}` → 設定 `user`。
3. `data` plugin 開始同步；這時候才進行路由，所以 `/settings` 的 middleware 拿得到 user。

---

## 10. 文案總表

### 10.1 Toast

| 情境 | 類型 | 文案 |
|------|------|------|
| 登入成功 | success | `歡迎回來，{name}！` |
| 登入失敗 | error | `登入失敗：{authMsg}` |
| 註冊成功 | success | `歡迎，{name}！` |
| 註冊失敗 | error | `註冊失敗：{authMsg}` |
| 登出成功 | success | `已登出` |
| 登出失敗 | error | `登出失敗：{msg}` |
| 紀錄儲存成功 | success | `已儲存 {M/D} 的紀錄` |
| 紀錄儲存失敗 | error | `儲存失敗：{msg}` |
| 紀錄刪除成功 | success | `已刪除 {M/D} 的紀錄` |
| 紀錄刪除失敗 | error | `刪除失敗：{msg}` |
| 暱稱更新成功 | success | `暱稱已更新` |
| 暱稱／運動／類型更新失敗 | error | `更新失敗：{msg}` |
| 新增運動／類型成功 | success | `已新增「{name}」` |
| 新增運動／類型失敗 | error | `新增失敗：{msg}` |
| 運動／類型改名成功 | success | `已更新「{name}」` |
| 刪除運動／類型成功 | success | `已刪除「{name}」` |
| 刪除運動／類型失敗 | error | `刪除失敗：{msg}` |
| 密碼更新成功 | success | `密碼已更新` |
| 密碼更新失敗 | error | `更新密碼失敗：{authMsg}` |

冒號都是**全形**「：」；`{M/D}` 由 `formatDateLabel` 產生；`{msg}` 是 `errorMessage(error)`，`{authMsg}` 是 `authErrorMessage(error)`。

### 10.2 確認 dialog

所有確認 dialog 的按鈕都是「取消」和「刪除」。

| 情境 | 標題 | 內文 |
|------|------|------|
| 刪除紀錄 | `刪除紀錄` | `確定要刪除 {M/D} 的「{運動名稱}」紀錄嗎？` |
| 刪除有紀錄的運動／類型 | `刪除運動`／`刪除類型` | `確定要刪除「{name}」嗎？有 {count} 筆紀錄會改為「其它」。` |
| 刪除沒有紀錄的運動／類型 | `刪除運動`／`刪除類型` | `確定要刪除「{name}」嗎？` |

---

## 11. 測試規格

### 11.1 目標與策略

- 測試**完全不能**連到真正的 Firebase。
- 分兩層：
  - **單元測試**（`test/unit/`）：純函式和 composables 的邏輯。
  - **整合測試**（`test/integration/`）：掛載真實的頁面和元件，經過真的 composables、plugins（包含 onSnapshot 即時同步）、router 和 middleware。只有 Firebase SDK 換成記憶體版的假實作。
- Firebase 的替換方式（MUST）：在 Nuxt 測試環境用 **Nuxt `alias`**，把 `firebase/app`、`firebase/auth`、`firebase/firestore` 整個換成 `test/mocks/` 裡的假模組。
  - 不要用 `vi.mock`。Nuxt 測試環境會在測試檔的 `beforeAll` 之前就啟動 app 並執行 plugins，用 alias 才能確保 plugins、composables、測試檔三方拿到的是同一套假實作。

### 11.2 目錄結構

```
test/
├── mocks/
│   ├── firebase-backend.ts     # 共用的記憶體狀態與測試 helper
│   ├── firebase-app.ts
│   ├── firebase-auth.ts
│   └── firebase-firestore.ts
├── setup/
│   └── nuxt.ts                 # Nuxt 環境的 setupFiles
├── unit/
│   ├── utils/                  # node 環境
│   │   ├── date.test.ts
│   │   ├── colors.test.ts
│   │   ├── catalog.test.ts
│   │   ├── error.test.ts
│   │   ├── redirect.test.ts
│   │   └── stats.test.ts
│   └── composables/            # nuxt 環境
│       ├── useAuth.test.ts
│       ├── useCatalog.test.ts
│       ├── useConfirm.test.ts
│       ├── useLogs.test.ts
│       └── useToast.test.ts
└── integration/                # nuxt 環境
    ├── helpers.ts
    ├── login.test.ts
    ├── register.test.ts
    ├── calendar.test.ts
    ├── confirm-dialog.test.ts
    ├── log-modal.test.ts
    ├── settings.test.ts
    ├── stats.test.ts
    └── navbar-and-session.test.ts
```

### 11.3 `vitest.config.ts`

```ts
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
```

`npm run test:unit` 和 `npm run test:integration` 是用路徑篩選，會跨 project 執行。

**`fsModuleCache: false`（MUST）：** Vitest 5 預設開啟 `fsModuleCache`，會把轉譯後的模組存到 `node_modules/.vitest-cache` 供下次重用。`@nuxt/test-utils` 啟動 Nuxt 用的 `nuxt-vitest-app-entry.js` 是記憶體中的虛擬模組，從快取讀回時路徑會變成 `/node_modules/nuxt/...`（少了專案目錄），解析不到 `./diagnostics/core.js`。症狀是清掉快取後第一次全部通過，第二次起每個 Nuxt 測試檔都在啟動階段失敗（測試全部 skipped）。只需要在 `nuxt` project 關閉；`unit` project 不受影響。日後兩個套件修正相容性後可以移除。

### 11.4 假 Firebase 的規格

#### `firebase-backend.ts`（共用狀態）

```ts
backend = {
  store: Map<string /* 完整文件路徑，例如 'users/uid-1/logs/auto-3' */, Record<string, unknown>>,
  accounts: Map<string /* email */, { uid: string; password: string }>,
  currentUser: { uid: string; email: string } | null,
  authListeners: Set<(user) => void>,
  collectionListeners: Map<string /* 集合路徑，例如 'users/uid-1/logs' */, Set<() => void>>,
  uidSeq: number,   // 產生 'uid-1'、'uid-2'…
  autoIdSeq: number, // 產生 'auto-1'、'auto-2'…
  clock: number,    // serverTimestamp 遞增用
}
```

- **MUST 掛在 `globalThis.__FAKE_FIREBASE_BACKEND__` 上**（`globalThis[key] ??= createBackend()`）。`@nuxt/test-utils` 會呼叫 `vi.resetModules()`，同一個檔案可能被載入成多個模組實例；狀態只存在模組變數裡的話，setup 檔重設的那份就不是 app 在用的那份。
- 匯出的 helper：
  - `nextUid()`、`nextAutoId()`
  - `notifyAuth()`
  - `notifyCollection(path)`
  - `resetBackend()`：清空 store、accounts、currentUser、各計數器。**保留**所有監聽器，並通知原本有資料的集合。
  - `seedDoc(path, data)`：直接寫入一份文件（`path` 是完整文件路徑）並通知該集合的監聽器。
  - `readDoc(path)`、`listDocs(collectionPath)`、`parentOf(path)`（取上一層集合路徑）
  - `backend`（共用狀態物件本身，假 SDK 模組直接讀寫它）
  - `fakeTimestamp(millis)` → `{ toMillis: () => millis }`
  - `seedAccount(email, password)` → 建立帳號並回傳 uid，不登入
  - `signInAs(uid, email)`：設定 currentUser 並 `notifyAuth()`，模擬 Firebase 還原登入狀態。
  - `fakeAuthError(code)` → `Object.assign(new Error(code), { code })`

#### `firebase-app.ts`

- `initializeApp(options)` → `{ name: '[DEFAULT]', options }`

#### `firebase-auth.ts`

所有函式都用 `vi.fn(impl)` 包起來，讓測試可以斷言呼叫次數，或用 `mockRejectedValueOnce` 注入錯誤。

- `export type User = FakeUser`
- `getAuth()` → 物件，帶有 `get currentUser()`（讀 `backend.currentUser`）
- `createUserWithEmailAndPassword(auth, email, password)`：
  - email 已存在 → reject `fakeAuthError('auth/email-already-in-use')`
  - password 長度 < 6 → reject `fakeAuthError('auth/weak-password')`
  - 否則建立帳號、設定 currentUser、`notifyAuth()`，回傳 `{ user }`
- `signInWithEmailAndPassword(auth, email, password)`：帳號不存在或密碼錯誤 → reject `fakeAuthError('auth/invalid-credential')`；否則設定 currentUser、`notifyAuth()`，回傳 `{ user }`
- `signOut()`：currentUser 設為 null，然後 `notifyAuth()`
- `onAuthStateChanged(auth, listener)`：加入監聽器，用 `queueMicrotask` 非同步呼叫一次 `listener(currentUser)`；回傳取消訂閱的函式
- `EmailAuthProvider.credential(email, password)` → `{ email, password }`
- `reauthenticateWithCredential(user, cred)`：密碼和 accounts 裡的不同 → reject `fakeAuthError('auth/invalid-credential')`
- `updatePassword(user, newPassword)`：更新 accounts 裡的密碼

#### `firebase-firestore.ts`

同樣全部用 `vi.fn` 包起來。

- `export type Timestamp`、`export type Unsubscribe`
- `getFirestore()` → 任意物件
- `collection(db, ...segments)` → `{ type: 'collection', path: segments.join('/') }`
- `doc(db, ...segments)` → `{ type: 'doc', id: 最後一段, path, parentPath }`；**`doc(collectionRef)` 只傳一個集合參考時**，用 `nextAutoId()` 產生 ID
- `serverTimestamp()` → 一個 Symbol sentinel；寫入時換成 `fakeTimestamp(++clock)`
- `getDoc(ref)` → `{ id, exists(), data() }`，`data()` 回傳淺拷貝
- `setDoc(ref, data)`：處理 sentinel 後寫入，並通知 `parentPath` 的監聽器
- `updateDoc(ref, data)`：**文件不存在時 throw**（和真實 SDK 一樣），否則合併寫入並通知
- `deleteDoc(ref)`：刪除並通知
- `writeBatch(db)` → `{ set, update, delete, commit }`，**四個方法都用 `vi.fn` 包起來**（測試會從 `vi.mocked(writeBatch).mock.results` 取出每個 batch，斷言 `update`、`delete` 的呼叫次數）：前三者只是排入佇列；`commit()` 依序套用（update 遇到不存在的文件時整批都不套用並 reject），最後對每個被影響的集合各通知一次
- `onSnapshot(colRef, next, error?)`：註冊監聽器，**同步**立刻 emit 一次（每份文件的 `data(options?)` 忽略參數，回傳淺拷貝）；之後該集合每次寫入都會 emit `{ docs: [{ id, data() }...] }`。只回傳**直接**屬於該集合的文件（例如 `users/uid-1/logs` 不會包含 `users/uid-1`）

### 11.5 `test/setup/nuxt.ts`

```ts
import { afterEach, beforeEach, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { useNuxtApp, useState } from '#imports'
import { resetBackend } from '../mocks/firebase-backend'

enableAutoUnmount(afterEach)

beforeEach(() => {
  // 先停掉上一個測試的同步，避免監聽器殘留
  useNuxtApp().$dataSync.stop()
  resetBackend()
  // 設回初始值，不要用 clearNuxtState()：設成 undefined 會讓仍在監聽的 computed 出錯
  useState('auth-user').value = null
  useState('sports').value = []
  useState('categories').value = []
  useState('catalog-ready').value = false
  useState('logs').value = {}
  useState('logs-ready').value = false
  useState('toasts').value = []
  useState('confirm').value = null
  vi.clearAllMocks()   // 只清呼叫紀錄；不要用 resetAllMocks，否則假實作會被清掉
})

afterEach(() => {
  vi.useRealTimers()
})
```

### 11.6 `test/integration/helpers.ts`

- `freezeToday()`：`vi.useFakeTimers({ toFake: ['Date'] })` 加上 `vi.setSystemTime(new Date(2026, 9, 15, 12, 0))`，把今天固定在 2026-10-15（週四）。**只假造 Date**，`setTimeout` 和 Promise 照常運作。
- `registerAs(name = '小明', email = 'ming@example.com', password = 'secret123')`：走真的 `useAuth().register()`，再 `await vi.waitFor(() => expect(useCatalog().ready.value).toBe(true))`，回傳 `user.value`。
- `seedLog(uid, date, { sportId, categoryId, note = '' })`：用 `seedDoc` 寫入 `users/{uid}/logs/seed-{N}`，**回傳文件 ID**。`createdAt`、`updatedAt` 是 `fakeTimestamp(-1_000_000 + N)`，所以排序就是呼叫順序，而且一定早於測試中透過 `addLog` 新增的紀錄。
- `catalogIds()`：回傳 `{ sportId, otherSportId: 'other', categoryId, otherCategoryId: 'other' }`，其中 sportId、categoryId 是預設「桌球」、「練習」的自動 ID。
- `answerConfirm(value: boolean)`：`await vi.waitFor(() => expect(useConfirm().request.value).not.toBeNull())`，記下 request 後呼叫 `useConfirm().answer(value)`，再 `await flushPromises()`，回傳記下的 request（讓測試斷言標題和內文）。元件測試只掛載單一元件，不會掛載 `ConfirmDialog`，所以直接透過 composable 回答；dialog 本身的畫面另外在 `confirm-dialog.test.ts` 測。
- `toastMessages()`：回傳 `useToast().toasts.value.map(t => t.message)`。
- `expectRoute(fullPath)`：`await vi.waitFor(() => expect(useRouter().currentRoute.value.fullPath).toBe(fullPath))`。

### 11.7 撰寫慣例

- 掛載元件用 `@nuxt/test-utils/runtime` 的 `mountSuspended(Component, { route?, props?, global? })`。
- 有用 `<Teleport>` 的元件（LogModal、AppToast、ConfirmDialog，以及內含 LogModal 的月曆、統計頁）要加上 `global: { stubs: { teleport: true } }`。
- 觸發非同步動作之後，先 `await flushPromises()` 再斷言。
- 注入錯誤：`vi.mocked(setDoc).mockRejectedValueOnce(new Error('...'))`。
- 測試處理中的狀態：`vi.mocked(setDoc).mockImplementationOnce(() => new Promise(r => { finish = r }))`，斷言按鈕已 disabled 之後再呼叫 `finish()`。
- 測試名稱用繁體中文描述行為。

### 11.8 測試案例清單（MUST 全部實作）

#### 單元：`utils/date.test.ts`

- `pad2`、`formatDateKey`（含 12/31 23:59 邊界）、`parseDateKey`（含 2024-02-29，與 `formatDateKey` 互為反函數）、`formatDateLabel`、`addDays`（跨月、跨年、不修改原物件）
- `weekdayLabel`：週日是「日」、週一是「一」
- `WEEKDAYS` 從「一」開始、到「日」結束
- `buildMonthGrid`：
  - 2026/10 有 35 格，從 09-28（週一）開始、到 11-01 結束；當月 31 格標記正確
  - 2027/02 有 28 格，全部是當月
  - 2026/08 有 42 格，從 07-27 開始、到 09-06 結束
  - 每一格的 key、day 和 date 一致；每一列第一格都是週一
- `startOfWeek`：週四、週日、週一都回到同一個週一
- `lastWeekRange`、`lastMonthRange`：2026-10-15 與跨年的 2026-01-07
- `shiftRange`：週加減 7 天；月份往前跨年（2026-01 → 2025-12）、2 月天數正確
- `countDays`、`formatRangeLabel`（含 en dash）

#### 單元：`utils/colors.test.ts`、`catalog.test.ts`、`error.test.ts`、`redirect.test.ts`、`stats.test.ts`

- `isHexColor`：合法、大小寫、少一碼、沒有 `#`
- `readableTextColor`：§7.3 的五個範例
- `sortCatalog`：`other` 不論 order 多小都在最後；order 相同時依名稱；不修改原陣列
- `nextOrder`：只有 `other` 時是 0；忽略 `other` 的 order
- `hasDuplicateName`：前後空白、英文大小寫視為重複；`excludeId` 排除自己；「其它」算重複
- `errorMessage`：Error 取 message；其他轉字串
- `authErrorMessage`：§7.5 表格的每個 code；沒有 code 時退回 `errorMessage`
- `safeRedirect`：`'/stats'` 原樣；`'//evil.com'`、`'https://evil.com'`、`undefined`、陣列都回傳 `'/'`
- `filterLogs`：日期含頭含尾；依運動、類型篩選；日期降冪、同一天依建立先後；start > end 回傳空陣列
- `countDates`：同一天多筆只算一天
- `groupByDate`：依日期分組並保留順序
- `countBy`：只回傳 count > 0；count 降冪；同 count 依 order

#### 單元：`composables/useAuth.test.ts`（固定 Date 為 2026-10-12 10:00）

- register：建立帳號；batch 寫入 users 文件與四份預設清單文件（桌球 `#10b981`、其它 `#94a3b8`、練習、其它）；user 為 `{ uid: 'uid-1', email, name, joinedAt: '2026 年 10 月' }`；暱稱已 trim
- register 暱稱空白：拋出「請輸入暱稱」，不呼叫 `createUserWithEmailAndPassword`
- register Email 重複：拋出 code 為 `auth/email-already-in-use` 的錯誤，user 維持 null
- register 寫入失敗（`writeBatch` commit reject）：拋錯，user 維持 null
- login：成功設定 user；密碼錯誤拋出 `auth/invalid-credential`
- login 時沒有 users 文件：以 Email 前綴當暱稱補建個人資料與預設清單
- logout：先呼叫 `$dataSync.stop()`，再呼叫 signOut，user 變成 null
- syncUser：null 清除 user；讀回文件；沒有文件時維持 null；同一個 uid 時不呼叫 getDoc
- updateName：更新 Firestore 和本地狀態；空白時拋錯，不呼叫 updateDoc
- changePassword：先 reauthenticate 再 updatePassword；目前密碼錯誤時不呼叫 updatePassword；之後可以用新密碼登入

#### 單元：`composables/useCatalog.test.ts`

- startSync：清單依 `sortCatalog` 排好，`other` 在最後；兩個集合都 emit 後 ready 為 true
- resolveSport：找得到就回傳；找不到退回 `other`；清單空的時候回傳預設的「其它」
- addSport：order 為最大值 + 1；名稱重複拋出「已經有同名的運動」；空白拋出「名稱不能空白」；顏色格式錯誤拋錯
- updateSport：可以改名、改色；`other` 可以改色、改名時拋錯
- removeSport：使用中的紀錄全部改成 `other` 後才刪除運動（同一天兩筆都要改到，第三筆不相關的紀錄不受影響，證明是用紀錄 ID 改寫）；刪除 `other` 拋錯
- removeSport 超過 400 筆紀錄時分成多個 batch，運動文件在最後一個 batch 刪除
- category 系列：同上，`updateCategory('other', ...)` 一律拋錯

#### 單元：`composables/useLogs.test.ts`

- startSync：以文件 ID 為 key，帶入 date 與 createdAt 毫秒數，ready 變 true
- 舊資料（文件 ID 就是日期）也能正常讀取
- logsOn：只回傳當天的紀錄，依建立先後排序；沒有時回傳 `[]`
- addLog：自動 ID、同一天可以有多筆、有 createdAt 與 updatedAt、note 已 trim
- updateLog：用 `updateDoc` 更新指定那一筆，不改 date 與 createdAt
- removeLog：只刪除指定的那一筆
- 未登入時 addLog、updateLog、removeLog 都拋出「尚未登入」
- countUsing：同一天多筆分別計算

#### 單元：`composables/useConfirm.test.ts`

- confirm 會設定 request，`confirmLabel` 預設是「刪除」；answer(true)、answer(false) 分別讓 Promise 回傳 true、false，並清空 request
- 前一個 request 還沒回答時又呼叫 confirm：前一個 Promise 回傳 false，request 換成新的
- 沒有 request 時 answer 不會出錯

#### 單元：`composables/useToast.test.ts`（`vi.useFakeTimers()`）

- success 在 2499 ms 時還在，2500 ms 時消失
- error 在 3999 ms 時還在，4000 ms 時消失
- 可同時顯示多則，id 不重複；dismiss 只移除指定的那一則
- 不同地方呼叫 `useToast()` 共用同一份清單

#### 整合：`login.test.ts`

- 從 `/login?redirect=/stats` 登入成功：toast「歡迎回來，小明！」，路由變成 `/stats`
- 沒有 redirect 時導到 `/`；redirect 是 `//evil.com` 時也導到 `/`
- 密碼錯誤：toast「登入失敗：Email 或密碼錯誤」，停留在 `/login`，密碼欄被清空，按鈕恢復成「登入 →」
- 已登入時進入 `/login?redirect=/settings`，會直接被導到 `/settings`（不要測 `push('/login')`：上一個測試可能已停在 `/login`，重複導頁不會觸發 middleware）
- 「建立帳號」連結保留 redirect：`a[href="/register?redirect=/stats"]`

#### 整合：`register.test.ts`

- 註冊成功：建立 `users/uid-1` 與預設清單，toast「歡迎，小明！」，路由變成 `/`
- 前端驗證：暱稱空白、密碼太短、兩次不一致，各顯示對應訊息，而且不呼叫 `createUserWithEmailAndPassword`
- Email 已註冊：toast「註冊失敗：這個 Email 已經註冊過了」，停留在 `/register`
- 處理中：按鈕 disabled，顯示「建立中…」

#### 整合：`calendar.test.ts`（freezeToday；`dayCell(day)` = 所有 `[aria-disabled]` 格子中的第 `2 + day` 個，因為 2026/10 前面有 3 格 9 月）

- 未登入打開需要登入的頁面會被導到登入頁：`push('/stats')` → `/login?redirect=/stats`（同上，避免目標和目前路由相同）
- 預設顯示「2026 年 10 月」；星期列第一個是「一」
- 14 日（過去）、15 日（今天）、20 日（未來）都是 `aria-disabled="false"`；9 月補上的格子是 `"true"`；15 日的數字有 `bg-emerald-600`
- 有一筆紀錄的格子顯示運動名稱（背景色是運動顏色）、類型、筆記
- 同一天 4 筆：只顯示前 2 個運動標籤與「+2」，不顯示類型與筆記；剛好 2 筆時不顯示「+」
- 掛載後才 seed 紀錄，格子會即時出現
- 運動改名後，格子即時顯示新名稱
- 點 10 日（過去）會出現「2026-10-10 運動紀錄」
- 下個月 → 11 月；上個月兩次 → 9 月；按「今天」回到 10 月

#### 整合：`confirm-dialog.test.ts`

- 沒有 request 時不顯示任何東西
- 呼叫 `confirm({ title: '刪除紀錄', message: '確定要刪除 10/20 的紀錄嗎？' })` 後顯示 `role="alertdialog"`、標題、內文、「取消」與「刪除」按鈕
- 按「刪除」→ Promise 回傳 true，dialog 消失；按「取消」→ 回傳 false
- 點遮罩、按 Escape → 回傳 false；點卡片內部不會關閉
- 打開時焦點在「取消」按鈕

#### 整合：`log-modal.test.ts`（freezeToday；先 `registerAs`）

- 當天沒有紀錄：直接是「TUESDAY · NEW ENTRY」、標題「2026-10-20 運動紀錄」；預設「桌球」、「練習」；按鈕「儲存紀錄」；沒有「← 返回列表」
- 儲存後切到「TUESDAY · LOGS」列表、不 emit；按「＋ 新增一筆紀錄」表單重設；再存一筆後列表 2 筆、Firestore 有 2 份同日期的文件
- 已有紀錄時打開是列表，依建立先後排序，不包含其他日期
- 點第二筆進入「TUESDAY · EDIT」，帶入原值，按鈕「更新紀錄」；儲存只更新那一筆（`updateDoc` 1 次），回到列表
- 「← 返回列表」不儲存
- 紀錄使用的運動、類型已不存在時，列表顯示「其它」，編輯時下拉選單是 `other`
- 關閉後換一天打開會重設畫面（「WEDNESDAY · NEW ENTRY」、筆記為空）
- 在列表刪除：`answerConfirm(false)` 不刪；`answerConfirm(true)` 的 request 是「刪除紀錄」／「確定要刪除 10/20 的「桌球」紀錄嗎？」，只刪掉那一筆，toast「已刪除 10/20 的紀錄」，列表剩 1 筆，不 emit
- 刪除最後一筆後顯示「這天還沒有紀錄」與「＋ 新增一筆紀錄」
- deleteDoc 失敗：toast「刪除失敗：offline」，文件仍在
- setDoc 失敗：toast「儲存失敗：quota exceeded」，停留在表單
- 處理中：按鈕 disabled，顯示「儲存中…」；完成後回到列表
- 點擊關閉按鈕會 emit `[[false]]`

#### 整合：`settings.test.ts`（先 `registerAs`）

- 顯示暱稱、Email、「加入於 …」
- 改暱稱：toast「暱稱已更新」，導覽列的暱稱跟著變；暱稱沒變時按鈕 disabled
- 運動清單顯示「桌球」、「其它」，「其它」有「固定」膠囊，沒有編輯、刪除按鈕
- 新增「羽球」：toast「已新增「羽球」」，出現在「桌球」和「其它」之間；新增「桌球」：toast「新增失敗：已經有同名的運動」
- 改名：「桌球」改成「乒乓球」，toast「已更新「乒乓球」」
- 改顏色：觸發 change 後 Firestore 的 color 更新
- 刪除使用中的運動（同一天 2 筆）：`answerConfirm(true)` 回傳的 request 標題是「刪除運動」、內文包含「有 2 筆紀錄會改為「其它」」；確認後紀錄的 sportId 變成 `other`，運動文件被刪除
- 取消刪除：`answerConfirm(false)` 後運動仍在，沒有呼叫 writeBatch
- 類型清單：新增、改名、刪除流程同上
- 修改密碼：四種前端驗證訊息；目前密碼錯誤時 toast「更新密碼失敗：Email 或密碼錯誤」；成功時 toast「密碼已更新」，欄位清空

#### 整合：`stats.test.ts`（freezeToday；先 `registerAs` 並新增「羽球」，seed 10/05、10/07、10/11（兩筆）、10/12、09/20 的紀錄）

- 預設是「週」，期間文字是「2026/10/5 – 2026/10/11」；運動次數 4、運動天數 3、期間天數 7
- 「上一期」→「2026/9/28 – 2026/10/4」（沒有資料）；「下一期」兩次 →「2026/10/12 – 2026/10/18」，1 個日期
- 切到「月」：期間文字是「2026 年 9 月」，只算到 09/20 那筆
- 自訂：切換後預設是上週（3 個日期）；開始晚於結束時顯示「開始日期不能晚於結束日期」，列表為空，期間天數顯示「—」
- 依運動篩選、依類型篩選後，次數、天數與列表都跟著變
- 「最常做的運動」顯示次數最多的運動；長條圖顯示 `N 次`
- 列表依日期降冪分組，10/11 那一列裡有 2 筆並依建立先後；顯示「共 4 筆」；點某一列會打開該天的 LogModal
- 沒有資料時顯示「這段期間沒有符合條件的紀錄」和「沒有資料」

#### 整合：`navbar-and-session.test.ts`

- 導覽列有「月曆」、「統計」、「設定」，顯示暱稱與 Email
- 按「登出」：user 變成 null，toast「已登出」，路由變成 `/login`，清單與紀錄 state 被清空
- signOut 失敗：toast「登出失敗：network」，維持登入
- 手機選單：點擊 `aria-label="開啟選單"` 後出現第二組導覽連結；換頁後收起
- auth plugin：先 seed users 文件再 `signInAs` → user 被同步成完整的 AppUser，`data` plugin 開始同步該使用者的清單
- `signInAs` 一個沒有 users 文件的 uid → user 維持 null
- 換成另一個帳號登入時，不會看到前一個帳號的紀錄
- AppToast：顯示 error 訊息，有 `bg-red-500` 和 `role="status"`；點擊後清單變空

---

## 12. 驗收清單

### 功能

- [ ] 未登入打開任何頁面都被導到登入頁；登入後回到原本要去的頁面
- [ ] 可以自行註冊；註冊後運動清單是「桌球、其它」，類型清單是「練習、其它」
- [ ] 月曆從週一開始；今天的日期數字以 emerald 圓底白字標示
- [ ] 過去、今天、未來的日期都能點；同一天可以新增多筆，列表上可以刪除、點一筆可以編輯
- [ ] 月曆標籤用運動的顏色，深淺顏色的文字都看得清楚
- [ ] 「其它」不能刪除、不能改名，永遠排最後；運動的「其它」可以改顏色
- [ ] 刪除使用中的運動或類型時，舊紀錄變成「其它」
- [ ] 統計頁預設上週一 ~ 上週日；切到月預設上個月；篩選與統計正確
- [ ] 可以修改暱稱與密碼；改密碼後用新密碼可以登入
- [ ] 兩個分頁登入同一個帳號，修改會即時同步
- [ ] 另一個帳號完全看不到這個帳號的資料（用 Security Rules 驗證，不只是畫面）
- [ ] 重新整理頁面後仍維持登入
- [ ] 所有非同步按鈕都有載入中狀態，而且不能連點
- [ ] 所有成功和失敗都有 §10 定義的 toast
- [ ] 手機寬度下，選單浮在內容上方，換頁會自動收起

### 測試

- [ ] `npm test` 全部通過，連續跑 3 次都穩定（目前是 136 個：`test/unit` 70 個〔utils 37、composables 33〕，`test/integration` 66 個）
- [ ] 跑測試時沒有任何 Firebase 網路請求，也沒有 Vitest 的 unhandled error
- [ ] 反向驗證，以下任一項故意改壞都要讓測試失敗：
  - `removeItem` 改寫紀錄時用 `log.date` 而不是 `log.id`
  - `logsOn` 同一天的排序顛倒
  - 月曆的 `MAX_VISIBLE` 改大（不再出現「+N」）
  - 統計頁的「運動天數」改成算筆數
  - `sortCatalog` 不再把 `other` 排最後（要把 `a`、`b` 兩個 `other` 判斷都拿掉；只改其中一個時，排序結果可能碰巧不變）
  - `removeSport` 不改寫紀錄就直接刪除
  - `buildMonthGrid` 改回週日開始
  - `lastWeekRange` 回傳本週而不是上週
  - `safeRedirect` 接受 `//evil.com`

---

## 13. 實作陷阱

1. **註冊的競態**：`createUserWithEmailAndPassword` 會觸發 `onAuthStateChanged` → `syncUser` 去讀一份還沒寫入的 `users` 文件。`syncUser` 開頭一定要有「同一個 uid 就跳過」的判斷，而且文件不存在時**不可以**把 user 設成 null。
2. **登出前先停止同步**：Security Rules 只允許本人讀取。如果先 `signOut` 再取消 onSnapshot，監聽器會收到 `permission-denied` 錯誤。`logout()` 一定要先 `$dataSync.stop()`。
3. **切換帳號殘留資料**：`data` plugin 的 `start(uid)` 一定要先 `stop()` 並 `reset()` state，否則新帳號會短暫看到舊帳號的紀錄。
4. **註冊寫入一半**：預設清單一定要和 users 文件放在同一個 batch；就算還是失敗，`login()` 也要能補建。
5. **刪除運動的順序**：先改紀錄、最後才刪運動；batch 超過 500 次寫入會失敗，要分批。
6. **確認 dialog 的層級**：LogModal 裡面會打開確認 dialog，dialog 的 z-index 一定要高於 LogModal，否則會被蓋住。
7. **LogModal 畫面殘留**：每次打開或換日期都要重設（有紀錄 → 列表，沒有 → 新增表單）；清單還沒載入時，要等 `ready` 再帶入表單預設值。
8. **紀錄 ID 不是日期**：新紀錄用自動 ID，舊紀錄的 ID 剛好是日期。更新、刪除、刪除運動時改寫紀錄，一律用 `log.id` 組文件路徑；只要用日期組路徑，就會改到錯的文件或找不到文件。
9. **自訂顏色的文字對比**：運動顏色是使用者選的，月曆標籤的文字色一定要用 `readableTextColor` 算。
10. **週的起點**：月曆和統計都是週一開始；`getDay()` 回傳 0 代表週日，換算時要用 `(getDay() + 6) % 7`。
11. **Open redirect**：`redirect` query 一定要經過 `safeRedirect`。
12. **SSR**：一定要關閉，否則 middleware 會在伺服器端誤判未登入。
13. **測試的模組實例**：假後端的狀態一定要放在 `globalThis`。
14. **測試的狀態重設**：用 `useState(key).value = 初始值`，不要用 `clearNuxtState()`；每個測試開始前先 `$dataSync.stop()`。
15. **測試的導頁斷言**：元件內觸發的導頁要用 `vi.waitFor` 等待。
16. **只假造 Date**：整合測試固定日期時用 `toFake: ['Date']`，否則 `vi.waitFor`、toast 的計時器和 Promise 都可能卡住。
17. **Vitest 模組快取**：`nuxt` project 一定要 `fsModuleCache: false`（§11.3），否則第二次執行起所有 Nuxt 測試都無法啟動。排查時記得 `node_modules/.vitest-cache` 也是快取，只清 `.nuxt`、`.vite` 不夠。
18. **路由狀態跨測試保留**：測試之間 router 不會重設，`push` 到和目前相同的路徑不會觸發 middleware；導頁測試要選一個和前一個測試不同的目標。
19. **可忽略的警告**：建置與測試時會出現 `[NUXT_B7027] The PostCSS plugin tailwindcss/nesting could not be loaded`，是 Nuxt 4.6 與 `@nuxtjs/tailwindcss` 的相容性警告；本專案沒有使用 CSS 巢狀語法，不影響結果。
