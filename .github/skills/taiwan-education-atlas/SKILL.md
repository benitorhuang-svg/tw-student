---
name: taiwan-education-atlas
description: 維護台灣學生數互動地圖專案時，處理正式資料切片、TopoJSON 邊界、URL 深連結、異常註記與視覺儀表板的實作規範。
---

# Taiwan Education Atlas

此 Skill 用於 Student Counting Analysis TW 專案的日常維護與擴充，聚焦在正式資料驅動的前端探索體驗。

## 何時使用
- 調整 frontend/src/App.tsx 的篩選流程、URL query state、scope drill-down。
- 修改 frontend/scripts/refresh-official-data.mjs 的資料刷新與靜態產物生成。
- 更新 county 或 township 邊界載入策略、TopoJSON 解碼與 lazy load。
- 新增資料註記，例如缺年度、停辦、整併、行政區改制差異。
- 優化互動地圖、排行面板、學校洞察與正式資料說明。

## 專案基線
- 前端堆疊：React 19、TypeScript、Vite。
- 正式資料來源：教育部統計處校別統計、教育 GIS 點位、內政部國土測繪中心行政區界線。
- 行政區座標系：WGS84 經緯度。
- 產物策略：以靜態 JSON 與 TopoJSON 切片為主，不預設引入本地資料庫。

## 工作準則
- 先更新 SDD 規格，再修改程式碼；規格文件一律使用繁體中文。
- 優先減少首次載入量：縣市界線使用 TopoJSON，鄉鎮界線依縣市切片 lazy load。
- JSON 產物必須使用多行格式輸出，避免單行壓縮檔難以檢視。
- URL 狀態至少同步學年度、教育階段、縣市、鄉鎮；若已存在其他篩選，也應一併同步。
- 對正式資料異常保持透明，使用結構化 dataNotes/status/missingYears，而不是只在 UI 寫死文案。
- 地圖改版時參考 local_view.html 的資訊密度與舞台感，但保留目前專案既有元件結構。

## 變更檢查清單
1. 若有改資料模型，同步更新 specs/001-interactive-edu-map/ 內的 spec、plan、data-model、contracts。
2. 若有改 refresh 腳本，重新執行 npm run data:refresh 並確認 public/data 輸出合理。
3. 若有改型別、UI 或載入流程，執行 npm run lint 與 npm run build。
4. 驗證 deep link：重整頁面後，縣市、鄉鎮、年份與教育階段需能從 URL 還原。
5. 驗證異常註記：至少能在縣市、鄉鎮或學校其中一層看到正式資料提示。

## 避免事項
- 不要重新改回一次載入全台鄉鎮 GeoJSON。
- 不要在未證明必要前加入 IndexedDB、SQLite 或本地 API 層。
- 不要讓資料欄位名稱只存在 UI，而沒有在型別與契約中定義。