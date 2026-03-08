# 實作計畫：縣市細節串流與版型深化

**分支**: `002-streamed-county-atlas` | **日期**: 2026-03-07 | **對應規格**: `/specs/002-streamed-county-atlas/spec.md`

## 摘要

本輪實作聚焦在三個方向：

1. 將原本單一 `education-dataset.json` 拆為「全台摘要」與「縣市細節」資料流。
2. 讓 URL 深連結在延遲載入模式下仍可完整還原縣市、鄉鎮與註記狀態。
3. 以 `local_view.html` 的資訊分區方向重整畫面，使控制區、地圖舞台、摘要與表格更接近分析控制台。

## 技術背景

**語言 / 版本**: TypeScript 5.9、React 19、Vite 8  
**主要依賴**: d3-geo、topojson-client、topojson-server  
**新增測試**: Playwright E2E  
**資料策略**: 靜態 JSON / TopoJSON 分檔 + 瀏覽器快取，不引入本地資料庫  
**目標平台**: 現代桌面與行動瀏覽器

## 憲章檢查

- **先更新規格，再進行實作**：通過。`002` 文件先建立，再進行程式修改。
- **效能優化必須可驗證**：通過。將以資料切分、Network 行為與 E2E 覆蓋驗證。
- **正式資料可追溯與異常透明**：通過。保留 `dataNotes` / `status` / `missingYears`。
- **邊界清楚，優先靜態交付**：通過。維持靜態檔 + lazy load，不引入本地資料庫。
- **規格文件繁體中文**：通過。

## 實作策略

- 將資料腳本輸出改為：
  - `education-summary.json`：全台摘要、縣市摘要、共用 metadata。
  - `counties/<countyId>.json`：單一縣市鄉鎮與學校細節。
- 前端資料層改為兩階段：
  - 啟動時先讀摘要檔與縣市 TopoJSON。
  - 進入縣市或處理深連結時再抓對應縣市細節檔與鄉鎮 TopoJSON。
- 版型從現有 hero + map + summary 結構調整為更明顯的控制台分區，但保留既有元件與互動邏輯。
- 新增 Playwright，優先測使用者主路徑，不做內部實作細節耦合。

## 不採用方案

- 不引入 IndexedDB / DuckDB-WASM：現階段查詢模式仍是靜態篩選與單縣市下鑽，靜態分檔足以達成目標。
- 不直接重建 `local_view.html`：該檔為打包後輸出，不適合作為原始碼來源，只抽取資訊架構與視覺方向。

## 驗證策略

- `npm run data:refresh`
- `npm run lint`
- `npm run build`
- `npx playwright test`
- 手動驗證：
  - 首頁初次進站不載全量細節。
  - 深連結可還原縣市與鄉鎮。
  - 註記顯示與版型重排正常。