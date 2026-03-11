# 實作計畫：圖表元件優化改版

**分支**: `002-chart-component-optimization` | **日期**: 2026-03-11 | **規格**: [spec.md](spec.md)

## 摘要

將現有 10+ 圖表與視覺化元件進行系統性升級：統一色票至 CSS 變數、建立共用動畫 Hook、實作響應式 SVG、強化互動與無障礙，並產出一致的 glassmorphism 視覺風格。本次不新增全新圖表類型，聚焦於現有元件的品質躍升。

## 技術背景

**語言/版本**: TypeScript 5.x + React 19
**主要依賴**: Vite、Leaflet（地圖）、sql.js（SQLite WASM）
**儲存**: 靜態 JSON / TopoJSON 切片
**測試**: Playwright E2E（`frontend/tests/e2e/atlas.spec.ts`）
**目標平台**: 桌面瀏覽器 + PWA（行動版）
**效能目標**: 圖表首次渲染 < 100ms，動畫 60fps
**約束**: 不引入外部圖表庫（D3/Recharts），維持手寫 SVG + CSS

## 憲章檢查

- ✅ 互動探索優先：所有改動保持原有下鑽流程不變。
- ✅ 先更新規格：本 plan.md 先於程式碼修改。
- ✅ 異常透明：圖表改版不改變資料標註邏輯。
- ✅ 效能可驗證：改版後執行 build + lint + E2E 驗證。
- ✅ 邊界清楚：不引入新依賴，不改資料模型。
- ✅ 繁體中文規格。

## 專案結構

### 文件（本功能）

```text
specs/002-chart-component-optimization/
├── spec.md              # 規格書
├── plan.md              # 本計畫
└── tasks.md             # 任務清單
```

### 原始碼異動

```text
frontend/src/
├── hooks/
│   └── useChartAnimation.ts          # [NEW] 共用進場動畫 Hook
├── styles/
│   └── components/
│       └── charts/
│           └── 01-chart-foundations.css  # [MODIFY] 統一色票變數 + tooltip 樣式
├── components/
│   ├── StackedAreaTrendChart.tsx      # [MODIFY] 圖例互動、色票變數化、響應式
│   ├── ScatterPlotChart.tsx           # [MODIFY] 四象限底色、tooltip 毛玻璃、色票
│   ├── ComparisonBarChart.tsx         # [MODIFY] 12 色票、色票變數化
│   ├── StackedShareBarChart.tsx       # [MODIFY] 色票變數化、動畫統一
│   ├── BoxPlotChart.tsx               # [MODIFY] 中位數標籤、色票變數化
│   ├── PieChart.tsx                   # [MODIFY] 預設尺寸 160px、色票變數化
│   ├── TrendChart.tsx                 # [MODIFY] 預測虛線段標準化、色票
│   ├── SchoolOverviewChart.tsx        # [MODIFY] 柱狀圖進場動畫、色票
│   ├── InsightPanel.tsx               # [MODIFY] 動畫統一
│   └── StatCard.tsx                   # [MODIFY] 微調色票引用
```

## 實作分階

### Phase 0：基礎建設（色票 + 動畫 Hook + Tooltip）
建立所有後續改動的基礎設施，不動任何圖表元件的渲染邏輯。

### Phase 1：核心圖表升級（P1 視覺品質）
依序升級 ScatterPlotChart → StackedAreaTrendChart → PieChart → ComparisonBarChart → BoxPlotChart → StackedShareBarChart。

### Phase 2：單校圖表與面板升級
升級 SchoolOverviewChart → TrendChart → InsightPanel。

### Phase 3：響應式 + 無障礙收尾
加入響應式 SVG 支援與鍵盤導航。

## 風險評估

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| 色票改動破壞暗色模式一致性 | 中 | 每步驗證亮/暗模式 |
| 動畫效能在低階裝置劣化 | 低 | 使用 CSS transition 而非 JS animation |
| SVG 響應式調整破壊圖表佈局 | 中 | 保持 viewBox 比例，只改外部容器 |
| E2E 選取器因 DOM 調整而中斷 | 中 | 不改變 data-testid 屬性 |
