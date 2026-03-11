# 圖表互動 & 手機版面 — 視覺 QA 清單

**建立日期**: 2026-03-12  
**適用範圍**: 本輪（003）圖表精修後的交付前驗證

---

## 執行方式

- **桌機**: Chrome DevTools 1440×900（或實機）
- **手機**: Chrome DevTools iPhone 14 (390×844) + 觸控模擬
- **每項皆需 PASS / FAIL + 截圖編號**

---

## A. P0 修復驗證

| # | 測試項目 | 步驟 | 預期結果 |
|---|---------|------|---------|
| A1 | ScatterPlot 空資料 | 縣市分析 → 選一個無學校的篩選條件 | 顯示「尚無資料」，不崩潰 |
| A2 | StackedArea 除以零 | 概況總覽 → 隱藏所有系列再逐一開啟 | 百分比標註不顯示 NaN/Infinity |
| A3 | PieChart 100% slice | 篩選至僅剩單一學制的鄉鎮 | 圓餅圖正常渲染完整圓環 |
| A4 | CSV 匯出安全性 | 學校列表 → 匯出 CSV → Excel 開啟 | 校名含 `=`/`+` 前綴的儲存格不觸發公式 |
| A5 | 區域成長率分母語意 | 區域分析 → 比對摘要 tile 的年增率與前一學年總數 | 100% 以前一學年實際總數為分母 |
| A6 | 資料載入診斷 | 人工破壞一個 `/data/*` 資產路徑 | UI 顯示資產脈絡錯誤，不顯示 raw parser exception |

## B. 進場動畫一致性

| # | 元件 | 步驟 | 預期結果 |
|---|------|------|---------|
| B1 | ScatterPlotChart | 捲動至可視範圍 | fadeIn + translateY 動畫觸發 |
| B2 | StackedAreaTrendChart | 同上 | 同上 |
| B3 | PieChart | 同上 | 同上 |
| B4 | SchoolCompositionChart | 進入單校聚焦 → 校代碼結構 | 同上 |
| B5 | TrendChart | 進入趨勢分頁 | 折線 stroke-dasharray 動畫 + IntersectionObserver 門檻觸發 |

## C. 空狀態一致性

| # | 元件 | 觸發方式 | 預期結果 |
|---|------|---------|---------|
| C1 | TreemapChart | 篩選至無區域資料 | 顯示「尚無資料」|
| C2 | ButterflyChart | 篩選至無公私立資料 | 同上 |
| C3 | ComparisonBarChart | 區域分析 → 空區域 | 同上 |
| C4 | StackedShareBarChart | 同上 | 同上 |
| C5 | TrendChart | 選擇無歷史資料的學校 | 同上 |
| C6 | SchoolDataTable | 極端篩選 → 0 筆結果 | 顯示「尚無學校資料」|

## D. 桌機版面檢查 (1440×900)

| # | 分頁 | 檢查重點 | 通過條件 |
|---|------|---------|---------|
| D1 | 概況總覽 | TreemapChart 標籤可讀 | 所有葉節點文字不溢出、不裁切 |
| D2 | 概況總覽 | StackedAreaTrendChart 三模式切換 | 數量/比例/趨勢模式轉換平順 |
| D3 | 區域分析 | ButterflyChart 左右對稱 | 標籤不重疊、指示列對齊 |
| D4 | 區域分析 | ComparisonBarChart 長名稱 | 超過 84px 的縣市名需有 title tooltip |
| D5 | 縣市分析 | ScatterPlotChart 四象限 | 象限標籤可讀、hover tooltip 正確 |
| D6 | 縣市分析 | BoxPlotChart 格線 | 格線在淺/深背景皆可見 |
| D7 | 單校聚焦 | PRIndicatorChart | 指標刻度正確、樣本不足降級顯示 |
| D8 | 單校聚焦 | SchoolCompositionChart | 男女比例條正確填滿 |
| D9 | 學校列表 | 排序 + 分頁 | 欄位排序後 scroll 位置不跳動 |

## E. 手機版面檢查 (390×844)

| # | 分頁 | 檢查重點 | 通過條件 |
|---|------|---------|---------|
| E1 | 概況總覽 | TreemapChart | 不需橫向捲動、文字可讀 |
| E2 | 概況總覽 | StackedAreaTrendChart | 左側學制標籤不被截斷 |
| E3 | 區域分析 | ButterflyChart | 垂直堆疊仍保留左右比較意圖 |
| E4 | 縣市分析 | ScatterPlotChart | 手指觸控可選取資料點 |
| E5 | 縣市分析 | 所有 SVG 圖表 | preserveAspectRatio 正確縮放 |
| E6 | 單校聚焦 | TrendChart | 折線不超出 viewBox |
| E7 | 學校列表 | SchoolDataTable | 水平捲動指示明確 |
| E8 | 全局 | 底部導航 | 分頁切換不閃爍、不延遲 |

## F. 互動品質

| # | 測試項目 | 步驟 | 預期結果 |
|---|---------|------|---------|
| F1 | PieChart 鍵盤 | Tab 到 slice → Enter | 中心標籤更新、focus ring 可見 |
| F2 | ScatterPlot 鍵盤 | Tab 到資料點 → Enter | 觸發 onSelectPoint callback |
| F3 | SchoolDataTable 鍵盤 | Tab 到列 → Enter | 選取學校並同步右側面板 |
| F4 | StackedArea 圖例點擊 | 點擊圖例 toggle 系列 | 系列隱藏/顯示、面積重新計算 |
| F5 | TrendChart hover | 滑鼠移動至折線 | 玻璃態 tooltip 跟隨游標 |
| F6 | StackedShare keyboard | Tab 到 row / segment | 顯示與 hover 等價的比例與人數資訊 |
| F7 | PieChart keyboard | Tab 到 legend / slice | 顯示與 hover 等價的分類名稱與佔比 |
| F8 | SchoolOverview keyboard | Tab 到年度 bar / 折線點 | 顯示年度、學生數、增減資訊 |
| F9 | Treemap hover / focus | Hover 或 Tab 到群組 / 葉節點 | 顯示區域或縣市名稱、總量與補充資訊 |
| F10 | Butterfly keyboard | Tab 到 row → Enter / Space | 顯示公私立左右值與比例摘要 |
| F11 | Histogram keyboard | Tab 到 bin → Enter / Space | 顯示區間、樣本數與 active state |
| F12 | PRIndicator keyboard | Tab 到 marker 區域 → Enter / Space | 顯示 PR、band 與樣本脈絡 |
| F13 | SchoolComposition keyboard | Tab 到學制卡片 → Enter / Space | 顯示該學制總量、男女比例與資料年別 |

## G. 窄容器 / Split View 驗證

| # | 元件 | 步驟 | 預期結果 |
|---|------|------|---------|
| G1 | PieChart | 縮窄右側 panel 或手機寬度 | legend 不重疊、tooltip 對應正確 |
| G2 | SchoolOverviewChart | 縮窄單校聚焦圖卡 | 年度標籤、bar、line、tooltip 仍可讀 |
| G3 | 窄寬度 screenshot | 執行 Playwright screenshot comparison | 無明顯裁切、重疊或 active-state 斷裂 |

## H. Cross-page Audit

| # | 檢查項目 | 步驟 | 預期結果 |
|---|---------|------|---------|
| H1 | 全圖表 audit 完整性 | 逐頁檢查所有現存圖表 | 每個元件皆有現況、風險、建議、優先級 |
| H2 | README 對齊 | 比對 README 與 003 任務 | 已完成項與下一輪建議一致 |

---

## 簽核

- [ ] 桌機 QA 完成 (D1–D9)
- [ ] 手機 QA 完成 (E1–E8)
- [ ] P0 修復驗證通過 (A1–A4)
- [ ] P0/P1 語意與診斷驗證通過 (A1–A6)
- [ ] 動畫一致性通過 (B1–B5)
- [ ] 空狀態通過 (C1–C6)
- [ ] 互動品質通過 (F1–F13)
- [ ] 窄容器驗證通過 (G1–G3)
- [ ] Cross-page audit 完成 (H1–H2)
