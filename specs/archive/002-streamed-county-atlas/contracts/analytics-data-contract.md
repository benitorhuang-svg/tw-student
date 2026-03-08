# 分析資料契約：串流版

## 摘要檔

```ts
type EducationSummaryDataset = {
  generatedAt: string
  years: number[]
  sources: {
    points: string
    statistics: string
    townshipBoundaries: string
    countyBoundaries: string
  }
  counties: CountySummaryRecord[]
}

type CountySummaryRecord = {
  id: string
  name: string
  shortLabel: string
  region: '北部' | '中部' | '南部' | '東部' | '離島'
  townshipFile: string
  detailFile: string
  previewNotes?: DataNote[]
  summaryTrend: TrendRecord[]
}
```

## 細節檔

```ts
type CountyDetailDataset = {
  county: {
    id: string
    name: string
    shortLabel: string
    region: '北部' | '中部' | '南部' | '東部' | '離島'
  }
  dataNotes?: DataNote[]
  towns: TownshipRecord[]
}
```

## 行為契約

- 前端啟動時只保證摘要檔存在於記憶體。
- `county` 或 `township` URL 參數存在時，前端必須主動補載對應縣市細節檔。
- 鄉鎮與學校層聚合只能在縣市細節載入完成後計算。
- `dataNotes`、`status`、`missingYears` 在摘要檔與細節檔之間不得語意漂移。
- 所有資料檔維持 prettified JSON，欄位命名穩定。