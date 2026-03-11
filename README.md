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
| **互動契約** | `chart-tooltip` + keyboard focus 規則已作為第一波基線，第二波正擴散到 Treemap / Butterfly / Histogram / PRIndicator / SchoolComposition |
| **PWA 離線** | vite-plugin-pwa + service worker，全靜態 precache |
| **CSS 設計系統** | `00-chart-foundations.css` 統一色彩 token、tooltip、動畫、空狀態；目前持續將狀態樣式從 inline style 收斂回 CSS class |

## 規格文件

我們遵循 **規格驅動開發 (SDD)** 精神：先定義規格，再進行實作。

- **[PRODUCT_SPEC.md](./specs/PRODUCT_SPEC.md)**：產品導向規格
- **[TECHNICAL_DETAILS.md](./specs/TECHNICAL_DETAILS.md)**：技術導向細節
- **[003 稽核進度](./specs/003-chart-ux-refinement/tasks.md)**：圖表 UI/UX 稽核結果與待辦

## 下一輪優化建議

### P2 — 圖表品質提升

1. **第二波 shared interaction contract**：Treemap / Butterfly / Histogram / PRIndicator / SchoolComposition 與第一波圖表收斂成相同的 hover、focus、Enter/Space、non-hover disclosure。
2. **真正容器驅動的 Pie / SchoolOverview**：不只 mobile-friendly，而是可在 split view / 窄欄位維持 legend、標籤與 active state 可讀。
3. **Inline style 清理**：ScatterPlotChart、StackedAreaTrendChart、PieChart legend 與 panel heading fragment 的狀態樣式回到 CSS token / class。
4. **Interaction E2E + screenshot baseline**：以自動化驗證 hover、Tab focus、Enter/Space 與窄寬度 screenshot，降低多輪 refinement 的回退風險。
5. **跨頁 chart audit**：對所有圖表建立現況、風險、建議與優先級清單，讓後續迭代可持續收斂。

### P2 — 可及性 (a11y)

5. **鍵盤導航**：目前第一波圖表已有基礎等價揭露，第二波 5 張圖仍需補 keyboard handler、focus ring 與 Enter/Space。
6. **ARIA 標注**：所有 SVG 圖表補 `role="img"` + 描述性 `aria-label`
7. **焦點樣式**：所有可互動元素補 `:focus-visible` outline

### P3 — 架構整理

8. **面板責任拆分延伸**：DashboardCanvas 已先拆出 `DashboardYearNavigator.tsx`，SchoolDetailPanel / SchoolAnalysisView 已完成 section-level 拆分；下一輪可把共用 panel heading / chip tab 邏輯再抽成 helper component。
9. **共用 `formatWan`**：該函式在 ScatterPlotChart / StackedAreaTrendChart 各自重複定義，應抽取至 `lib/analytics`
10. **E2E 擴充**：新增圖表互動 + 手機版面的 Playwright 視覺迴歸測試
11. **圖表互動樣式收斂**：目前 tooltip 契約已建立，但第二波圖表與 responsive legend 的視覺密度仍有差異，建議下一輪做純樣式微調與 QA 收斂

## 維護原則

1. **規格先行**：重大功能開發前先更新 `specs/` 相關文件
2. **歷史累積**：已完成或廢棄的計畫移入 `archive/` 而非刪除
3. **語文一致**：維持繁體中文編寫