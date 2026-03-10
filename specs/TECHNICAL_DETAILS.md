# 技術規格與架構細節 (Technical Details)

## 1. 系統架構
- **技術棧**：React 19 + TypeScript + Vite。
- **資料層**：基於靜態資料切片 (Pre-sliced JSON/TopoJSON) 加上 `sql.js` (SQLite WASM) 進行前端查詢。
- **部署**：GitHub Pages 靜態交付，支援 PWA 離線能力。

---

## 2. 資料模型 (Data Model)

### 核心實體
- **County (縣市)**：`id`, `name`, `shortLabel`, `region` (北部/中部/南部/東部/離島)。
- **Township (鄉鎮市區)**：`id`, `name`, `countyId`。
- **School (學校)**：`id`, `code` (MOE 代碼), `name`, `educationLevel`, `managementType` (公/私), `coordinates`, `yearlyStudents` (TrendRecord 陣列)。
- **TrendRecord (趨勢)**：`year`, `students`, `isMissing`。

### 狀態管理 (AtlasAppState)
- 分離地理 Scope (全台/縣市/鄉鎮) 與單校聚焦狀態。
- **URL 同步**：同步 `year`, `level`, `management`, `county`, `township`, `zoom`, `lat`, `lon` 到查詢參數。

---

## 3. 資料分層與切片策略
1. **全台摘要層 (National Slice)**：載入首頁與地圖著色所需數值。
2. **縣市細節層 (County Slice)**：進入特定縣市後載入該區學校明細。
3. **校點分群層 (School Bucket Slice)**：依 Geohash 預先聚合，優化低縮放層級顯示效能。
4. **地理邊界層 (Boundary Slice)**：使用 TopoJSON 壓縮格式。

---

## 4. 研究決策 (Architecture Decisions)
- **ADR-001**: 不使用 SSR 框架 (Next.js)，維持純前端 SPA 降低維運成本。
- **ADR-002**: 優先使用靜態資料切片而非即時 API，以符合 GitHub Pages 部署環境。
- **ADR-003**: 使用雙軌狀態模型，確保搜尋學校代碼時能精準導航而不破壞行政區篩選邏輯。

---

## 5. 平台交付 (Platform Delivery)
- **GitHub Pages**: 使用自定義 domain 與自動化 Action 部署。
- **PWA**: 透過 `vite-plugin-pwa` 實作產物快取與離線存取。
- **SEO**: 針對教育分析關鍵字優化 Meta tags 與語意化 HTML。
