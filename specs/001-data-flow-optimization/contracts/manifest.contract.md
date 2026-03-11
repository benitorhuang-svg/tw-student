# Contract: manifest.json

## 目的

`manifest.json` 是差異刷新與版本治理的唯一入口。前端必須先讀此檔，再決定是否刷新 `education-summary.json`、縣市切片、schema、SQLite 與驗證報告。

## 檔案位置

- 正式輸出：`frontend/public/data/manifest.json`

## JSON 結構

```json
{
  "schemaVersion": "2026.03.p0",
  "generatedAt": "2026-03-10T14:30:00.000Z",
  "buildId": "20260310-143000",
  "contentHash": "sha256-...",
  "previousCompatibleSchemaVersions": ["2026.03.rc1"],
  "validationSummary": {
    "overallStatus": "warning",
    "blockingCount": 0,
    "warningCount": 3,
    "infoCount": 12
  },
  "assets": [
    {
      "path": "education-summary.json",
      "assetGroup": "summary",
      "hash": "sha256-...",
      "bytes": 182431,
      "dependsOnSchemaVersion": "2026.03.p0",
      "critical": true
    },
    {
      "path": "schema/grade-map.json",
      "assetGroup": "schema",
      "hash": "sha256-...",
      "bytes": 14203,
      "critical": true
    },
    {
      "path": "counties/taichung-city.json",
      "assetGroup": "county-detail",
      "hash": "sha256-...",
      "bytes": 504821,
      "countyId": "臺中市",
      "countyCode": "66000",
      "critical": false,
      "legacyAliases": ["counties/臺中市.json"]
    }
  ]
}
```

## 欄位規則

- `schemaVersion` 必填，且需與 `schema/grade-map.json.schemaVersion` 一致。
- `contentHash` 必須由排序後的 `assets[].path + assets[].hash` 穩定推導。
- `assets[]` 必須包含所有正式輸出檔案，包含 `validation-report.json` 與 `education-atlas.sqlite`。
- `critical=true` 的資產代表前端刷新時若下載失敗，需要明確回報並決定是否回退整體版本。
- `countyId` 僅作 P0/P1 過渡相容；P2 起以 `countyCode` 為正式對應鍵。

## 前端使用規則

- `useEducationData.ts` 先讀本地 manifest，再讀遠端 manifest。
- 若 `contentHash` 相同，刷新流程應回報「無需更新」。
- 若只有部分 `assets[].hash` 不同，只刷新該資產群組。
- 若 manifest 無法取得或格式不合法，使用最後成功本地 manifest 作為回退依據。

## 驗證規則

- manifest 中每一個 `assets[].path` 都必須在 `public/data/` 找到對應檔案。
- `bytes` 與 `hash` 必須在寫檔後重新計算驗證。
- `validationSummary` 必須與 `validation-report.json` 摘要一致。