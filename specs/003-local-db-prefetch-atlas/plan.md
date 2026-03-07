# 實作計畫：本地資料庫預抓與可觀測縣市 Atlas

**分支**: `003-local-db-prefetch-atlas` | **日期**: 2026-03-07 | **對應規格**: `/specs/003-local-db-prefetch-atlas/spec.md`

## 摘要

本輪把 `002` 的純 lazy-load 版 atlas 再往前推進一層：

1. 以瀏覽器本地資料庫保存已載入的縣市細節與鄉鎮切片。
2. 加入限定條件的預抓，只在 hover 或排行前幾名時進行。
3. 將學校名單升級為可排序表格與 CSV 匯出。
4. 在地圖與摘要面板加入來源觀測資訊。

## 技術策略

- 啟動流程仍維持「摘要先載 + 縣市界線先載」。
- 深層細節改為「記憶體快取 -> IndexedDB -> 網路」三層讀取順序。
- `refresh-official-data.mjs` 增加縣市細節與鄉鎮切片大小 metadata。
- 預抓只對 `top 3` 與 map / ranking hover 目標生效。
- UI 不新增後端服務，不使用額外 API 層。

## 驗證策略

- `npm run data:refresh`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- 手動驗證：hover 預抓、二次進入同縣市的快取命中、表格排序、CSV 匯出、來源觀測顯示