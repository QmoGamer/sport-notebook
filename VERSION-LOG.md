### v0.2.1 - 2026-10-15

- feat(stats): 統計頁預設期間改為本週與本月，打開就能看到目前進行中的期間，不用再按「下一期」
- test: 統計頁與日期工具測試改以本週、本月驗證，並涵蓋週日、週一與跨年邊界
- docs(SPEC): 同步統計預設期間與相關測試案例

### v0.2.0 - 2026-10-15

- feat(useLogs): 紀錄改用自動 ID 並依日期分組，讓同一天可以記錄多筆運動；舊資料（以日期為 ID）不需搬移即可沿用
- feat(LogModal): 紀錄視窗改為當日列表與表單切換，可在列表直接刪除、點選編輯，儲存後回到列表方便連續新增
- feat(calendar): 月曆格子最多顯示 2 個運動標籤並以 +N 表示其餘筆數，避免多筆紀錄擠爆格子
- feat(stats): 摘要新增「運動次數」並與「運動天數」分開計算，紀錄列表改為依日期分組
- fix(useCatalog): 刪除運動或類型時改用紀錄 ID 改寫紀錄，避免同一天多筆時改到錯的文件
- chore(firestore.rules): 紀錄路徑改為 logs/{logId}，與新的文件 ID 對應
- chore(public): 加入 Vue 預設 favicon，讓瀏覽器分頁有圖示
- test: 依一天多筆的行為更新單元與整合測試，涵蓋列表刪除、排序與分組
- docs(SPEC): 同步一天多筆紀錄的規格，並補上 fsModuleCache、版本、表單 novalidate 等實作差異

### v0.1.0 - 2026-10-14

- feat(auth): 改用 Email 與密碼註冊登入，註冊時一併建立個人資料與預設的運動、類型清單，讓每位使用者擁有自己的筆記本
- feat(calendar): 首頁月曆改為週一開始，任何一天都能新增或編輯當天的運動紀錄，並以運動顏色標示
- feat(LogModal): 新增紀錄視窗，可選擇運動、類型並撰寫筆記，同一天只保留一筆紀錄
- feat(settings): 新增設定頁，可管理暱稱、運動與類型清單及修改密碼；刪除使用中的項目時自動把紀錄改為「其它」，避免出現孤兒資料
- feat(stats): 新增統計頁，可依週、月、自訂期間與運動、類型篩選，查看次數統計與紀錄列表
- feat(ConfirmDialog): 以簡易 dialog 取代瀏覽器內建確認視窗，避免誤刪
- feat(data): 依登入帳號啟動與停止 Firestore 即時同步，避免切換帳號時殘留前一位使用者的資料
- feat(firestore.rules): 加入 Security Rules，確保只有本人能讀寫自己的資料，且「其它」不能刪除或改名
- test: 新增假 Firebase 與單元、整合測試，確保核心流程不連線也能驗證
- chore(vitest): 關閉 Nuxt 測試專案的 fsModuleCache，修正第二次執行起測試無法啟動的問題
- docs(README): 補上 Firebase 設定與啟動、測試步驟

### v0.0.2 - 2026-10-13

- chore: 建立 Nuxt 4 專案骨架與套件設定，讓後續功能有可建置的基礎
- chore(nuxt.config): 關閉 SSR 並以 runtimeConfig 讀取 Firebase 設定，避免伺服器端誤判登入狀態、設定不寫死在程式碼
- feat(firebase): 新增 Firebase 初始化 plugin，提供全站共用的 Auth 與 Firestore 實例
- chore(gitignore): 忽略 .env 與建置輸出，避免設定值與產物進入版本控制

### v0.0.1 - 2026-10-13

- docs(SPEC): 將群組預約系統規格改寫為個人運動筆記本，作為後續實作的依據
