# 功能規格書：圖表元件優化改版

**功能分支**: `002-chart-component-optimization`
**建立日期**: 2026-03-11
**狀態**: Implemented
**輸入**: PRODUCT_SPEC.md §2 五大主題分頁圖表設計規格、ui_plot/plot.md 儀表板視覺規格、UI UX Pro Max Design Intelligence 參考

---

## 現況問題分析

### 結構性問題
1. **巨量 Props 傳遞**：DashboardCanvas (40+ props)、RegionalTabPanel (22 props)、CountyTabPanel (18 props) 違反單一職責原則，導致難以維護與測試。
2. **內聯樣式氾濫**：所有圖表元件大量使用 inline style（padding、margin、display、gap），而非統一至 CSS 類別或 CSS 變數。
3. **固定尺寸不響應**：SVG viewBox 硬編碼（620×240、680×240、520×200），在窄屏或大屏皆無適配。
4. **色票散落**：Hex 色碼散佈在各元件內（`#38bdf8`、`#34d399` 等），未統一引用 CSS 變數。
5. **動畫進場不一致**：四支元件使用 `requestAnimationFrame(() => setMounted(true))` 模式觸發進場動畫，機制重複但未抽成共用 Hook。

### 視覺與體驗問題
6. **ScatterPlotChart 四象限缺乏底色**：PRODUCT_SPEC §2.3 要求的象限矩陣，目前僅有十字線，無視覺分區。
7. **StackedAreaTrendChart 圖例不可互動**：PRODUCT_SPEC §2.1 要求可點擊圖例隱藏學制，目前不支援。
8. **TrendChart 預測段缺失**：ui_plot §3 建議的 114 年後虛線預測段，目前僅有簡略回歸線。
9. **PieChart 尺寸過小**：預設 120px 在縣市分頁中太小，中心文字難以辨識。
10. **BoxPlotChart 缺少中位數標示**：目前 median 僅為一條細線，無標籤。
11. **SchoolOverviewChart 無動畫**：柱狀圖渲染後完全靜態，無進場效果。
12. **ComparisonBarChart 色票只有 5 色**：超過 5 個縣市比較時色彩循環，難以區分。

### 無障礙與鍵盤操作問題
13. **SVG 圖表無鍵盤導航**：所有 SVG 互動元素僅支援滑鼠 hover/click。
14. **圖表缺少 aria-label**：大部分圖表僅有 `role="img"`，缺少描述性標注。
15. **PieChart 扇區不可鍵盤聚焦**：`<path>` 元素使用 onMouseEnter/Leave，無 Tab 支援。

---

## 使用者故事與測試

### 使用者故事 1 — 圖表視覺品質升級 (Priority: P1)

使用者在瀏覽全台總覽、區域分析、縣市分析分頁時，所有圖表應呈現一致的視覺風格：統一色票系統、微妙的 glassmorphism 卡片效果、平滑的進場動畫，以及清晰的象限/分區底色。

**為何此優先級**：視覺品質是使用者對分析工具品質的第一印象，直接影響信任度與使用意願。

**獨立測試**：開啟各分頁，肉眼確認圖表一致的色彩風格、進場動畫、hover 反饋皆呈現正常。Build + Lint 通過。

**驗收情境**：

1. **Given** 使用者進入全台總覽分頁, **When** 頁面載入完成, **Then** StackedAreaTrendChart 有平滑進場動畫，圖例可點擊切換學制顯示/隱藏。
2. **Given** 使用者進入縣市分析分頁, **When** 散點矩陣載入, **Then** 四象限有淡色背景區分，十字基準線清晰標示。
3. **Given** 使用者 hover 任何圖表資料點, **When** 滑鼠懸停, **Then** tooltip 帶毛玻璃背景，smooth 200ms 過渡出現。

---

### 使用者故事 2 — 圖表色票與主題系統整合 (Priority: P1)

所有圖表元件統一從 CSS 變數取色，而非硬編碼 Hex 值。確保亮/暗主題切換後，圖表色彩自動跟隨。

**為何此優先級**：色票一致性是設計系統的基礎，也是暗色模式支援的前提。

**獨立測試**：搜尋所有元件中的 `#` Hex 值，確認圖表渲染色彩來源為 CSS 變數。切換亮暗模式確認色彩跟隨。

**驗收情境**：

1. **Given** 應用程式載入完成, **When** 在各分頁檢視圖表, **Then** 所有填色、線條、文字色彩皆引用 CSS 變數（`--chart-*` 或 `--palette-*`）。
2. **Given** 使用者切換暗色模式, **When** 模式切換, **Then** 所有圖表色彩平滑過渡至暗色配色。

---

### 使用者故事 3 — 圖表響應式布局 (Priority: P2)

圖表元件在不同螢幕寬度下自動調整，SVG 圖表使用百分比 viewBox + CSS 控制最大寬度，HTML 圖表在窄屏時堆疊排列。

**為何此優先級**：行動裝置為重要使用場景；目前固定寬度在小於 768px 時裁切嚴重。

**獨立測試**：在 375px（手機）、768px（平板）、1440px（桌面）三個斷點下，確認所有圖表不溢出、不重疊、資訊完整。

**驗收情境**：

1. **Given** 使用者以 375px 寬度裝置瀏覽, **When** 進入任何分頁, **Then** 圖表以全寬顯示且無水平捲動。

---

### 使用者故事 4 — 進場動畫與微互動統一 (Priority: P2)

所有圖表使用統一的進場動畫系統：IntersectionObserver 觸發 + CSS 類別切換。SVG 圖表使用 stroke-dashoffset 繪製感動畫，HTML bar 使用 width transition。

**為何此優先級**：一致的動畫語言強化品牌識別，且需取代目前分散在各元件的 `requestAnimationFrame` 模式。

**獨立測試**：各圖表首次進入視口時，應有統一的動畫效果；快速切換分頁時動畫不應閃爍。

**驗收情境**：

1. **Given** 圖表尚未進入視口, **When** 捲動使圖表進入視口, **Then** 元素以 600ms ease-out 從下方淡入展開。

---

### 使用者故事 5 — 無障礙圖表互動 (Priority: P3)

所有互動圖表支援鍵盤 Tab 導航。SVG 圖表的可互動元素加入 `role="listitem"`、`aria-label`、`tabIndex`，確保螢幕閱讀器可以讀取圖表摘要。

**為何此優先級**：合規要求，且對特殊需求使用者重要。

**驗收情境**：

1. **Given** 使用者使用鍵盤, **When** Tab 聚焦至 ScatterPlotChart 資料點, **Then** 螢幕閱讀器讀出「{縣市名} 學生數 {X} 人，變動率 {Y}%」。

---

### 邊界情境

- 學制資料為零時，PieChart 不應渲染空扇區。
- 只有一個鄉鎮/學校時，BoxPlotChart 應降級為數值卡片。
- 比較面板加入超過 8 個縣市時，色票不再重複。

---

## 需求規格

### 功能需求

- **FR-001**: 所有圖表色彩 MUST 引用 CSS 變數，不得硬編碼 Hex 色碼。
- **FR-002**: 新增共用 `useChartAnimation` Hook，統一進場動畫邏輯。
- **FR-003**: ScatterPlotChart MUST 在四象限加入淡背景色。
- **FR-004**: StackedAreaTrendChart 圖例 MUST 支援點擊切換系列顯示/隱藏。
- **FR-005**: PieChart 預設尺寸 MUST 調整為 160px 以上。
- **FR-006**: 所有 SVG 圖表 MUST 使用 `preserveAspectRatio="xMidYMid meet"` 實現響應式。
- **FR-007**: ComparisonBarChart 色票 MUST 支援至少 12 色，不重複循環。
- **FR-008**: SchoolOverviewChart MUST 新增柱狀圖進場動畫。
- **FR-009**: BoxPlotChart 的中位數 MUST 顯示數值標籤。
- **FR-010**: StackedAreaTrendChart MUST 新增「趨勢」折線模式（已有但需標準化圖例互動）。
- **FR-011**: Tooltip 樣式 MUST 統一為 glassmorphism 毛玻璃效果。
- **FR-012**: 所有互動圖表 MUST 支援基本鍵盤 Tab 導航。

### 關鍵實體

- **ChartTheme**: 統一色票系統（primary、secondary、accent、series[0-11]、quadrant 背景色）。
- **ChartAnimation**: 共用動畫 Hook 介面（mounted、ref、animationClass）。
- **TooltipConfig**: 統一 tooltip 樣式與定位邏輯。

---

## 不在本次範圍

- 手機版底部抽屜 (Bottom Sheet) 佈局改版（歸屬 PWA 優化）。
- 資料治理飛出面板 (DataGovernanceFlyout) 改版。
- 新增 Treemap 或 Butterfly Chart 等全新圖表類型（先優化現有）。
- 變更資料模型或 API 契約。
