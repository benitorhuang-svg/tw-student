# 003 圖表與 UX 互動精修 — 實作進度與稽核結果

**更新日期**: 2026-03-11 (Iteration 15 完成)  
**狀態**: In Progress

---

## 一、完整圖表元件 UI/UX 稽核摘要

### 嚴重度分級

| 嚴重度 | 元件 | 主要問題 |
|--------|------|----------|
| **P0 已修復** | ScatterPlotChart | `Math.min(...[])` 空陣列崩潰 → 加入早期 return 空狀態 |
| **P0 已修復** | StackedAreaTrendChart | 除以零風險 (`totals[i-1] === 0`) → 加入 guard |
| **P0 已修復** | SchoolDataTable | CSV 匯出公式注入漏洞 → `escapeCsv` 加入前綴防護 |
| **P0 已修復** | PieChart | 100% 單片弧線退化 (start≈end) → 角度上限 clamp |
| **P0 已修復** | 資料載入層 | `/data/*` 回傳 HTML 時辨識為資產路徑錯誤，不再直接拋出 `Unexpected token '<'` |
| **P1 已修復** | 5 元件 | 未使用 `useChartAnimation` → Scatter/StackedArea/Pie/SchoolComposition/TrendChart 已接入 |
| **P1 已修復** | 9 元件 | 缺少空狀態 → Treemap/Butterfly/ComparisonBar/StackedShare/Trend/Scatter/StackedArea/Pie/SchoolDataTable 已加入 |
| **P1 已修復** | 4 元件 | `useResponsiveSvg` 取代硬編碼尺寸 → Scatter/BoxPlot/StackedArea/TrendChart |
| **P1 部分修復** | 多元件 | inline style、tooltip 不一致、鍵盤可及性缺口仍待擴散到其餘圖表 |
| **P1 已修復** | ComparisonBarChart | tooltip 在窄寬度下加入左右邊界保護，避免溢出 viewport/card |
| **P1 已修復** | HistogramChart | bins 依容器寬度自動減箱，避免手機/窄欄位標籤擁擠 |
| **P1 已修復** | VisibleSchoolMarkers | 地圖 marker / cluster 支援 Tab、Enter/Space、Escape 與 aria-label |
| **P1 已修復** | Interaction E2E | dark-theme screenshot baseline 已加入 treemap/comparison/histogram |
| **P2 已修復** | 圖表樣式系統 | chart CSS 依功能拆為 foundations / legacy-svg / comparison-share / distribution |
| **P2 已修復** | Lighthouse Audit | 改由 Ubuntu CI workflow 執行，避開 Windows Chrome interstitial |

### 逐元件稽核矩陣

| 元件 | 成熟度 | 響應式 | CSS Token | 動畫 | 空狀態 | 鍵盤 | Tooltip | Aria |
|------|--------|--------|-----------|------|--------|------|---------|------|
| TreemapChart | 92% | ✅ | ✅ | ✅ | ✅ | ⚠ Enter | ✅ | ✅ |
| ButterflyChart | 82% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| HistogramChart | 86% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PRIndicatorChart | 84% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| BoxPlotChart | 90% | ✅ | ✅ token | ✅ | ✅ | ✅ | ⚠ | ✅ |
| ComparisonBarChart | 95% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ScatterPlotChart | 90% | ✅ resp | ✅ token | ✅ | ✅ | ✅ | ⚠ | ✅ |
| StackedAreaTrendChart | 93% | ✅ resp | ✅ token | ✅ | ✅ | ⚠ | ✅ | ✅ |
| StackedShareBarChart | 95% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| TrendChart | 93% | ✅ | ✅ token | ✅ | ✅ | ✅ | ✅ | ✅ |
| SchoolOverviewChart | 88% | ✅ | ✅ token | ✅ | ✅ | ⚠ | ✅ | ✅ |
| SchoolCompositionChart | 92% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PieChart | 93% | ✅ | ✅ token | ✅ | ✅ | ✅ | ✅ | ✅ |
| InsightPanel | 90% | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| StatCard | 90% | ✅ | ✅ | N/A | N/A | N/A | N/A | ✅ |
| AnimatedNumber | 85% | N/A | N/A | ✅ | N/A | N/A | N/A | ✅ |
| ScopePanel | 93% | ✅ | ✅ | ✅ | N/A | ✅* | ✅ | ✅ |

`*` = 本輪新接入 `useChartAnimation`

---

## 二、已完成實作項目

### P0 — 程式缺陷 / 安全性

- [x] **ScatterPlotChart** 空資料崩潰：`Math.min/max(...[])` 產生 `Infinity` 導致 NaN 座標 → 加入 `points.length === 0` 早期 return + 空狀態 UI
- [x] **StackedAreaTrendChart** 除以零：`totals[i-1]` 為 0 時百分比計算產生 `NaN` → 加入 `totals[i-1] === 0` guard，回傳空字串
- [x] **SchoolDataTable** CSV 公式注入：`escapeCsv` 僅處理引號跳脫 → 新增 `=+\-@\t\r` 前綴偵測並加 `'` 前綴防護
- [x] **PieChart** 全圓弧退化：單一 slice.share ≈ 1 時 arc start ≈ end → 角度 clamp 至 `2π - 0.001`
- [x] **資料載入 HTML fallback**：新增 `dataAsset.ts`，統一 `/data/*` URL 組裝與 JSON / binary 回應驗證；Vite dev server 缺檔改回傳 404 plain text，不再落到 SPA `index.html`

### P1 — 一致性 & 使用體驗

- [x] **統一進場動畫**：ScatterPlotChart、StackedAreaTrendChart、PieChart、SchoolCompositionChart、TrendChart 均接入共用 `useChartAnimation` hook
- [x] **統一空狀態**：9 個缺少空狀態的元件全數加入 `.chart-empty-state` 回退 UI
- [x] **空狀態樣式**：`00-chart-foundations.css` 新增 `.chart-empty-state` 共用樣式規則
- [x] **Responsive SVG 基礎 hook**：新增 `useResponsiveSvg.ts`，BoxPlot/Scatter/StackedArea/TrendChart 改以容器寬度驅動內部座標系
- [x] **Tooltip / focus 基礎樣式**：新增 `chart-svg-tooltip__*` 與 `chart-data-focusable` 共用 class，先套用到 Scatter / Trend
- [x] **DashboardCanvas 局部拆分**：年份導航抽出為 `DashboardYearNavigator.tsx`，清掉該段 inline style
- [x] **區域成長率語意**：RegionalTabPanel 改以前一學年實際總數作為分母，不再用重建值推算
- [x] **InsightPanel 色彩一致性**：sparkline 改用 theme token，移除沒有差異的 active/inactive branch
- [x] **互動契約擴散**：StackedShareBarChart、PieChart、SchoolOverviewChart 補齊 shared tooltip + keyboard focus + 非 hover 等價揭露
- [x] **SchoolAnalysisView section 拆分**：overview / trend / ranking / positioning 區段拆為子元件
- [x] **SchoolDetailPanel section 拆分**：workspace / focus 模式拆為子元件，抽離 `SchoolWorkbenchView` shared type

### P2 — 第二波一致性擴散

- [x] **TreemapChart 契約擴散**：補 hover/focus/Enter/Space 與 shared tooltip
- [x] **ButterflyChart 契約擴散**：補 hover/focus/Enter/Space 與 shared tooltip
- [x] **HistogramChart 契約擴散**：將分箱改為可 focus / activation 的資料項
- [x] **PRIndicatorChart 契約擴散**：替 percentile marker 與摘要補 keyboard-disclosure
- [x] **SchoolCompositionChart 契約擴散**：level card / 結構摘要補 shared tooltip 與 keyboard equivalence
- [x] **PieChart responsive SVG**：改為容器驅動尺寸並驗證窄寬度 legend/tooltip
- [x] **SchoolOverviewChart responsive SVG**：改為容器驅動尺寸並驗證窄寬度標籤/active state
- [x] **ComparisonBarChart 全面升級**：補 focus/blur、aria-label、tooltip、inline → CSS token
- [x] **BoxPlotChart 鍵盤補齊**：補 Enter/Space handler、CSS box token
- [x] **InsightPanel aria 補齊**：補 aria-label、bar-fill transition 移至 CSS
- [x] **TrendChart 梯度 token 化**：gradient stopColor 改用 CSS var
- [x] **StackedAreaTrendChart aria-label**：SVG 補 role="img" + aria-label
- [x] **CSS 設計系統擴充**：新增 --chart-text-{2xs,xs,sm,base,md}、--chart-line-weight-{thin,primary,bold}、--chart-opacity-{muted,rest}、--chart-transition-{layout,fast}、--chart-box-{stroke,fill} 等 token
- [x] **Iteration 3: 響應式 Padding**：StackedAreaTrendChart paddingLeft 110→64@<420px、ScatterPlotChart padding.left 100→56@<400px
- [x] **Iteration 3: BoxPlotChart inline 清理**：transition/opacity/cursor 移至 CSS group class，fill/stroke 改為 group--active cascade
- [x] **Iteration 3: TrendChart inline 清理**：bench stroke → CSS、crosshair ring → CSS class
- [x] **Iteration 3: SchoolOverviewChart inline 清理**：grid stroke → CSS、active-line color → CSS、rate-line/rate-dot → CSS
- [x] **Iteration 4: 剩餘 inline 屬性清掃**：StackedArea line-path → CSS (strokeWidth/linecap/linejoin)、dot → CSS (stroke/strokeWidth)、ScatterPlot quadrant fill → CSS class、SchoolOverview bar opacity → CSS、BoxPlot fill/stroke 全部改為 CSS cascade
- [x] **Iteration 6: school panels 對比修正**：school-focus、school-detail、workspace cards、summary cards、side metrics 改用 theme-safe surface/text/border token，修正 light theme 洗白問題
- [x] **Iteration 7: 跨頁 section heading 收斂**：DashboardCanvas、RegionalTabPanel、CountyTabPanel 的 heading margin/color inline style 改為共用 `panel-heading--section` / eyebrow class
- [x] **Iteration 8: AtlasTabs 導覽拋光**：active indicator、inactive/hover 狀態與窄桌機水平捲動安全性提升
- [x] **Iteration 9: 卡片層級重整**：atlas metric tile 與 storyboard chart container 建立 primary / secondary surface 區隔與 spacing rhythm
- [x] **Iteration 10: 校別概況首屏階層**：SchoolAnalysisView breadcrumb / chart-path 改為結構化導覽，hero surface 與 summary hierarchy 強化
- [x] **ScatterPlotChart inline style 清理**：fontSize、padding 響應式化、quadrant fill → CSS class
- [x] **StackedAreaTrendChart inline style 清理**：響應式 padding、strokeWidth/stroke → CSS、series-label → CSS class
- [x] **PieChart legend inline style 清理**：slice stroke/opacity → CSS class (pie-chart__slice--active/muted)
- [x] **Panel heading 殘留樣式清理**：overview / regional / county 共用 section heading 已改為 class，school panels 相關 surface 一併對齊
- [x] **Interaction E2E**：補 hover、Tab focus、Enter/Space activation、窄寬度 screenshot comparison
- [x] **跨頁 chart audit**：為所有圖表列出現況、風險、建議與優先級
- [x] **README 對齊**：同步 Iterations 6–10 與下一輪建議
- [x] **Iteration 11: StackedAreaTrendChart 標籤碰撞修復**：greedy Y-offset spreading 演算法 (MIN_GAP=14px)，窄寬度 (<420px) 自動縮寫為 2 字元 + "…"
- [x] **Iteration 11: TrendChart tooltip 四向邊界保護**：X 軸翻轉 + Y 軸 clamp，避免 tooltip 溢出 SVG 容器
- [x] **Iteration 11: ComparisonBarChart inline → CSS**：邊框色/背景/文字色/透明度 5 處 inline style 改為 CSS class (`--active`, `--muted`)
- [x] **Iteration 11: StackedShareBarChart inline → CSS**：segment transition/opacity 遷移至 CSS class (`--muted`)
- [x] **Iteration 11: InsightPanel bar-fill opacity → CSS**：預設 0.6 + active class 1.0
- [x] **Iteration 11: PieChart aria-label 加強**：SVG aria-label 改為動態描述（總人數 + top-3 占比）
- [x] **Iteration 11: SchoolAnalysisView breadcrumb/hero overflow**：語意化 CSS class、max-width + text-overflow:ellipsis、640px 響應式
- [x] **Iteration 11: Treemap leaf-label overflow**：text-overflow + max-width 保護、860px 響應式（縮小字體、隱藏 meta）
- [x] **Iteration 11: school-detail topbar overflow**：min-width:0 + line-clamp:2 防止指標文字撐爆欄位
- [x] **Iteration 11: Playwright baselines 重建**：4/4 測試通過，treemap screenshot baseline 已更新
- [x] **Iteration 11: spec.md 更新**：新增 User Stories 7-10、FR-025~031、NFR-015~016、SC-021~025、3 edge cases
- [x] **Iteration 12: ScopePanel grid inline → CSS**：`gridTemplateColumns: '1fr 1fr'` 改為 `stat-grid--cols-2` class
- [x] **Iteration 12: Dark theme chart containers**：Treemap、Butterfly、Histogram、ComparisonBar、StackedShare、PRIndicator 補 `[data-theme=dark]` 背景/邊框/陰影覆蓋
- [x] **Iteration 12: ButterflyChart/Histogram/PR narrow responsive**：860px 以下縮小 value/label 字體、histogram range ellipsis、PR score-block 字體縮放、histogram bar-track 減高
- [x] **Iteration 12: Map legend swatch → CSS custom property**：MapSidebar/MapFloatingHelp `style={{background,opacity}}` 改為 `--swatch-color` / `--swatch-opacity` CSS vars
- [x] **Iteration 12: spec.md 補充**：SC-026~028
- [x] **Iteration 12: Playwright baselines 重建**：4/4 測試通過
- [x] **Iteration 13: ComparisonBarChart tooltip 邊界保護**：新增 520px 以下 max-width 與左右 clamp，避免 tooltip 超出卡片
- [x] **Iteration 13: HistogramChart 響應式 bins**：以 `ResizeObserver` 量測 bars 容器寬度，窄寬度自動降低 bin 數量
- [x] **Iteration 13: VisibleSchoolMarkers 鍵盤可及性**：Leaflet marker / cluster 補 `tabindex`、`role=button`、`aria-label`、Enter/Space、Escape 與 focus tooltip
- [x] **Iteration 13: 地圖 marker focus-visible**：atlas-school-marker / cluster-marker 新增鍵盤焦點外框
- [x] **Iteration 13: Dark theme E2E**：新增 overview treemap、regional comparison、schools histogram 三張 dark baseline
- [x] **Iteration 13: chart CSS 原子化拆分**：新增 `02-comparison-share.css`、`03-distribution-charts.css`，入口檔改為多檔匯入
- [x] **Iteration 13: Lighthouse CI workflow**：新增 `.github/workflows/lighthouse.yml` 與 `frontend/lighthouserc.json`
- [x] **Iteration 14: Overview trend 空白修正**：`StackedAreaTrendChart` SVG 顯示狀態改為 `chart-enter chart-enter--visible`，避免首屏資料存在卻被 opacity 0 隱藏
- [x] **Iteration 14: County / Regional comparison label 可讀性**：ComparisonBarChart 改為雙行行政名稱標籤，窄寬度下降低單行 ellipsis 資訊損失
- [x] **Iteration 14: SchoolComposition 響應式與原子化**：可見狀態 class 修正、長校名雙行顯示、640px 以下 header / gender meta 重排，並將樣式拆至 `02-school-composition.css`
- [x] **Iteration 14: PRIndicator 窄寬度穩定**：860px 以下 score block 改為左對齊、track / ticks 微調
- [x] **Iteration 14: Map marker focused-path regression**：Playwright 補上 Leaflet school marker focus + Enter 選取學校流程
- [x] **Iteration 14: 窄寬度 baselines**：新增 SchoolCompositionChart 與 PRIndicatorChart 的 360px screenshot 守門
- [x] **Iteration 15: TrendChart 基準線落地**：SchoolAnalysisView 以 peer schools 推導 benchmark trend，TrendChart 補 legend / 雙列 tooltip / 窄寬年份稀疏與更明顯的 benchmark / prediction 視覺分層
- [x] **Iteration 15: County 全路徑 regression**：County storyboard 補 comparison row focus、scatter point focus、fallback pie 觸發路徑與 responsive screenshot baseline
- [x] **Iteration 15: Schools 工作台 regression**：peer scatter keyboard 選校、Histogram / BoxPlot keyboard disclosure、peer scatter / histogram / boxplot 窄寬 screenshot baselines 全數補齊
- [x] **Iteration 15: 版面密度調整**：新增 `04-trend-regression.css` 與 `03-layout-density.css`，避免擴張既有大型 CSS 檔；修正 county split、scatter quadrant label、boxplot median label、histogram range label 的擁擠感
- [x] **Iteration 15: Chart Playwright 擴充**：`chart-interactions.spec.ts` 擴充為 9 個回歸案例，涵蓋 Trend hover/keyboard/dark、County comparison/scatter/fallback pie、Schools workspace keyboard + narrow baselines

---

## 三、下一輪待辦（P2–P3）

### 響應式 SVG 尺寸

| 元件 | 現況 | 建議 |
|------|------|------|
| BoxPlotChart | 已改為 `useResponsiveSvg` | ✅ 完成 |
| ScatterPlotChart | 已改為 `useResponsiveSvg` | ✅ padding 響應式化完成 |
| StackedAreaTrendChart | 已改為 `useResponsiveSvg` | ✅ padding 響應式化完成，標籤壓縮待優 |
| TrendChart | 已改為 `useResponsiveSvg` | ✅ crosshair 已補 CSS ring class |
| PieChart | 已改為容器驅動 | ✅ legend / tooltip 已驗證 |
| SchoolOverviewChart | 已改為容器驅動 | ✅ active state / 窄寬度已驗證 |

### Tooltip 一致化

| 現行模式 | 使用元件 | 目標 |
|---------|---------|------|
| 玻璃態 SVG tooltip class | TrendChart | 已套用共用 `chart-svg-tooltip__*` |
| SVG rect+text | ScatterPlotChart | 已套用共用 `chart-svg-tooltip__*` |
| 區塊 tooltip 面板 | StackedShareBarChart | 已改為共用 `chart-tooltip` 互動詳情 |
| 中心標籤 + tooltip | PieChart | 已補 hover/focus tooltip，後續可再收斂定位樣式 |
| 第二波圖表 tooltip | Treemap / Butterfly / Histogram / PRIndicator / SchoolComposition | ✅ 已補齊 shared tooltip / keyboard equivalence |

### 跨頁視覺層級待辦

- ~~StackedAreaTrendChart：窄寬度下左側系列標籤仍需碰撞偵測與省略策略~~ → ✅ Iteration 11 greedy Y-spread + 縮寫
- ~~TrendChart：crosshair tooltip 仍需邊界保護，避免貼邊溢出~~ → ✅ Iteration 11 四向邊界保護
- ~~ComparisonBarChart / StackedShareBarChart：仍有少量 data-driven inline style~~ → ✅ Iteration 11 active/muted CSS class
- ~~SchoolAnalysisView：breadcrumb / hero 已強化，但長校名與長行政區組合仍需做更激進的窄寬度壓縮策略~~ → ✅ Iteration 11 breadcrumb max-width + ellipsis + 640px responsive
- ~~Playwright screenshot baselines 與 Lighthouse 仍待重建 / 掃描~~ → ✅ Iteration 11 baselines 已重建

### Iteration 14+ 待處理

- ~~TreemapChart 仍使用固定 1000×560 canvas~~ → 確認已為 % 配置 + aspect-ratio CSS，無需轉換
- SchoolCompositionChart 仍有 4 處 inline style (gender segment widths, band widths) — data-driven，保留
- ButterflyChart 仍有 2 處 inline style (left/right width animations) — data-driven，保留
- ~~Dark theme 對新增 CSS 規則進行覆蓋驗證~~ → ✅ Iteration 12 已補齊
- Mobile 與 tablet 之間仍可再做一輪 chart shell 密度稽核，特別是 county storyboard 與 school focus sidebar 的 720–960px 區段
- Scatter / Trend / Histogram 的 axis label token 仍有細微落差，下一輪可收斂到同一套字級與邊界規則
- County / Schools regression 已補齊，但 map + chart 混合操作的窄寬度 baseline 仍可再增加一輪專項守門
- ~~ButterflyChart / PRIndicatorChart 手機端響應式不足~~ → ✅ Iteration 12 已補 860px 斷點

### 可及性補強

- 所有 SVG 圖表補充 `role="img"` 與描述性 `aria-label`
- 所有可互動資料點補充 `tabIndex`、`:focus-visible` 樣式與 `onKeyDown` handler
- InsightPanel sparkline 色彩從 hardcoded hex 改為 CSS 變數
- TrendChart 點位已補 keyboard focus / Enter / Space；BoxPlotChart 已補焦點 hover state
- TreemapChart、ButterflyChart、HistogramChart、PRIndicatorChart、SchoolCompositionChart 為第二波 shared tooltip / keyboard equivalence 目標

### Interaction E2E

- 建立 hover / Tab focus / Enter or Space / narrow-width screenshot 的回歸測試流程
- 優先覆蓋 overview、regional、school focus 三條使用路徑
- 避免共享互動契約重新退回 title-only、hover-only 或固定尺寸破版

### 全頁 chart audit

- 所有圖表需記錄：頁面、元件、現況、風險、建議、優先級
- README 必須同步反映本輪與下一輪重點
- 本輪新增稽核結論：Trend / County / Schools 三條高風險互動路徑皆已納入 Playwright 守門，且 fallback pie 以 searchText 降級路徑穩定重現

### 面板責任拆分

- DashboardCanvas (~290 行) 已先拆分年份導航為 `DashboardYearNavigator.tsx`
- SchoolDetailPanel (~290 行) workspace/focus 兩模式已改為獨立子元件
- SchoolAnalysisView (~260 行) overview/trend/ranking/positioning 已改為獨立子元件
