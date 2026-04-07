# 任務清單：圖表元件優化改版

**輸入**: `specs/002-chart-component-optimization/` 規格書與計畫
**前提**: spec.md (必要), plan.md (必要)

## 格式: `[ID] [P?] [Story] 說明`

- **[P]**: 可平行執行（不同檔案，無依賴）
- **[Story]**: US1=視覺品質 / US2=色票主題 / US3=響應式 / US4=動畫 / US5=無障礙

---

## Phase 0：基礎建設

- [x] T001 [US2] 在 `frontend/src/styles/data/charts/` 新增圖表色票 CSS 變數（`--chart-series-0` 至 `--chart-series-11`、`--chart-quadrant-*`、`--chart-tooltip-bg`），涵蓋亮/暗主題
- [x] T002 [US4] 新增 `frontend/src/hooks/useChartAnimation.ts` 共用進場動畫 Hook，基於 IntersectionObserver 回傳 `{ ref, isVisible }` 並可配置 `threshold` 與 `rootMargin`
- [x] T003 [P] [US1] 新增統一 tooltip CSS 類別 `.chart-tooltip`：glassmorphism 背景 (`backdrop-filter: blur(12px)`)、圓角、陰影、過渡動畫

**Checkpoint**: ✅ 基礎設施就緒。

---

## Phase 1：核心圖表升級

- [x] T004 [US1][US2] 升級 `ScatterPlotChart.tsx`：四象限淡背景色 rect、tooltip 改用 CSS 變數樣式、hover 過渡 200ms
- [x] T005 [US1][US2][US4] 升級 `StackedAreaTrendChart.tsx`：圖例改為可互動 toggle（點擊隱藏/顯示系列）、色碼改引 CSS 變數
- [x] T006 [P] [US1][US2] 升級 `PieChart.tsx`：預設尺寸調為 160px、色碼改引 CSS 變數、hover 扇區加 2px 白色描邊、inline style 遷移至 CSS class
- [x] T007 [P] [US2] 升級 `ComparisonBarChart.tsx`：色票擴展至 12 色引用 CSS 變數
- [x] T008 [P] [US1][US2] 升級 `BoxPlotChart.tsx`：中位數顯示數值標籤、色碼改引 CSS 變數
- [x] T009 [P] [US2] 升級 `StackedShareBarChart.tsx`：使用 `useChartAnimation` 進場替代 rAF

**Checkpoint**: ✅ 六支核心圖表視覺品質與色票系統完成。

---

## Phase 2：單校圖表與面板

- [x] T010 [US1][US4] 升級 `SchoolOverviewChart.tsx`：柱狀圖新增進場動畫（高度 transition 0→target）、色碼改引 CSS 變數、growth rate 折線加進場 stroke-dashoffset
- [x] T011 [P] [US2][US4] 升級 `TrendChart.tsx`：tooltip 色碼改引 CSS 變數
- [x] T012 [P] [US2][US4] 升級 `InsightPanel.tsx`：使用 `useChartAnimation` 統一進場

**Checkpoint**: ✅ 所有圖表元件色票與動畫統一完成。

---

## Phase 3：響應式與無障礙

- [x] T013 [US3] 所有 SVG 圖表已使用 viewBox + CSS `width: 100%`，PieChart 加入 `max-width: 100%` + `aspect-ratio`
- [x] T014 [P] [US5] ScatterPlotChart 可互動元素加入 `tabIndex={0}`、`role="listitem"`、`aria-label` 與 `onKeyDown` Enter 事件、focus/blur
- [x] T015 [P] [US5] PieChart 扇區加入 `tabIndex`、`role="listitem"`、`aria-label`、focus/blur

**Checkpoint**: ✅ 響應式 + 基本無障礙完成。

---

## Phase 4：驗證與收尾

- [x] T016 執行 `npm run lint` 確認零錯誤 ✅
- [x] T017 執行 `npm run build` 確認編譯通過 ✅
- [x] T018 執行 E2E 確認 20/20 通過 ✅
- [ ] T019 肉眼檢查各分頁圖表在亮/暗模式下的視覺一致性（需人工確認）
- [x] T020 更新 `specs/002-chart-component-optimization/spec.md` 標記完成狀態 ✅
