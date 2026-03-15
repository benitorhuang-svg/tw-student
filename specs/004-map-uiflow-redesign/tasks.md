# 執行任務清單（tasks）

> 優先度定義：P0 = 高優先、P1 = 中、P2 = 低/延後。

## P0（高優先）

- id: multi-zoom-data-pipeline
  - 標題：建立 multi-zoom 資料管線（backend）
  - 描述：在 backend 產生 z0..z14 的 topojson / vector-tiles，並輸出到 backend/data/tiles/{z}/{x}/{y}.json；包含每級的 simplify tolerance 設定表。
  - 預期檔案改動：backend/data/**, .specify/scripts/**
  - 驗收準則：可在本地驗證輸出完整且符合簡化表的 tiles（至少 z=0,4,7,10）。
  - 建議測試案例：backend-multi-zoom-pipeline.spec.ts
  - 優先度：P0

- id: frontend-supercluster-integration
  - 標題：前端整合 Supercluster 與 cluster UI（含 spiderfy）
  - 描述：在前端整合 Supercluster，支援 cluster radius、extent 參數；實作點擊 cluster 的 spiderfy 與 zoom-in 展開邏輯。
  - 預期檔案改動：frontend/src/components/map/**, frontend/src/lib/supercluster/**
  - 驗收準則：cluster 在低 zoom 正常聚合，點擊 cluster 後在 500ms 內執行 spiderfy 或 zoom-in 展開；對應 Playwright 測試通過。
  - 建議測試案例：cluster-spiderfy.spec.ts
  - 優先度：P0

- id: serviceworker-precaching-baseline
  - 標題：預取 & Service Worker precache baseline zooms
  - 描述：將 baseline zoom levels（z=0,4,7,10）列入 precache；其餘 tiles 採用 runtime 缓存策略 (stale-while-revalidate)
  - 預期檔案改動：frontend/src/service-worker.js, frontend/public/manifest.json
  - 驗收準則：在離線模式下，baseline 層仍可顯示；offline-map.spec.ts 通過。
  - 建議測試案例：offline-map.spec.ts
  - 優先度：P0

- id: playwright-e2e-cluster-zoom-deeplink
  - 標題：Playwright E2E：cluster / zoom / deep-link 測試
  - 描述：建立 Playwright 測試，覆蓋 map-pan-zoom.spec.ts、cluster-spiderfy.spec.ts、deep-link-restore.spec.ts
  - 預期檔案改動：tests/e2e/map-*.spec.ts, .github/workflows/**
  - 驗收準則：CI 上可穩定執行並報告關鍵指標
  - 建議測試案例：map-pan-zoom.spec.ts
  - 優先度：P0

- id: basic-keyboard-aria
  - 標題：基本鍵盤導覽與 ARIA
  - 描述：為地圖容器、cluster、point 加入鍵盤互動支援與必要 ARIA 屬性，並支援 prefers-reduced-motion
  - 預期檔案改動：frontend/src/components/map/accessibility.tsx
  - 驗收準則：鍵盤可以聚焦、使用方向鍵進行 pan（或以鍵盤輔助操作），Enter 可展開 cluster。
  - 建議測試案例：accessibility-map.spec.ts
  - 優先度：P0

## P1（中優先）

- id: label-collision-greedy
  - 標題：標籤碰撞處理（greedy + priority）
  - 描述：實作 greedy placement，使用 rbush 做碰撞檢測，優先顯示 selected/hovered 標籤
  - 預期檔案改動：frontend/src/lib/label-placement/**
  - 驗收準則：在多標籤場景下主要標籤不被遮蔽
  - 建議測試案例：label-placement.spec.ts
  - 優先度：P1

- id: canvas-webgl-fallback
  - 標題：Canvas 與 WebGL fallback 策略
  - 描述：偵測資料量與 FPS，超過閾值時引導切換至 WebGL-rendering（或提示降級策略）
  - 預期檔案改動：frontend/src/components/map/rendering-mode.ts
  - 驗收準則：在高負載情境下能正確切換渲染模式，且地圖狀態同步正常
  - 建議測試案例：rendering-mode.spec.ts
  - 優先度：P1

## P2（低優先）

- id: geobuf-compression-tiles
  - 標題：tiles 二進位壓縮（geobuf）
  - 描述：測試 geobuf 壓縮對 network payload 的改善與可行性
  - 預期檔案改動：backend/data/**, frontend/src/lib/tiles/**
  - 驗收準則：傳輸量顯著減少且解碼成本可接受
  - 建議測試案例：tiles-compression.spec.ts
  - 優先度：P2


---

## P0 任務已寫入 session todos

（請見回報）
