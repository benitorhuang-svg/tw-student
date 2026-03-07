# 實作計畫：預產生 bucket、可搬移情境庫與分層式工作台 UI

## 實作範圍

1. 開發穩定性修正：保留穩定版 Vite 與 dev optimizer 設定，避免 `react-leaflet` 預打包錯誤回歸。
2. 資料產物升級：在 refresh 腳本中直接輸出縣市級 geohash bucket JSON，並將 bucket asset path / size 寫入摘要資料。
3. 地圖互動升級：低縮放使用 bucket 切片，高縮放使用單校點位，維持 viewport lazy render。
4. 比較情境升級：保留 URL query，同時加入重新命名、釘選、JSON 匯出 / 匯入與最近開啟管理。
5. 異常調查升級：保留單筆詳情與下載，新增依類型篩選後的整批匯出。
6. UI 升級：依探索數據文件加入 Macro / Regional / Micro 三層資訊導覽與更清楚的工作台分區。
7. 驗證：重新執行 install、data:refresh、lint、build、e2e，確認 deep link、資料切片與工作台互動未回歸。

## 設計原則

- 保留目前 top filter + left analytics + right map 的工作台結構。
- 新增的 URL query 不能破壞既有 `year`、`level`、`management`、`region`、`search`、`county`、`township` 還原。
- 點位分群改為在 refresh 階段預先輸出 bucket 切片，再依視窗過濾，避免每次拖曳都重算全部校點。
- 異常序列下載內容需直接對應正式資料欄位與年份，不用 UI 專用欄名替代。
- 情境 JSON 匯出 / 匯入以瀏覽器檔案操作完成，不引入新的後端或本地資料庫層。
