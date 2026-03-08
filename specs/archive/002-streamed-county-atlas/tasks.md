# 任務清單：縣市細節串流與版型深化

## 階段一：文件同步

- [x] T001 建立 `specs/002-streamed-county-atlas/` 規格文件組
- [x] T002 明確記錄「目前不引入本地資料庫」決策

## 階段二：資料切分

- [ ] T003 將 `refresh-official-data.mjs` 改為輸出 `education-summary.json`
- [ ] T004 將 `refresh-official-data.mjs` 改為輸出 `counties/*.json`
- [ ] T005 保持所有新 JSON / TopoJSON 為 prettified 多行格式

## 階段三：前端載入流程

- [ ] T006 將資料層改為摘要先載、縣市細節後載
- [ ] T007 加入縣市細節快取與載入狀態
- [ ] T008 修正 URL 還原流程以支援延遲載入

## 階段四：版型深化

- [ ] T009 參考 `local_view.html` 調整主畫面資訊分區
- [ ] T010 重整地圖面板、摘要區、排行與學校清單排版
- [ ] T011 補齊可測試的 UI 標記與可辨識狀態文案

## 階段五：E2E 驗證

- [ ] T012 安裝並設定 Playwright
- [ ] T013 新增 URL 還原 E2E
- [ ] T014 新增縣市切換載入鄉鎮切片 E2E
- [ ] T015 新增異常註記顯示 E2E

## 階段六：驗證與收尾

- [ ] T016 執行 `npm run data:refresh`
- [ ] T017 執行 `npm run lint`
- [ ] T018 執行 `npm run build`
- [ ] T019 執行 `npx playwright test`