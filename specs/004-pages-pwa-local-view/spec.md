# 規格：GitHub Pages、PWA 與 local_view 主版型改版

## 目標

- 以前端靜態站形式部署到 GitHub Pages。
- 將目前首頁改為以 `specs/local_view.html` 地圖舞台感為主的雙欄版型。
- 保留既有互動地圖、排行、學校表格、異常註記與深連結能力。
- 加入 PWA 基礎能力，支援安裝與靜態資產快取。

## 使用者故事

1. 作為一般訪客，我希望在 GitHub Pages 直接打開網站，不需要本機啟動伺服器。
2. 作為分析使用者，我希望首頁一打開就先看到地圖舞台、側欄篩選與重點排行，而不是多段式儀表板堆疊。
3. 作為回訪使用者，我希望網站可安裝為 PWA，並快取主要靜態資產與資料切片，降低再次進入等待時間。

## 驗收條件

- `vite build` 在 GitHub Actions 內可產出適用於 Pages 的靜態檔。
- `main` 分支推送後自動部署到 GitHub Pages。
- 首頁改為左側控制欄、右側主地圖舞台，視覺風格接近 `local_view.html`。
- 學校表格仍支援排序、匯出、單校焦點與既有測試 hook。
- 站點具有 manifest 與 service worker，可被安裝為 PWA。