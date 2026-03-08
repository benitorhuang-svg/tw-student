# 資料模型：台灣學生人數互動探索平台

## 縣市 `County`

- `id`：穩定的縣市識別值。
- `name`：縣市名稱，使用繁體中文正式名稱。
- `shortLabel`：地圖或圖例顯示用的簡短標籤。
- `region`：所屬區域群組，例如北部、中部、南部、東部、離島。
- `towns`：鄉鎮市區集合。

## 鄉鎮市區 `Township`

- `id`：在縣市範圍內唯一的識別值。
- `name`：鄉鎮市區名稱。
- `countyId`：所屬縣市識別值。
- `schools`：學校集合。

## 學校 `School`

- `id`：穩定的學校識別值。
- `code`：教育部正式學校代碼。
- `name`：學校名稱。
- `countyId`：所屬縣市。
- `townshipId`：所屬鄉鎮市區。
- `educationLevel`：`國小`、`國中`、`高中職`、`大專院校` 等教育階段。
- `managementType`：`公立` 或 `私立`。
- `address`：正式地址。
- `phone`：聯絡電話。
- `website`：學校網站。
- `profileUrl`：教育部或相關學校概況連結。
- `coordinates`：WGS84 經緯度座標。
- `yearlyStudents`：歷年學生數陣列。
- `dataNotes`：資料註記陣列，例如停辦、缺年度、名稱異動。
- `status`：學校資料狀態，例如 `正常`、`停辦`、`整併`、`待確認`。
- `missingYears`：缺漏的學年度清單。

## 趨勢紀錄 `TrendRecord`

- `year`：學年度。
- `students`：該年度學生數。
- `isEstimated`：是否為估算值，預設為 `false`。
- `isMissing`：是否為缺漏年度佔位資料。

## 篩選狀態 `FilterState`

- `year`：目前學年度。
- `educationLevel`：目前教育階段或 `全部`。
- `managementType`：目前公私立或 `全部`。
- `region`：目前區域群組或 `全部`。
- `selectedCountyId`：目前選定縣市或 `null`。
- `selectedTownshipId`：目前選定鄉鎮或 `null`。
- `searchText`：自由文字搜尋。

## URL 分享狀態 `ShareState`

- `year`：網址中的學年度參數。
- `level`：網址中的教育階段參數。
- `county`：網址中的縣市識別值。
- `town`：網址中的鄉鎮市區識別值。
- `region`：網址中的區域群組參數。
- `q`：網址中的搜尋關鍵字。

## 資料註記 `DataNote`

- `type`：註記類型，例如 `停辦`、`缺年度`、`行政區改制`、`名稱異動`。
- `message`：給使用者看的繁中文案。
- `severity`：嚴重程度，例如 `info`、`warning`、`critical`。
- `years`：與註記相關的學年度陣列。

## 切片資料模型

### 全台摘要切片 `NationalSlice`

- 提供首頁與地圖著色所需的全台與縣市摘要。
- 不含所有學校細節，優先追求載入輕量化。

### 縣市細節切片 `CountySlice`

- 每個縣市獨立一份細節檔，包含鄉鎮摘要與該縣市學校細節。
- 只在進入該縣市時載入。

### 地理邊界切片 `BoundarySlice`

- 縣市邊界與鄉鎮邊界各自獨立輸出。
- 優先使用 TopoJSON 或等效壓縮格式，並保留必要屬性如 `countyId`、`townId`、`name`。

### 校點分群切片 `SchoolBucketSlice`

- 以縣市為單位輸出 geohash bucket JSON。
- 每個 bucket 至少包含 `geohash`、`count`、中心點經緯度、包圍盒，以及代表性學校摘要。
- 供低縮放層級地圖直接讀取，避免前端在載入後重算所有校點分群。

## 衍生檢視模型

### 比較情境 `SavedComparisonScenario`

- `id`：情境識別值。
- `name`：情境名稱，可重新命名。
- `countyIds`：比較中的縣市陣列。
- `activeYear`：情境對應的學年度。
- `educationLevel`：教育階段篩選。
- `managementType`：公私立篩選。
- `region`：區域篩選。
- `pinned`：是否釘選。
- `updatedAt`：最後更新時間。

### 分析摘要 `ScopeSummary`

- `label`：目前分析範圍名稱。
- `caption`：摘要描述。
- `students`：目前年度彙總學生數。
- `schools`：符合條件的學校數。
- `delta`：相較前一年的變化值。
- `deltaRatio`：相較前一年的變化比例。
- `trend`：完整年度趨勢。
- `notes`：目前範圍需要顯示的資料註記集合。

### 排行列 `RankingRow`

- `label`：縣市或鄉鎮名稱。
- `students`：彙總學生數。
- `schools`：彙總學校數。
- `delta`：年變化。
- `subLabel`：次要標示，例如區域或上層行政區。
- `notes`：與該列相關的註記。

### 學校洞察 `SchoolInsight`

- `schoolId`：學校識別值。
- `currentStudents`：目前年度學生數。
- `trend`：完整年度趨勢。
- `notes`：該校資料註記。
- `status`：學校狀態。

## 資料替換邊界

前端 UI 只依賴穩定的縣市 / 鄉鎮 / 學校 / 趨勢 / 註記資料契約與 selector 輸出。未來若改用新資料源、瀏覽器快取或資料庫，都必須維持這組契約，避免 UI 與資料管線緊耦合。