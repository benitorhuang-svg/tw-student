# 資料模型：本地資料庫預抓與可觀測縣市 Atlas

## 載入觀測 `AtlasLoadObservation`

- `loadedCountyDetails`：目前已載入的縣市細節 ID 清單。
- `loadedTownshipSlices`：目前已載入鄉鎮切片的縣市 ID 清單。
- `cacheHits`：總快取命中次數。
- `memoryHits`：記憶體命中次數。
- `indexedDbHits`：本地資料庫命中次數。
- `networkFetches`：網路抓取次數。
- `totalTransferredBytes`：目前累積下載位元組數。
- `resourceSizes`：以資源路徑為 key 的大小對照表。

## 摘要資產大小 `assetMetrics`

- `summaryBytes`：摘要檔大小。
- `countyBoundaryBytes`：縣市界線大小。
- `countyDetailBytes`：所有縣市細節總大小。
- `townshipBoundaryBytes`：所有鄉鎮切片總大小。

## 縣市摘要的資源大小

- `detailBytes`：單一縣市細節檔大小。
- `townshipBytes`：單一縣市鄉鎮切片大小。