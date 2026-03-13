# Frontend — 臺灣教育 Atlas

React 19 + TypeScript 5.9 + Vite 7.3 PWA 前端工作台。

## 開發

```bash
npm install
npm run dev                # http://localhost:5173 — Vite 自動代理 backend/data
npm run build              # 產出 dist/ 含 PWA service worker

# performance helpers

To reduce front‑end payloads, township/county GeoJSON files can be simplified with
mapshaper or converted into vector tiles.  A convenience script lives at
`frontend/scripts/simplify-boundaries.mjs`:

```sh
node frontend/scripts/simplify-boundaries.mjs
```

For production-grade tiling use Tippecanoe to emit `.pbf` files and serve them
via `Leaflet.VectorGrid` from the atlas page — this mimics Google Maps' style
and ensures only features in the current view are downloaded.

A helper script (`frontend/scripts/generate-vector-tiles.mjs`) builds the tiles and
lays them under `public/data/tiles/{county,township}/{z}/{x}/{y}.pbf`; run it with
`node frontend/scripts/generate-vector-tiles.mjs` after data refresh.

For development or light deployment you can serve those files via the
included express server:

```sh
node backend/scripts/start-vector-tiles-server.js 8081 # optionally specify port
```

Point `VITE_VECTOR_TILE_BASE_URL` at `http://localhost:8081/tiles` (or your
real tile host) and set `VITE_USE_VECTOR_TILES=true` to enable online tiling.
Alternatively, host the `tiles` directory with any static file server that
delivers `.pbf` with `application/x-protobuf` and `Content-Encoding: gzip`.

Once tiles exist, configure the atlas component with the `vectorTileBaseUrl`
prop (e.g. `/data/tiles`) or set a global constant.  The mapper will automatically
switch to vector‑tile rendering and drop the old GeoJSON layers.


School points are currently rendered as `CircleMarker` elements.  If you hit
performance issues on mobile devices you may switch them to a canvas layer
(similar to how townships were migrated) or pre‑cluster them server‑side.

npm run lint               # ESLint
npm run test:e2e           # Playwright E2E
npm run audit:lighthouse   # LHCI（建議在 CI / Ubuntu runner 執行）
```

## 資料來源

開發模式下，`backendDataPlugin()` (定義於 `vite.config.ts`) 將 `../backend/data/` 底下的靜態資料以 `/data/*` 路徑代理至前端。Production build 時會自動複製至 `dist/data/`。

## 圖表元件

所有圖表為手刻 SVG，不依賴 D3/Recharts。共用基礎設定：

- `src/styles/data/charts/00-chart-foundations.css` — 色彩 token、SVG 文字尺寸（`--chart-text-2xs` ~ `--chart-text-md`）、線條粗細、互動不透明度、transition、box-plot/trend gradient token、PieChart 切片狀態 class
- `src/styles/data/charts/01-charts.css` — 核心 SVG 與 legacy chart 規則：scatter quadrant classes、stacked-area label/delta/total/dot/hover-clip styles、box-plot group cascade（active/muted）、trend crosshair ring
- `src/styles/data/charts/02-comparison-share.css` — ComparisonBarChart / StackedShareBarChart 規則、長行政名稱雙行標籤與 tooltip 邊界保護
- `src/styles/data/charts/03-distribution-charts.css` — Treemap / Butterfly / Histogram / PRIndicator 規則、dark theme 覆蓋與窄寬度斷點
- `src/styles/organisms/school-panels/02-school-composition.css` — SchoolCompositionChart 專屬樣式，從大型 school-panels 檔案拆出
- `src/hooks/useChartAnimation.ts` — IntersectionObserver 進場動畫
- `src/hooks/useResponsiveSvg.ts` — ResizeObserver 容器驅動 SVG 座標系（ScatterPlot / BoxPlot / StackedArea / TrendChart / SchoolOverview / PieChart）
- `chart-tooltip` / keyboard focus contract — 全部 17 元件皆已套用

## 本輪優化（Iterations 1–14）

### CSS 設計系統
- 新增 30+ CSS custom property token（文字尺寸、線條粗細、不透明度、transition、色彩）
- BoxPlotChart fill/stroke 完全改為 CSS group cascade（`--active` / `--muted`）
- SchoolOverviewChart bar opacity、rate-line/rate-dot 改為 CSS
- chart CSS 改為 feature split，將 comparison/share 與 distribution charts 從 `01-charts.css` 抽離

### 響應式與互動
- StackedAreaTrendChart: `paddingLeft` 110 → 64@<420px
- ScatterPlotChart: `padding.left` 100 → 56@<400px
- StackedAreaTrendChart: greedy Y-offset spreading (MIN_GAP=14px) + 窄寬度 <420px 自動縮寫
- TrendChart: crosshair tooltip 四向邊界保護（X 翻轉 + Y clamp）
- ComparisonBarChart: tooltip 在 520px 以下加入左右邊界保護，避免窄卡片或手機視窗被裁切
- HistogramChart: bins 依容器寬度自動合併，窄欄位下不再把過多 range label 硬塞進同一列

### Inline SVG → CSS Migration
- 17 個元件中所有可移除的 inline SVG presentation attrs 已清理
- 僅保留真正 data-driven 的 inline 值（per-series color、hover state opacity）
- ComparisonBarChart: border-color/background/color/opacity 5 處 → CSS class (`--active`, `--muted`)
- StackedShareBarChart: segment transition/opacity → CSS class (`--muted`)
- InsightPanel: bar-fill opacity → CSS default 0.6 + active class 1.0
- ScopePanel: `gridTemplateColumns: '1fr 1fr'` → `stat-grid--cols-2` CSS class
- MapSidebar / MapFloatingHelp: legend swatch `background`/`opacity` → `--swatch-color`/`--swatch-opacity` CSS custom properties

### 可及性
- ComparisonBarChart: focus/blur、aria-label、tooltip、keyboard activation 全面補齊
- BoxPlotChart: Enter/Space handler
- TrendChart / StackedAreaTrendChart: SVG `role="img"` + `aria-label`
- VisibleSchoolMarkers: 地圖單點與 cluster marker 補齊 Tab、Enter/Space、Escape 與 aria-label
- atlas school marker / cluster marker 新增 `:focus-visible` 視覺回饋

### E2E 測試
- `chart-interactions.spec.ts`: 5 個測試（overview treemap、regional+school charts、PieChart slice activation、narrow-width screenshots、dark-theme screenshots）
- Iteration 11: treemap screenshot baseline 已重建
- Iteration 12: responsive CSS 變更後 baselines 再次重建
- Iteration 13: dark-theme comparison / histogram baselines 補齊
- Iteration 14: 補上 Leaflet school marker focused-path keyboard activation regression，並新增 SchoolComposition / PRIndicator 窄寬度 screenshot baseline

### Iteration 14 收斂
- StackedAreaTrendChart 修正 `chart-enter` / `chart-enter--visible` 顯示狀態，解決 overview「全台各學制歷年學生數」首屏空白風險
- ComparisonBarChart 對長行政名稱改為雙行可讀標籤，窄寬度下降低 ellipsis 資訊損失
- SchoolCompositionChart 補上可見狀態 class、長校名雙行顯示與 640px 以下的 header / gender meta 重排
- `01-school-panels.css` 進行原子化檢核後，將 SchoolComposition 特性拆到獨立 `02-school-composition.css`
- PRIndicatorChart 補強手機斷點下 score block / track / ticks 的穩定性

### Dark Theme 圖表覆蓋
- Treemap canvas、group、leaf: dark 背景 gradient + 邊框降 opacity
- ButterflyChart row/track: dark 背景 + hover shadow
- HistogramChart bin/bar-track: dark 背景
- ComparisonBarChart row、StackedShareBarChart row: dark 背景
- PRIndicatorChart score-block: dark gradient + marker 邊框

### 跨頁視覺階層
- `panel-heading--section` 與 `panel-heading__stack` 收斂 overview / regional / county 的 section heading
- `AtlasTabs` 升級為一級導覽 surface，改善 active indicator 與窄桌機水平捲動安全性
- `src/styles/organisms/school-panels/01-school-panels.css` 新增 `--atlas-surface-*`、`--atlas-text-*`、`--atlas-border-*` token
- `SchoolAnalysisView` breadcrumb / chart-path 改為結構化導覽，首屏 hero 與 side metrics 的主次更清楚
- atlas metric tile 與 storyboard chart container 改為 primary / secondary surface 分層

## Lighthouse CI

- `npm run audit:lighthouse` 會以 build 後的 preview server 掃描三條核心路徑：overview、regional、schools(Taichung)
- 本機 Windows 若遇到 Chrome interstitial，可改由 `.github/workflows/lighthouse.yml` 在 Ubuntu runner 執行
- 報告輸出至 `frontend/lighthouse-results/`，workflow 也會上傳成 artifact

## 下一輪精修焦點

- TrendChart regression：補 hover / keyboard / dark-theme baseline，並驗證 benchmark / prediction 線的可辨識度
- County tab regression：補齊 county comparison / scatter / fallback pie 的互動與 responsive baseline
- Schools chart audit：Histogram / BoxPlot / peer scatter 的 keyboard、tooltip 與 dark-theme baseline 仍需擴充
- Lighthouse assertion tuning：在 CI 累積幾輪報告後，把 performance/accessibility 由 `warn` 調高為更具體的門檻
