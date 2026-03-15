# 地圖互動與載入優化產品規格（Map UI Flow Redesign）

摘要：將現有 Leaflet + TopoJSON 地圖互動與資料載入管線系統性重構，提升互動流暢度、首屏載入速度與離線可用性，並提供可測試的驗收準則與執行任務清單。

## 背景
本專案為臺灣教育 Atlas（student_counting_analysis_TW），目前以 Leaflet + TopoJSON 呈現教育行政區與學校點位。隨著資料量與互動需求提升，地圖在低倍率（low-zoom）或大量點物件時的載入/渲染效能、標籤顯示與離線體驗成為限制，需引入多層級資料管線、前端聚合（clustering）、漸進載入與 PWA 快取策略。

## 問題陳述
- 使用者在平移 (pan) 或縮放 (zoom) 時，畫面會有明顯延遲或掉幀，影響使用體驗。
- 首次載入需下載大量 topojson 導致首屏延遲 (TTI) 上升。
- 離線或網路差時，地圖互動與資料還原 (deep-link) 體驗不穩定。
- 標籤（label）碰撞與資訊遮蔽，使圖上焦點不清楚。
- 測試覆蓋不足，缺少 E2E 驗證地圖常見互動流程（聚合、spiderfy、deep-link、離線）

## 目標與成功衡量指標
- 互動流暢度：在常見桌面/筆電裝置上，平移/縮放操作平均維持 30 FPS（可視為目標），pan/zoom 延遲平均 < 150ms。
- 首屏載入（First meaningful map content）：主要地圖圖層在 2 秒內可見（在標準寬頻條件下）。
- 離線可用性：預先快取的 baseline 縮放層（例如 z=0,4,7,10）在離線模式下仍能顯示基本地圖與聚合，離線地圖互動不致於崩潰。 
- E2E 覆蓋：Playwright 測試包含 pan/zoom、cluster 展開與 spiderfy、deep-link 還原、離線模式（至少 5 個測試案例），CI 上能穩定執行。
- 正確性：聚合展開後可以在 500ms 內回應對點資訊的 click/drill-down 操作（在模擬中等網速下測試）。

## 範圍
- In-scope:
  - 建立 backend multi-zoom topojson/vector-tiles（建議 z0..z14）並提供 tile API
  - 前端聚合（Supercluster）整合、cluster UI、spiderfy 行為
  - 漸進載入（progressive loading）與 Canvas/WebGL fallback 策略
  - Service Worker 的 precache（baseline zooms）與 runtime cache policy
  - E2E 測試（Playwright）與性能指標量測
  - 基本無障礙支援（鍵盤導覽、ARIA）

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