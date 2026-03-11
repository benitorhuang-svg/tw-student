# 003 圖表與 UX 互動精修 — 實作進度與稽核結果

**更新日期**: 2026-03-12 (Iteration 4 完成)  
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
| **P1 本輪目標** | Regional/Insight | 修正成長率語意、sparkline token 與 redundant color branch |
| **P1 本輪目標** | StackedShare/Pie/SchoolOverview | 補齊 shared tooltip + keyboard focus contract |
| **P2 本輪目標** | SchoolDetailPanel / SchoolAnalysisView | 擴散 DashboardCanvas 的 section-based 拆分模式 |
| **P2 本輪目標** | 第二波圖表 | Treemap / Butterfly / Histogram / PRIndicator / SchoolComposition 補 shared tooltip + focus + Enter/Space |
| **P2 本輪目標** | 響應式 SVG | PieChart / SchoolOverviewChart 改為真正容器驅動尺寸 |
| **P2 本輪目標** | 圖表樣式系統 | Scatter / StackedArea / Pie legend / panel heading 清掉 residual inline style |
| **P2 本輪目標** | Interaction E2E | 補 hover、Tab focus、Enter/Space、窄寬度 screenshot comparison |

### 逐元件稽核矩陣

| 元件 | 成熟度 | 響應式 | CSS Token | 動畫 | 空狀態 | 鍵盤 | Tooltip | Aria |
|------|--------|--------|-----------|------|--------|------|---------|------|
| TreemapChart | 85% | ✅ | ✅ | ✅ | ✅ | ⚠ Enter | ✅ | ✅ |
| ButterflyChart | 75% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| HistogramChart | 80% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PRIndicatorChart | 78% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| BoxPlotChart | 90% | ✅ | ✅ token | ✅ | ✅ | ✅ | ⚠ | ✅ |
| ComparisonBarChart | 90% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ScatterPlotChart | 90% | ✅ resp | ✅ token | ✅ | ✅ | ✅ | ⚠ | ✅ |
| StackedAreaTrendChart | 88% | ✅ resp | ✅ token | ✅ | ✅ | ⚠ | ✅ | ✅ |
| StackedShareBarChart | 90% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| TrendChart | 88% | ✅ | ✅ token | ✅ | ✅ | ✅ | ✅ | ✅ |
| SchoolOverviewChart | 88% | ✅ | ✅ token | ✅ | ✅ | ⚠ | ✅ | ✅ |
| SchoolCompositionChart | 92% | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PieChart | 88% | ✅ | ✅ token | ✅ | ✅ | ✅ | ✅ | ⚠ |
| InsightPanel | 82% | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| StatCard | 90% | ✅ | ✅ | N/A | N/A | N/A | N/A | ✅ |
| AnimatedNumber | 85% | N/A | N/A | ✅ | N/A | N/A | N/A | ✅ |
| ScopePanel | 90% | ✅ | ✅ | ✅ | N/A | ✅* | ✅ | ✅ |

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
- [x] **ScatterPlotChart inline style 清理**：fontSize、padding 響應式化、quadrant fill → CSS class
- [x] **StackedAreaTrendChart inline style 清理**：響應式 padding、strokeWidth/stroke → CSS、series-label → CSS class
- [x] **PieChart legend inline style 清理**：slice stroke/opacity → CSS class (pie-chart__slice--active/muted)
- [ ] **Panel heading 殘留樣式清理**：聚焦於 school panels 與 chart heading fragment 的彩色 eyebrow / margin 片段
- [x] **Interaction E2E**：補 hover、Tab focus、Enter/Space activation、窄寬度 screenshot comparison
- [x] **跨頁 chart audit**：為所有圖表列出現況、風險、建議與優先級
- [ ] **README 對齊**：同步本輪已完成項與下一輪建議

---

## 三、下一輪待辦（P2–P3）

### 響應式 SVG 尺寸

| 元件 | 現況 | 建議 |
|------|------|------|
| BoxPlotChart | 已改為 `useResponsiveSvg` | ✅ 完成 |
| ScatterPlotChart | 已改為 `useResponsiveSvg` | ✅ padding 響應式化完成 |
| StackedAreaTrendChart | 已改為 `useResponsiveSvg` | ✅ padding 響應式化完成，標籤壓縮待優 |
| TrendChart | 已改為 `useResponsiveSvg` | ✅ crosshair 已補 CSS ring class |
| PieChart | 仍以固定 size prop 為主 | 改成真正容器驅動 SVG 與 legend 重排 |
| SchoolOverviewChart | viewBox 固定密度 | 改成真正容器驅動 SVG 與窄寬度標籤策略 |

### Tooltip 一致化

| 現行模式 | 使用元件 | 目標 |
|---------|---------|------|
| 玻璃態 SVG tooltip class | TrendChart | 已套用共用 `chart-svg-tooltip__*` |
| SVG rect+text | ScatterPlotChart | 已套用共用 `chart-svg-tooltip__*` |
| 區塊 tooltip 面板 | StackedShareBarChart | 已改為共用 `chart-tooltip` 互動詳情 |
| 中心標籤 + tooltip | PieChart | 已補 hover/focus tooltip，後續可再收斂定位樣式 |
| 完全無 tooltip | Treemap / Butterfly / Histogram / PRIndicator / SchoolComposition | 第二波補齊 |

### Inline Style 清理

- ScatterPlotChart：標題、meta 與 tooltip pointer-events 仍有 residual inline style，移至 `01-charts.css`
- StackedAreaTrendChart：heading、toggle、legend、系列狀態仍有 residual inline style，移至 `01-charts.css`
- PieChart legend：opacity / border / padding 狀態移回 `01-charts.css`
- SchoolComposition / SchoolAnalysis / SchoolDetail 的彩色 eyebrow heading 片段統一成 class
- DashboardCanvas：年份導航已抽成 `DashboardYearNavigator` 並移除該段 inline style；其餘仍待整理

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

### 面板責任拆分

- DashboardCanvas (~290 行) 已先拆分年份導航為 `DashboardYearNavigator.tsx`
- SchoolDetailPanel (~290 行) workspace/focus 兩模式已改為獨立子元件
- SchoolAnalysisView (~260 行) overview/trend/ranking/positioning 已改為獨立子元件
