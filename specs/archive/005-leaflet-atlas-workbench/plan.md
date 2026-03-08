# 實作計畫：Leaflet 地圖工作台、比較視圖與離線首頁策略

## 版面策略

- 保留 `local_view` 的深色控制室氛圍，但從固定側欄改成兩層式工作台：頂部篩選列 + 左右雙欄內容區。
- 右側地圖舞台聚焦地圖、載入來源觀測與模式提示。
- 左側分析區依序呈現摘要卡片、趨勢、比較工作台、異常調查、排行與學校表格。

## 功能拆解

1. 建立 Leaflet 行政區圖層元件，接入縣市與鄉鎮 GeoJSON、選取與 hover 預抓。
2. 在 `App.tsx` 加入學年度播放控制與比較縣市狀態管理。
3. 以既有 analytics selector 建構縣市比較卡與教育階段分布列。
4. 從 county / township / school notes 與 status 彙整異常調查面板。
5. 加入離線狀態橫幅與最近一次快取摘要說明。
6. 重新整理 CSS，讓桌面版遵循左分析右地圖，行動版自然堆疊。

## 驗證策略

- 執行 `npm run lint --prefix frontend`
- 執行 `npm run build --prefix frontend`
- 執行 `npm run test:e2e --prefix frontend`
- 若推送前需要，再檢查 GitHub Pages workflow 與 remote 狀態