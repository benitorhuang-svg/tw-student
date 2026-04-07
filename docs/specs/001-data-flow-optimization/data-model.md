# Data Model: 資料流程優化與差異刷新

## 目標

本資料模型定義 P0-P2 期間新增或調整的核心實體，讓 refresh/build、前端讀取、治理 UI 與 SQLite 正規化都依賴同一套欄位語義。設計重點如下：

- `manifest.json` 提供整體版本、資產 hash 與差異刷新依據。
- `schema/grade-map.json` 統一學制、年級、學位、band 與性別維度。
- `school_level_id` 取代只依賴 `school_code` 的不穩定索引。
- `school_compositions`、時間維度狀態、地理 audit metadata 與 validation report 皆成為正式資料模型的一部分。
- canonical ID (`countyCode` / `townCode`) 在 P0/P1 先雙寫，P2 成為正式唯一主鍵。

## Entity Overview

### 1. ManifestDocument

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `schemaVersion` | string | 是 | 本批資料契約版本，例如 `2026.03.p0` |
| `generatedAt` | string (ISO-8601) | 是 | 產製時間 |
| `contentHash` | string | 是 | 以所有資產 hash 匯總後計算的整體 hash |
| `buildId` | string | 是 | 當次 build 的穩定識別碼 |
| `assets` | ManifestAssetEntry[] | 是 | 所有正式輸出資產清單 |
| `validationSummary` | ValidationSummary | 是 | 當次 build 驗證摘要 |
| `previousCompatibleSchemaVersions` | string[] | 否 | 可被前端接受的舊版 schema |
| `notes` | string[] | 否 | 本次發版補充說明 |

### 2. ManifestAssetEntry

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `path` | string | 是 | 相對於 `public/data/` 的路徑 |
| `assetGroup` | enum | 是 | `summary`, `schema`, `county-detail`, `bucket`, `school-atlas`, `boundary`, `sqlite`, `validation-report` |
| `hash` | string | 是 | 內容 hash |
| `bytes` | number | 是 | 實際檔案大小 |
| `dependsOnSchemaVersion` | string | 否 | 此資產依賴的 schema 版本 |
| `countyId` | string | 否 | 舊式縣市識別，P0/P1 過渡用 |
| `countyCode` | string | 否 | canonical 縣市代碼 |
| `critical` | boolean | 是 | 是否為刷新必要資產 |
| `legacyAliases` | string[] | 否 | 舊檔名或舊 key 對照 |

### 3. GradeMapSchema

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `schemaVersion` | string | 是 | 與 manifest 對齊 |
| `generatedAt` | string | 是 | schema 產生時間 |
| `levels` | GradeLevelDefinition[] | 是 | 各學制 mapping |
| `genderDimensions` | GenderDimension[] | 是 | 性別維度與顯示文案 |
| `bandDimensions` | BandDimensionDefinition[] | 是 | 年級 / 學位 / 班別 band 定義 |

### 4. SchoolEntity

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `school_code` | string | 是 | 官方學校代碼；代表學校主體 |
| `primary_name` | string | 是 | 正式顯示名稱 |
| `aliases` | string[] | 否 | 名稱異動或別名 |
| `governance_notes` | DataNote[] | 否 | 跨學制共用治理註記 |

### 5. SchoolLevelRecord

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `school_level_id` | string | 是 | `school_code:level` 或等價穩定鍵 |
| `school_code` | string | 是 | 對應 SchoolEntity |
| `level_code` | string | 是 | 學制代碼 |
| `education_level` | string | 是 | 現行 UI 用學制名稱 |
| `management_type` | string | 是 | 公立 / 私立 |
| `county_code` | string | 是 | canonical 縣市代碼 |
| `town_code` | string | 是 | canonical 鄉鎮代碼 |
| `county_id_legacy` | string | 否 | 過渡期間保留 |
| `township_id_legacy` | string | 否 | 過渡期間保留 |
| `county_name` | string | 是 | 顯示值 |
| `township_name` | string | 是 | 顯示值 |
| `address` | string | 否 | 地址 |
| `phone` | string | 否 | 電話 |
| `website` | string | 否 | 網站 |
| `profile_url` | string | 否 | 外部介紹頁 |
| `status` | enum | 否 | `正常`, `停辦`, `整併`, `待確認` |
| `data_notes` | DataNote[] | 否 | 單一學制層級註記 |
| `geographic_audit` | GeographicResolutionAudit | 是 | 座標與行政區解析審計資料 |
| `time_series` | SchoolYearMetric[] | 是 | 各學年度學生數與語義 |

### 6. SchoolYearMetric

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `year` | number | 是 | 學年度 |
| `students` | number \| null | 是 | 正式值或空值 |
| `valueStatus` | enum | 是 | `official`, `estimated`, `zero`, `missing`, `year-not-applicable` |
| `sourceFile` | string | 否 | 來源 CSV 或 slice |
| `note` | string | 否 | 補充說明 |

### 7. SchoolCompositionFact

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `school_level_id` | string | 是 | 對應 SchoolLevelRecord |
| `year` | number | 是 | 學年度 |
| `dimension_type` | enum | 是 | `grade`, `degree`, `track`, `other` |
| `band_id` | string | 是 | 來自 `grade-map.json` |
| `band_label` | string | 是 | 顯示文字 |
| `male_students` | number \| null | 否 | 男生人數 |
| `female_students` | number \| null | 否 | 女生人數 |
| `total_students` | number | 是 | 合計 |
| `source_status` | enum | 是 | `official`, `estimated`, `derived` |

### 8. GeographicResolutionAudit

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `coordinateSource` | enum | 是 | `gis-point`, `manual-override`, `address-geocode`, `township-fallback` |
| `coordinateResolution` | string | 否 | 現有 `coordinateResolution` 的正規化欄位 |
| `coordinateMatchType` | string | 否 | 解析方式 |
| `coordinateMatchScore` | number | 否 | 配對可信度 |
| `boundaryResolutionMethod` | enum | 是 | `source-attribute`, `code-lookup`, `spatial-join`, `manual-review` |
| `countyCodeResolved` | string | 是 | 最終縣市代碼 |
| `townCodeResolved` | string | 是 | 最終鄉鎮代碼 |
| `manualReviewed` | boolean | 是 | 是否人工覆核 |
| `auditNotes` | string[] | 否 | 補充說明 |

### 9. ValidationReport

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `generatedAt` | string | 是 | 驗證時間 |
| `schemaVersion` | string | 是 | 驗證時使用的資料契約版本 |
| `overallStatus` | enum | 是 | `pass`, `warning`, `fail` |
| `items` | ValidationReportItem[] | 是 | 規則明細 |

### 10. ValidationReportItem

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `ruleId` | string | 是 | 規則代號 |
| `severity` | enum | 是 | `blocking`, `warning`, `info` |
| `status` | enum | 是 | `pass`, `warning`, `fail` |
| `scope` | enum | 是 | `manifest`, `schema`, `summary`, `county-detail`, `bucket`, `school-atlas`, `sqlite` |
| `affectedAssets` | string[] | 是 | 受影響資產路徑 |
| `affectedRecordCount` | number | 是 | 受影響筆數 |
| `samples` | object[] | 否 | 抽樣資料 |
| `recommendedAction` | string | 否 | 處理建議 |

## Relationships

- `ManifestDocument 1 -> N ManifestAssetEntry`
- `ManifestDocument 1 -> 1 ValidationSummary`
- `GradeMapSchema 1 -> N GradeLevelDefinition`
- `SchoolEntity 1 -> N SchoolLevelRecord`
- `SchoolLevelRecord 1 -> N SchoolYearMetric`
- `SchoolLevelRecord 1 -> N SchoolCompositionFact`
- `SchoolLevelRecord 1 -> 1 GeographicResolutionAudit`
- `ValidationReport 1 -> N ValidationReportItem`

## Derived Views And Compatibility Shapes

### P0 前端相容 shape

- `EducationSummaryDataset` 仍保留現有欄位，但補入：
  - `manifestVersion`
  - `schemaVersion`
  - `validationSummary`
  - `refreshCompatibility`
- `CountySummaryRecord`、`TownshipRecord`、`SchoolRecord` 在過渡期可同時持有 legacy id 與 canonical code。

### P1 SQLite 相容 shape

- `atlasSqlite.ts` 將以正規化 SQL query 組裝：
  - `EducationSummaryDataset`
  - `CountyDetailDataset`
  - `CountyBucketDataset`
- 這些 shape 不直接反映底層表結構，目的是讓 React hooks 與元件在 P1 不必全面改寫。

## Validation Rules

### Key Integrity

- `school_level_id` 必須唯一。
- `school_code` 可重複，但同一 `school_code + level_code` 不可重複。
- `county_code` / `town_code` 必須存在於 boundary 對照中。

### Time Series Semantics

- 同一 `school_level_id + year` 僅能存在一筆 `SchoolYearMetric`。
- `valueStatus=zero` 時 `students` 必須為 `0`。
- `valueStatus=missing` 或 `year-not-applicable` 時 `students` 必須為 `null`。

### Composition Integrity

- 同一 `school_level_id + year + dimension_type + band_id` 僅能存在一筆 composition。
- 同年度 composition `total_students` 合計不可超出對應 `SchoolYearMetric.students`，除非有明確 `derived`/warning 標記。

### Geographic Audit Integrity

- `coordinateSource=manual-override` 時 `manualReviewed` 必須為 `true`。
- `boundaryResolutionMethod=manual-review` 時 `auditNotes` 不得為空。

### Manifest Integrity

- `ManifestAssetEntry.bytes` 與實際檔案大小必須一致。
- `ManifestAssetEntry.hash` 與實際內容 hash 必須一致。
- `ManifestDocument.contentHash` 必須由資產清單穩定推導，而不是獨立任意字串。

## State Transitions

### Refresh Lifecycle

| 狀態 | 觸發條件 | 下一狀態 |
|------|----------|----------|
| `idle` | 使用者尚未刷新 | `checking-remote-manifest` |
| `checking-remote-manifest` | 取得遠端 manifest | `no-change`, `downloading-diff`, `fallback-local`, `failed` |
| `downloading-diff` | 至少一個資產 hash 改變 | `verifying`, `partial-failed`, `applied` |
| `verifying` | 所有變更資產下載完成 | `applied`, `partial-failed`, `failed` |
| `partial-failed` | 部分資產失敗但有本地可回退版本 | `applied-with-rollback` |
| `applied` | 所有資產已更新 | `idle` |
| `applied-with-rollback` | 部分資產更新，部分資產維持舊版本 | `idle` |
| `fallback-local` | manifest 不可用或不合法 | `idle` |
| `failed` | 無法取得可用資料 | `idle` |

## Migration Mapping

| 現行欄位 / 結構 | 新欄位 / 結構 | Phase | 備註 |
|----------------|--------------|-------|------|
| `school.id` (`code:educationLevel`) | `school_level_id` | P0 | 對外名稱正式化 |
| `school.code` | `school_code` | P0 | 學校主體鍵 |
| `county.id` 中文識別 | `county_code` | P2 | P0/P1 先雙寫 |
| `town.id` 中文識別 | `town_code` | P2 | P0/P1 先雙寫 |
| `TrendRecord.isEstimated` / `isMissing` | `SchoolYearMetric.valueStatus` | P0 | 明確表達零值、缺值與缺年度 |
| `studentCompositions[]` 嵌入 JSON | `school_compositions` 表 | P1 | 正規化查詢主路徑 |
| `summary_views.payload_json` 等 view | SQL 組裝相容層 | P1 | 完成後停止預設寫入 view |

## Non-Goals In This Model

- 不把整個資料流程改為部署期後端 API；允許建立 `backend/` 作為建置與資料處理工作區。
- 不在此階段重設所有前端 UI shape；相容層會先維持現有 hook/元件 API。
- 不把 canonical ID 直接暴露成唯一 UI 顯示值；名稱仍保留給介面與匯出使用。