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
| **互動契約** | `chart-tooltip` + keyboard focus 規則已擴散到第二波圖表，並以 Playwright 守住 TrendChart、County storyboard、Schools workspace、Leaflet marker、SchoolComposition、PRIndicator 的 regression |
| **PWA 離線** | vite-plugin-pwa + service worker，全靜態 precache |
| **CSS 設計系統** | `00-chart-foundations.css` 統一色彩 token、tooltip、動畫、空狀態；目前持續將狀態樣式從 inline style 收斂回 CSS class |

## 規格文件

我們遵循 **規格驅動開發 (SDD)** 精神：先定義規格，再進行實作。

- **[PRODUCT_SPEC.md](./specs/PRODUCT_SPEC.md)**：產品導向規格
- **[TECHNICAL_DETAILS.md](./specs/TECHNICAL_DETAILS.md)**：技術導向細節
- **[003 稽核進度](./specs/003-chart-ux-refinement/tasks.md)**：圖表 UI/UX 稽核結果與待辦

## 下一輪優化建議

### P2 — 圖表品質提升

1. **中斷帶密度微調**：County storyboard 與 school focus sidebar 在 720–960px 之間仍有進一步壓縮空白與整理資訊節奏的空間。
2. **軸線與標籤 token 收斂**：Scatter / Trend / Histogram 目前已可讀，但 axis label、tooltip 內文與圖例字級仍未完全共用同一套 token 範圍。
3. **Map + chart 混合場景 baselines**：目前已守住單圖表與工作台 regression，下一輪可補「地圖 + 右側分析卡」的窄寬度與 dark-theme 組合基準。
4. **跨頁 chart audit 持續收斂**：將 overview、regional、county、schools、school-focus 剩餘的視覺密度問題持續轉成 spec、實作與 regression。

### P2 — 可及性 (a11y)

5. **ARIA 摘要深化**：Trend / Scatter / Histogram 已可操作，下一輪可為 remaining charts 補更具體的狀態摘要與資料語意。
6. **焦點樣式**：統一 SVG / Leaflet / list-row 的 `:focus-visible` 規則與主題對比。
7. **鍵盤捷徑一致性**：整理 Space / Enter 在 chart disclosure 與 drill-down 行為上的一致規範。

### P3 — 架構整理

8. **面板責任拆分延伸**：DashboardCanvas 已先拆出 `DashboardYearNavigator.tsx`，SchoolDetailPanel / SchoolAnalysisView 已完成 section-level 拆分；下一輪可把共用 panel heading / chip tab 邏輯再抽成 helper component。
9. **共用 `formatWan`**：該函式在 ScatterPlotChart / StackedAreaTrendChart 各自重複定義，應抽取至 `lib/analytics`
10. **E2E helper 收斂**：`chart-interactions.spec.ts` 已擴充到 9 個案例，下一輪可抽出 chart focus / screenshot helper，降低維護成本。
11. **圖表互動樣式收斂**：tooltip 契約與 regression 已建立，但 responsive legend / axis / disclosure badge 的視覺密度仍可再做純樣式 QA 收斂。

## 維護原則

1. **規格先行**：重大功能開發前先更新 `specs/` 相關文件
2. **歷史累積**：已完成或廢棄的計畫移入 `archive/` 而非刪除
3. **語文一致**：維持繁體中文編寫