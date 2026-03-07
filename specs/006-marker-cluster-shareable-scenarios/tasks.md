# 任務清單：預產生 bucket、可搬移情境庫與分層式工作台 UI

- [x] T001 建立 006 規格文件
- [x] T002 維持 React / Vite / react-leaflet 開發模式穩定
- [x] T003 由 refresh 腳本輸出縣市級 geohash bucket JSON
- [x] T004 接上前端 bucket lazy load 與 asset metrics
- [x] T005 為比較情境加入重新命名、釘選、JSON 匯出 / 匯入
- [x] T006 為異常整批匯出加入類型篩選
- [x] T007 依探索數據文件優化 Macro / Regional / Micro UI
- [x] T008 修正新增需求導致的樣式、型別與互動問題
- [x] T009 執行 install、data:refresh、lint、build、e2e 驗證
- [x] T010 修正 GitHub Pages BASE_URL — fetchJsonWithMetrics 加入 import.meta.env.BASE_URL 前綴；workbox 加入 navigateFallbackDenylist
- [x] T011 三層 UI 重構 — 將 analysis-column 拆分為 Macro / Regional / Micro tier 區塊，加入 tier label、教育階段分布條、全縣市預載按鈕
- [x] T012 驗證通過 — lint 0 warnings、production build 成功、3/3 e2e 通過

## 第二輪優化任務

- [x] T013 [P0] App.tsx 原子化拆檔 — 抽出 5 個 custom hooks + 6 個面板元件 + helper module，App.tsx 1654→754 行
- [x] T014 [P0] 分頁切換 UI — 概況總覽 / 區域分析 / 學校工作台 三個頁籤，tab= URL 參數同步
- [ ] T015 [P1] Macro 熱力地圖 — 以 choropleth 著色呈現縣市學生密度
- [ ] T016 [P1] 教育階段圓餅圖 — SVG 圓餅圖取代分布條
- [ ] T017 [P2] SchoolDataTable 虛擬捲動 — 大縣市 700+ 校不卡頓
- [x] T018 [P2] URL deep-link 擴展 — tab 參數已加入 URL 序列化
- [ ] T019 [P3] 趨勢預測分析 — 線性回歸推算未來 3–5 年走勢
- [ ] T020 [P3] 離線指標面板 — SW 快取覆蓋率、IndexedDB 使用量
- [ ] T021 全縣市資料預載流程驗證 — 確認離線按鈕可下載所有切片
- [x] T022 驗證通過 — lint 0 / build 成功 / 3/3 e2e 通過
