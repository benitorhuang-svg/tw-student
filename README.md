# 臺灣教育 Atlas — 學生人數分析工作台

> 地圖為核心、資料為脈絡的教育研究儀表板。以 PWA 形式發布，支援桌機與手機全離線瀏覽。

---

## 專案結構

```
student_counting_analysis_TW/
├── frontend/              # React 19 + Vite 7 + TypeScript PWA
│   ├── src/
│   │   ├── components/    # 24 個圖表 / 面板元件（手刻 SVG）
│   │   ├── hooks/         # useChartAnimation, useAtlas, …
│   │   ├── layouts/       # Desktop / Mobile 自適應佈局
│   │   ├── data/          # 資料載入 & 衍生邏輯
│   │   ├── lib/           # analytics 工具函式
│   │   └── styles/        # CSS 設計系統（chart foundations, …）
│   ├── public/            # PWA icon SVGs
│   └── tests/e2e/         # Playwright E2E 測試
├── backend/
│   ├── scripts/           # 資料刷新管線 (Node ESM)
│   │   └── lib/           # 9 個 builder 模組
│   └── data/              # 靜態資料資產（JSON, TopoJSON, SQLite）
└── specs/                 # 規格驅動文件
    ├── PRODUCT_SPEC.md
    ├── TECHNICAL_DETAILS.md
    ├── 001-data-flow-optimization/
    ├── 002-chart-component-optimization/
    └── 003-chart-ux-refinement/
```

## 快速開始

```bash
# 安裝依賴
cd frontend && npm install
cd ../backend && npm install

# 開發伺服器（Vite 自動代理 backend/data）
cd frontend && npm run dev

# 產品建置
cd frontend && npm run build     # 輸出至 frontend/dist/

# 資料刷新
cd backend && node scripts/refresh-official-data.mjs
```

## 關鍵架構決策

| 決策 | 說明 |
|------|------|
| **資料分離** | `backend/data/` 為唯一資料源，Vite plugin 在 dev 代理、build 複製至 `dist/data/` |
| **資料資產 helper** | `src/data/dataAsset.ts` 統一 `/data/*` URL 與 HTML fallback 偵測，避免 `Unexpected token '<'` 類錯誤 |
| **手刻 SVG** | 所有圖表不依賴 D3/Recharts，以 `<svg viewBox>` + CSS 變數實現 |
| **共用動畫** | `useChartAnimation` hook (IntersectionObserver) 統一進場動畫 |
| **共用響應式尺寸** | `useResponsiveSvg` 以 `ResizeObserver` 將容器寬度映射成 SVG 座標系 |
| **PWA 離線** | vite-plugin-pwa + service worker，全靜態 precache |
| **CSS 設計系統** | `00-chart-foundations.css` 統一色彩 token、tooltip、動畫、空狀態 |

## 規格文件

我們遵循 **規格驅動開發 (SDD)** 精神：先定義規格，再進行實作。

- **[PRODUCT_SPEC.md](./specs/PRODUCT_SPEC.md)**：產品導向規格
- **[TECHNICAL_DETAILS.md](./specs/TECHNICAL_DETAILS.md)**：技術導向細節
- **[003 稽核進度](./specs/003-chart-ux-refinement/tasks.md)**：圖表 UI/UX 稽核結果與待辦

## 下一輪優化建議

### P2 — 圖表品質提升

1. **擴散 `useResponsiveSvg`**：本輪已覆蓋 BoxPlot/Scatter/StackedArea/TrendChart，下一輪補到 SchoolOverviewChart、PieChart 與其餘固定尺寸圖
2. **統一 Tooltip 模式**：Scatter/Trend 已收斂到共用 SVG tooltip class；下一輪把 title-only / center-label-only 圖表全部收斂
3. **Inline Style 清理**：ScatterPlotChart、StackedAreaTrendChart 與 DashboardCanvas 仍有殘留 inline style，遷移至 `01-charts.css`
4. **InsightPanel Sparkline 色彩**：hardcoded `#f97316` / `#10b981` 遷移至 CSS 變數

### P2 — 可及性 (a11y)

5. **鍵盤導航**：僅 ScatterPlot/PieChart/SchoolDataTable 有 tabIndex，其餘圖表資料點需補上 keyboard handler
6. **ARIA 標注**：所有 SVG 圖表補 `role="img"` + 描述性 `aria-label`
7. **焦點樣式**：所有可互動元素補 `:focus-visible` outline

### P3 — 架構整理

8. **面板責任拆分**：DashboardCanvas (~290 行)、SchoolDetailPanel (~290 行)、SchoolAnalysisView (~260 行) 各自過大，考慮拆分子元件
目前已先拆出 `DashboardYearNavigator.tsx`；下一輪可沿相同方式拆 section-level 子元件。
9. **共用 `formatWan`**：該函式在 ScatterPlotChart / StackedAreaTrendChart 各自重複定義，應抽取至 `lib/analytics`
10. **E2E 擴充**：新增圖表互動 + 手機版面的 Playwright 視覺迴歸測試
11. **RegionalTabPanel 計算修正**：年增率分母疑似使用 `students - delta` 而非前一年度實際總數，需驗證

## 維護原則

1. **規格先行**：重大功能開發前先更新 `specs/` 相關文件
2. **歷史累積**：已完成或廢棄的計畫移入 `archive/` 而非刪除
3. **語文一致**：維持繁體中文編寫