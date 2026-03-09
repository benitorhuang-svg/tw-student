# 003 — 圖表視覺優化與互動體驗強化

## 目標

針對台灣學生數互動地圖儀表板，進行第三輪視覺優化與互動強化，
使層級鑽取、地圖群聚、KPI 回饋、排行面板等核心體驗達到 Power BI 等級。

## 範圍

### P0：本輪必完成

| 項目 | 說明 |
|------|------|
| 地圖群聚標記 | 學校工作台 tab 啟用鄉鎮級群聚圓點，類似 591 租屋網；大地圖大圓點，zoom in 後小地圖小圓點 |
| 學校 toggle | 地圖預設直接顯示學校工作台，可 toggle 切換圓點/色域模式 |
| 校點閃動修正 | 單校點擊後穩定顯示單點資訊，不再閃動 |
| 縣市 Drill-down 動畫 | 點擊縣市時加入 flyTo 平滑縮放動畫，取代硬切 bounds |
| Dark mode 地圖底圖 | 暗色主題切換到 CARTO dark_all tile |
| KPI 動態數字動畫 | KPI 卡片數字用 countUp 過場效果 |
| 迷你趨勢火花線 (Sparkline) | 排行榜每一列加入迷你 SVG 趨勢線 |
| 響應式斷點優化 | 中型螢幕 (1120-1400px) 兩欄疊加 |
| Heatmap 圖層 | 縣市鑽取後可疊加學生密度熱力圖，與校點同時切換顯示 |
| 縣市 / 鄉鎮 hover 預覽卡 | 滑鼠移入縣市或鄉鎮時，直接顯示學生數、校數、年增減的預覽卡，再決定是否點入 |
| 單校側欄摘要 | 學校層級補上真正的單校側欄，整合歷年趨勢、基本資料、正式註記與外部連結 |
| 學校分頁圖表元件 | 參考 stats.moe.gov.tw 的資訊編排，讓單校層至少具備多個圖表分頁而非只有表格焦點 |
| 桌機固定左右欄配置 | 桌機版左側地圖舞台與右側分析欄寬需固定，切換 overview / regional / county / schools / 單校分頁時不得反覆改變比例 |
| 縣市圓點統一尺度 | 區域層級的縣市圓點需統一尺寸，以名稱辨識為主，不再用數值大小壓過名稱，也不額外顯示區域名稱如「中部」 |
| 鄉鎮名稱標籤規則 | 鄉鎮名稱需一律顯示於行政區範圍上方，避免蓋住學校點選熱區；當切入單一鄉鎮時，仍需保留其他鄉鎮名稱作為方位參考 |
| 單校主分頁 | 在右側主分析分頁新增以目前學校名稱命名的分頁，點擊地圖校點後直接切入單校圖表工作台 |
| 圖表切換膠囊 | 右側圖表區避免依賴垂直 scroll，改以右上方或區塊頂部膠囊切換不同圖表元件並完整顯示 |
| 單校基準切換 | 單校圖表需支援鄉鎮平均、縣市平均、同學制前 10 校等基準切換，不再為每種比較新增獨立卡片 |
| 單校 UI 參考校別概況 | 單校分析需改為接近教育部「國小校別概況」的資訊編排，至少包含基本資料列、校別歷年趨勢、範圍比較與排名側欄 |
| 趨勢圖三態切換 | 同一張趨勢圖需可切換學生數、今年增減、成長率三種觀察指標 |
| Header 膠囊重整 | 桌機版上方膠囊需靠左貼齊 `Taiwan Education Atlas`，移除無效 placeholder 文案如「地區類別」，並讓教育階段 / 公私立 / 區域膠囊直接驅動地圖範圍與右側分析 |
| 地圖浮層位置微調 | 視窗資訊 chip 文案改為 `Zoom (12.0)   (Lat) 24.1880 / (Lon) 120.7000` 格式，並左移避免與右上角 zoom control 重疊；breadcrumb 與 hover 浮層維持磨砂黑玻璃感 |
| 地圖焦點標籤精簡 | 切進縣市 / 鄉鎮層級後，地圖不再額外顯示與 breadcrumb 重複的目前焦點名稱，例如已在 breadcrumb 顯示 `全台 › 臺中市 › 北屯區` 時，地圖標籤層不再重覆顯示 `北屯區` |
| 五大主分頁重定義 | 依現有正式資料重新定義「全台總覽 / 區域分析 / 縣市分析 / 各校分析 / 校別概況」內容，每個分頁至少有 2-3 個具體圖表或排行區塊，而非只停留在單一卡片或表格 |
| Map-Chart 雙向連動 | 滑過排行列、比較長條或圖表項目時，同步 highlight 對應縣市、鄉鎮或學校；滑過地圖標的時，右側工作台也需反映目前焦點 |
| 資料治理刷新重設 | 重新設計資料治理浮動框，清楚展示資料來源、最後產製時間、refresh 模式、fallback 與異常註記，讓資料更新不只是一個按鈕 |
| 年度缺漏判定重構 | `missingYears` 不可再把所有 0 值年度視為缺漏，需改成只標示正式資料序列中的內部斷點與可疑缺口，降低假陽性 |

### P1：待評估

| 項目 | 說明 |
|------|------|
| 匯出報表 | 每個 tab 增加一鍵匯出 PNG/PDF |
| React.lazy 路由拆分 | `MobileAppLayout`、`DesktopAppLayout`、`DashboardCanvas` 使用 `React.lazy` + `Suspense`，減少首屏 JS 與 initial parse time |
| React.memo 防重繪 | `TaiwanExplorerMap`、`ComparisonBarChart`、`TrendChart`、`SchoolOverviewChart` 加上 `React.memo`，避免上層 `setState` 造成連鎖重繪 |
| useMemo/useCallback 穩定 GeoJSON | 將 `GeoJSON` 的 `style` / `onEachFeature` 回調穩定化，避免每次 render 重建整層而觸發 remount |
| manualChunks 分包 | 將 `leaflet`、`sql.js` 拆成獨立 chunk，並搭配 `DesktopAppLayout`、`MobileAppLayout`、`DashboardCanvas` lazy load 消除 `522 kB` 警告 |
| 資料模型擴充（性別/班級/教師） | `TrendRecord` / `SchoolInsight` 增加 `maleStudents`、`femaleStudents`、`classCount`、`teacherCount`，讓校別概況更接近教育部校別概況 |
| 成長光圈 tooltip | 成長光圈 hover 顯示校名、鄉鎮與年增率，補上視覺提示對應的數據內容 |
| Code-splitting 首屏拆包 | 目前 JS bundle 約 526 kB，需以 `React.lazy` + Vite `manualChunks` 將 leaflet / sql.js / layout 元件拆成獨立 chunk，首屏僅載入地圖核心 |
| 鄉鎮邊界懶載入指示 | 點入縣市後才載入鄉鎮 TopoJSON，載入期間顯示骨架/脈動(pulse)動畫，避免使用者以為畫面卡住 |

### P2：效能與架構優化

| 項目 | 說明 |
|------|------|
| App.tsx 再拆分 | 將 30+ 個 `useState` 抽成 `useAtlasAppState()` custom hook，降低 App.tsx 至 ~300 行 ✅ 已完成 |
| App.tsx 協調層抽離 | 將 URL sync、prefetch、derived state、scenario actions 合併為 `useAtlasOrchestration()` hook (109 行)，App.tsx 降至 295 行 ✅ 已完成 |
| 桌機佈局抽離 | 將 DashboardHeader + DashboardCanvas + AtlasFooter + DataGovernanceFlyout 的桌機版 JSX 抽成 `DesktopAppLayout.tsx` ✅ 已完成 |
| DashboardCanvas tab 抽出 | 將 Regional / County tab panel JSX 抽成 `RegionalTabPanel.tsx`、`CountyTabPanel.tsx`，DashboardCanvas 降至 ~235 行 ✅ 已完成 |
| TaiwanExplorerMap 計算抽離 | 將地圖衍生計算（regionSummaries、centerLookup、可見性旗標等）抽成 `useMapComputedState()` hook ✅ 已完成 |
| TaiwanExplorerMap 輕量化 | 移除冗餘 callback wrapper、共享 tooltip 選項、壓縮 marker 區塊，降至 286 行 ✅ 已完成 |
| 地圖 UX：鄉鎮標籤去重 | 當 scope marker 圓點已顯示鄉鎮名稱時，不再額外渲染 `renderFocusLabelIcon` 標籤層，消除重複標籤 ✅ 已完成 |
| 地圖 UX：校點模式標籤精簡 | 切入單一鄉鎮顯示校點時，僅保留該鄉鎮名稱標籤，隱藏其他鄉鎮標籤以避免遮蓋校點 ✅ 已完成 |
| 地圖 UX：鄉鎮 marker 密度優化 | 縮小鄉鎮 scope marker（base 20+14 取代原 26+18），低於 35% 比例的鄉鎮啟用 compact 模式隱藏學生數，減少重疊 ✅ 已完成 |
| 鄉鎮 marker 計算最佳化 | 將 `Math.max(...townshipRows.map(...))` 改用 `useMapComputedState` 預算的 `maxTownshipStudents`，避免每次 render 重算 ✅ 已完成 |
| 鄉鎮 marker 名稱唯一 | 鄉鎮小圓點一律顯示完整鄉鎮市區名稱（如「東勢區」「大雅區」），不顯示學生數值；統一 42px 尺寸 ✅ 已完成 |
| hover card 滯留修正 | 為 `.atlas-map-hover-card` 與 `.atlas-map-tooltip--preview` 加上 `pointer-events: none`，防止 tooltip 攔截滑鼠事件造成 mouseout 不觸發 ✅ 已完成 |
| 鄉鎮 click-back 行為確認 | 進入鄉鎮後再次點擊同鄉鎮回到縣市層（`handleTownshipSelect` toggle），點擊不同鄉鎮切換目標 ✅ 邏輯已在 `useAtlasScenarioActions` 中實作 |
| 麵包屑區域層級 | 路徑改為 `全台 › 區域 › 縣市 › 鄉鎮`，可直接回到區域層 ✅ 已完成 |
| 分層固定 zoom | 區域 zoom 9、縣市 zoom 11、鄉鎮 zoom 13，並以當前 bounds center 作為定位中心 ✅ 已完成 |
| 鄉鎮黑色膠囊移除 | 單一鄉鎮模式移除中央黑色 focus pill，改由麵包屑與 polygon 導航 ✅ 已完成 |
| 校別概況圖表 (MOE 參考) | 新增「校別概況」chart tab，使用柱狀圖+年增率折線呈現歷年學生數，參考教育部國小校別概況風格 ✅ 已完成 |
| 單校分析容器裁切修正 | school detail card 改為右側單欄捲動容器，解除 `.dashboard-card__body` 的 hidden 裁切，確保 MOE 概況、排行 rail 與 profile facts 可完整瀏覽 ✅ 已完成 |
| 桌機左右欄固定比例 | 抽成 `--dashboard-map-column` / `--dashboard-side-column` 固定欄寬變數，所有 desktop tab 共用同一比例 ✅ 已完成 |
| 地圖學生數藍色色域 | 縣市、鄉鎮 GeoJSON 改用藍色單色系，依學生總量深淺呈現 ✅ 已完成 |
| URL zoom 同步 | 地圖 zoom 值即時寫入 URL query `?zoom=`，頁面重整或分享連結時可還原 zoom 層級 ✅ 已完成 |
| 學校點成長色彩 | 單校圓點改以年增率著色，成長藍、衰退紅，並依百分比深淺呈現 ✅ 已完成 |
| 學校成長光圈 | header pill 文案簡化為「成長光圈」，學生數年增減超過 ±5% 的學校顯示綠 / 紅泛光並支援 tooltip ✅ 已完成 |
| MobileAppLayout prop 瘦身 | 目前 mobile layout 仍承接 70+ props，下一步可抽 `MobileAppAdapter` 或改為 composite props/context，降低轉接成本 |
| 資料模型擴充：性別/班級/教師 | 擴充 `TrendRecord` 與 `SchoolInsight` 加入 `maleStudents`、`femaleStudents`、`classCount`、`teacherCount`，讓校別概況可呈現男女堆疊柱、班級數與生師比等 MOE 格式 |
| manualChunks 分包 | 針對 Vite 已出現的 `524 kB` chunk 警告，將 `leaflet`、`sql.js` 等重資產拆為獨立 chunk，降低主 bundle 壓力 |
| App.tsx 進一步瘦身 | 將 `MobileAppLayout` 的大量 prop 轉接再抽成 adapter 或 scope-oriented props，讓 App 保持 orchestration-only 職責 |
| GeoJSON callback 穩定化 | 以 `useCallback` / `useMemo` 固定 `style`、`onEachFeature` 與 tooltip options，避免縣市/鄉鎮圖層反覆 remount |
| 校點 tooltip 精緻化 | 校點 hover 改用與 scope marker 一致的 preview card，補上學校名稱、學生數、年增減與正式註記摘要 |
| Sparkline 迷你折線圖 | 排行榜與比較面板每列加入 8 年趨勢迷你 SVG 折線，滑鼠移入顯示完整年度值 |
| 學制分佈環形圖 (Donut) | 縣市/鄉鎮層級新增環形圖，顯示國小/國中/高中/大學各學制佔比，可點擊篩選學制 |
| GIS 缺失學校清單面板 | 資料治理浮動框中增加 GIS 座標缺失學校列表，顯示校名、縣市與學制，支援 CSV 匯出 |

### P3：測試與驗證補強

| 項目 | 說明 |
|------|------|
| E2E 補測 | 補上 URL zoom 還原、growth choropleth 視覺回歸，以及區域 / 縣市 / 鄉鎮固定 zoom 導航案例 |
| E2E lat/lon URL 還原 | 驗證 `?lat=&lon=&zoom=` 三參數頁面重整後地圖視角完整還原 |
| E2E 學校代碼搜尋 | 驗證輸入六碼學校代碼後能正確定位學校並展開完整階層路徑 |
| Dark mode 圖表色彩適配 | 所有 Chart 組件（TrendChart、ComparisonBarChart、SchoolOverviewChart、PieChart）在 theme 切換時自動調整軸線/標籤/背景色，確保暗色主題下可讀性 |
| Mobile 手勢操作強化 | 行動裝置支援 bottom sheet 上滑展開右側面板，地圖支援雙指縮放與單指平移手勢，避免與頁面捲動衝突 |
| E2E lat/lon URL 驗證 | 使用 Playwright 驗證 `?lat=&lon=&zoom=` 三參數頁面重整後地圖視角完整還原，覆蓋邊界值與跨縣市分享情境 |
| 資料管道透明度 | 正式統計中存在但缺少 GIS 座標的學校，需在前端以「正式資料存在，座標待補」標註，不得靜默排除；pipeline 建置階段需產出 `missingCoordinates` 清單供 UI 呈現 |

## 優先級補充

- 高：資料模型擴充（性別 / 班級 / 教師）、`React.lazy` 路由拆分、`React.memo` 純展示元件，這三項直接影響 bundle 體積、圖表表達力與互動順暢度。
- 中：`App.tsx` / `MobileAppLayout` prop 瘦身、GeoJSON callback 穩定化、校點 tooltip 精緻化，這些屬於架構與可維護性優化，適合接在本輪 UX 修正後處理。

## 下一輪執行順序

1. 先做 `React.lazy` + `manualChunks`：優先拆 `MobileAppLayout`、`DesktopAppLayout`、`DashboardCanvas`，並將 `leaflet`、`sql.js` 拆成獨立 chunk，直接消除 `500 kB` 警告。
2. 再做 `React.memo` + GeoJSON callback 穩定化：對 `TaiwanExplorerMap`、`TrendChart`、`ComparisonBarChart`、`SchoolOverviewChart` 加上 memo，並固定 `GeoJSON style / onEachFeature` 參照，避免互動時整層重繪。
3. 最後補資料模型擴充與 E2E：將性別 / 班級 / 教師數納入 `TrendRecord` / `SchoolInsight`，並補上 township compact marker 視覺回歸與 URL deep-link 還原案例，降低後續 UX 回退風險。

## 下一輪優先序表

| 優先序 | 項目 | 預期效果 |
|------|------|------|
| 1 | React.lazy + Vite manualChunks | 將 `leaflet` / `sql.js` 拆獨立 chunk，layout 組件 lazy load，消除 `526 kB` 警告 |
| 2 | React.memo + GeoJSON callback 穩定化 | 避免 `TaiwanExplorerMap` 等重元件因上層 `setState` 連鎖重繪 |
| 3 | 資料模型擴充（性別 / 班級 / 教師） | 讓校別概況可呈現男女堆疊柱、班級數與生師比 |
| 4 | E2E 補測 | 補上 township marker visual regression 與 URL deep-link 還原案例 |
| 5 | MobileAppLayout prop 瘦身 | 將 70+ props 轉接抽成 adapter 或 composite props |

## 資料備註

- 學年度：目前前端互動鏈已擴充到 107–114 學年度 (2018–2025)。
- 台灣學年度為每年 8 月至隔年 7 月，不區分上下學期，因教育部統計以學年度為單位。
- 當前為 2026 年 3 月，教育部統計處已公告 114 學年度，但部分靜態明細檔可能晚於公告頁上線，refresh 腳本需容忍逐檔回退來源。
- 學年度選擇器不需要「上學期 / 下學期」區分，因為官方資料粒度為整學年。

## 技術說明

- 群聚效果：沿用現有 `VisibleSchoolMarkers` 的 geohash bucket 機制，調整 circle radius 依 zoom 級別縮放
- flyTo 動畫：`MapBoundsController` 已使用 `map.flyToBounds`，確認 duration 設定
- Dark tile：依 `data-theme` 屬性動態切換 TileLayer url
- countUp：純 CSS/useEffect 實作，無外部依賴
- Sparkline：SVG polyline，內嵌 InsightPanel 每一列
- 響應式：CSS media query `@media (max-width: 1400px)` 兩欄 fallback
- Heatmap：沿用縣市 lazy load 後的 `schoolMapPoints` 做權重熱力圖，不回退成全台一次載入
- Hover 預覽卡：優先用 map tooltip / preview card 呈現縣市、鄉鎮與校點摘要，避免 click 後資訊黏住造成 hover 閃動
- 單校圖表分頁：沿用既有 `TrendChart`、`ComparisonBarChart` 等元件重組，不為此引入大型圖表框架
- 桌機版固定欄寬：左右區塊使用穩定 grid 配置，不因主分頁切換改寫整體 columns 比例
- 鄉鎮標籤：使用非互動標籤層或地圖 div icon 顯示於行政區上方，避免遮蓋校點 hover / click 命中區
- 缺年度重構：資料建置階段需區分「序列前段/尾段自然不存在」與「序列中段異常缺口」，並將判定依據寫入 dataNotes / scope notes
- 治理浮動框：顯示 refresh 狀態、資料源審查摘要、fallback 年度、缺年度學校數與異常下載入口

## 互動細節

- 縣市與鄉鎮層 hover 預覽卡至少需顯示：名稱、學生數、校數、年增減。
- 校點 hover 應跟著滑鼠切換，不得因固定 popup 或 sticky tooltip 造成資訊卡黏住、停留在畫面上方或多張預覽卡殘留。
- 單校 click 後，右側需顯示獨立側欄摘要，不可只停留在 table active row。
- 單校圖表分頁至少需包含：校別歷年趨勢、同範圍比較、規模定位或等效圖表群。
- 單校 click 後，右側主 tabs 需新增以學校名稱命名的分頁並自動切入，不可只停留在「各校分析」總表。
- 桌機版上方 header 若已進入縣市或鄉鎮層級，僅保留單一「回到全台」膠囊；目前路徑則留在地圖舞台左上角，避免 header 與 map 重複顯示同一組 breadcrumb。
- 桌機版 header 的篩選器改為貼齊品牌標題的水平膠囊列，學年度維持 select，其餘教育階段 / 公私立 / 區域優先使用 chip button 顯示，不出現僅作 placeholder 的獨立膠囊。
- 區域層級的縣市圓點應採固定大小，名稱權重高於數值；不再於地圖焦點標籤顯示單純區域名稱如「中部」。
- 鄉鎮標籤應統一放在行政區範圍上方，且在單一鄉鎮模式下仍保留周邊鄉鎮名稱，避免失去方位感。
- 地圖 breadcrumb、viewport chip、說明浮層應維持一致的磨砂黑玻璃語言；viewport chip 需避開右上角 zoom control 與 help toggle，不可互相遮擋。
- 右側五大主分頁需對應目前資料能力：全台以全台趨勢 / 教育階段分布 / 縣市熱點為主，區域以區域總量 / 區域內縣市對照為主，縣市以縣內鄉鎮差異為主，各校以範圍內學校排行與摘要為主，校別概況則維持單校趨勢與基準切換。
- 右側主要分析區在桌機版不應出現多重垂直 scroll；優先透過膠囊切換內容密度，而非讓多張卡片各自滾動。
- `missingYears` 與「待確認」的顯示需以正式資料序列判定為準，不得把學校尚未成立、自然停招或前後端觀測窗外年度直接標成缺漏。
