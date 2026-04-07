# Contract: School Data And Slice Records

## 目的

此契約規範 summary、county detail、school-atlas 與 SQLite 查詢相容層共同依賴的學校資料欄位，確保 `school_level_id`、時間維度語義、地理 audit metadata 與 canonical ID 一致。

## 核心欄位

### SchoolEntity

```json
{
  "school_code": "013405",
  "primary_name": "某某完全中學",
  "aliases": ["某某中學"],
  "governance_notes": []
}
```

### SchoolLevelRecord

```json
{
  "school_level_id": "013405:junior-high",
  "school_code": "013405",
  "level_code": "junior-high",
  "education_level": "國中",
  "management_type": "公立",
  "county_code": "63000",
  "town_code": "6300400",
  "county_id_legacy": "臺北市",
  "township_id_legacy": "臺北市:大安區",
  "county_name": "臺北市",
  "township_name": "大安區",
  "coordinates": {
    "longitude": 121.543,
    "latitude": 25.033
  },
  "geographic_audit": {
    "coordinateSource": "gis-point",
    "boundaryResolutionMethod": "code-lookup",
    "countyCodeResolved": "63000",
    "townCodeResolved": "6300400",
    "manualReviewed": false,
    "auditNotes": []
  },
  "time_series": [
    {
      "year": 113,
      "students": 921,
      "valueStatus": "official"
    },
    {
      "year": 114,
      "students": null,
      "valueStatus": "missing"
    }
  ]
}
```

### SchoolCompositionFact

```json
{
  "school_level_id": "013405:junior-high",
  "year": 113,
  "dimension_type": "grade",
  "band_id": "g7",
  "band_label": "七年級",
  "male_students": 150,
  "female_students": 139,
  "total_students": 289,
  "source_status": "official"
}
```

## 契約規則

- `school_level_id` 是所有 slice、索引與 SQLite 的正式唯一鍵。
- `school_code` 代表學校主體，可關聯多個 `school_level_id`。
- `county_code` / `town_code` 為正式 canonical ID；`county_name` / `township_name` 僅作顯示用途。
- `time_series[].valueStatus` 必須明確表達 `official`, `estimated`, `zero`, `missing`, `year-not-applicable`。
- `geographic_audit` 必填，哪怕僅記錄 `gis-point` 與 `code-lookup`。

## 過渡期相容規則

- P0/P1 可同時輸出 `countyId` / `townshipId` 與 canonical code。
- P0/P1 前端讀取層需同時接受 `yearlyStudents` 舊欄位與 `time_series` 新欄位。
- P2 起停止使用僅靠中文名稱的識別欄位作為 join key。

## 驗證規則

- 同一 `school_code` 下允許多筆 `school_level_id`，但同一 `school_level_id` 不得重複。
- `SchoolCompositionFact.total_students` 加總需與對應 `time_series.students` 一致或被標記為 warning。
- `county_code` / `town_code` 必須能在 boundary 契約中找到對應實體。