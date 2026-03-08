# 實作計畫：SQLite 資料庫驅動的可觀測縣市 Atlas

**分支**: `003-local-db-prefetch-atlas` | **日期**: 2026-03-07 | **對應規格**: `/specs/003-local-db-prefetch-atlas/spec.md`

## 摘要

本輪把既有 atlas 資料層從多個 JSON 切片升級為單一 SQLite 教育資料庫：

1. 以官方 CSV、教育點位與邊界資料建置單一 SQLite 檔案。
2. 前端以 SQLite 查詢縣市摘要、學校明細、年度趨勢與 bucket 分群。
3. 保留 TopoJSON 邊界切片與地圖互動，但教育資料改由資料庫驅動。
4. 將超過 300 行的大檔拆成符合 SOLID 的原子模組。

## 技術策略

- 啟動流程改為「SQLite 教育資料檔 + 縣市界線先載」。
- 使用 `sql.js` 在 Node 端產生 SQLite，在瀏覽器端直接查詢同一檔案，避免引入後端服務。
- 邊界仍維持 TopoJSON 切片 lazy load，教育資料不再以縣市 JSON 為主互動來源。
- `refresh-official-data.mjs` 需輸出 SQLite 檔、摘要 metadata 與必要的邊界切片大小資訊。
- 觀測層改為區分 `memory`、`sqlite`、`network` 三種來源。
- `App.tsx`、`educationData.ts`、`analytics.ts`、刷新腳本都要拆檔，單一模組控制在 300 行內。

## 驗證策略

- `npm run data:refresh`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- 手動驗證：SQLite 首次載入、切換年份與縣市的資料庫查詢結果、表格排序、CSV 匯出、來源觀測顯示