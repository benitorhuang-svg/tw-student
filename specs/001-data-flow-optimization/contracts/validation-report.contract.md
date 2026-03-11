# Contract: validation-report.json

## 目的

`validation-report.json` 是每次資料刷新後的正式驗證產物，供維護者、部署流程與治理 UI 讀取。它必須指出錯誤類型、影響範圍、受影響資產與建議處置，而不只是單純終端機訊息。

## 檔案位置

- 正式輸出：`frontend/public/data/validation-report.json`

## JSON 結構

```json
{
  "generatedAt": "2026-03-10T14:30:00.000Z",
  "schemaVersion": "2026.03.p0",
  "overallStatus": "warning",
  "items": [
    {
      "ruleId": "manifest-hash-match",
      "severity": "blocking",
      "status": "pass",
      "scope": "manifest",
      "affectedAssets": ["manifest.json"],
      "affectedRecordCount": 0,
      "recommendedAction": "none"
    },
    {
      "ruleId": "missing-coordinates",
      "severity": "warning",
      "status": "warning",
      "scope": "summary",
      "affectedAssets": ["education-summary.json"],
      "affectedRecordCount": 18,
      "samples": [
        { "school_code": "123456", "county_code": "66000" }
      ],
      "recommendedAction": "檢查 GIS 點位、人工補點或地址解點結果"
    }
  ]
}
```

## 規則分類

### Blocking

- 主鍵重複
- manifest/hash 不一致
- 縣市或鄉鎮彙總錯誤
- composition 合計錯誤
- canonical ID 無法對應 boundary

### Warning

- 缺座標
- 估算值比例偏高
- legacy 欄位仍殘留
- 單一切片 bytes 異常膨脹

### Info

- SQLite 體積比較
- 本次變更資產數量
- schema 版本升級摘要

## 前端使用規則

- `DataGovernanceFlyout.tsx` 只呈現摘要與關鍵警示，不直接渲染全部原始 JSON。
- 若 `overallStatus=fail`，刷新完成後仍可使用 last-known-good 資料，但 UI 必須標示此次更新未正式採用。

## 發布規則

- `validation-report.json` 必須被 manifest 納入 `assets[]`。
- 若存在 blocking `fail`，資料刷新應中止正式發布或至少將 manifest 標示為不可採用版本。