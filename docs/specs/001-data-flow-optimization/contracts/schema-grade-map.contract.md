# Contract: schema/grade-map.json

## 目的

`schema/grade-map.json` 統一學制、年級、學位、班別 band 與性別維度，避免 refresh 腳本、SQLite 與前端各自維護不同 mapping。

## 檔案位置

- 正式輸出：`frontend/public/data/schema/grade-map.json`

## JSON 結構

```json
{
  "schemaVersion": "2026.03.p0",
  "generatedAt": "2026-03-10T14:30:00.000Z",
  "levels": [
    {
      "levelCode": "elementary",
      "label": "國小",
      "legacyLabels": ["國小"],
      "dimensions": [
        {
          "dimensionType": "grade",
          "bands": [
            { "bandId": "g1", "label": "一年級", "sortOrder": 1 },
            { "bandId": "g2", "label": "二年級", "sortOrder": 2 }
          ]
        }
      ]
    }
  ],
  "genderDimensions": [
    { "key": "male", "label": "男生" },
    { "key": "female", "label": "女生" },
    { "key": "total", "label": "合計" }
  ]
}
```

## 欄位規則

- `schemaVersion` 必須與 manifest 一致。
- `levelCode` 必須穩定，不應直接用 UI 文案當主鍵。
- `legacyLabels` 用於 P0/P1 對應現有 `educationLevel` 字串。
- `bands[].bandId` 必須在同一 `levelCode + dimensionType` 下唯一。
- `sortOrder` 決定前端顯示與 SQLite query ordering。

## 使用規則

- refresh 腳本以此 schema 決定 composition band 轉換與驗證。
- `build-atlas-sqlite.mjs` 在 P1 以同一份 schema 寫入 `school_compositions`。
- 前端 `SchoolCompositionChart`、分析面板與治理檢查不得自行硬編 band 定義。

## 驗證規則

- 每個 `studentCompositions` band 都必須能在 `grade-map.json` 找到對應 `bandId`。
- 不允許前端或腳本新增未出現在 schema 的 band。
- 若 schema 調整導致 band 消失，manifest 必須更新 `schemaVersion`。