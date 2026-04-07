# Contract: education-atlas.sqlite

## 目的

SQLite 在此 feature 中是前端查詢與離線輔助層，不應再保存大量重複的完整 JSON payload。P1 之後以正規化表為主，`atlasSqlite.ts` 再組裝出既有資料 shape。

## 正規化表

### 必要資料表

- `meta`
- `counties`
- `towns`
- `schools`
- `school_year_metrics`
- `school_compositions`
- `county_summaries`
- `town_summaries`
- `school_buckets`
- `validation_meta`

## 主要欄位

### `schools`

| 欄位 | 說明 |
|------|------|
| `school_level_id` | 主鍵 |
| `school_code` | 學校主體鍵 |
| `level_code` | 學制代碼 |
| `county_code` | canonical 縣市代碼 |
| `town_code` | canonical 鄉鎮代碼 |
| `county_name` / `township_name` | 顯示值 |
| `coordinate_source` | 座標來源 |
| `boundary_resolution_method` | 行政區解析方式 |
| `data_notes_json` | 少量治理註記 JSON，可保留 |

### `school_year_metrics`

| 欄位 | 說明 |
|------|------|
| `school_level_id` | 外鍵 |
| `year` | 學年度 |
| `students` | 數值或 null |
| `value_status` | `official` / `estimated` / `zero` / `missing` / `year-not-applicable` |
| `source_file` | 來源檔名 |

### `school_compositions`

| 欄位 | 說明 |
|------|------|
| `school_level_id` | 外鍵 |
| `year` | 學年度 |
| `dimension_type` | `grade` / `degree` / `track` / `other` |
| `band_id` | 對應 `grade-map.json` |
| `male_students` / `female_students` / `total_students` | 組成統計 |
| `source_status` | `official` / `estimated` / `derived` |

## 相容層規則

- P1 初期可保留 `summary_views`、`county_detail_views`、`county_bucket_views` 作為 fallback，但不再是主要資料來源。
- `frontend/src/data/atlasSqlite.ts` 必須優先用 SQL 查詢正規化表組裝 summary/detail/bucket shape。
- 若新查詢失敗且舊 view 仍存在，可回退讀取舊 view，同時記錄 warning。

## 驗證規則

- 需要量測 SQLite 檔案大小並與 migration 前基線比較。
- `school_compositions` 行數與 query 抽樣結果必須納入 `validation-report.json`。
- `payload_json` 類型欄位只允許保留在明確標示為 legacy/fallback 的 view，不得再用於主資料表。