### v0.0.2 - 2026-10-13

- chore: 建立 Nuxt 4 專案骨架與套件設定，讓後續功能有可建置的基礎
- chore(nuxt.config): 關閉 SSR 並以 runtimeConfig 讀取 Firebase 設定，避免伺服器端誤判登入狀態、設定不寫死在程式碼
- feat(firebase): 新增 Firebase 初始化 plugin，提供全站共用的 Auth 與 Firestore 實例
- chore(gitignore): 忽略 .env 與建置輸出，避免設定值與產物進入版本控制

### v0.0.1 - 2026-10-13

- docs(SPEC): 將群組預約系統規格改寫為個人運動筆記本，作為後續實作的依據
