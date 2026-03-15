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
  - preferCanvas: true
  - inertia: true
  - zoomAnimation: true
  - preferCanvas 在大量點時能穩定提升渲染效能

- 聚合引擎：Supercluster（或等價 JS library）
  - 主要參數：radius (像素)、extent、maxZoom
  - cluster expansion / spiderfy：點擊 cluster 時若 cluster 大小小於 threshold，可直接 spiderfy 展示內部點，否則以 zoom-in 展開
  - spiderfy 設定要能處理大量重疊點（避免重疊重心偏移）

- label collision 處理
  - 演算法建議：greedy placement + priority rules
    - priority：selected / hovered point > anchor points > secondary labels
    - 先繪製高權重標籤，再嘗試放置次級標籤，若碰撞則以縮放或聚合處理
  - 可採用 spatial index（rbush）做快速碰撞測試

- progressive loading event flow
  - 首屏載入：load baseline tiles (z=0,4,7) 並 render choropleth + coarse clusters
  - 使用者 zoom-in 到 threshold 時，request 點資料或較高 z 的 tiles
  - 在 cluster expansion/spiderfy 前，確保點資料已載入或以 placeholder 顯示

- Canvas vs WebGL fallback
  - 預設使用 Canvas（Leaflet canvas layer），當資料量超過閾值（例如超過 10k 點或 FPS 降低明顯）時，切換到 WebGL 解決方案（mapbox-gl / deck.gl）作為 fallback
  - 需設計一套 state sync 機制，使得地圖狀態（zoom, center, selectedId）能在兩種渲染模式間互通

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