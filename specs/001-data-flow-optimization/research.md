# Phase 0 Research: 資料流程優化與差異刷新

## 研究結論摘要

本 feature 的主要未知點已收斂為 manifest/hash 契約、共用 schema 形式、差異刷新狀態機、SQLite 正規化遷移、canonical ID 雙寫策略與驗證報告格式。以下決策皆以目前 repo 的實際路徑與現況為基礎，並解決 `refresh-official-data.mjs` 全量覆寫、`atlasSqlite.ts` 依賴 `payload_json`、`useEducationData.ts` 暴力清快取，以及 `DataGovernanceFlyout.tsx` 只顯示產製時間而無法對比版本的問題。

## Decisions

### 0. 建立獨立 `backend/` 資料處理工作區

- Decision: 將正式資料刷新、切片生成、SQLite 建置、manifest 與 validation report 產生流程移入 `backend/`，並由 root scripts 統一調度；輸出仍維持寫入 `frontend/public/data/`。
- Rationale: 現有資料處理邏輯堆疊在 `frontend/scripts/`，已與 UI 工作區耦合過深，不利於後續維護、測試與責任分離。新增 `backend/` 能完成前後端分離，同時不破壞 GitHub Pages 靜態部署前提。
- Alternatives considered:
  - 繼續把資料管線留在 `frontend/`：無法達成職責拆分，也讓前端 package 持續承擔非 UI 任務。
  - 直接改成長駐 API：超出目前靜態部署邊界，成本與風險過高。

### 1. Manifest 契約採單一 `public/data/manifest.json`

- Decision: 在 `frontend/public/data/manifest.json` 輸出單一版本清單，包含 `schemaVersion`、`generatedAt`、`contentHash`、`assets[]`、`validationSummary` 與 `previousCompatibleSchemaVersions`。
- Rationale: 現有 `useEducationData.refreshData()` 只能清快取後重抓，缺少版本基準。單一 manifest 可以作為前端 diff refresh、部署核對與回退判斷的共同來源。
- Alternatives considered: 
  - 把版本資訊分散寫進各 slice：會讓前端必須先抓多個檔案才能比較版本，增加網路往返。
  - 僅用 `education-summary.json.generatedAt`：無法辨識局部切片變更，也不能檢查 bytes/hash。

### 2. `schema/grade-map.json` 作為 refresh 與前端共用的單一 mapping 來源

- Decision: 在 `frontend/public/data/schema/grade-map.json` 定義學制、年級 band、學位、班別 band、性別維度與 stable ids。
- Rationale: 目前映射邏輯散落在 build helper 與前端資料 shape。收斂為 schema 資產後，P0 即可先消除「前後端各維護一份 band 定義」的風險，P1 再把此 schema 導入 SQLite 查詢層。
- Alternatives considered:
  - 保留在腳本常數：不利於治理、驗證與前端動態渲染。
  - 把映射寫死在 SQLite：不利於靜態契約檢查，也無法讓 JSON 切片與 UI 共用。

### 3. 差異刷新以 manifest compare + per-asset invalidation 實作

- Decision: `useEducationData.ts` 先讀本地 manifest，再抓遠端 manifest，比對 `contentHash` 與 `assets[].hash`；只有變更檔案才執行 `forceRefresh`，並保留未變更資產的記憶體與 Cache API 可用性。
- Rationale: 目前刷新流程先清空所有快取與 React state，再重抓 summary 與縣市資源，對大型 SQLite 與慢網路都不友善。diff refresh 可直接滿足 spec 的 FR-006、FR-007、NFR-002。
- Alternatives considered:
  - Service Worker 全域版本 bump：太粗粒度，仍會造成全量重抓。
  - 每次都下載 `education-atlas.sqlite`：P1 前體積仍偏大，且會破壞「只抓變更切片」目標。

### 4. 版本資訊與局部失敗回報集中在 `DataGovernanceFlyout.tsx`

- Decision: UI 僅在治理面板與刷新狀態區顯示本地 manifest、遠端 manifest、schema 版本、更新項目、略過項目、失敗項目與回退結果。
- Rationale: 憲章要求維持主探索體驗。治理資訊應可見但不能干擾主要分析畫面，`DataGovernanceFlyout.tsx` 已是最適合承載版本/治理狀態的現有元件。
- Alternatives considered:
  - 把版本資訊直接塞進主 header：會干擾一般探索者。
  - 只用 console log：維護者與使用者都無法在 UI 內辨識目前資料版本。

### 5. P1 先建立查詢相容層，再移除 SQLite `payload_json`

- Decision: `build-atlas-sqlite.mjs` 在第一步雙寫正規化表與舊 view；`atlasSqlite.ts` 新增以 SQL 組裝 `EducationSummaryDataset` / `CountyDetailDataset` / `CountyBucketDataset` 的相容層，待結果穩定後停止寫入 view。
- Rationale: 現有 UI 與 hooks 都依賴既定資料 shape，若直接移除 `payload_json`，回歸風險過高。相容層可先鎖住外部 API，再逐步調整內部儲存。
- Alternatives considered:
  - 一次重寫前端所有讀取邏輯：改動面太大，不符合漸進遷移。
  - 永久保留雙寫：無法達成 SQLite 去重與體積下降目標。

### 6. `school_compositions` 需成為獨立正規化事實表

- Decision: 新增 `school_compositions` 與必要維度欄位，至少包含 `school_level_id`、`year`、`dimension_type`、`band_id`、`male_students`、`female_students`、`total_students`、`source_status`。
- Rationale: 目前 composition 只存在 JSON 切片，導致 SQLite 查詢無法直接支援年級、學位、band、性別分析，也讓 JSON 與 SQLite 發生重複邏輯。
- Alternatives considered:
  - 把 composition 繼續序列化成 JSON 欄位：難以查詢與驗證。
  - 在前端即時計算 composition：會把治理責任推回 UI，且無法在 build 階段檢查一致性。

### 7. Canonical ID 採雙寫遷移，P2 才正式淘汰名稱型主鍵

- Decision: `build-boundary-files.mjs` 與 `build-official-dataset.mjs` 先同時輸出 canonical ID (`countyCode` / `townCode`) 與 display name，切片讀取層與 URL 解析於過渡期同時接受 legacy id 與 canonical id。
- Rationale: 現況的 `countyId` / `townshipId` 帶有中文名稱依賴，直接硬切風險太高。雙寫可確保邊界、summary、school-atlas、SQLite 與 deep link 一起遷移。
- Alternatives considered:
  - 一次性改所有 id：最容易造成連結失效與快取污染。
  - 永久維持中文名稱主鍵：無法解決 canonicalization 與行政區改制風險。

### 8. 驗證報告需落地為正式資產 `validation-report.json`

- Decision: 在 `public/data/validation-report.json` 輸出可機器讀、亦可被治理 UI 摘要的驗證結果，並讓 manifest 引用其 hash 與摘要統計。
- Rationale: spec 要求維護者可讀的驗證結果。只在 console 顯示不利於發布追蹤，也無法讓前端或部署流程對應目前資料品質狀態。
- Alternatives considered:
  - 單純輸出終端機訊息：不可追溯。
  - 只寫在 specs 文件：不屬於 build 產物，無法代表當次資料刷新結果。

### 9. 回退策略以「最後成功 manifest + 局部資產回退」為主

- Decision: 本地端記錄最後成功 manifest 與對應 cache keys；若遠端 manifest 或某個切片下載失敗，只回退受影響資產，不刪除未受影響切片。
- Rationale: 目前刷新是全清後重抓，一旦中途失敗會讓本地資料整體可用性下降。局部回退符合 NFR-002 且與靜態資產策略相容。
- Alternatives considered:
  - 失敗即要求使用者手動清快取：使用者體驗差，也不利於治理。
  - 保留多版本完整 SQLite：空間成本高，不利於 P1 體積下降目標。

## Best Practices Applied To This Repo

- 將 hashing、manifest 建構、schema 輸出、validation 規則封裝到 `backend/scripts/lib/`，避免 `refresh-official-data.mjs` 繼續膨脹成單一巨型腳本。
- 保持 JSON 多行格式輸出，且 hash 必須以寫檔後實際 bytes 回算，避免序列化格式差異造成假性變更。
- 在 `atlasSqlite.ts` 的相容層維持現有資料 shape，將 UI 改動壓縮到 `useEducationData.ts` 與 `DataGovernanceFlyout.tsx` 的版本/刷新狀態。
- 利用 manifest 的 `assetGroup` 與 `dependsOnSchemaVersion` 區分 summary、schema、county detail、bucket、school-atlas、boundary、sqlite、validation-report 等資產群組，讓前端能按群組做快取失效與錯誤訊息分類。

## Open Questions Resolved

- `NEEDS CLARIFICATION: 前後端分離是否必須導入新服務層` → 不需要。此處的 backend 僅為資料處理工作區，部署仍沿用既有靜態檔與瀏覽器快取。
- `NEEDS CLARIFICATION: P1 是否必須立即重寫所有 UI 查詢` → 不需要。先做 `atlasSqlite.ts` 相容層即可。
- `NEEDS CLARIFICATION: 驗證結果要存在哪裡` → 存為 `public/data/validation-report.json`，並由 manifest 摘要引用。
- `NEEDS CLARIFICATION: canonical ID 何時全面生效` → P0/P1 先雙寫，P2 才切為唯一正式主鍵。