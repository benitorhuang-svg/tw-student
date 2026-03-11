# 003 圖表與 UX 互動精修 — 實作進度與稽核結果

**更新日期**: 2026-03-12  
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

### 逐元件稽核矩陣

| 元件 | 響應式 | CSS 變數 | 動畫 | 空狀態 | 鍵盤 | Tooltip |
|------|--------|---------|------|--------|------|---------|
| TreemapChart | ⚠ | ✅ | ✅ | ✅ | 部分 | ❌ |
| ButterflyChart | ⚠ | ✅ | ✅ | ✅ | 部分 | ❌ |
| HistogramChart | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| PRIndicatorChart | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| BoxPlotChart | ✅* | ⚠ | ✅ | ✅ | 部分 | ❌ |
| ComparisonBarChart | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| ScatterPlotChart | ✅* | ⚠ | ✅* | ✅ | ✅ | 部分 |
| StackedAreaTrendChart | ✅* | ⚠ | ✅* | ✅ | ❌ | ❌ |
| StackedShareBarChart | ✅ | ✅ | ✅ | ✅ | ❌ | title |
| TrendChart | ✅* | ✅ | ✅* | ✅ | ✅* | ✅ |
| SchoolOverviewChart | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| SchoolCompositionChart | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| PieChart | ⚠ | ✅ | ✅* | ✅ | ✅ | 中心 |
| StatCard | ✅ | ✅ | N/A | N/A | ❌ | N/A |
| InsightPanel | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| SchoolDataTable | ✅ | N/A | N/A | ✅ | ✅ | ❌ |

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

---

## 三、下一輪待辦（P2–P3）

### 響應式 SVG 尺寸

| 元件 | 現況 | 建議 |
|------|------|------|
| BoxPlotChart | 已改為 `useResponsiveSvg` | 擴散到 SchoolOverviewChart / PieChart 等其餘固定尺寸圖 |
| ScatterPlotChart | 已改為 `useResponsiveSvg` | 進一步優化手機座標 padding |
| StackedAreaTrendChart | 已改為 `useResponsiveSvg` | 補 hover tooltip / 手機標籤壓縮 |
| TrendChart | 已改為 `useResponsiveSvg` | 補 crosshair tooltip 的容器邊界保護 |

### Tooltip 一致化

| 現行模式 | 使用元件 | 目標 |
|---------|---------|------|
| 玻璃態 SVG tooltip class | TrendChart | 已套用共用 `chart-svg-tooltip__*` |
| SVG rect+text | ScatterPlotChart | 已套用共用 `chart-svg-tooltip__*` |
| 原生 title | StackedShareBarChart | 遷移至共用 tooltip class |
| 僅中心標籤 | PieChart | 保留 + 補 hover tooltip |
| 完全無 tooltip | 其餘 7 個圖表 | 全數補上 |

### Inline Style 清理

- ScatterPlotChart：仍有多處 inline style，下一輪移至 `01-charts.css`
- StackedAreaTrendChart：仍有多處 inline style，下一輪移至 `01-charts.css`
- DashboardCanvas：年份導航已抽成 `DashboardYearNavigator` 並移除該段 inline style；其餘仍待整理

### 可及性補強

- 所有 SVG 圖表補充 `role="img"` 與描述性 `aria-label`
- 所有可互動資料點補充 `tabIndex`、`:focus-visible` 樣式與 `onKeyDown` handler
- InsightPanel sparkline 色彩從 hardcoded hex 改為 CSS 變數
- TrendChart 點位已補 keyboard focus / Enter / Space；BoxPlotChart 已補焦點 hover state

### 面板責任拆分

- DashboardCanvas (~290 行) 已先拆分年份導航為 `DashboardYearNavigator.tsx`
- SchoolDetailPanel (~290 行) workspace/focus 兩模式考慮拆分
- SchoolAnalysisView (~260 行) 四分頁各自獨立子元件
