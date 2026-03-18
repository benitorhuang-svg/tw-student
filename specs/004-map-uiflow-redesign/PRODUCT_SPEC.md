# 地圖互動與載入優化產品規格（Map UI Flow Redesign）

摘要：將現有 Leaflet + TopoJSON 地圖互動與資料載入管線系統性重構，提升互動流暢度、首屏載入速度與離線可用性，並提供可測試的驗收準則與執行任務清單。

## 背景
本專案為臺灣教育 Atlas（student_counting_analysis_TW），目前以 Leaflet 為主體呈現教育行政區與學校點位。隨著資料量與互動需求提升，單純依賴 React 元件渲染數千個 DOM Marker 已達到效能瓶頸。需導入前端空間索引（rbush）、資料投影（Data Projection）與 Canvas 渲染優化，以維持流暢的互動體驗。

## 問題陳述
- 大量點位渲染瓶頸：當畫面中校點超過 2,000 個時，React 的 Reconciliation 與 DOM 渲染導致平移與縮放延遲。
- 資料流過於沈重：每次過濾條件改變時，全量物件的解構與合併處理占用過多 JS 主執行緒時間。
- 標籤碰撞效率：目前的碰撞檢測與 React 元件生命週期綁定，導致高頻操作下的「噴幀」現象。

## 目標與成功衡量指標
- 互動流暢度：平移/縮放操作需維持穩定 30+ FPS，互動延遲（Interaction Latency）< 100ms。
- 資料投影效率：從資料庫查詢到地圖座標點產出的處理時間 < 50ms。
- 空間索引查詢：使用 rbush 進行 Viewport Culling，確保畫面外點位不參與 React 渲染循環。
- 離線可用性：預先快取的基礎縮放層（z=0,4,7,10）在離線模式下需能秒級呈現，不依賴動態計算。

## 範圍
- In-scope:
  - 輕量化資料投影（Data Projection）：將 SQLite 原始資料轉為輕量化的傳輸格式。
  - 前端空間索引（rbush）：實作高效的 Viewport 點位裁切。
  - Canvas 全局渲染：開啟 Leaflet `preferCanvas` 模式，並重構 Marker 為 Canvas 渲染。
  - 事件防抖與處理：優化地圖移動事件對 React 狀態的觸發頻率。
  - PWA 快取與邊界 TopoJSON 壓縮。
  - 側欄總覽體驗重整：將「全台縣市規模排名」重構為可掃讀、可點選的原子化排行榜卡片，避免資訊擠壓與可讀性下降。
  - 資料治理入口明確化：頁尾「資料治理」按鈕需穩定展開資訊框，並提供可預期的開關狀態與鍵盤關閉行為。

- Out-of-scope:
  - 大幅改用其他地圖平台（例如完全換成 Mapbox GL）作為主線實作（可列為替代方案）
  - 完整的地圖樣式重設或視覺設計系統改動（僅建議小幅 UI 調整）

## 主要用戶故事
1. 一般使用者（探索地圖）
   - 作為一個訪客，我要在地圖上平移與縮放，快速看到各級聚合與學校分佈，以便快速理解某一縣市的學校密度。
2. 資料分析者（比對區域）
   - 作為資料分析者，我要能在較高縮放層級取得個別學校點並能將選取範圍與圖表同步，方便做跨圖表分析。
3. QA/測試工程師
   - 作為 QA，我要有 E2E 測試覆蓋常見互動（聚合、spiderfy、deep-link、離線），以利 CI 驗證功能正確。
4. 行動網路使用者（離線與慢網路）
   - 作為在弱網路或離線環境的使用者，我希望預設範圍能離線瀏覽，並在回線恢復時自動更新資料。

## 主要互動流程（Map-centric）
1. 首屏：載入 baseline topojson tiles（例如 z=0/4/7），顯示 choropleth 與初階聚合。
2. 使用者 pan/zoom：地圖回應（inertia + zoomAnimation），前端判斷是否需要載入更高解析度 tiles 或點資料。
3. Cluster 展開：點擊 cluster 後若在同層級可展開為 spiderfy（或 zoom-in 展開），顯示 cluster 內重點資料摘要。
4. 點選 Drill-down：點擊單一學校點後，顯示側欄或 popup，同步更新 charts 工作台。
5. Deep-link 還原：使用者透過 URL（包含 bbox / zoom / selectedId）回到已儲存的視圖，系統重建相同的 map state 並同步 charts。

## 接受準則
- 側欄總覽與資料治理
  - 「全台縣市規模排名」在桌面寬度下需呈現三個獨立榜單卡片，每卡固定顯示前三名，名稱、數值、排名語意清楚，且不應出現內容截斷到無法辨識縣市的情況。
  - 排行榜列項必須可點擊，點擊後沿用既有 drill-down 流程切到對應縣市。
  - 點擊頁尾「資料治理」按鈕後，資訊框需可靠展開；再次點擊、點擊背景遮罩或按 `Escape` 都必須能關閉。

- Multi-zoom 資料管線（backend）
  - 可以輸出 z0..z14 的 topojson 或 vector-tile 形式，並依範例目錄結構儲存在 backend/data/tiles/{z}/{x}/{y}.json
  - 生成流程應包含簡化容差表格（每級 simplify tolerance），可在文件中驗證

- 前端聚合與 cluster UI
  - 聚合在低 zoom 顯示清楚，點擊 cluster 可在 500ms 內觸發 spiderfy 或 zoom-in 展開
  - cluster radius 與 behaviour 為可設定參數（配置檔或初始化參數）

- 標籤顯示
  - 使用 greedy placement，優先顯示被 hover 或 selected 的標籤，碰撞判斷成功率需達到預期（無遮蔽主要資訊）

- 性能門檻
  - 在代表性桌機裝置（中等規格），平移/縮放維持平均 30 FPS，若條件受限則最低不低於 20 FPS
  - 首屏主要圖層在 2 秒內可見（標準網路）

- 離線與快取
  - 預先快取的 baseline zooms（z=0,4,7,10）在離線模式下可以顯示
  - 在離線情境下，系統應顯示離線提示並允許基本互動

- E2E 測試
  - Playwright 測試包含：map-pan-zoom.spec.ts、cluster-spiderfy.spec.ts、deep-link-restore.spec.ts、offline-map.spec.ts


---

請參見 TECHNICAL_DETAILS.md 了解更細的技術建議與 API 介面範例。