# Frontend — 臺灣教育 Atlas

React 19 + TypeScript 5.9 + Vite 7.3 PWA 前端工作台。

## 開發

```bash
npm install
npm run dev          # http://localhost:5173 — Vite 自動代理 backend/data
npm run build        # 產出 dist/ 含 PWA service worker
npm run lint         # ESLint
npm run test:e2e     # Playwright E2E
```

## 資料來源

開發模式下，`backendDataPlugin()` (定義於 `vite.config.ts`) 將 `../backend/data/` 底下的靜態資料以 `/data/*` 路徑代理至前端。Production build 時會自動複製至 `dist/data/`。

## 圖表元件

所有圖表為手刻 SVG，不依賴 D3/Recharts。共用基礎設定：

- `src/styles/data/charts/00-chart-foundations.css` — 色彩 token、SVG 文字尺寸（`--chart-text-2xs` ~ `--chart-text-md`）、線條粗細、互動不透明度、transition、box-plot/trend gradient token、PieChart 切片狀態 class
- `src/styles/data/charts/01-charts.css` — 逐元件 SVG 規則：scatter quadrant classes、stacked-area label/delta/total/dot/hover-clip styles、box-plot group cascade（active/muted）、trend crosshair ring
- `src/hooks/useChartAnimation.ts` — IntersectionObserver 進場動畫
- `src/hooks/useResponsiveSvg.ts` — ResizeObserver 容器驅動 SVG 座標系（ScatterPlot / BoxPlot / StackedArea / TrendChart / SchoolOverview / PieChart）
- `chart-tooltip` / keyboard focus contract — 全部 17 元件皆已套用

## 本輪優化（Iterations 1–4）

### CSS 設計系統
- 新增 30+ CSS custom property token（文字尺寸、線條粗細、不透明度、transition、色彩）
- BoxPlotChart fill/stroke 完全改為 CSS group cascade（`--active` / `--muted`）
- SchoolOverviewChart bar opacity、rate-line/rate-dot 改為 CSS
- TrendChart bench stroke、crosshair ring 改為 CSS class
- ScatterPlotChart quadrant fill 改為 CSS class

### 響應式 Padding
- StackedAreaTrendChart: `paddingLeft` 110 → 64@<420px
- ScatterPlotChart: `padding.left` 100 → 56@<400px
- SchoolOverviewChart: 已有 useMemo 響應式 PAD

### Inline SVG → CSS Migration
- 17 個元件中所有可移除的 inline SVG presentation attrs 已清理
- 僅保留真正 data-driven 的 inline 值（per-series color、hover state opacity）

### 鍵盤可及性
- ComparisonBarChart: 全面升級（focus/blur、aria-label、tooltip、inline → CSS）
- BoxPlotChart: Enter/Space handler
- InsightPanel: aria-label
- TrendChart / StackedAreaTrendChart: SVG `role="img"` + `aria-label`

### E2E 測試
- `chart-interactions.spec.ts`: 4 個測試（overview treemap、regional+school charts、PieChart slice activation、narrow-width screenshots）

## 下一輪精修焦點

- **StackedAreaTrendChart 標籤壓縮**：窄寬度下左側學制標籤可能重疊，需加碰撞偵測或省略策略
- **Tooltip 定位邊界保護**：TrendChart crosshair tooltip 在容器邊緣可能溢出
- **PieChart aria-label 加強**：SVG 補充 total value 描述
- **Panel heading 殘留 inline style**：school panels / chart heading eyebrow 還有少量彩色 margin 片段
- **Playwright screenshot baselines**：CSS 變更後需 `--update-snapshots` 重建基線圖
- **Lighthouse 效能掃描**：驗證 CSS 新增量對 LCP/FID 無負面影響
