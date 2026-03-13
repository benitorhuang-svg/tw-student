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

### 使用者故事 4 - 建立互動、主題與窄寬度回歸防線 (Priority: P2)

產品團隊在交付第二波圖表精修前，需要 E2E 驗證 hover、Tab focus、Enter/Space activation、地圖 marker 鍵盤導覽回歸、窄寬度 screenshot comparison 與 dark theme screenshot regression，避免共享互動契約、Leaflet path 焦點啟動與主題對比在後續回歸；本輪並需把 TrendChart、County tab 全圖表與 Schools 頁核心圖表納入明確的 regression 守門。

**Why this priority**: 共享互動契約、responsive SVG、Leaflet path 鍵盤啟動與 dark theme 對比若只靠人工檢查，很容易在後續調整時退回 title-only、hover-only、marker 僅能滑鼠操作、窄寬度破版或深色主題對比失衡；若 TrendChart、County tab 與 Schools 頁沒有完整 baseline，跨頁品質仍會出現局部回歸黑洞。

**Independent Test**: 執行圖表互動、地圖 marker 鍵盤導覽、窄寬度與 dark theme E2E，驗證 overview、county tab、schools 與 school-focus 至少各有一條正式回歸流程，且涵蓋 TrendChart 的 hover、Tab focus、Enter/Space、dark theme screenshot，County tab 的 ComparisonBarChart、ScatterPlotChart、fallback PieChart 與 responsive baselines，以及 Schools 頁 Histogram、BoxPlot 與 peer scatter 的 keyboard 與 screenshot defenses；performance audit 驗證仍改由 CI 或等價真實 runner 進行而非受本機 Windows 條件阻塞。

**Acceptance Scenarios**:

1. **Given** 團隊完成本輪精修，**When** 執行互動 E2E，**Then** 至少能驗證 hover、Tab focus 與 Enter/Space 是否對應到相同資訊揭露結果。
2. **Given** 團隊完成本輪精修，**When** 執行地圖 marker 鍵盤回歸，**Then** Leaflet path 與對應 marker 焦點可被鍵盤抵達，且 Enter / Space 會觸發與 pointer activation 等價的資訊揭露或導覽行為。
3. **Given** 團隊完成本輪精修，**When** 執行窄寬度 screenshot comparison，**Then** PieChart、SchoolOverviewChart、SchoolCompositionChart 與 PRIndicatorChart 不得出現主要訊息裁切、重疊、標籤失讀或 active-state 無法對應的回歸。
4. **Given** 團隊完成本輪精修，**When** 執行 dark theme screenshot regression，**Then** 關鍵圖表不得出現背景、邊框、文字或資料項對比失真的回歸。
5. **Given** 團隊在 Windows 本機執行 performance audit，**When** headless Chrome 出現 `CHROME_INTERSTITIAL_ERROR` 而無法完成 Lighthouse 稽核，**Then** 此情況應被視為本機限制並改由 CI 或等價真實 runner 驗證，不得阻塞功能驗收。
6. **Given** 團隊執行 TrendChart regression，**When** 驗證 hover、鍵盤 focus、Enter/Space 與 dark theme screenshot，**Then** benchmark line、prediction line、資料點與 crosshair tooltip 需維持可辨識且不互相混淆。
7. **Given** 團隊進入 County tab 執行完整回歸，**When** ComparisonBarChart、ScatterPlotChart 或 fallback PieChart 於不同斷點顯示，**Then** 每張圖都需具備對應的互動與 screenshot baseline，而不是只驗證預設可見的一種圖表狀態。
8. **Given** 團隊進入 Schools 頁執行完整回歸，**When** Histogram、BoxPlot 與 peer scatter 接受鍵盤與 screenshot 驗證，**Then** 焦點、tooltip、資料標示與主要結構在桌機、窄寬度與 dark theme 條件下皆不得出現未被守住的回歸。

---

### 使用者故事 5 - 建立跨頁一致的視覺階層與導覽辨識 (Priority: P1)

教育分析使用者在全台總覽、區域分析、縣市分析、各校分析與校別概況之間切換時，應能從 section heading、AtlasTabs、hero summary、metric tile 與 chart container 立即辨識主次資訊，而不是在每頁重新學一次標題節奏、卡片層級與導覽狀態。

**Why this priority**: 第二波圖表互動逐步收斂後，目前最大的跨頁落差改集中在 heading inline style、頁籤 active 狀態、surface 層級與 school-focus/detail 的 theme-safe 對比；若不補齊，整體 atlas 仍會呈現各頁各自成型的視覺節奏。

**Independent Test**: 依序檢視五個目標頁面，驗證 section heading、AtlasTabs、hero summary、metric tile、chart container 與 school panels 在桌機、窄桌機與 light theme 條件下皆具有一致且可辨識的主次階層。

**Acceptance Scenarios**:

1. **Given** 使用者在全台總覽、區域分析與縣市分析切換不同分析區塊，**When** 觀察共用 section heading，**Then** 標題的間距、色彩強度與前後節奏應來自統一規則，而不是各檔案各自定義 margin 或 color。
2. **Given** 使用者在 overview、regional、county、schools 與 school-focus 分頁之間切換，**When** 觀察 AtlasTabs，**Then** active 與 inactive 狀態需有明確辨識差異，且在較窄桌機寬度下仍可安全捲動、不截斷主要導覽語意。
3. **Given** 使用者在同一頁面中同時看到 atlas metric tile 與 storyboard chart container，**When** 區塊上下堆疊，**Then** 主要摘要 surface 與次要圖表 surface 需保持清楚層級差異，不得因樣式過度相似而混成單一平面。
4. **Given** 使用者進入校別概況頁面，**When** 閱讀 breadcrumb / chart-path、hero summary、summary cards、side metrics 與 workspace cards，**Then** 主要識別資訊、輔助數據與背景容器需具有更強資訊階層，且在 light theme 下仍保有足夠對比。

---

### 使用者故事 6 - 完成跨頁圖表 UI/UX 稽核並形成下一輪建議 (Priority: P2)

產品團隊需要一份 chart-by-chart 的跨頁面稽核紀錄，說明目前已解決項目、仍存在的使用性缺口，以及下一輪優先改善建議，且稽核內容必須明確記錄真實使用者可見缺陷，例如空白圖、過密版面、裁切標籤、難讀趨勢區與第一眼階層失效，而不只停留在一般性設計建議；若 audit 發現 layout density 或 hierarchy 問題，文件必須同步記錄已落地的修正或下一輪具體修正動作。

**Why this priority**: 當前專案已進入多輪精修階段，若沒有跨頁 chart audit、缺陷分級與下一輪建議，後續優化順序會持續依賴臨時判斷，難以穩定收斂所有頁面的可讀性與第一眼理解品質；若 audit 只留下抽象評論，也無法驅動真正的版面密度修復。

**Independent Test**: 檢視 003 任務與 QA 文件，確認 overview、regional、county、schools 與 school-focus 五類頁面的每個現存圖表皆有 audit 結論、優先級、使用者可見缺陷紀錄、具體修正動作與下一步建議，且在可行時有根據當前 localhost 畫面狀態形成的下一輪建議；若無法直接檢視 localhost，亦需記錄環境限制與替代依據，並讓 README 同步反映本輪與下輪重點。

**Acceptance Scenarios**:

1. **Given** 團隊完成本輪圖表精修，**When** 產出 chart-by-chart audit，**Then** 每個現存圖表都應記錄現況、風險、建議、優先級、實際使用者可見缺陷，以及需要落地的版面密度或階層修正動作。
2. **Given** README 描述圖表精修範圍，**When** 維護者檢閱專案說明，**Then** 文件能明確反映已完成的一致性成果、下一輪目標與驗證方式。
3. **Given** 團隊準備進入下一輪 refinement，**When** 依 003 文件排序工作，**Then** 應能直接辨識哪些項目已完成、哪些為下一輪候選、哪些超出本輪範圍。
4. **Given** 專案當下可直接開啟 localhost 頁面，**When** 團隊進行本輪 audit，**Then** 下一輪建議應以當前畫面實際狀態為依據，而不是只引用過期截圖或抽象印象。
5. **Given** 專案當下無法直接檢視 localhost 頁面，**When** 團隊仍需完成 audit 與下一輪建議，**Then** 文件必須記錄無法直接檢視的環境限制、改用的替代證據，以及因此保留的觀察風險。

---

### 使用者故事 7 - 圖表邊界保護與標籤碰撞防護 (Priority: P1)

教育分析使用者在窄寬度桌機或手機瀏覽各分頁時，StackedAreaTrendChart 左側學制標籤在系列數增加或容器縮小時會互相重疊，TrendChart crosshair tooltip 在容器邊緣（左右與上下）仍可能溢出，ComparisonBarChart tooltip 在行動裝置缺乏邊界保護，HistogramChart 分箱在窄容器中也可能因密度過高而讓標籤互相擠壓。這些碰撞、溢出與過密問題需要系統化的偵測與防護機制。

**Why this priority**: 標籤碰撞、tooltip 溢出與分箱過密是已知且可觀察到的回歸主因，尤其在窄寬度裝置上直接影響資訊可讀性，屬於與使用者故事 2 同等重要的 P1 缺口。

**Independent Test**: 將 StackedAreaTrendChart、TrendChart、ComparisonBarChart 與 HistogramChart 分別放入 340px、640px 與 1920px 寬度容器，驗證左側標籤無重疊、crosshair tooltip 不溢出四邊界、ComparisonBarChart tooltip 在手機中完整可見，且 HistogramChart 會自動合併分箱或降低標籤密度以避免擁擠。

**Acceptance Scenarios**:

1. **Given** StackedAreaTrendChart 顯示多個學制系列且容器寬度從寬縮窄，**When** 左側學制標籤彼此垂直距離過近，**Then** 系統自動以 greedy 垂直展開演算法重新排列標籤位置，窄寬度時自動縮寫或省略以維持可讀性，任何容器寬度下皆不互相重疊。
2. **Given** TrendChart crosshair tooltip 在資料點靠近容器邊緣（左、右、上、下），**When** tooltip 嘗試定位於預設方向，**Then** tooltip 位置自動修正以確保 100% 留在 SVG 可見區域內。
3. **Given** ComparisonBarChart 在手機或窄容器中顯示 tooltip，**When** 使用者 hover 或觸控 bar 段，**Then** tooltip 不溢出可見區域，必要時自動調整定位方向。
4. **Given** HistogramChart 在窄容器中原始分箱數量過多，**When** range label 或刻度開始互相擁擠，**Then** 系統自動合併鄰近分箱或降低標籤密度，而不是讓標籤直接重疊。

---

### 使用者故事 8 - 清除殘餘 data-driven inline style (Priority: P2)

ComparisonBarChart、StackedShareBarChart、InsightPanel 仍殘留 data-driven inline style objects（borderColor、background、color、opacity），影響主題切換穩定性與維護性。所有可由 CSS class 表達的狀態樣式需遷移至 CSS。

**Why this priority**: 使用者故事 3 已處理 ScatterPlotChart、StackedAreaTrendChart 與 PieChart legend，但本輪 audit 發現額外三個元件仍殘留 inline style，需同步收斂以避免主題切換不一致。

**Independent Test**: 檢視 ComparisonBarChart、StackedShareBarChart 與 InsightPanel 的 active、inactive 與 muted 狀態，確認非 data-driven 的 borderColor、background、color、opacity 皆由 CSS class 驅動。

**Acceptance Scenarios**:

1. **Given** ComparisonBarChart 進入 active 狀態，**When** 團隊修改主題 token，**Then** borderColor、background 與 label/value color 由 CSS class 驅動，不需修改元件內 style object。
2. **Given** StackedShareBarChart 的 segment 進入 active 或 muted 狀態，**When** opacity 與 transition 需要調整，**Then** 由 CSS class 驅動，width 與 background 因為是 data-driven 保留 inline。
3. **Given** InsightPanel 的 bar-fill 進入 active 或 inactive 狀態，**When** opacity 需要調整，**Then** 由 CSS class 驅動，而不是 inline style。

---

### 使用者故事 9 - 輔助工具可及性補強 (Priority: P2)

PieChart aria-label 目前只有「比例圓餅圖」字串，缺少 total value 與各 slice 比例摘要。SchoolAnalysisView breadcrumb 在長校名時缺乏 text-overflow 保護。

**Why this priority**: 可及性缺口直接影響螢幕閱讀器使用者的資訊取得能力，與使用者故事 1 的資訊揭露一致性互補；breadcrumb overflow 則補強使用者故事 5 的跨頁識別基線。

**Independent Test**: 以螢幕閱讀器宣讀 PieChart SVG，驗證 aria-label 包含 total value 與至少前 3 項 slice 資訊；以長校名進入 SchoolAnalysisView，驗證 breadcrumb 各段落有 ellipsis 保護。

**Acceptance Scenarios**:

1. **Given** 螢幕閱讀器宣讀 PieChart SVG 元素，**When** aria-label 被朗讀，**Then** 內容包含 total value 數值與至少前 3 項 slice 的標籤與比例摘要。
2. **Given** SchoolAnalysisView 顯示含長校名的 breadcrumb，**When** 文字超出可用空間，**Then** 各段落有 max-width 與 text-overflow: ellipsis 保護，長校名不會撐破容器。

---

### 使用者故事 10 - 跨頁文字溢出與長名稱壓縮 (Priority: P2)

校別概況 hero summary 的 h3 與 p 在長校名加長行政區組合時缺乏 overflow 保護。各校分析 topbar h3 與描述同理。CountyTabPanel 在窄桌機顯示長縣市名稱時標題可能擠壓。Treemap leaf label 在小矩形時無 ellipsis。

**Why this priority**: 文字溢出與長名稱壓縮是使用者故事 5 跨頁視覺階層的延伸收斂項，在台灣教育資料中長校名與行政區組合極為常見，需系統化保護。

**Independent Test**: 以長校名加長行政區名稱進入 school-focus 與 school-detail 頁面，並在 340px 與 640px 寬度下驗證 h3/p 有 ellipsis 保護；Treemap 以極小矩形節點驗證 leaf-label 不溢出。

**Acceptance Scenarios**:

1. **Given** school-focus summary 顯示長校名與長行政區組合，**When** h3 或 p 內容超出容器寬度，**Then** 有 overflow / text-overflow 保護，不會撐破或截斷容器版面。
2. **Given** school-detail topbar 顯示長校名與描述，**When** h3 或 p 內容超出容器寬度，**Then** 有 overflow / text-overflow 保護。
3. **Given** TreemapChart 在窄容器中有極小矩形的 leaf 節點，**When** 標籤文字超出矩形面積，**Then** leaf-label 有 overflow / text-overflow / max-width 保護，窄寬度時隱藏 meta 資訊。

---

### 使用者故事 11 - 地圖學校標記的鍵盤導覽與非指標啟動 (Priority: P1)

地圖使用者在校點稀疏或校點聚合的情境下，必須能以鍵盤逐一移動到單一學校標記與 cluster marker，並以 Enter / Space 或其他非指標方式觸發與滑鼠點擊等價的資訊揭露與縮放導覽。

**Why this priority**: VisibleSchoolMarkers 是 atlas 的核心入口；若單校與 cluster 只能靠 pointer 操作，則整體探索流程在可及性與非滑鼠使用情境下仍存在主路徑斷點。

**Independent Test**: 在地圖載入單一學校 marker 與 cluster marker 的情境下，以 Tab / Shift+Tab、Enter 與 Space 驗證兩類 marker 及其 Leaflet path 焦點層均可被聚焦、辨識、啟動，且結果與 pointer activation 等價。

**Acceptance Scenarios**:

1. **Given** 地圖上存在單一學校 marker，**When** 使用者以 Tab 導覽到該 marker，**Then** marker 需具有可見 focus 樣式與可理解名稱，且 Enter / Space 會觸發與點擊相同的資訊揭露。
2. **Given** 地圖上存在 cluster marker，**When** 使用者以鍵盤聚焦並啟動該 marker，**Then** 系統執行與 pointer activation 等價的聚焦、縮放或展開行為，不得要求滑鼠才能深入查看。
3. **Given** 使用者在多個可見 marker 與 cluster 之間移動焦點，**When** 地圖視角、縮放層級或資料密度改變，**Then** 焦點順序與可操作狀態仍保持可預期，不會出現無法抵達或陷入焦點陷阱的情況。
4. **Given** 地圖互動依賴 Leaflet path 承接焦點或啟動，**When** 使用者以 Enter 或 Space 操作該焦點節點，**Then** 系統需命中正確 marker 實體並執行等價行為，不得出現焦點存在但啟動失效的回歸。

---

### 使用者故事 12 - 圖表樣式拆分與驗證路徑去阻塞 (Priority: P2)

產品維護者在調整圖表 tooltip、responsive、防呆樣式與主題細節時，應能在 `frontend/src/styles/data/charts/` 下快速定位到對應特性檔案，而不是長期依賴單一大型 `01-charts.css`；同時 performance audit 驗證路徑需明確區分本機限制與正式驗證環境。

**Why this priority**: 圖表樣式持續累積在單一檔案會增加回歸風險，Windows 本機 Lighthouse 又已知受 headless Chrome interstitial 阻塞；若不在規格內明確收斂，維護與驗證都會被無關阻力拖慢。

**Independent Test**: 檢視圖表樣式組織方式與驗證說明，確認 chart CSS 依特性拆分、維護者可快速定位規則來源，且 performance audit 明確要求以 CI 或等價真實 runner 作為最終驗證來源。

**Acceptance Scenarios**:

1. **Given** 維護者需要調整某一類圖表互動或視覺規則，**When** 進入 `frontend/src/styles/data/charts/`，**Then** 可依特性或關注點找到對應樣式檔，而不是只能在單一大型檔案中搜尋全部規則。
2. **Given** 團隊檢視本輪驗證方式，**When** 需要確認 performance audit 是否完成，**Then** 規格清楚指出 CI 或等價真實 runner 為正式驗證來源，本機 Windows 失敗不構成功能阻塞。

---

### 使用者故事 13 - 修復概況總覽首屏圖表完整性與資訊密度 (Priority: P1)

教育分析使用者進入概況總覽時，標題為「全台各學制歷年學生數」的圖表即使已有資料也不得呈現空白，且「全台區域與縣市量體」與相關概況組合需具備更清楚的間距層級與閱讀節奏，避免首屏一開始就出現空洞或過密感。

**Why this priority**: 概況總覽是 atlas 的第一眼體驗；若首屏核心趨勢圖空白或概況卡與圖表擁擠，使用者會直接失去對資料完整性與分析節奏的信任。

**Independent Test**: 進入全台總覽首屏，驗證「全台各學制歷年學生數」在有資料時首次可見狀態即顯示有效圖形或可理解載入過渡，不得停留空白；同時檢視「全台區域與縣市量體」及相關概況組合的 spacing hierarchy，確認主要摘要、次要圖表與輔助標籤具備清楚層級。

**Acceptance Scenarios**:

1. **Given** 概況總覽已取得有效資料，**When** 使用者首次進入或重新整理頁面，**Then** 「全台各學制歷年學生數」必須顯示有效首屏狀態，不得出現無資料假象或空白圖面。
2. **Given** 概況總覽仍在進行首屏組裝，**When** 圖表資料尚未完成繪製，**Then** 系統需提供可理解的過渡狀態，且過渡結束後立即轉為可見圖表而非空白容器。
3. **Given** 使用者同時看到「全台區域與縣市量體」與相關概況區塊，**When** 以第一眼掃讀方式理解頁面，**Then** 主要標題、摘要數值、圖表本體與補充標籤需具有清楚 spacing hierarchy，不得形成過密堆疊。
4. **Given** 概況總覽在窄桌機或較高瀏覽器縮放下顯示，**When** 使用者閱讀 overview composition，**Then** 主要內容仍需維持可讀間距與視覺分群，不得因壓縮而讓區塊彼此混成單一平面。

---

### 使用者故事 14 - 長行政名稱在比較圖中的窄寬度可讀性 (Priority: P1)

教育分析使用者在區域比較與縣市比較圖中遇到較長行政名稱時，標籤在窄寬度下應保有可辨識語意，例如採用多行換行或可預期縮寫，而不是只用 ellipsis 截斷到無法第一眼理解。

**Why this priority**: 台灣行政區名稱長度差異大，若比較圖只依賴單行 ellipsis，窄寬度下會讓區域與縣市標籤失去判讀性，直接削弱比較任務。

**Independent Test**: 在 regional 與 county 比較相關圖表載入長行政名稱情境下，於桌機窄欄位與手機寬度驗證標籤可透過多行換行或確定性縮寫維持辨識，而不是只剩無法判斷的截斷字串。

**Acceptance Scenarios**:

1. **Given** 比較圖載入長行政名稱，**When** 容器寬度不足以容納單行標籤，**Then** 系統需採用多行換行、確定性縮寫或其他可預期策略保留主要辨識語意。
2. **Given** 相同長行政名稱出現在不同頁面或不同比較圖，**When** 系統採用縮寫策略，**Then** 縮寫結果需一致且可被使用者穩定辨識，不得同名異縮。
3. **Given** 使用者在窄寬度比較 overview、regional 與 county 圖表，**When** 依標籤判讀資料差異，**Then** 不得只剩 ellipsis 導致縣市或區域無法第一眼分辨。

---

### 使用者故事 15 - 大型檔案原子化審查與模組邊界可追溯 (Priority: P2)

產品維護者在本輪精修中調整程式碼或 CSS 時，任何超過 300 行的檔案都必須先經過原子化審查，優先依功能或責任拆分，並記錄模組邊界理由與驗證方式，避免以任意切段製造更多搜尋與維護成本。

**Why this priority**: 圖表與樣式檔正持續成長，若沒有一致的 300 行審查門檻與邊界記錄要求，本輪精修會再次把複雜度累積回少數大型檔案。

**Independent Test**: 檢視本輪受影響的程式碼與 CSS 檔案，確認所有超過 300 行的檔案皆有原子化審查結論；若進行拆分，能追溯拆分依據、模組責任與對應驗證期待。

**Acceptance Scenarios**:

1. **Given** 任一程式碼檔或 CSS 檔在本輪變更後超過 300 行，**When** 團隊進行交付審查，**Then** 必須先有原子化審查結論，說明是否應依功能或責任拆分。
2. **Given** 團隊決定拆分大型檔案，**When** 記錄拆分方案，**Then** 必須說明模組邊界、為何這樣分工較符合單一責任，以及對應的驗證期待。
3. **Given** 團隊評估某大型檔案暫不拆分，**When** 完成審查紀錄，**Then** 必須說明保留原因、未拆分風險與後續再審條件。
4. **Given** 團隊進行拆分，**When** 比較拆分後產物，**Then** 不得以任意等量切段取代依功能或責任分界的模組化設計。

---

### 使用者故事 16 - 強化 TrendChart 第一眼辨識與跨頁回歸基線 (Priority: P1)

教育分析使用者在 overview 或 school-focus 等頁面閱讀 TrendChart 時，必須能在第一眼直接分辨 benchmark line 與 prediction line，而不是必須先 hover 才知道哪一條是實際基準、哪一條是預測延伸；同時這個辨識差異需被正式 regression 守住，避免在深色主題、鍵盤操作或窄寬度下再次退化。

**Why this priority**: TrendChart 是跨頁趨勢判讀的核心元件；若基準線與預測線第一眼過度相似，即使 tooltip 存在，使用者仍會在最關鍵的第一眼判讀階段迷失，直接削弱趨勢閱讀與決策速度。

**Independent Test**: 進入含 TrendChart 的頁面，以 light theme、dark theme、滑鼠 hover 與鍵盤 Tab/Enter/Space 檢查 benchmark 與 prediction 是否可在第一眼被辨識，並確認 screenshot baseline 能穩定攔截兩者視覺差異退化。

**Acceptance Scenarios**:

1. **Given** 使用者第一次看到 TrendChart，**When** 尚未操作 tooltip，**Then** benchmark line 與 prediction line 需具備足夠的第一眼辨識差異，不得必須依賴 hover 才能理解角色。
2. **Given** TrendChart 顯示 benchmark 與 prediction，**When** 使用者以 hover 或鍵盤 focus 檢視資料點，**Then** tooltip、focus 與圖例語言需強化兩者角色差異，而不是只回傳數值。
3. **Given** TrendChart 進入 dark theme 或窄寬度條件，**When** 使用者快速掃讀趨勢，**Then** 基準線、預測線、資料點與 crosshair 仍需維持足夠對比與角色辨識。
4. **Given** 團隊更新 TrendChart 樣式或互動，**When** 執行回歸驗證，**Then** 必須同時守住 hover、鍵盤、dark theme screenshot 與 benchmark/prediction 第一眼差異，不得只驗證其中單一面向。

---

### 使用者故事 17 - 地圖 UI Flow 重新設計：Google Maps 層級邏輯 (Priority: P0)

地圖使用者在不同 zoom level 之間縮放時，應得到類似 Google Maps 的漸進式層級揭露體驗：放大時下一層標記逐步出現，但上一層標記不會突然消失，而是逐漸退後（變小/變淡）；點選「全台」應回到預設起始視角。

**Why this priority**: 目前 zoom 可見性規則散落在多處且互相覆蓋，導致 zoom=11 時嘉市 marker 消失、deep link 不穩定等使用者可見 bug。這是地圖核心導航邏輯，必須在所有圖表精修之前修復。

**設計參考**: Google Maps zoom-based layer visibility

**Zoom 層級定義**:

| Zoom 範圍 | 顯示層級 | 說明 |
|-----------|---------|------|
| 7–8 | 全台/縣市 | 所有 22 縣市 markers 可見，county boundaries 填色 |
| 9–10 | 縣市 + 鄉鎮預載 | 縣市 markers 持續顯示，zoom=9 開始 prefetch township boundaries，zoom=10 township dot markers 出現與縣市 markers 共存 |
| 11 | 鄉鎮市區為主 | township markers 為主角，county markers 維持可見但退後（Google Maps style: 上層不消失），township boundaries 完整可見 |
| 12+ | 校點 | school markers 出現，zoom=12 及以上顯示所有校點；township markers 持續可見，township boundaries 保持 |

**關鍵設計原則**:
1. **上層不消失**: 放大時上一層標記不突然消失，而是逐漸退後
2. **嘉市永遠可見**: 移除所有嘉市特殊過濾邏輯，所有縣市在所有 zoom 都遵守同一套規則
3. **全台回預設**: breadcrumb「全台」→ center=[23.9260, 120.4597], zoom=7
4. **Deep link 至上**: URL 中 zoom/lat/lon 為最高優先，不受 auto-select 覆蓋
5. **單一規則源**: useMapComputedState 為唯一可見性決策點，移除所有二次覆蓋

**移除的舊邏輯**:
- `centerEnablesTownships` 二次覆蓋
- 嘉市特殊 filter (`c.shortLabel !== '嘉市'`)
- zoom≥11 跳過 setView 的硬限制
- 重複的 zoom override branches

**Independent Test**: 使用 Playwright 驗證以下場景：
1. zoom=7 deep link → 確認所有縣市 markers 可見
2. zoom=10 deep link → 確認縣市 markers + 鄉鎮 markers 共存
3. zoom=11 嘉義區域 deep link → 確認嘉市 marker 仍可見
4. 點選「全台」breadcrumb → 確認回到預設 zoom=7 視角
5. zoom=13 deep link → 確認 school markers 可見

**Acceptance Scenarios**:

1. **Given** 使用者開啟 zoom=7 的地圖，**When** 檢視縣市層級，**Then** 所有 22 縣市 markers 皆可見，包含嘉義市，不做任何特殊過濾。
2. **Given** 使用者放大到 zoom=10，**When** 檢視地圖，**Then** 縣市 markers 與 township dot markers 同時可見。
3. **Given** 使用者放大到 zoom=11 並位於嘉義區域，**When** 檢視地圖，**Then** 嘉市 marker 仍然可見（不消失），township markers 為主要層級。
4. **Given** 使用者放大到 zoom=13 以上並已選擇縣市，**When** 檢視地圖，**Then** school markers 出現，township markers 仍然可見。
5. **Given** 使用者在任何 zoom level 點選 breadcrumb「全台」，**When** 觸發導覽，**Then** 地圖回到 center=[23.9260, 120.4597] zoom=7，所有選擇狀態重置。
6. **Given** 使用者透過 deep link 指定 zoom/lat/lon，**When** 頁面載入，**Then** 地圖精確還原 URL 參數，不被 auto-select 或 fly-to 覆蓋。

---

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
- 當 HistogramChart 在窄寬度下仍無法同時保留所有分箱標籤時，系統需優先合併鄰近分箱或降低標籤密度，而不是保留過密刻度造成資訊噪音。
- 當 PRIndicatorChart 樣本不足且容器狹窄時，降級說明、尺度標示與比較脈絡仍需完整可讀。
- 當 SchoolCompositionChart 以鍵盤切換到不同結構項目時，focus 與 tooltip 資訊需與 hover 完全等價。
- 當 Playwright screenshot comparison 遇到窄寬度 layout 波動時，規格需清楚定義哪些元素屬於可容忍差異，哪些屬於回歸失敗。
- 當 ComparisonBarChart 的資料段貼近容器左右邊界且 tooltip 內容較長時，系統仍需保證 tooltip 保持在可見區域內，不因窄寬度而被裁切。
- 當全台總覽、區域分析與縣市分析的 section heading 由不同檔案輸出時，仍需維持一致的上下留白、強弱節奏與色彩階層，不能因單頁例外而破壞閱讀節奏。
- 當 school-focus 與 school-detail 在 light theme 顯示時，hero、summary card、side metric 與 workspace card 不得因沿用偏暗底設計色碼而出現發灰、洗白或對比不足的情況。
- 當 AtlasTabs 於較窄桌機寬度、較長頁籤文案或較高瀏覽器縮放比例下顯示時，系統仍需保留可辨識 active state、完整導覽語意與安全水平捲動行為。
- 當 atlas metric tile 與 chart container 連續堆疊時，主要摘要 surface 與次要分析 surface 仍需可被一眼區分，不能因背景、邊框與間距過度相似而失去主次關係。
- 當 SchoolAnalysisView 的 breadcrumb / chart-path 與 hero summary 內容同時包含長校名、行政區描述與補充摘要時，主要標題、定位資訊與輔助說明仍需保持清楚階層，不得壓縮成同一視覺權重。
- 當 StackedAreaTrendChart 有 5 個以上可見系列且 Y 值彼此接近，在窄寬度下標籤碰撞演算法仍需產出可讀且不重疊的標籤，必要時縮寫至單一字元。
- 當 TrendChart 搭配預測資料點（prediction points）延伸超出實際資料範圍時，tooltip 邊界保護仍需對預測資料點正常運作。
- 當 TrendChart 的 benchmark line 與 prediction line 在 light theme、dark theme 或資料值相近時視覺過於接近，系統仍需讓使用者在未開啟 tooltip 前就能辨識兩者角色。
- 當 PieChart 只有單一 slice 佔 100% 時，aria-label 需正確反映單一項目組成，不使用多餘的比較語言。
- 當地圖同時存在單一學校 marker 與 cluster marker，且使用者僅以鍵盤操作時，兩者都需可抵達、可辨識並可完成等價啟動。
- 當 cluster marker 因縮放或資料刷新而重新計算時，既有鍵盤焦點不得落入不存在的節點或失去後續可操作路徑。
- 當 Leaflet path 仍存在但 marker 視覺已更新時，鍵盤 focus、Enter 與 Space 仍需命中正確資料實體，不得出現焦點落在無效 path 或啟動到錯誤學校的情況。
- 當 dark theme screenshot regression 在不同執行環境間存在些微抗鋸齒差異時，規格仍需明確區分可容忍像素波動與實際視覺回歸。
- 當 Windows 本機的 headless Chrome 持續出現 `CHROME_INTERSTITIAL_ERROR` 時，團隊仍需以 CI 或等價真實 runner 提供 performance audit 證據，而不是將本機失敗誤判為功能缺陷。
- 當圖表樣式由單一大型檔案拆分為多個特性檔時，共用 token、state 與 responsive 規則仍需保持單一權責來源，不得因拆分造成重複定義與覆寫競爭。
- 當概況總覽已取得有效資料但首屏仍在切換篩選或組裝區塊時，「全台各學制歷年學生數」不得顯示空白圖面超過可接受過渡狀態，且使用者需能辨識圖表仍在載入或即將顯示。
- 當「全台區域與縣市量體」與相鄰概況區塊同時顯示於窄桌機首屏時，間距、分群與標題階層仍需保持清楚，不得因元件密集而讓摘要與比較圖失去主次。
- 當區域或縣市比較圖遇到長行政名稱且容器寬度收窄時，系統需提供多行換行或確定性縮寫，不得只留下無法判讀的 ellipsis。
- 當同一行政名稱在不同比較圖中被縮寫時，縮寫規則需維持一致，避免使用者在 overview、regional 與 county 間重新學習命名。
- 當程式碼檔或 CSS 檔超過 300 行但本輪未拆分時，規格紀錄需能說明保留原因與下一次再審條件，而不是靜默略過原子化審查。
- 當 County tab 因資料條件切換到 fallback PieChart，而不是預設的 ComparisonBarChart 或 ScatterPlotChart，正式 regression 仍需覆蓋這個降級分支，不得只驗證主要路徑。
- 當 Schools 頁的 Histogram、BoxPlot 或 peer scatter 需要經過互動或切換後才顯示時，鍵盤與 screenshot baseline 仍需基於實際開啟狀態驗證，而不是停留在預設折疊或未啟用表面。
- 當目前環境無法直接檢視 localhost 頁面內容時，audit 與下一輪建議仍需產出，但必須附帶環境限制說明、替代證據來源與殘餘觀察風險。

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
- **FR-019**: 系統 MUST 將全台總覽、區域分析與縣市分析共用的 section heading 樣式收斂為一致規則，避免在個別檔案以 inline margin、inline color 或局部例外維持階層。
- **FR-020**: 系統 MUST 讓 school-focus 與 school-detail 的 hero、summary cards、side metrics 與 workspace cards 使用 theme-safe 的 surface / text / border 階層，避免依賴偏暗底硬編碼色碼造成 light theme 對比不足。
- **FR-021**: 系統 MUST 為 atlas metric tile 與 storyboard chart container 建立清楚的 primary / secondary surface 區隔與一致 spacing rhythm，使 overview、regional 與 county 頁面的摘要卡與圖表卡不再視覺等重。
- **FR-022**: 系統 MUST 將 AtlasTabs 視為一級導覽 surface，提供明確 active state、inactive state、鍵盤可辨識焦點與較窄桌機寬度下的安全水平捲動行為。
- **FR-023**: 系統 MUST 強化 SchoolAnalysisView 中 breadcrumb / chart-path、hero summary 與相關摘要區塊的資訊階層，確保主要識別資訊、定位脈絡與輔助說明在不同主題下都維持清楚對比。
- **FR-024**: 系統 MUST 在 README 同步本輪跨頁視覺階層精修範圍、已完成項目與下一輪建議，且下一輪建議需明確指出仍待收斂的跨頁設計風險與優先順序。
- **FR-025**: 系統 MUST 偵測並解決 StackedAreaTrendChart 左側學制標籤碰撞，在窄寬度時以 greedy 垂直展開演算法重新排列標籤位置，並搭配縮寫策略維持可讀性。
- **FR-026**: 系統 MUST 保護 TrendChart crosshair tooltip 不溢出容器的上下左右四個邊界。
- **FR-027**: 系統 MUST 將 ComparisonBarChart 的 active 狀態 borderColor、background 與 label/value color 從 inline style object 遷移至 CSS class 驅動。
- **FR-028**: 系統 MUST 將 StackedShareBarChart segment 的 opacity 與 InsightPanel bar-fill 的 opacity 從 inline style 遷移至 CSS class modifier 驅動。
- **FR-029**: 系統 MUST 在 PieChart 的 SVG aria-label 中包含 total value 與前 N 項 slice 的標籤與比例摘要，以服務輔助工具使用者。
- **FR-030**: 系統 MUST 為 SchoolAnalysisView breadcrumb 各段落、hero summary 標題與 school-detail topbar heading 套用 text-overflow 保護（ellipsis、max-width）。
- **FR-031**: 系統 MUST 為 TreemapChart leaf label 與 meta 套用 text-overflow 保護，並在窄寬度時響應式隱藏 meta 資訊。
- **FR-032**: 系統 MUST 為 ComparisonBarChart tooltip 提供窄寬度邊界保護，確保 tooltip 在手機與窄容器中不會溢出左右可見範圍。
- **FR-033**: 系統 MUST 在 HistogramChart 窄寬度情境下自動合併鄰近分箱或降低標籤密度，避免 range label、刻度或欄位說明互相擁擠。
- **FR-034**: 系統 MUST 讓地圖上的 VisibleSchoolMarkers 同時支援單一學校 marker 與 cluster marker 的鍵盤導覽、可見 focus 與可理解名稱。
- **FR-035**: 系統 MUST 為單一學校 marker 與 cluster marker 提供 Enter / Space 或其他非指標啟動方式，且結果與 pointer activation 等價。
- **FR-036**: 系統 MUST 為關鍵圖表新增 dark theme screenshot regression 覆蓋，將主題對比與容器狀態納入 E2E 驗收範圍。
- **FR-037**: 系統 MUST 在本規格的驗證說明中明確指出 performance audit 以 CI 或等價真實 runner 為正式驗證來源；若 Windows 本機因 `CHROME_INTERSTITIAL_ERROR` 無法完成 Lighthouse 稽核，不得作為阻塞本功能驗收的唯一依據。
- **FR-038**: 系統 MUST 將 `frontend/src/styles/data/charts/` 下的圖表樣式依功能特性或關注點進一步拆分為較原子化的樣式檔，避免持續以單一大型 `01-charts.css` 作為主要承載。
- **FR-039**: 系統 MUST 將任何本輪受影響且超過 300 行的程式碼檔與 CSS 檔納入原子化審查，優先依功能或責任拆分，而不得以任意段落切割作為唯一拆分方式。
- **FR-040**: 系統 MUST 在本規格、計畫或對應工作紀錄中記錄大型檔案拆分或不拆分的理由、模組邊界判斷與驗證期待，使後續維護者可追溯決策依據。
- **FR-041**: 系統 MUST 針對「全台各學制歷年學生數」建立圖表渲染完整性要求，確保在資料存在時首屏顯示有效圖形或可理解過渡狀態，不得出現空白圖面。
- **FR-042**: 系統 MUST 改善「全台區域與縣市量體」及相關概況組合的 spacing hierarchy、分群與閱讀節奏，降低首屏過密與層級混雜。
- **FR-043**: 系統 MUST 讓區域與縣市比較相關圖表在長行政名稱與窄寬度條件下支援多行換行、確定性縮寫或等價可讀策略，而非僅依賴 ellipsis。
- **FR-044**: 系統 MUST 在 overview、regional、county、schools 與 school-focus 五類頁面執行 chart-by-chart audit，且每張圖表至少記錄空白狀態、版面密度、標籤裁切、趨勢可讀性與第一眼階層等使用者可見缺陷檢查結果。
- **FR-045**: 系統 MUST 以 Playwright 或等價 E2E 流程覆蓋地圖 marker 的鍵盤回歸，明確驗證 Leaflet path focus、Enter 與 Space 不會退化為滑鼠限定流程。
- **FR-046**: 系統 MUST 為 SchoolCompositionChart 與 PRIndicatorChart 新增窄寬度 screenshot baseline，作為正式回歸驗收的一部分。
- **FR-047**: 系統 MUST 為 TrendChart 建立明確的 regression coverage，至少涵蓋 hover、Tab focus、Enter/Space、benchmark 與 prediction 的角色辨識，以及 dark theme screenshot baseline。
- **FR-048**: 系統 MUST 提高 TrendChart 中 benchmark line 與 prediction line 的第一眼可辨識差異，讓使用者在未開啟 tooltip 前即可理解兩者角色。
- **FR-049**: 系統 MUST 為 County tab 的 ComparisonBarChart、ScatterPlotChart 與 fallback PieChart 建立完整 regression coverage，並覆蓋主要 responsive 斷點的 screenshot baseline。
- **FR-050**: 系統 MUST 為 Schools 頁的 Histogram、BoxPlot 與 peer scatter 建立完整 regression coverage，特別涵蓋鍵盤可及性、防止 focus 回歸，以及正式 screenshot defenses。
- **FR-051**: 系統 MUST 讓 chart-by-chart cross-page audit 產出具體 UI/UX findings，並在發現版面密度、階層或擁擠問題時，同步記錄已完成的修正或下一輪明確修正動作，而不是只留下通用建議。
- **FR-052**: 系統 MUST 在可行時檢視目前已開啟的 localhost 頁面，並以當前 UI 狀態推導下一輪 refinement 建議；若無法直接檢視頁面內容，則 MUST 記錄環境限制、替代觀察依據與殘餘風險。
- **FR-053**: 系統 MUST 將本輪新增的 TrendChart、County tab、Schools 頁與 localhost 檢視要求視為 iteration 14 既有範圍之上的增量擴充，不得刪減或放寬 iteration 14 已建立的回歸與驗收基線。

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
- **NFR-011**: 跨頁 section heading、hero summary、breadcrumb 與導航頁籤 MUST 形成一致的視覺節奏，使使用者不需重新學習每頁的資訊階層。
- **NFR-012**: school-focus 與 school-detail 的主要 surface 在 light theme 與預設 theme 下 MUST 保持可讀且高對比，不得因單頁硬編碼色碼導致洗白或弱層級。
- **NFR-013**: metric tile、summary card 與 chart container 的表面層級 MUST 可在單一視區內立即分辨主次，不得形成連續等權重卡片牆。
- **NFR-014**: AtlasTabs 在窄桌機寬度、長標籤與高縮放條件下 MUST 維持可操作性與辨識性，不得因截斷、壓縮或弱 active state 造成導覽歧義。
- **NFR-015**: SVG 文字元素的標籤碰撞偵測 MUST 使用確定性 greedy 演算法解決，不得造成佈局抖動或重繪迴圈。
- **NFR-016**: 所有 tooltip 邊界保護 MUST 在 SVG 座標系統內計算完成，不得依賴可能造成 layout shift 的 DOM 量測。
- **NFR-017**: HistogramChart 在窄寬度下降低分箱密度時 MUST 優先保留分布趨勢可讀性，不得因過度壓縮而讓主要分布形狀失真。
- **NFR-018**: VisibleSchoolMarkers 的鍵盤導覽與非指標啟動 MUST 維持與 pointer 流程同等的理解成本，不得出現僅對滑鼠使用者完整的地圖探索路徑。
- **NFR-019**: dark theme screenshot regression MUST 覆蓋本輪關鍵圖表的主要容器、文字與資料前景對比，並可穩定區分真實視覺回歸與可容忍渲染微差。
- **NFR-020**: performance audit 驗證路徑 MUST 明確區分本機開發檢查與正式驗證來源；Windows 本機 headless Chrome 的已知 interstitial 問題不得成為唯一阻塞條件。
- **NFR-021**: `frontend/src/styles/data/charts/` 的樣式組織 MUST 維持高可尋址性與單一權責，使維護者能在有限檔案範圍內理解單一圖表特性，而非回到單體樣式檔搜尋全部規則。
- **NFR-022**: 任一超過 300 行的程式碼檔或 CSS 檔在本輪範圍內 MUST 具備可追溯的原子化審查結果，且拆分策略需以功能責任為核心，而非以平均行數分段。
- **NFR-023**: 概況總覽首屏 MUST 維持資料存在即有可見圖表的完整性感受，不得讓使用者在首屏誤判為無資料、故障或尚未載入完成。
- **NFR-024**: overview composition 的 spacing hierarchy MUST 支援首屏快速掃讀，讓主要摘要、次要比較與輔助說明在第一眼內可被區分。
- **NFR-025**: 長行政名稱的顯示策略 MUST 在不同比較圖之間保持一致與可預測，避免同名資料在不同頁面採用不同縮寫邏輯。
- **NFR-026**: chart-by-chart audit 產出 MUST 以實際使用者可見缺陷為主體，而非僅提供風格化建議，確保下一輪 refinement 依缺陷嚴重度排序。
- **NFR-027**: 地圖 marker 的鍵盤回歸驗證 MUST 能區分單一學校 marker、cluster marker 與 Leaflet path 焦點層，不得只驗證其中一種互動表面。
- **NFR-028**: SchoolCompositionChart 與 PRIndicatorChart 的窄寬度 screenshot baseline MUST 穩定反映真實閱讀品質，並作為正式回歸基線持續維護。
- **NFR-029**: TrendChart 的 benchmark line 與 prediction line MUST 在 light theme、dark theme 與窄寬度條件下維持第一眼可辨識性，不得只靠輕微色差或 hover 才能區分。
- **NFR-030**: County tab 與 Schools 頁的 regression baselines MUST 覆蓋實際顯示的完整圖表狀態與主要 breakpoint，而非只驗證預設初始畫面。
- **NFR-031**: localhost current-state audit MUST 優先使用可直接觀察的頁面狀態；若工具或環境限制使直接檢視不可行，文件 MUST 明確記錄限制並持續產出可執行的下一輪建議。

### Key Entities *(include if feature involves data)*

- **圖表區段定義**: 代表分析面板中的單一圖表模組，包含標題、摘要、顯示條件、互動說明與驗證責任。
- **可比 Cohort**: 代表用於 PR Indicator 與分布分析的同縣市、同學制學校集合，是定位與比較的共同基準。
- **分布分箱**: 代表直方圖用來描述學校規模分布的區間集合，用於揭露集中、偏態與極端值現象。
- **圖表互動規則**: 代表 tooltip、legend、焦點、選取與高亮等互動語言的共用規範。
- **視覺驗證清單**: 代表桌機與手機交付前必須完成的圖表檢視項目，用於判定是否達到專業品質門檻。
- **跨頁 surface 階層**: 代表 metric tile、chart container、hero summary、workspace card 與 side metric 在不同頁面中的主次視覺權重規則。
- **AtlasTabs 導覽狀態**: 代表頁籤在 active、inactive、focus、overflow 與縮放情境下應保持的辨識與操作基線。
- **可見學校標記**: 代表地圖上可直接互動的單一學校 marker，需同時支援 pointer 與鍵盤啟動。
- **學校群集標記**: 代表地圖上由多所學校聚合而成的 cluster marker，需提供與 pointer 等價的鍵盤展開或縮放導覽。
- **圖表樣式模組**: 代表 `frontend/src/styles/data/charts/` 下按特性拆分的樣式檔，用於承載 tooltip、responsive、state 與 theme 等規則。
- **效能稽核驗證來源**: 代表用於確認 performance audit 結果的正式執行環境，預設為 CI 或等價真實 runner，而非單一本機條件。
- **原子化審查紀錄**: 代表針對超過 300 行的程式碼檔或 CSS 檔所留下的拆分判斷、保留原因、模組邊界與驗證期待。
- **概況首屏完整性狀態**: 代表 overview 首屏核心圖表在首次渲染時應呈現的可見圖形、過渡狀態與非空白要求。
- **行政名稱顯示策略**: 代表區域與縣市比較圖在長行政名稱條件下採用的多行換行、確定性縮寫與一致性規則。
- **跨頁圖表缺陷紀錄**: 代表 overview、regional、county、schools 與 school-focus 各圖表的使用者可見缺陷清單與優先級結果。
- **TrendChart 角色辨識基線**: 代表 benchmark line、prediction line、資料點、crosshair 與相關圖例在第一眼判讀、互動與主題切換下應保持的辨識規則。
- **當前 UI 觀察證據**: 代表來自 localhost 現況、正式截圖、E2E baseline 或其他可追溯畫面證據的 audit 依據，用於形成下一輪建議。

## Assumptions

- 既有前端資料切片已具備區域、縣市、學校與管理別等基本維度，可支撐此次圖表新增與重組，不需要新增部署層級服務。
- PR Indicator 所需的比較基準以同縣市、同學制學校集合為主，除非後續規格修訂，否則不擴大為跨縣市全國排名。
- 直方圖的主要用途是揭露學校規模分布形狀；盒鬚圖若保留，僅作補充統計摘要，而非主要洞察介面。
- 此次精修以既有 atlas 視覺語言延伸為原則，保留目前地圖工作台、分析面板與分頁脈絡，不進行整體品牌重設計。
- 前端內部可自行選擇合適的組織方式降低面板複雜度，但不得改變對外部署邊界或引入新平台依賴。
- 本輪跨頁精修以既有五個分析頁面與 SchoolAnalysisView 脈絡為範圍，預設不改動 atlas 的主資訊架構，只收斂階層、導覽與視覺節奏。
- 本輪 dark theme screenshot regression 的「關鍵圖表」預設指本輪新增或調整互動、窄寬度保護、主題對比的核心圖表，至少涵蓋 ComparisonBarChart、HistogramChart 與既有代表性總覽圖表。
- Lighthouse performance audit 的正式驗證預設由 CI 或等價真實 runner 提供；Windows 本機若因 headless Chrome interstitial 無法完成，只作為已知環境限制記錄，不視為功能未完成。
- 圖表樣式拆分以提升可維護性與特性定位為目的，預設保留既有 token 基礎檔並把互動、responsive、theme 或元件特性規則拆至較小責任單元。
- 任一超過 300 行的程式碼檔或 CSS 檔皆需先接受原子化審查；若暫不拆分，團隊仍需留下邊界理由與後續再審條件。
- 概況總覽「全台各學制歷年學生數」的空白渲染屬於真實 defect，而非可接受的暫時視覺差異，需在本輪 refinement 中納入正式驗收。
- 區域與縣市比較圖中的長行政名稱在窄寬度下，預設以保留辨識語意為優先，允許多行換行或確定性縮寫，但不以單純 ellipsis 作為唯一方案。
- chart-by-chart audit 預設涵蓋 overview、regional、county、schools 與 school-focus 五類頁面，且會記錄缺陷而非僅記錄優化建議。
- 本次為 iteration 14 的延伸收斂；iteration 14 已建立的範圍、回歸守門與驗收基線皆視為保留前提，只在其上擴充下一輪要求。
- localhost 當前畫面檢視的可行性依執行環境與工具能力而定；若無法直接讀取頁面內容，仍需依可得畫面證據與既有基線形成下一輪建議。

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
- **SC-015**: 全台總覽、區域分析、縣市分析、各校分析與校別概況五個目標頁面的 section heading 皆使用一致階層規則，抽樣檢查時不再出現依賴個別檔案 inline margin / color 維持節奏的情況。
- **SC-016**: 校別概況與相關 school-detail surface 在 light theme 驗證中，hero、summary card、side metric 與 workspace card 的主要文字與背景對比 100% 可讀，且不出現洗白或近似底色的資訊層。
- **SC-017**: overview、regional 與 county 頁面的 metric tile 與 chart container 在視覺審查中可被明確區分為主要摘要與次要分析 surface，不再被評為等權重堆疊。
- **SC-018**: AtlasTabs 在既定窄桌機驗證條件與較高瀏覽器縮放條件下，100% 保持可辨識 active state、可安全水平捲動且不造成主要頁籤語意遺失。
- **SC-019**: SchoolAnalysisView 的 breadcrumb / chart-path 與 hero summary 在長校名與長行政區文案條件下，仍可於單一首屏中清楚區分主標題、定位資訊與輔助摘要。
- **SC-020**: README 對本輪跨頁視覺階層精修與下一輪建議的描述，能讓維護者直接辨識至少 3 項後續優先收斂主題，而不需重新翻查稽核原始筆記。
- **SC-021**: StackedAreaTrendChart 左側標籤在 340px 至 1920px viewport 寬度的視覺檢查中顯示零重疊。
- **SC-022**: TrendChart crosshair tooltip 在 hover 任何資料點時 100% 保持在 SVG viewBox 邊界內。
- **SC-023**: ComparisonBarChart、StackedShareBarChart 與 InsightPanel 中零殘留非 data-driven inline style object。
- **SC-024**: PieChart aria-label 在螢幕閱讀器宣讀時包含數值總計與至少前 3 項 slice 的比例資訊。
- **SC-025**: SchoolAnalysisView breadcrumb、hero h3/p 與 school-detail topbar h3/p 在 640px 寬度下內容超出容器時顯示正確 ellipsis 截斷。
- **SC-026**: Treemap、ButterflyChart、HistogramChart、ComparisonBarChart、StackedShareBarChart 與 PRIndicatorChart 在 dark theme 驗證中，主要容器背景、邊框與資料項前景在 WCAG AA 對比下可讀。
- **SC-027**: ButterflyChart value labels、HistogramChart range labels 與 PRIndicatorChart score block 在 860px 以下寬度顯示合理大小且無截斷或重疊。
- **SC-028**: ScopePanel stat-grid 與 Map legend swatch 的呈現樣式可由 CSS class 或 custom property 驅動，不依賴元件內 style object literal。
- **SC-029**: ComparisonBarChart tooltip 在 340px 至 640px 驗證寬度下，100% 保持於可見區域內，且不因邊界修正而遮蔽主要比較資訊。
- **SC-030**: HistogramChart 在 340px 至 640px 驗證寬度下，不出現 range label 或刻度互相重疊的情況，且主要分布趨勢仍可被辨識。
- **SC-031**: 地圖上的單一學校 marker 與 cluster marker 在抽樣驗證中 100% 可由鍵盤抵達、辨識並以 Enter / Space 完成等價啟動。
- **SC-032**: 關鍵圖表的 dark theme screenshot regression 在既定 E2E 流程中完成覆蓋，且不留未審核的主題差異快照。
- **SC-033**: performance audit 的最終驗證證據 100% 來自 CI 或等價真實 runner；Windows 本機 `CHROME_INTERSTITIAL_ERROR` 僅作限制註記，不再被視為單獨阻塞條件。
- **SC-034**: `frontend/src/styles/data/charts/` 下的圖表樣式已拆分為多個依特性或關注點命名的樣式檔，維護者可在有限搜尋範圍內定位 tooltip、responsive、theme 或 state 規則，而非回到單一大型檔案搜尋全部圖表樣式。
- **SC-035**: 本輪受影響且超過 300 行的程式碼檔與 CSS 檔 100% 具備原子化審查結論，且任何拆分皆可追溯到功能或責任邊界理由。
- **SC-036**: 「全台各學制歷年學生數」在有資料的情況下，首次可見狀態 100% 不呈現空白圖面，並可讓使用者在首屏立即理解圖表已載入完成或正在過渡。
- **SC-037**: 「全台區域與縣市量體」與相鄰概況組合在桌機、窄桌機與較高縮放條件下，經視覺審查不再被標記為過密、混層或難以第一眼辨識主次。
- **SC-038**: 區域與縣市比較相關圖表在窄寬度下，長行政名稱 100% 採用可辨識的多行換行、確定性縮寫或等價策略，且不再只剩無法判讀的 ellipsis。
- **SC-039**: chart-by-chart audit 100% 覆蓋 overview、regional、county、schools 與 school-focus 五類頁面，且每張圖表至少記錄空白狀態、密度、標籤裁切、趨勢可讀性與第一眼階層檢查結果。
- **SC-040**: 地圖 marker 鍵盤回歸 E2E 100% 驗證單一學校 marker、cluster marker 與 Leaflet path focus/Enter/Space 的等價啟動，不留滑鼠限定主路徑。
- **SC-041**: SchoolCompositionChart 與 PRIndicatorChart 的窄寬度 screenshot baseline 已納入正式回歸，且後續變更不得在未更新或審核基線的情況下通過驗收。
- **SC-042**: TrendChart 的 regression 100% 覆蓋 hover、Tab focus、Enter/Space 與 dark theme screenshot，且 benchmark 與 prediction 的角色差異在正式 baseline 中有明確守門。
- **SC-043**: 在 light theme 與 dark theme 的 TrendChart 視覺審查中，benchmark line 與 prediction line 可於第一眼被辨識，且不再被標記為角色混淆或過度相似。
- **SC-044**: County tab 的 ComparisonBarChart、ScatterPlotChart 與 fallback PieChart 100% 具備正式 regression 紀錄與 responsive screenshot baseline，不留未覆蓋的圖表分支。
- **SC-045**: Schools 頁的 Histogram、BoxPlot 與 peer scatter 100% 通過鍵盤回歸與 screenshot defenses，且不留未審核的窄寬度或 dark theme 差異。
- **SC-046**: cross-page chart audit 100% 以具體 UI/UX findings 記錄問題，所有被標記為密度、階層或擁擠缺陷的圖表都具有已落地修正或下一輪明確修正動作，不再出現只有「可再優化」這類泛化建議的結論。
- **SC-047**: 若環境允許直接檢視 localhost 頁面，下一輪建議 100% 建基於當前可見 UI 狀態；若不允許，文件 100% 記錄環境限制、替代證據來源與因此保留的觀察風險。