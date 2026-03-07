# 任務清單：本地資料庫預抓與可觀測縣市 Atlas

## 階段一：文件同步

- [x] T001 建立 `specs/003-local-db-prefetch-atlas/` 規格文件組
- [x] T002 明確記錄本輪改採瀏覽器本地資料庫快取

## 階段二：資料產物

- [x] T003 擴充 `refresh-official-data.mjs` 產出縣市切片大小 metadata
- [x] T004 重新刷新正式資料產物

## 階段三：前端資料層

- [x] T005 建立 `記憶體 -> IndexedDB -> 網路` 載入順序
- [x] T006 建立載入來源觀測狀態與事件訂閱
- [x] T007 加入 hover / top 3 預抓與避免重複請求

## 階段四：介面改造

- [x] T008 地圖加入觀測面板與 hover 預抓觸發
- [x] T009 摘要區加入已載入切片、快取命中與檔案大小顯示
- [x] T010 學校清單改為可排序表格與 CSV 匯出

## 階段五：驗證

- [x] T011 執行 `npm run data:refresh`
- [x] T012 執行 `npm run lint`
- [x] T013 執行 `npm run build`
- [x] T014 執行 `npm run test:e2e`