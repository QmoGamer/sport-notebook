# sport-notebook

個人運動筆記本：在月曆上記錄每天做了什麼運動、屬於哪種類型，並寫下筆記。完整規格見 [SPEC.md](SPEC.md)。

## 開始使用

1. 安裝套件（Node.js v22）：

   ```bash
   npm install
   ```

2. 複製 `.env.example` 為 `.env`，填入 Firebase 網頁應用程式的設定值。
3. 在 Firebase 主控台：
   - Authentication → Sign-in method：啟用「電子郵件/密碼」
   - 建立 Firestore 資料庫
   - 將 [firestore.rules](firestore.rules) 貼到 Firestore → 規則並發布（**未部署規則前不要上線**）
4. 啟動開發伺服器：

   ```bash
   npm run dev
   ```

## 測試

```bash
npm test                  # 全部測試
npm run test:unit         # 單元測試
npm run test:integration  # 整合測試
```

測試使用記憶體版的假 Firebase（`test/mocks/`），不會連到真正的 Firebase。
