# 資料模型：SQLite 資料庫驅動的可觀測縣市 Atlas

## SQLite 主資料庫 `education-atlas.sqlite`

- `meta`：儲存 `generatedAt`、`years`、`sources`、資料庫檔大小等全域 metadata。
- `counties`：縣市主檔，包含 `id`、`name`、`short_label`、`region`、`detail_file`、`bucket_file`、`township_file` 與資產大小。
- `county_notes`：縣市層級註記，保留 `type`、`message`、`severity`、`years_json`。
- `towns`：鄉鎮主檔，包含 `id`、`county_id`、`name`。
- `town_notes`：鄉鎮層級註記。
- `schools`：學校主檔，包含 `education_level`、`management_type`、地址、電話、網站、經緯度、狀態與缺年資訊。
- `school_yearly_students`：每校每學年學生數。
- `school_notes`：學校層級註記。
- `county_summaries`：縣市 x 學年 x 學制 x 公私立的預先聚合結果。
- `town_summaries`：鄉鎮 x 學年 x 學制 x 公私立的預先聚合結果。
- `school_buckets`：地圖分群資料，欄位包含 `county_id`、`precision`、`bucket_id`、`geohash`、中心點、bounds 與 `top_schools_json`。

## 載入觀測 `AtlasLoadObservation`

- `loadedCountyDetails`：目前已查詢過縣市明細的縣市 ID 清單。
- `loadedTownshipSlices`：目前已載入鄉鎮 TopoJSON 切片的縣市 ID 清單。
- `cacheHits`：總快取命中次數。
- `memoryHits`：記憶體命中次數。
- `sqliteHits`：SQLite 查詢命中次數。
- `networkFetches`：網路抓取次數。
- `totalTransferredBytes`：目前累積下載位元組數。
- `resourceSizes`：以資源路徑為 key 的大小對照表。

## 前端查詢投影

- `EducationSummaryDataset`：由 `counties`、`county_notes`、`towns`、`town_summaries`、`county_summaries` 重建，供摘要與篩選 UI 使用。
- `CountyDetailDataset`：由 `counties`、`towns`、`schools`、`school_yearly_students`、註記表重建，供學校工作台與地圖校點使用。
- `CountyBucketDataset`：由 `school_buckets` 依縣市與精度重建，供低縮放分群使用。

## 摘要資產大小 `assetMetrics`

- `sqliteBytes`：SQLite 主資料檔大小。
- `countyBoundaryBytes`：縣市界線大小。
- `countyDetailBytes`：所有縣市明細在 SQLite 中對應資料量的累積大小估算。
- `townshipBoundaryBytes`：所有鄉鎮切片總大小。

## 縣市摘要的資源大小

- `detailBytes`：單一縣市細節檔大小。
- `townshipBytes`：單一縣市鄉鎮切片大小。
- `bucketBytes`：單一縣市 bucket 分群資料大小。