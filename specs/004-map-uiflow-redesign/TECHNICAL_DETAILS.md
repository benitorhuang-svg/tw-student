# 技術細節說明（Technical Details）

## 資料端（Backend）處理方案
- 目標：在後端生成 multi-zoom 的地理資料（TopoJSON 或 vector-tiles）以減少前端首次下載負擔。
- 建議輸出範圍：z0..z14（視資料密度可調整），輸出路徑範例：backend/data/tiles/{z}/{x}/{y}.json
- 推薦工具：tippecanoe（產生 vector tiles）、mapshaper（TopoJSON 簡化）、turf.js / ogr2ogr（資料處理）、geobuf（二進位壓縮可選）
- 簡化/抽稀策略：為每個 zoom level 定義 simplify tolerance，例如表格：

  | zoom | simplify tolerance (meters) |
  |------|----------------------------|
  | 0-2  | 5000                       |
  | 3-5  | 1000                       |
  | 6-8  | 200                        |
  | 9-11 | 50                         |
  | 12-14| 5                          |

- 分層點集（學校點）：
  - 在低 zoom (z <= 6) 只提供聚合中心或代表點（例如每行政區代表點）
  - 中/高 zoom 提供更完整的學校點集合（可分層，例如基礎資料、附加屬性）
  - 後端流程示例：原始學校點 -> 產生 density/clustered summary -> 產生 per-zoom point-sets -> 輸出為 tiles

## 前端實作建議
- Leaflet 建議設定：
  - `preferCanvas: true`：這是核心設定，確保所有向量圖層與 Marker 盡可能在 Canvas 上繪製，避免 DOM 節點過多。
  - `zoomSnap: 0.1`, `zoomDelta: 0.5`：配合平滑縮放。

- 輕量化資料投影 (Data Projection)：
  - 使用 `Float32Array` 或精簡物件存放校點座標，避免在 React State 中存放大體積的完整 Metadata 物件。
  - 只有在選取（Selected）或懸停（Hovered）時，才從 SQLite 緩存中索引詳細屬性。

- 空間索引與 Viewport Culling：
  - 引入 **`rbush`** 作為前端空間索引。
  - 在 `moveend` 事件觸發時，透過 `rbush.search(bbox)` 快速篩選可見點位。
  - 只有在「畫面內」的點位才傳遞給 React 元件進行渲染。

- 標籤碰撞與顯示優化：
  - 在 `AllTownshipLabels` 中使用 `rbush` 進行標籤位置預計算。
  - 增加 **Debounce (防抖)** 機制：地圖移動過程中不觸發重大的標籤計算，僅在移動結束後進行一次性更新。

- 渲染 fallback 策略：
  - 預設模式：Leaflet Canvas Renderer。
  - 當點位超過 10,000 個或移動 FPS 低於 20 時，引導使用者縮小搜尋範圍或切換至基礎預覽模式。

## Service Worker / PWA Cache 策略
- Precache：將 baseline zoom levels （建議 z=0,4,7,10）列為 precache 的項目
- Runtime cache policy：對 tiles/points 使用 stale-while-revalidate；對變動頻繁的 API 使用 network-first（帶 fallback）
- Cache invalidation：版本化 tiles（例如 /data/tiles/v1/{z}/{x}/{y}.json）以便於清除快取
- 離線測試要點：模擬離線後，驗證 baseline tiles 可用、聚合顯示合理、且離線提示顯示正常

## API / 資料介面契約
- Tile endpoint 建議：/data/tiles/{z}/{x}/{y}.json
  - 回傳範例：

```json
{
  "type":"FeatureCollection",
  "features":[
    {"type":"Feature","properties":{"id":"school-123","name":"中學A","type":"school","pop":1200},"geometry":{"type":"Point","coordinates":[121.5,25.0]} }
  ]
}
```

- 點資料查詢建議：/data/points?bbox={minX,minY,maxX,maxY}&zoom={z}
  - 回傳包含 points 與 metadata（total, zoomLevel, timestamp）

## 性能監控與量測
- 指標：FPS、TTI (Time to Interactive)、First Contentful Paint、pan/zoom latency、cluster expansion latency、network payload sizes
- 在 E2E 中驗證：使用 Playwright 結合 Performance API（window.performance）或瀏覽器 trace，測量 pan/zoom latency 與 TTI
- 建議在 CI 中定期收集測試指標並存檔以便趨勢分析

## 無障礙（a11y）
- 鍵盤導覽規則：
  - 地圖容器可聚焦（tabindex=0），使用方向鍵執行 pan（小幅度）或快速鍵切換工具
  - cluster 與 point 可以被鍵盤選取（Enter 鍵展開）
- ARIA 屬性：map container role="application"、對於 popup/sidepanel 使用 aria-labelledby 與 aria-describedby
- prefers-reduced-motion：在使用者偏好減少動畫時關閉 zoomAnimation 與 spiderfy 動畫

## 風險與替代方案
- 風險：在極大量點（>100k）下 Canvas 仍可能掉幀
  - 替代方案：server-side clustering 或使用 WebGL (mapbox-gl / deck.gl)
- 風險：Service Worker 設定錯誤會導致資料老舊
  - 替代方案：版本化資源路徑並強制在新版本可用時清除舊快取


---

請參考 tasks.md 取得執行任務清單與優先順序。