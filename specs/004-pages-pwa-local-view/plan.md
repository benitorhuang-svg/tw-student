# 實作計畫

## 版型

- 重組 `App.tsx` 為 `sidebar + stage + content rail`。
- 保留現有資料與互動邏輯，只調整資訊層級與區塊編排。
- 讓地圖延續深色舞台、圖例浮層與觀測資訊，但避免擋住主地圖辨識。

## 平台

- 透過 `vite-plugin-pwa` 產生 manifest 與 service worker。
- 針對 GitHub Pages 設定 `base` 與 workflow 自動部署。

## 驗證

- 執行 `npm run lint`。
- 執行 `npm run build`。
- 執行 `npm run test:e2e` 驗證深連結、切片載入與異常註記未回歸。