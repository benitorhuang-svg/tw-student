# 分析資料契約

## 目的

定義互動教育分析儀表板的前端資料契約，讓正式資料刷新腳本、切片資料產物與前端元件可以在不重寫介面的前提下互換與演進。

## 型別契約

```ts
type RegionGroup = '北部' | '中部' | '南部' | '東部' | '離島'
type EducationLevel = '全部' | '國小' | '國中' | '高中職' | '大專院校'
type ManagementType = '全部' | '公立' | '私立'

type DataNote = {
  type: '停辦' | '缺年度' | '行政區改制' | '名稱異動' | '異常值' | '其他'
  message: string
  severity: 'info' | 'warning' | 'critical'
  years?: number[]
}

type TrendRecord = {
  year: number
  students: number
  isEstimated?: boolean
  isMissing?: boolean
}

type SchoolRecord = {
  id: string
  code: string
  name: string
  countyId: string
  townshipId: string
  educationLevel: Exclude<EducationLevel, '全部'>
  managementType: Exclude<ManagementType, '全部'>
  address: string
  phone: string
  website: string
  profileUrl?: string
  coordinates: {
    longitude: number
    latitude: number
  }
  yearlyStudents: TrendRecord[]
  status?: '正常' | '停辦' | '整併' | '待確認'
  missingYears?: number[]
  dataNotes?: DataNote[]
}

type TownshipRecord = {
  id: string
  name: string
  countyId: string
  schools: SchoolRecord[]
  dataNotes?: DataNote[]
}

type CountyRecord = {
  id: string
  name: string
  shortLabel: string
  region: RegionGroup
  towns: TownshipRecord[]
  dataNotes?: DataNote[]
}

type ShareState = {
  year?: number
  level?: EducationLevel
  management?: ManagementType
  region?: RegionGroup
  county?: string
  town?: string
  q?: string
}
```

## 行為契約

- 所有彙總都必須先套用篩選條件後再計算。
- 相同篩選狀態必須產生可重現、決定性的聚合結果。
- 當分析範圍由縣市回到全台時，必須清除不相容的鄉鎮與學校選取狀態。
- 當分析範圍切換到另一個縣市時，原本屬於舊縣市的鄉鎮與學校選取狀態必須被清除。
- URL 查詢參數與內部篩選狀態必須可雙向轉換。
- 深層細節切片資料必須按需載入，不得假設所有資料都已預先在記憶體中。

## 呈現契約

- 每個分析摘要卡都必須顯示目前年度學生數、學校數與年變化。
- 每個趨勢圖都必須使用完整追蹤年度序列，並標示目前學年度。
- 每個地圖區塊都必須能對應到名稱、學生數與必要的異常提示。
- 若某範圍或學校存在 `dataNotes`，UI 必須有可顯示這些註記的空間與元件。

## 資料產物契約

- 地理資料可以使用 GeoJSON 或 TopoJSON，但屬性欄位命名必須穩定。
- 所有 `.json` 與 `.topo.json` 產物都必須以多行格式輸出。
- 若資料被切片，前端仍需能透過穩定 ID 將縣市、鄉鎮與學校資料重新串接。