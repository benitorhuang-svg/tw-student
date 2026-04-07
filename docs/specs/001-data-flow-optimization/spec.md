# Feature Specification: 資料流程優化與差異刷新

**Feature Branch**: `[001-data-flow-optimization]`  
**Created**: 2026-03-10  
**Status**: Implemented  
**Input**: User description: "建立台灣學生數互動地圖資料流程優化 feature specification，涵蓋資料鍵值正規化、共用 schema、行政區代碼 canonicalization、地理對應 audit metadata、時間維度語義、SQLite payload 去重、manifest 差異刷新與資料品質驗證。"

## Implementation Status Snapshot

- `manifest.json`、`schema/grade-map.json`、`validation-report.json` 已納入正式 refresh pipeline，前端 refresh 流程改為 manifest 驅動差異刷新。
- `education-atlas.sqlite` 已改為正規化查詢路徑，主流程不再依賴重複的 `payload_json` summary/detail/bucket 視圖。
- `countyCode` / `townCode` 已寫入 boundary、summary、detail、bucket、school-atlas 與 SQLite 契約，validation 也已改用 canonical code 驗證邊界覆蓋。
- URL hydration / deep-link / compare scenario 已補上 canonical code resolver；公開 URL 現在以 `countyCode` / `townCode` 輸出，legacy 名稱 alias 僅保留讀取相容。
- 缺座標治理已收斂到人工覆核與公開校址補點，`validation-report.json` 目前為 `overallStatus: pass`，`missing-coordinates` 已降為 `affectedRecordCount: 0`。
- SQLite 體積已降至約 32.4 MB，確認 payload duplication 移除後仍可由前端重建 summary/detail/bucket 資料 shape。
- E2E 已補 canonical deep-link、legacy alias rewrite，以及 SQLite-backed school detail / composition 驗證路徑。
- 下一步需將資料刷新與切片生成邏輯自 `frontend/scripts/` 移往獨立 `backend/` workspace，讓前端僅保留靜態資產消費與 UI 呈現責任。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 可信資料探索 (Priority: P1)

作為一般探索者，我希望地圖、縣市切片、校別分析與趨勢資料在重新載入後仍保持一致，且不會因為完全中學或資料缺值語義不清而看到被覆寫、被誤算或來源不明的數字。

**Why this priority**: 這是產品的核心價值。若同一學校資料會互相覆寫、行政區對不到邊界、或重新載入後內容前後不一致，使用者會直接失去對平台的信任。

**Independent Test**: 可透過選取含完全中學的縣市、檢視單校與縣市聚合、再執行一次部署資料重新載入來驗證；若數值、學制組成、行政區落點與版本資訊前後一致，則此旅程獨立成立。

**Acceptance Scenarios**:

1. **Given** 使用者瀏覽包含完全中學的地區，**When** 查看同校不同學制的學校卡片、趨勢與 composition，**Then** 系統必須分別呈現各自資料，不得發生 `school_code` 互相覆寫。
2. **Given** 某年度資料同時存在 `0`、缺值、缺年度與估算值四種情況，**When** 使用者查看趨勢或明細，**Then** 系統必須以可區分的狀態呈現，且不得把不同語義混為同一種數字。
3. **Given** 本地已快取舊版部署資料，**When** 使用者執行重新載入部署資料，**Then** 系統必須先比較版本資訊，只更新已變更切片，並保留未變更資料的可用性。

---

### User Story 2 - 可稽核資料治理 (Priority: P2)

作為資料治理維護者，我希望刷新流程能輸出一致的資料契約、明確的地理對應與資料狀態欄位，並在建置時自動檢查彙總、組成、缺座標與重複主鍵問題，以便快速追查異常來源。

**Why this priority**: 資料品質問題目前散落在腳本與靜態資產之間，若沒有共用 schema 與驗證機制，任何資料修正都可能只修到單一路徑，造成日後維護成本持續升高。

**Independent Test**: 可透過執行一次正式資料刷新並檢視輸出資產與驗證報告來驗證；若維護者能從單一契約辨識學制 mapping、地理歸屬、資料狀態與異常註記，即可獨立交付價值。

**Acceptance Scenarios**:

1. **Given** 維護者完成一次資料刷新，**When** 檢查共用 schema、學校資料模型與驗證結果，**Then** 必須能找到學制 mapping、行政區代碼、座標來源與資料狀態的標準欄位定義。
2. **Given** 刷新輸入資料出現縣市彙總不一致、composition 合計錯誤或重複鍵值，**When** 建置完成，**Then** 系統必須產出明確失敗或警示結果，指出受影響的資產與資料列。

---

### User Story 3 - 可管理部署更新 (Priority: P3)

作為部署維護者，我希望每次發布後都能知道遠端資料版本、切片內容雜湊與更新結果，讓我只需重新發布變更檔案、驗證 manifest 一致性，並在 UI 中向使用者說明本地與遠端版本差異。

**Why this priority**: 現行全量清快取重抓的方式對部署與支援都不友善，且無法快速確認是否真的有新資料；加入 manifest 後才能建立穩定的靜態資產發布流程。

**Independent Test**: 可透過兩次連續部署驗證，一次無資料變更、一次僅局部切片變更；若維護者能從版本資訊辨識差異並看到正確更新結果，即代表此旅程可獨立驗收。

**Acceptance Scenarios**:

1. **Given** 遠端部署資料沒有變更，**When** 維護者或使用者觸發重新載入部署資料，**Then** 系統必須明確顯示本地與遠端版本相同，且不得重抓未變更切片。
2. **Given** 僅部分縣市切片或 schema 資產更新，**When** 重新載入部署資料，**Then** 系統必須只刷新受影響資產與對應快取，並回報成功、略過與失敗項目。

### Edge Cases

- 遠端 `manifest.json` 無法取得、格式不完整或雜湊不合法時，系統必須保留既有本地資料，並明確標示無法驗證版本的原因。
- 某學校同時存在多個學制、部分年度缺漏且含估算值時，系統必須能分辨 `school_code` 與 `school_level_id`，且不得把估算值當作正式值覆蓋。
- 行政區名稱異動、中文別名或 GIS 名稱與邊界名稱不一致時，系統必須以標準行政區代碼維持歸屬穩定，顯示名稱僅作為 UI 文案。
- 某切片雜湊有變更但下載失敗時，系統必須回退到前一版快取並回報局部更新失敗，不得讓整體資料不可用。
- 舊版快取尚未包含 manifest 或新 schema 資產時，系統必須提供相容遷移路徑，而不是直接要求使用者清空所有本地資料。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 為每筆學校資料同時保留 `school_code` 與 `school_level_id`，其中 `school_level_id` 必須可唯一識別同校不同學制資料，避免完全中學等情境發生覆寫。
- **FR-002**: 系統 MUST 提供可重用的共用 schema 資產，以統一定義學制到年級、學位、班別 band 與性別分析的 mapping，並供資料刷新流程與前端讀取流程共用。
- **FR-003**: 系統 MUST 以標準行政區代碼作為縣市與鄉鎮的 canonical ID，所有 boundary、summary、detail 與學校資料契約都必須以該代碼互相對應，中文名稱僅作為顯示欄位。
- **FR-004**: 系統 MUST 定義穩定的地理對應策略，將經緯度與行政區歸屬的解析方式、來源可信度、人工覆核與例外註記記錄為 audit metadata。
- **FR-005**: 系統 MUST 明確區分學生數時間序列中的正式值、估算值、零值、缺值與缺年度，並讓消費端能不靠推測辨識各種語義。
- **FR-006**: 系統 MUST 在靜態資產策略下新增 `manifest.json`，至少包含 `schemaVersion`、產生時間或版本識別、整體 `contentHash`、各切片的位元組數與內容雜湊，供部署版本偵測與差異載入使用。
- **FR-007**: 系統 MUST 將「重新載入部署資料」流程改為先比較本地與遠端 manifest，再只刷新已變更切片與對應快取，並向使用者顯示本地版本、遠端版本與更新結果。
- **FR-008**: 系統 MUST 保持 `public/data/` 靜態切片策略為主要交付方式，不得把此功能的基本流程建立在新增 server API、全台單一大型 GeoJSON 或本地 API 層之上。
- **FR-009**: 系統 MUST 以正規化查詢表為 SQLite 的主要資料來源，避免在資料庫內重複儲存完整 JSON payload；若保留局部快取視圖，必須清楚定義用途、適用範圍與淘汰條件。
- **FR-010**: 系統 MUST 提供 `school_compositions` 或等價的正規化資料結構，以支援依年級、學位、班別 band 與性別進行分析，而不依賴僅存在於 JSON 切片中的臨時欄位。
- **FR-011**: 系統 MUST 在 refresh/build 流程加入資料品質驗證，至少涵蓋縣市與鄉鎮彙總一致性、composition 加總檢查、缺座標追蹤、重複 key 檢查，以及 manifest/hash 一致性。
- **FR-012**: 系統 MUST 讓資料模型明確表達學校座標來源、地理解析方式、資料狀態與治理註記，讓異常與人工修補可以被追蹤，而非隱含在腳本邏輯中。
- **FR-013**: 系統 MUST 以 P0、P1、P2 的漸進遷移方式交付本功能，允許既有靜態資產與前端行為在過渡期間維持可用，不要求一次硬切所有契約。
- **FR-014**: 系統 MUST 為 migration 定義向後相容與回退策略，讓舊版快取、舊版資料契約與新 manifest 可以共存於過渡期間，直到驗證完成後再淘汰舊欄位或舊資產。
- **FR-015**: 系統 MUST 產出對維護者可讀的驗證結果，指出失敗類型、影響範圍、受影響資產與建議處置，避免只留下難以追查的建置錯誤。
- **FR-016**: 系統 MUST 建立獨立 `backend/` 資料處理工作區，承接正式資料刷新、切片生成、SQLite 建置、manifest 與 validation 產物生成；`frontend/` 僅負責消費 `frontend/public/data/` 產物與呈現 UI，不再承載資料處理元件實作。
- **FR-017**: 系統 MUST 讓 `backend/` 與 `frontend/` 的責任邊界清楚可驗證：`backend/` 可輸出至 `frontend/public/data/`，但不得成為長駐 API 或取代既有靜態部署模型。

### Non-Functional Requirements

- **NFR-001**: 同一份正式來源資料在未變更前提下重跑刷新流程時，除時間戳記外，輸出的切片雜湊與內容必須保持穩定，以支援可靠的版本比較。
- **NFR-002**: 差異刷新失敗時，未受影響的本地資料仍必須維持可讀，且使用者能清楚知道哪些切片未更新成功。
- **NFR-003**: 新資料契約必須可被非原作者理解與檢查；維護者不應需要追讀多個腳本才能判斷某欄位的語義。
- **NFR-004**: 新舊資料契約在 P0 至 P2 過渡期間必須有明確相容邊界，避免前端與建置產物在版本交錯時產生不可恢復錯誤。
- **NFR-005**: 功能擴充不得顯著增加首次載入所需下載量；新增資產應以小型 schema、manifest 與必要切片為主。

### Data Contract Changes

#### 1. Manifest 契約

- 在 `public/data/manifest.json` 定義整體資料版本契約。
- 契約至少包含：`schemaVersion`、`generatedAt` 或等價版本欄位、整體 `contentHash`、資產清單、每個 slice 的 `path`、`bytes`、`hash`、資產類型與相依 schema 版本。
- 契約需能辨識 summary、boundary、county detail、bucket、school atlas、schema 與 SQLite 等不同資產群組。

#### 2. 共用 Schema 契約

- 在 `public/data/schema/` 提供共用 schema 資產，至少包含 `grade-map.json` 或等價契約。
- 契約需定義學制、年級、學位、班別 band、性別維度與前端顯示所需的穩定代碼。
- 任何學制 mapping 調整都必須先反映到共用 schema，再由刷新流程與前端共同採用。

#### 3. 學校資料契約

- 學校資料至少需定義：`school_code`、`school_level_id`、學校名稱、學制代碼、行政區代碼、行政區顯示名稱、座標、座標來源、地理解析方式、資料狀態、治理註記。
- 時間序列資料需能區分正式值、估算值、零值、缺值與缺年度。
- 同一 `school_code` 下允許多個 `school_level_id` 共存，並可追溯回共同學校實體。

#### 4. 行政區與邊界契約

- 縣市與鄉鎮邊界資產必須以標準行政區代碼為主鍵。
- 所有切片資料內的 `countyId`、`townshipId` 必須與 boundary 契約一致，中文名稱改為獨立顯示欄位。
- 若原始來源僅提供中文名稱，需透過標準化對照流程轉換為 canonical ID，並保留 audit metadata。

#### 5. SQLite 契約

- SQLite 以正規化表為主，避免重複保存整份 JSON payload。
- `school_compositions` 或等價結構需成為可查詢資料的一部分，而非只存在於 JSON 切片。
- 若保留少量快取視圖，必須標記其用途、有效期間與可替代性，且不得再次成為主要資料來源。

### Acceptance Criteria

- **AC-001 主鍵衝突消除**: 任一完全中學或跨學制學校在所有索引、切片與查詢結果中，都必須以 `school_level_id` 唯一識別，不得再有只用 `school_code` 而發生覆寫的路徑。
- **AC-002 共用 schema 收斂**: 學制到年級、學位、班別 band 與性別維度的 mapping 必須收斂到單一共用 schema 資產，刷新流程與前端不得各自維護不同定義。
- **AC-003 行政區代碼正規化**: 所有新輸出的縣市、鄉鎮與邊界相關資料都必須以標準行政區代碼對接，中文名稱只能是顯示值，不能再作為 canonical ID。
- **AC-004 地理對應可稽核**: 每筆學校座標都必須能追溯其來源與行政區解析方式；若來源不穩定、人工修補或解析失敗，必須留下 audit metadata 與治理註記。
- **AC-005 時間維度語義明確**: 任何消費端都能從資料契約直接辨識零值、缺值、缺年度與估算值，而不需要依靠推論或補值副作用判讀。
- **AC-006 SQLite 去重完成**: SQLite 不再保存造成大幅重複的完整 payload JSON；資料量成長時，資料庫體積不得因重複 payload 造成不成比例膨脹。
- **AC-007 差異刷新可見**: 「重新載入部署資料」必須先比對 manifest，再只刷新已變更切片與快取，並在 UI 顯示本地版本、遠端版本、更新項目與結果摘要。
- **AC-008 刷新驗證內建**: refresh/build 流程必須在輸出時自動執行一致性與品質檢查，至少覆蓋縣/鄉鎮彙總、composition 加總、缺座標、重複 key 與 manifest/hash 一致性。

### Key Entities *(include if feature involves data)*

- **School**: 學校主體，代表可跨學制共用的學校實體，至少包含 `school_code`、名稱與治理註記。
- **School Level Record**: 學校與學制的交集實體，以 `school_level_id` 唯一識別，承載行政區歸屬、座標、趨勢與狀態。
- **School Composition**: 學校在特定年度、學制維度下的組成資料，支援年級、學位、班別 band 與性別分析。
- **Geographic Resolution Audit**: 描述座標來源、行政區解析方式、可信度、人工覆核與例外說明的治理紀錄。
- **Slice Manifest Entry**: 描述單一靜態資產切片的版本、雜湊、大小與相依 schema 版本的 manifest 項目。
- **Validation Report Item**: 描述資料品質檢查的規則、結果、影響範圍與建議處置的驗證紀錄。

## Migration Strategy

### P0 - 版本辨識與契約鋪底

- 新增 `manifest.json` 與共用 schema 資產，先建立靜態部署版本識別、slice hash 與差異刷新所需契約。
- 在不破壞現有切片命名與主要 UI 流程的前提下，先讓重新載入部署資料改為 manifest 比對驅動。
- 為學校、行政區與時間維度欄位補上新欄位與 audit metadata，但允許舊欄位暫時並存以維持相容。

### P1 - 正規化資料模型落地

- 將行政區代碼、`school_level_id` 與 `school_compositions` 納入主要資料契約。
- 讓 SQLite 逐步改以正規化表為主，淘汰重複的完整 payload JSON，並明確標示任何保留視圖的用途。
- 讓前端主要讀取路徑開始使用新契約，但保留必要轉接層以支援尚未切換的資產。

### P2 - 舊契約淘汰與品質治理收斂

- 在驗證穩定後淘汰只靠中文名稱識別行政區、只用 `school_code` 的索引與舊 payload 快取視圖。
- 將資料品質驗證納入正式發布門檻，讓缺座標、重複 key、彙總不一致與 manifest 不一致都可阻擋或標示發布。
- 收斂 UI、切片與 SQLite 對同一份資料契約的依賴，移除過渡期轉接欄位。

## Risks & Mitigations

- **舊快取與新 manifest 並存風險**: 以向後相容的欄位與版本檢查降低一次性失效風險，並提供局部刷新失敗時的回退策略。
- **行政區代碼切換影響既有連結與索引**: 先保留中文顯示名稱與相容映射，在 P1 前不移除舊顯示欄位。
- **資料契約收斂過程中前後端版本錯配**: 使用 `schemaVersion` 與 manifest 相依資訊明確標示相容範圍，避免部署後才發現不相容。
- **去除重複 payload 後查詢行為改變**: 先以正規化結構覆蓋關鍵分析場景，再逐步淘汰舊視圖，確保使用者可觀察的結果不倒退。
- **資料品質檢查過嚴導致發布阻塞**: 將錯誤分為阻擋型與警示型，先建立可觀測性，再逐步提高門檻。

## Assumptions

- 正式資料仍以既有靜態刷新流程產出，不新增長駐型伺服器 API。
- `backend/` 僅作為建置與資料處理工作區，不提供部署期常駐服務。
- 前端會持續以 summary、boundary、縣市切片與 SQLite 的雙通道讀取方式演進，而不是改成單一超大檔案下載。
- 資料治理需要保留中文顯示名稱，但 canonical ID 以標準行政區代碼為唯一依據。
- 使用者可接受在過渡期同時存在新舊欄位，只要 UI 行為與資料意義保持穩定。

## Out of Scope

- 不在此功能中改為全台一次載入單一大型 GeoJSON 或等價大型地理檔案。
- 不在此功能中導入部署期常駐 API、SSR 伺服器或資料庫服務。
- 不在此功能中重設整個前端資訊架構或視覺設計；UI 變更僅限支援版本顯示、更新結果與治理資訊。
- 不在此功能中重新定義所有官方資料來源內容，只聚焦於資料契約、切片生成、刷新流程與品質治理。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% 的跨學制學校資料在切片、索引與查詢中都能以 `school_level_id` 唯一識別，建置驗證不得再出現已知的主鍵覆寫問題。
- **SC-002**: 100% 的正式輸出資產都可在 manifest 中找到對應的大小與雜湊資訊，且建置後驗證能確認 manifest 與實際檔案一致。
- **SC-003**: 當一次部署僅變更部分切片時，重新載入部署資料流程只下載 manifest 與受影響資產，未變更資產的下載數量應為 0。
- **SC-004**: 100% 的縣市與鄉鎮彙總、composition 加總與重複 key 檢查都在刷新流程中自動執行，並能對每次發布產出可追溯結果。
- **SC-005**: 100% 的缺座標、估算值與地理解析例外都能在輸出資料中被標示，資料治理維護者可直接追蹤受影響學校清單。
- **SC-006**: SQLite 主資料來源完成正規化後，重複完整 payload 不再作為預設儲存策略，資料庫體積需相較於遷移前基線明顯下降，並在發布驗證中被量測與記錄。

## Next Planning Topics

- 定義 manifest、schema 與學校資料契約的欄位級別 migration 計畫。
- 規劃 SQLite 正規化表、`school_compositions` 與查詢相容層的切換步驟。
- 設計差異刷新 UI 狀態機、快取更新流程與局部失敗回退行為。
- 規劃資料品質驗證規則分級、發布門檻與驗證輸出格式。
- 整理 P0、P1、P2 對應的實作 tasks、測試策略與回歸驗證清單。