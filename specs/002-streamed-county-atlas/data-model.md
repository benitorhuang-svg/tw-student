# 資料模型：縣市細節串流與版型深化

## 全台摘要檔 `EducationSummaryDataset`

- `generatedAt`：資料產製時間。
- `years`：可用學年度清單。
- `sources`：正式資料來源描述。
- `counties`：縣市摘要集合。

### 縣市摘要 `CountySummaryRecord`

- `id`：穩定縣市識別值。
- `name`：縣市名稱。
- `shortLabel`：地圖簡稱。
- `region`：區域群組。
- `townshipFile`：對應鄉鎮 TopoJSON 切片路徑。
- `detailFile`：對應縣市細節 JSON 路徑。
- `previewNotes`：縣市層預覽註記。
- `summaryTrend`：縣市層年度彙總趨勢。

## 縣市細節檔 `CountyDetailDataset`

- `county`：縣市基本資料。
- `towns`：鄉鎮集合。
- `dataNotes`：縣市層級註記。

### 鄉鎮 `TownshipRecord`

- `id`：鄉鎮識別值。
- `name`：鄉鎮名稱。
- `countyId`：上層縣市。
- `summaryTrend`：鄉鎮年度彙總趨勢。
- `schools`：學校集合。
- `dataNotes`：鄉鎮註記。

### 學校 `SchoolRecord`

- 延續 `001` 契約：`id`、`code`、`name`、`educationLevel`、`managementType`、`yearlyStudents`、`status`、`missingYears`、`dataNotes` 等欄位不得移除。

## 初始化狀態 `HydrationState`

- `summaryReady`：全台摘要是否完成。
- `countyDetailReady`：目前縣市細節是否完成。
- `townshipBoundaryReady`：目前縣市鄉鎮界線是否完成。
- `loadError`：目前細節載入錯誤。

## 快取模型 `CountyResourceCache`

- `detailByCountyId`：已載入縣市細節快取。
- `townshipBoundaryByCountyId`：已載入鄉鎮界線快取。
- `pendingCountyRequestIds`：避免重複請求的中間狀態。