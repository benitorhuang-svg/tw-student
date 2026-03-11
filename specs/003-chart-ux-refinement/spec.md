# 功能規格書：圖表與 UX 互動精修

**功能分支**: `003-chart-ux-refinement`  
**建立日期**: 2026-03-11  
**狀態**: Proposed  
**輸入**: 使用者需求：「圖表與 UX 互動精修」

## User Scenarios & Testing *(mandatory)*

### 使用者故事 1 - 擴散第二波圖表互動契約 (Priority: P1)

教育分析使用者在概況總覽、區域分析、縣市分析與單校聚焦頁面切換 TreemapChart、ButterflyChart、HistogramChart、PRIndicatorChart、SchoolCompositionChart 時，應得到與既有第一波圖表相同的 tooltip、focus、Enter/Space 啟動與非 hover 等價資訊揭露，而不是每張圖表沿用不同互動慣例。

**Why this priority**: 第一波已收斂 StackedShareBarChart、PieChart、SchoolOverviewChart，但第二波圖表仍存在鍵盤、tooltip 與 disclosure 缺口；若不補齊，整體圖表語言仍會分裂。

**Independent Test**: 分別進入概況總覽、區域分析、學校分布與單校聚焦相關區塊，驗證第二波圖表的 hover、Tab focus、Enter/Space 與 tooltip 資訊層級皆與第一波一致。

**Acceptance Scenarios**:

1. **Given** 使用者以滑鼠 hover TreemapChart、ButterflyChart、HistogramChart、PRIndicatorChart 或 SchoolCompositionChart 的主要資料項，**When** 資料項進入 active state，**Then** 系統以共用 tooltip 結構揭露名稱、數值與必要比較脈絡。
2. **Given** 使用者以 Tab 鍵瀏覽第二波圖表，**When** 焦點移至可互動資料項，**Then** 系統顯示可見 focus 樣式，並揭露與 hover 等價的資訊。
3. **Given** 使用者以 Enter 或 Space 操作第二波圖表的焦點資料項，**When** 觸發互動，**Then** 系統執行與 pointer activation 等價的資料揭露或選取行為。
4. **Given** 使用者完成第二波圖表切換，**When** 比較不同圖表模組的 tooltip、focus 與 active state，**Then** 資訊層級、延遲與揭露方式應維持一致，而不是各圖各自採不同慣例。

---

### 使用者故事 2 - 將固定 viewBox 圖改為真正容器驅動響應式 (Priority: P1)

教育分析使用者在窄欄位、手機、分割畫面與一般桌機之間切換時，PieChart 與 SchoolOverviewChart 的主要標籤、圖例、active state 與 tooltip 仍須可讀，不得依賴固定 viewBox 密度才看得懂圖表。

**Why this priority**: 第一波雖補了兩張圖的互動，但它們仍受固定寬高與固定密度假設影響，在窄容器或手機中仍容易壓縮圖例、標籤與 active-state 可讀性。

**Independent Test**: 將 PieChart 與 SchoolOverviewChart 放入桌機、手機與窄容器寬度中，逐一驗證 SVG、legend、tooltip 與 active state 是否會隨容器重排且無需水平捲動。

**Acceptance Scenarios**:

1. **Given** PieChart 或 SchoolOverviewChart 被放入窄容器、手機欄寬或分割視窗，**When** 容器寬度縮小，**Then** SVG 佈局、圖例與標籤會依容器重新安排，主要資訊仍可讀且不需水平捲動。
2. **Given** 使用者在手機寬度與桌機寬度間切換，**When** 重新檢視相同圖表模組，**Then** 主要標籤、legend 與 active-state 資訊不應互相重疊或被裁切。
3. **Given** 使用者偏好減少動態效果，**When** 進入圖表頁面，**Then** 系統保留資訊可讀性，但避免依賴強制動畫才能理解狀態變化。
4. **Given** 使用者操作 PieChart 或 SchoolOverviewChart，**When** 使用 hover、鍵盤 focus 或觸控觸發資料項，**Then** 系統以一致的資料揭露模式顯示標籤、比例 / 數值與 active state，且定位不因容器縮小而失效。

---

### 使用者故事 3 - 以 CSS token 與 class 統一圖表狀態樣式 (Priority: P2)

產品維護者在調整圖表 hover、focus、selected、muted、legend 與 heading 狀態時，應能透過共用 CSS token 與 class 管理，而不是在元件內保留散落的 inline style 或 style object。

**Why this priority**: ScatterPlotChart、StackedAreaTrendChart、PieChart legend 與部分 panel heading 仍殘留 inline style，會讓主題 token、狀態規則與後續維護持續分散。

**Independent Test**: 檢視目標圖表與 panel heading 的 hover、focus、active、muted 狀態，確認主要狀態樣式可由 CSS token 或 class 驅動，而不是依賴元件內 inline style。

**Acceptance Scenarios**:

1. **Given** ScatterPlotChart、StackedAreaTrendChart、PieChart legend 或 panel heading fragment 進入 hover、focus、selected 或 muted state，**When** 團隊調整主題 token，**Then** 視覺狀態應由 CSS class 與 token 驅動。
2. **Given** 團隊需要統一圖表色彩、opacity 或 heading emphasis，**When** 修改共用樣式，**Then** 不需回到個別元件內修改 style object 才能完成。
3. **Given** 使用者在不同圖表之間切換 active 與 muted 狀態，**When** 比較狀態表現，**Then** 不應出現同義狀態在不同元件上採用衝突樣式的情況。

---

### 使用者故事 4 - 建立互動與窄寬度回歸防線 (Priority: P2)

產品團隊在交付第二波圖表精修前，需要 E2E 驗證 hover、Tab focus、Enter/Space activation 與窄寬度 screenshot comparison，避免共享互動契約在後續回歸。

**Why this priority**: 共享互動契約與 responsive SVG 若只靠人工檢查，很容易在後續調整時退回 title-only、hover-only 或窄寬度破版。

**Independent Test**: 執行圖表互動與窄寬度 E2E，驗證至少一條 overview 流程與一條 school-focus 流程皆涵蓋 hover、Tab focus、Enter/Space 與 screenshot comparison。

**Acceptance Scenarios**:

1. **Given** 團隊完成本輪精修，**When** 執行互動 E2E，**Then** 至少能驗證 hover、Tab focus 與 Enter/Space 是否對應到相同資訊揭露結果。
2. **Given** 團隊完成本輪精修，**When** 執行窄寬度 screenshot comparison，**Then** PieChart 與 SchoolOverviewChart 不得出現主要訊息裁切、重疊或 active-state 無法對應的回歸。

---

### 使用者故事 5 - 完成跨頁圖表 UI/UX 稽核並形成下一輪建議 (Priority: P2)

產品團隊需要一份 chart-by-chart 的跨頁面稽核紀錄，說明目前已解決項目、仍存在的使用性缺口，以及下一輪優先改善建議，避免 refinement 停留在零散修補。

**Why this priority**: 當前專案已進入多輪精修階段，若沒有跨頁 chart audit 與下一輪建議，後續優化順序會持續依賴臨時判斷，難以穩定收斂所有 UI 元件。

**Independent Test**: 檢視 003 任務與 QA 文件，確認每個現存圖表皆有 audit 結論、優先級與下一步建議，且 README 同步反映本輪與下輪重點。

**Acceptance Scenarios**:

1. **Given** 團隊完成本輪圖表精修，**When** 產出 chart-by-chart audit，**Then** 每個現存圖表都應記錄現況、風險、建議與優先級。
2. **Given** README 描述圖表精修範圍，**When** 維護者檢閱專案說明，**Then** 文件能明確反映已完成的一致性成果、下一輪目標與驗證方式。
3. **Given** 團隊準備進入下一輪 refinement，**When** 依 003 文件排序工作，**Then** 應能直接辨識哪些項目已完成、哪些為下一輪候選、哪些超出本輪範圍。

### Edge Cases

- 當 `/data/*` 資產路徑錯誤、漏部署或被 SPA fallback 攔截時，系統需辨識「伺服器回傳 HTML 而非正式資料」，並提供可理解的錯誤訊息，而不是直接顯示原始 JSON parse 例外。
- 當成長率分母所需的前一學年總數缺失、為零、或因目前篩選無法比較時，系統需顯示「不可計算」或等價說明，不得強制顯示 0% 或以重建值推導分母。
- 當 Treemap 某層級只有單一節點或多個節點學生數接近零時，系統仍需提供可辨識標示，不能因面積過小而完全失去資訊。
- 當 Butterfly Chart 一側資料為零或該地區僅有單一管理別資料時，系統需明確顯示失衡或缺值狀態，而非繪製誤導性的對稱圖形。
- 當 PR Indicator 的比較 cohort 樣本不足、資料缺漏或無法形成合理百分等級時，系統需改以不可計算狀態與原因說明呈現。
- 當學校數過少無法形成有意義的直方圖分箱時，系統需降級為簡化分布摘要，並說明為何未顯示完整分布圖。
- 當 tooltip 依賴 hover 的情境出現在觸控裝置上，系統仍需提供等價的點擊或聚焦資訊揭露方式。
- 當使用者採用鍵盤或輔助工具瀏覽，圖表主要互動點必須具有可見焦點與可理解描述，不能只靠顏色變化傳達狀態。
- 當 PieChart、SchoolOverviewChart 或 StackedShareBarChart 出現在窄容器或手機寬度時，主要標籤、legend 與 active-state 資訊仍需可讀，不得因固定尺寸或僅靠 hover 而失去主要訊息。
- 當 Treemap 在極窄容器下矩形區塊過小時，系統仍需保留可聚焦互動與等價資訊揭露，不能因標籤縮短而完全失去理解能力。
- 當 ButterflyChart 在手機或窄欄位改排版後，仍需保留左右比較語意，不能退化成兩組互不對照的條列。
- 當 HistogramChart 分箱過多導致窄寬度標籤擁擠時，系統需採用簡化標示或摘要策略，而不是讓刻度互相覆蓋。
- 當 PRIndicatorChart 樣本不足且容器狹窄時，降級說明、尺度標示與比較脈絡仍需完整可讀。
- 當 SchoolCompositionChart 以鍵盤切換到不同結構項目時，focus 與 tooltip 資訊需與 hover 完全等價。
- 當 Playwright screenshot comparison 遇到窄寬度 layout 波動時，規格需清楚定義哪些元素屬於可容忍差異，哪些屬於回歸失敗。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 將共用 tooltip、focus、activation 契約擴散至 TreemapChart、ButterflyChart、HistogramChart、PRIndicatorChart 與 SchoolCompositionChart，且其資訊揭露內容需與第一波圖表共享契約保持一致。
- **FR-002**: 系統 MUST 為第二波目標圖表提供 Tab focus、可見 focus ring、Enter/Space activation 與非 hover 等價資訊揭露。
- **FR-003**: 系統 MUST 將 PieChart 與 SchoolOverviewChart 從固定密度 viewBox 行為改為容器驅動的 responsive SVG 行為。
- **FR-004**: 系統 MUST 將窄容器可讀性視為第一級驗收條件，包含標籤、legend、active state、空狀態與 tooltip 皆不得因容器縮小而失去主要訊息。
- **FR-005**: 系統 MUST 為目標圖表建立一致的 tooltip、legend、色彩 token 與狀態標示規則，使不同頁面的圖表互動語言一致。
- **FR-006**: 系統 MUST 統一圖表進場與狀態轉換的動態規則，讓目標圖表共享同一套動畫節奏與降級行為。
- **FR-007**: 系統 MUST 移除 ScatterPlotChart、StackedAreaTrendChart、PieChart legend 與 panel heading fragment 的剩餘 inline style，改由 CSS token 與 class 驅動狀態樣式。
- **FR-008**: 系統 MUST 為目標圖表提供鍵盤操作、可見焦點、文字替代與非色彩依賴的狀態辨識，補足目前可及性缺口。
- **FR-009**: 系統 MUST 為本輪影響圖表提供 E2E 互動驗證，至少涵蓋 hover、Tab focus、Enter/Space activation 與窄寬度 screenshot comparison。
- **FR-010**: 系統 MUST 完成跨頁 chart-by-chart UI/UX audit，並將下一輪改善建議記錄於 003 相關文件與 README。
- **FR-011**: 系統 MUST 維持本功能為前端體驗精修範圍，不得要求新的部署架構、即時服務或後端依賴作為本功能成立前提。
- **FR-012**: 若本功能的圖表範圍、互動定義或驗證標準發生變更，團隊 MUST 先更新本規格文件，再進行對應程式實作。
- **FR-013**: 系統 MUST 統一正式資料資產的 URL 組裝規則，並在 `/data/*` 路徑錯誤時回傳可診斷的錯誤，而不是讓 HTML fallback 混入 JSON / SQLite 載入流程。
- **FR-014**: 系統 MUST 以「前一學年實際總數」作為 year-over-year 成長率分母，且該語意需一致套用於區域摘要 tile、排行列與圖表標註。
- **FR-015**: 系統 MUST 在前一學年總數不可比較時顯示不可計算狀態，而非自動回退為 0% 或推估值。
- **FR-016**: 系統 MUST 讓 StackedShareBarChart、PieChart、SchoolOverviewChart 與第二波目標圖表共享同一套資料揭露契約，至少涵蓋 hover、鍵盤 focus 與非 hover 等價資訊揭露。
- **FR-017**: 系統 MUST 以容器驅動的 SVG 尺寸策略處理 PieChart 與 SchoolOverviewChart，避免依賴固定寬高假設造成手機或窄容器內的文字、圖例與 active-state 壓縮失真。
- **FR-018**: 系統 MUST 於 003 文件中記錄跨頁圖表 audit 結果、下一輪建議與 README 對齊狀態，讓後續 refinement 可延續既有基線而非重新盤點。

### Non-Functional Requirements

- **NFR-001**: 圖表精修成果 MUST 維持現有 Taiwan education atlas 的產品語言，不得演變成與地圖工作台脫節的通用型儀表板重設計。
- **NFR-002**: 目標圖表模組 MUST 具備專業儀表板等級的資訊階層，讓標題、摘要、圖例、資料重點與輔助說明能在單一視區內被快速理解。
- **NFR-003**: 色彩系統 MUST 以一致 token 為主，避免頁面或元件各自定義 fallback 色碼造成視覺漂移，且不得以 inline style 保留可由 token/class 表達的狀態樣式。
- **NFR-004**: 動畫表現 MUST 服務於資訊揭露與狀態轉換，不得造成閱讀延遲、過度閃動或讓重要資訊僅在動畫完成後才可辨識。
- **NFR-005**: 響應式行為 MUST 同時支援桌機與手機主要使用情境，並符合既有 PWA 版面優化方向。
- **NFR-006**: 本功能的調整 MUST 以重用既有資料來源與前端衍生資料能力為前提，不得擴張為資料管線、部署或平台治理改造專案。
- **NFR-007**: 正式資料載入失敗時，錯誤訊息 MUST 指向資產路徑 / 載入型別問題，避免將原始 parser 例外直接暴露為唯一診斷資訊。
- **NFR-008**: 響應式圖表在桌機與手機驗證寬度下 MUST 保留可讀標籤、圖例與 active-state 資訊，且主要訊息不得依賴橫向捲動才能理解。
- **NFR-009**: 所有共享互動圖表的 tooltip、focus 與 activation 延遲與資訊層級 MUST 保持一致，不得因圖表種類不同而產生明顯互動落差。
- **NFR-010**: UI/UX audit 輸出 MUST 使用一致格式，至少包含頁面、圖表、現況、風險、建議與優先級。

### Key Entities *(include if feature involves data)*

- **圖表區段定義**: 代表分析面板中的單一圖表模組，包含標題、摘要、顯示條件、互動說明與驗證責任。
- **可比 Cohort**: 代表用於 PR Indicator 與分布分析的同縣市、同學制學校集合，是定位與比較的共同基準。
- **分布分箱**: 代表直方圖用來描述學校規模分布的區間集合，用於揭露集中、偏態與極端值現象。
- **圖表互動規則**: 代表 tooltip、legend、焦點、選取與高亮等互動語言的共用規範。
- **視覺驗證清單**: 代表桌機與手機交付前必須完成的圖表檢視項目，用於判定是否達到專業品質門檻。

## Assumptions

- 既有前端資料切片已具備區域、縣市、學校與管理別等基本維度，可支撐此次圖表新增與重組，不需要新增部署層級服務。
- PR Indicator 所需的比較基準以同縣市、同學制學校集合為主，除非後續規格修訂，否則不擴大為跨縣市全國排名。
- 直方圖的主要用途是揭露學校規模分布形狀；盒鬚圖若保留，僅作補充統計摘要，而非主要洞察介面。
- 此次精修以既有 atlas 視覺語言延伸為原則，保留目前地圖工作台、分析面板與分頁脈絡，不進行整體品牌重設計。
- 前端內部可自行選擇合適的組織方式降低面板複雜度，但不得改變對外部署邊界或引入新平台依賴。

## Out of Scope

- 變更 GitHub Pages、PWA、靜態切片或既有部署架構。
- 以新後端 workspace、即時 API 或額外服務取代目前前端資料驅動模式。
- 重新定義 atlas 的整體資訊架構、主導航或地圖下鑽模型。
- 與本次圖表精修無直接關聯的資料刷新腳本重構、行政區邊界策略調整或正式資料治理規格改寫。
- 將所有既有圖表全面重做為單一大型改版；本次以補齊缺口與統一規則為主。

## 實作邊界

- 本功能限定為 `frontend/` 使用者體驗與圖表模組精修，不得以需要新部署拓樸為前提。
- 允許整理前端面板組裝方式與重用規則，但不得擴張為跨 workspace 的平台遷移專案。
- 若後續發現資料不足以支撐某一圖表表達，應先回到本規格修訂需求與驗證方式，再決定是否調整實作範圍。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 概況總覽、區域分析與單校聚焦三個目標頁面，皆完成對應新圖表模組上線條件，且不存在以舊圖或文字暫代核心洞察的情況。
- **SC-002**: 受此次功能影響的目標圖表模組在桌機寬度與手機寬度的最終視覺檢查中，零容忍資訊裁切、標示重疊與橫向捲動缺陷。
- **SC-003**: 目標圖表模組的互動審查中，100% 主要互動點皆可由鍵盤或等價非滑鼠方式觸達，並具備可見焦點與文字化說明。
- **SC-004**: 目標圖表模組在交付前的設計一致性檢查中，tooltip、legend、色彩 token 與動態規則不得出現重大例外。
- **SC-005**: 維護者可在不變更部署架構的前提下，於既有前端工作台內完成本功能交付，且任何後續範圍變更都先反映於本規格文件。
- **SC-006**: 經抽樣檢查後，區域摘要與學校圖表中的 year-over-year 成長率 100% 使用前一學年實際總數作為分母。
- **SC-007**: StackedShareBarChart、PieChart 與 SchoolOverviewChart 的主要資料點 100% 具備 pointer、keyboard 與非 hover 等價資訊揭露。
- **SC-008**: SchoolAnalysisView 與 SchoolDetailPanel 的 section 拆分後，單一圖表區段變更不需編輯整體大型條件 render tree 即可完成。
- **SC-009**: 所有測試到的 `/data/*` 失敗模式皆以可操作診斷訊息呈現，且不再以 raw parser exception 作為主要使用者錯誤文案。
- **SC-010**: TreemapChart、ButterflyChart、HistogramChart、PRIndicatorChart 與 SchoolCompositionChart 的主要互動點 100% 支援 hover、Tab focus 與 Enter/Space 等價啟動。
- **SC-011**: PieChart 與 SchoolOverviewChart 在既定窄寬度驗證條件下，不出現主要標籤裁切、legend 無法對應或 active state 不可讀的缺陷。
- **SC-012**: ScatterPlotChart、StackedAreaTrendChart、PieChart legend 與目標 panel heading 的狀態樣式 100% 可由共用 CSS token 或 class 調整，不需再改元件內 style object。
- **SC-013**: 本輪新增的 E2E 覆蓋能驗證 hover、focus、Enter/Space activation 與窄寬度 screenshot，且可穩定攔截共享互動契約回歸。
- **SC-014**: 003 文件與 README 對所有現存圖表皆有 audit 紀錄或下一步建議，且可區分本輪已完成與下一輪候選項目。