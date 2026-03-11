# Quickstart: 資料流程優化與差異刷新

## 目的

此 quickstart 用於後續直接進入實作與驗證。順序以風險最低、回饋最快為原則，先做 P0 的 manifest/schema/刷新 UI，再做 P1 的 SQLite 正規化，最後做 P2 的 canonical ID 與舊契約淘汰。

## 前置條件

- 使用 repo root 執行命令。
- 已完成 `npm install`，且 root `postinstall` 會安裝 `frontend/` 與 `backend/` 依賴。
- 確認正式資料刷新可在本機執行：`npm run data:refresh`。

## 建議實作順序

### Step 1. P0 建立資料契約鋪底

1. 建立 `backend/` 工作區與入口：
   - 新增 `backend/package.json`。
   - 讓 root `npm run data:refresh` 指向 `backend/scripts/refresh-official-data.mjs`。
2. 在 `backend/scripts/lib/` 拆出 manifest builder、hash helper、schema writer、validation reporter。
3. 修改 `backend/scripts/refresh-official-data.mjs`：
   - 先保留現有輸出流程。
   - 補寫 `manifest.json`、`schema/grade-map.json`、`validation-report.json`。
   - 將 asset bytes/hash 與 validation 摘要寫回 manifest。
4. 修改型別與讀取層：
   - `frontend/src/data/educationTypes.ts` 加入 manifest/schema/validation 型別。
   - `frontend/src/data/educationData.ts` 新增 manifest 載入與 cache 介面。
5. 修改 `frontend/src/hooks/useEducationData.ts`：
   - 新增本地 manifest 與遠端 manifest 比對。
   - 僅對變更資產執行 force refresh。
   - 將刷新狀態細分為檢查、下載、驗證、完成、部分失敗、回退。
6. 修改 `frontend/src/components/DataGovernanceFlyout.tsx`：
   - 顯示本地版本、遠端版本、schema 版本、更新摘要與回退訊息。

### Step 2. P0 驗證

1. 執行 `npm run data:refresh`。
2. 檢查 `frontend/public/data/manifest.json`、`frontend/public/data/schema/grade-map.json`、`frontend/public/data/validation-report.json` 是否生成。
3. 執行 `npm run lint` 與 `npm run build`。
4. 手動驗證：
   - 首次載入可正常顯示地圖與治理面板。
   - 重新載入部署資料時，無變更情境不重抓所有切片。
   - 故意讓單一資產失敗時，UI 顯示部分失敗且未受影響資料仍可讀。

### Step 3. P1 SQLite 正規化

1. 修改 `backend/scripts/lib/build-atlas-sqlite.mjs`：
   - 新增 `school_compositions` 表。
   - 正式化 `school_level_id`、時間維度狀態、地理 audit metadata。
   - 暫時保留舊 `summary_views` / `county_detail_views` / `county_bucket_views` 雙寫。
2. 修改 `frontend/src/data/atlasSqlite.ts`：
   - 新增以 SQL 組裝 summary/detail/bucket 的查詢相容層。
   - 加入新舊讀取結果比對與 fallback。
3. 補上 SQLite 體積量測與查詢一致性驗證。

### Step 4. P1 驗證

1. 執行 `npm run data:refresh`，確認 SQLite 可生成且 `validation-report.json` 記錄體積與查詢驗證。
2. 執行 `npm run lint`、`npm run build`、`npm run test:e2e`。
3. 手動抽樣完全中學與 composition 查詢結果，確認不再發生覆寫，且年級/性別分析與舊版一致。

### Step 5. P2 Canonical ID 與舊契約淘汰

1. 修改 `backend/scripts/lib/build-boundary-files.mjs` 與 `build-official-dataset.mjs`：
   - 對縣市、鄉鎮、學校、切片、SQLite 全面雙寫 `countyCode` / `townCode`。
   - 產生 legacy alias map，供前端 URL 與快取轉接。
2. 修改前端讀取層與深連結解析，讓 canonical ID 成為主鍵，中文名稱僅作為顯示值。
3. 完成一輪完整驗證後，移除 legacy 欄位與轉接邏輯。

### Step 6. P2 驗證

1. 執行 `npm run data:refresh`、`npm run lint`、`npm run build`、`npm run test:e2e`。
2. 手動驗證 desktop/mobile、縣市/鄉鎮下鑽、深連結還原、治理面板、版本刷新與完全中學查詢。
3. 確認 `validation-report.json` 無 canonical ID blocking 錯誤，且 manifest/hash 一致。

## 測試與驗證策略

### 自動驗證

- `npm run data:refresh`: 檢查 build 輸出與 validation report。
- `npm run lint`: 檢查 TypeScript / React 程式品質。
- `npm run build`: 確保 bundle 與型別建置通過。
- `npm run test:e2e`: 驗證主要互動路徑、刷新流程與治理 UI。

### 手動驗證情境

- 無資料變更時刷新：應顯示「本地與遠端相同」，且下載數量趨近 0。
- 僅單一縣市 detail/bucket/school-atlas 變更：只刷新該縣相關資產。
- manifest 損毀：應回退到本地最後成功版本並提示原因。
- SQLite 新查詢層開啟：完全中學、composition、縣市彙總與舊結果一致。
- canonical ID 切換：深連結與治理 UI 仍可還原原本篩選狀態。

## 回退策略

- P0 若 manifest/diff refresh 不穩定，可回退到原本的 `refreshEducationSummary()` 全量刷新，但保留新增契約檔案輸出。
- P1 若 SQL 相容層結果異常，可暫時改回讀取舊 `payload_json` view，同時保留新表雙寫。
- P2 若 canonical ID 遷移出現大面積對不到邊界或深連結失敗，可回退到 legacy id 解析，並保留已產出的對照表以便修正。

## 風險緩解重點

- 每個 phase 都先雙寫/相容，再淘汰舊欄位，避免一次硬切。
- 所有正式輸出檔案都必須可從 manifest 與 validation report 追溯。
- 先固定外部資料 shape，再替換內部儲存結構，降低 UI 回歸風險。