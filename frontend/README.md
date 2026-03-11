# Frontend — 臺灣教育 Atlas

React 19 + TypeScript 5.9 + Vite 7.3 PWA 前端工作台。

## 開發

```bash
npm install
npm run dev          # http://localhost:5173 — Vite 自動代理 backend/data
npm run build        # 產出 dist/ 含 PWA service worker
npm run lint         # ESLint
npm run test:e2e     # Playwright E2E
```

## 資料來源

開發模式下，`backendDataPlugin()` (定義於 `vite.config.ts`) 將 `../backend/data/` 底下的靜態資料以 `/data/*` 路徑代理至前端。Production build 時會自動複製至 `dist/data/`。

## 圖表元件

所有圖表為手刻 SVG，不依賴 D3/Recharts。共用基礎設定：

- `src/styles/data/charts/00-chart-foundations.css` — 色彩 token、動畫、空狀態
- `src/hooks/useChartAnimation.ts` — IntersectionObserver 進場動畫
