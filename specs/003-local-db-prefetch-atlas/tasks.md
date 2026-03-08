# 任務清單：SQLite 資料庫驅動的可觀測縣市 Atlas

## 階段一：文件同步

- [x] T001 建立 `specs/003-local-db-prefetch-atlas/` 規格文件組
- [x] T002 明確記錄本輪改採瀏覽器本地資料庫快取

## 階段二：SQLite 資料產物

- [ ] T003 建立 SQLite schema，將官方 CSV、學校點位與預先計算 bucket 匯入資料庫
- [ ] T004 輸出 `education-atlas.sqlite` 並保留繁體中文欄位值
- [ ] T005 重新刷新正式資料產物並驗證台中等大型縣市資料筆數

## 階段三：前端資料層

- [ ] T006 建立 `memory -> sqlite -> network` 載入順序
- [ ] T007 建立 SQLite 查詢器，回傳縣市摘要、鄉鎮摘要、學校明細與 bucket 分群
- [ ] T008 保留 TopoJSON 邊界 lazy load，並更新來源觀測為 SQLite 命中

## 階段四：介面與原子化改造

- [ ] T009 地圖加入觀測面板並顯示 SQLite 載入與查詢狀態
- [ ] T010 摘要區加入資料庫檔大小、命中次數與來源資訊
- [ ] T011 學校清單維持可排序表格與 CSV 匯出
- [ ] T012 將 `App.tsx`、`educationData.ts`、`analytics.ts`、`refresh-official-data.mjs` 拆分為符合 SOLID 的原子模組

## 階段五：驗證

- [ ] T013 執行 `npm run data:refresh`
- [ ] T014 執行 `npm run lint`
- [ ] T015 執行 `npm run build`
- [ ] T016 執行 `npm run test:e2e`