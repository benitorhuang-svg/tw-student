# 資料契約：SQLite Atlas 查詢輸出

## `EducationSummaryDataset`

- `generatedAt`: ISO 字串。
- `years`: 學年度陣列，維持遞增排序。
- `assetMetrics.sqliteBytes`: SQLite 主檔大小。
- `counties[]`: 縣市摘要列，保留 `detailFile`、`bucketFile`、`townshipFile` 供觀測與邊界切片對照使用。

## `CountyDetailDataset`

- `county`: 縣市基本資料。
- `towns[]`: 鄉鎮清單。
- `towns[].schools[]`: 學校資料，欄位值必須維持繁體中文。
- `towns[].schools[].yearlyStudents[]`: 每學年學生數。

## `CountyBucketDataset`

- `county`: 縣市基本資料。
- `precisions['5'|'6'|'7']`: bucket 陣列。
- bucket 需包含 `topSchools` 預覽，供低縮放地圖提示使用。

## 來源觀測 `AtlasLoadObservationSnapshot`

- `sqliteHits`: SQLite 查詢命中次數。
- `memoryHits`: 記憶體命中次數。
- `networkFetches`: 首次載入 SQLite 與邊界圖資的網路抓取次數。
- `resourceSizes`: 至少包含 SQLite 檔、縣市界線、鄉鎮切片與 bucket 對應大小。