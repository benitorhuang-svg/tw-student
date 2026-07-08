# 專案稽核與優化建議

稽核日期：2026-07-07
範圍：根目錄 workspace、`frontend/`、`backend/`、`infra/`、`docs/specs/` 與主要資料/PWA/測試路徑。
驗證方式：稽核階段先以檔案讀取、狀態盤點與靜態分析完成；後續 DDD 深度優化已執行 `npm.cmd run lint -- --fix`、`npm.cmd run lint`、`npm.cmd run build` 與本機 HTTP smoke check。未執行 `npm run test:e2e`、`npm run data:refresh` 或 Docker build。
工作樹狀態：目前已有大量既有變更，包含舊 `services/*` 刪除、新 `frontend/` / `backend/` 未追蹤、`README.md` / `package.json` / `.gitignore` 已修改；本文件只新增稽核結果，不處理既有變更。

## 2026-07-08 DDD/FSD 收斂狀態

- 前端 source 已收斂為 `app` / `domains` / `shared` / `types` 四個入口層，沒有舊式 root `components`、`hooks`、`lib`、`data`、`layouts`、`styles` 目錄回流。
- Atlas map UI 已由 `shared/ui/components/map` 移至 `domains/atlas/ui/map`；Atlas filters/tabs/footer/governance styles 也移至 `domains/atlas/ui/styles`。
- Education school detail/table workflow 與 school panel styles 由 `domains/education/ui` 擁有。
- Analytics chart/overview/county wrapper UI 與對應 CSS 由 `domains/analytics/ui` 擁有。
- `shared/ui/core` 只保留可跨 domain 使用的 generic primitives；`shared/api/data` 保留為外部資料 gateway，因為 `educationData` / SQLite / manifest 類型同時被 app orchestration 與多個 domain 使用，搬進單一 domain 會製造反向依賴。
- 新增 `npm.cmd --workspace frontend run lint:architecture`，檢查 layer 邊界、domain Public API、跨層相對 import、shared UI business leakage、import cycle 與 main reachability。
- 清掉 root/backend 的一次性 scratch/fix/check/old 暫存檔，backend 正式資料管線維持 `backend/scripts/refresh-official-data.mjs` + `backend/scripts/lib/*` 結構。

## 1. 專案基本資訊

- 專案名稱：`student-counting-analysis-tw`
- 套件管理：npm workspaces，root `package.json` 宣告 `frontend`、`backend` 兩個 workspace。
- 前端技術棧：React 19、TypeScript 5.9、Vite 7、vite-plugin-pwa、Leaflet / React Leaflet、Leaflet VectorGrid、SQL.js、TopoJSON。
- 後端/資料技術棧：Node ESM 腳本、SQL.js、shpjs、topojson-server/client、xlsx；主要責任是下載/轉換官方教育與邊界資料，輸出 SQLite 與 manifest。
- 部署設定：`infra/cloudbuild.yaml` 建 Docker image 後部署 Cloud Run；`infra/firebase.json` 將 Firebase Hosting rewrite 到 Cloud Run `tw-student-atlas`。
- 主要指令：
  - `npm install`
  - `npm run dev` -> `npm run dev -w frontend`
  - `npm run build` -> `npm run build -w frontend`
  - `npm run lint` -> `npm run lint -w frontend`
  - `npm run test:types` -> 目前 root script 有宣告，但 `frontend/package.json` 沒有對應 `test:types`
  - `npm run data:refresh` -> `npm run data:refresh -w backend`
  - `npm run test:e2e -w frontend`
  - `npm run audit:lighthouse -w frontend`

## 2. 專案目錄結構

```text
tw-student/
├── backend/
│   ├── package.json
│   └── scripts/
│       ├── refresh-official-data.mjs
│       └── lib/                  # 資料下載、邊界處理、SQLite、manifest、validation builder
├── frontend/
│   ├── package.json
│   ├── vite.config.ts            # /data dev server plugin、PWA、chunk、cache 設定
│   ├── playwright.config.ts
│   ├── lighthouserc.json
│   └── src/
│       ├── app/                  # layout、providers、store、全域 styles
│       ├── domains/              # atlas、education、scenario、analytics
│       ├── shared/               # api、workers、ui、lib
│       └── types/
├── docs/
│   ├── frontend-architecture.md
│   └── specs/                    # data flow、chart、map UX 等規格與任務
├── infra/
│   ├── Dockerfile
│   ├── cloudbuild.yaml
│   ├── deploy-to-gcp.ps1
│   └── firebase.json
├── package.json
└── package-lock.json
```

已略過 `node_modules`、`dist`、`build`、`.git`。目前實際輸出資料存在 `backend/dist`，前端建置後會複製到 `frontend/dist/data`；文件與部分 infra 仍有舊 `services/`、`data/` 或 `frontend/public/data` 敘述，需同步。

## 3. 核心功能推測

以下是依原始碼與文件推測的產品能力：

- 臺灣教育資料互動 Atlas：以地圖、縣市/鄉鎮/學校下鑽、圖表、排名與趨勢呈現學生數資料。
- 離線/靜態資料優先：正式資料被整合為 `education-atlas.sqlite`，前端用 SQL.js / Web Worker 查詢，再透過 PWA cache 提供離線能力。
- 資料治理：manifest、content hash、validation summary、資料更新狀態與治理 flyout 已存在。
- 地圖效能路徑：Leaflet `preferCanvas` 已開啟，邊界 TopoJSON decode、SQLite summary/detail/bucket mapping、canvas/township collision 等多個重工作已移到 worker。
- 深連結與狀態同步：URL query 可帶 `county`、`school`、`tab`、`zoom`、`lat/lon`、`vectorTiles` 等狀態。
- 視覺與可及性優化已做過多輪：`docs/specs/002-*`、`003-*` 記錄了 chart token、responsive SVG、keyboard/focus、dark theme 與 screenshot baseline 工作。

## 4. 架構分析

前端入口是 `frontend/src/main.tsx`，啟動 React 後延後呼叫 `warmAtlasRuntime()`。`frontend/src/App.tsx` 負責資料載入、狀態組裝、URL/vector tile 設定、地圖元素 memo 化、桌面/手機 layout 分流；它目前約 302 行，是主要 orchestration 熱點。

狀態層已拆成 `app/store` 與 `app/providers`：`useAtlasAppState()` 聚合 filter/navigation/comparison/interaction state；`useEducationData()`、`useAtlasDerivedState()` 與 `useAtlasOrchestration()` 集中資料載入、derived state、scenario actions、URL sync、prefetch 與搜尋導覽。data/derived 子 hooks 已收回 `app/providers/data` 與 `app/providers/derived`。方向合理，但大型 prop drilling 仍集中在 `App.tsx`、`DesktopAppLayout.tsx`、`MobileAppLayout.tsx`、`MapCanvas.tsx`。

資料流已從早期 JSON 切片逐步轉成 SQLite 主路徑。`backend/scripts/refresh-official-data.mjs` 下載官方資料與邊界、產生 SQLite buffer、manifest 與 validation summary；`frontend/vite.config.ts` 的 `backendDataPlugin()` 在 dev 以 `/data/*` 代理 `backend/dist`，build 時複製到 `frontend/dist/data`。

PWA 設定集中於 `frontend/vite.config.ts`，包含 auto update、manifest、navigate fallback denylist、Google Fonts runtime cache、`/data/*.json|sqlite` runtime cache、map tile runtime cache。`maximumFileSizeToCacheInBytes` 設為 50 MB，而目前 `backend/dist/education-atlas.sqlite` 約 43.8 MB，已接近單檔上限。

架構文件要求 DDD/FSD 與 Domain Public API。後續優化已補上 ESLint 守門：禁止 external deep domain import、禁止 `shared` 依賴 `domains/app`、禁止 `domains` 反向依賴 `app`、禁止 domain 互相 import，並把 analytics/atlas identity/type/investigation/scenario persistence 等共用 kernel 下沉到 `shared`，同時移除 `shared/lib/hooks/app` 這個 app 職責殘留。

測試層以 Playwright E2E 為主，現有 5 個 e2e 檔案主要覆蓋深連結、縣市 marker、嘉義/台中互動與 CPU profile。`frontend/playwright.config.ts` 的 webServer 使用 `npm run dev -- --port 4173`，不是 production preview；`lighthouserc.json` 則使用 preview server，但 assertion 多為 warning。

## 5. 目前風險

已處理 - 部署路徑漂移：`infra/Dockerfile` 已改用 root npm workspace，安裝 root / frontend / backend package、執行 `npm run data:refresh` 與 `npm run build`，並從 `/app/frontend/dist` 複製產物。

已處理 - SQLite 強制刷新可能查到舊資料：已補上 SQLite worker reset/terminate 路徑，`resetAtlasSqliteCache()` 會重建 worker 狀態，避免資料 manifest 更新後 UI 清了 React cache 但仍向舊 worker DB 查詢。

已處理 - repo hygiene 與版本控制成本：舊 `services/`、root `data/`、`.vite-cache/` 與 `.firebase` hosting cache 已從 Git index 移除，`.gitignore` / `.dockerignore` / `.gcloudignore` 已補上 root workspace 與本機產物規則。

P1 - CI 缺口：目前沒有 `.github/workflows/*.yml`；`docs/gcp-artifact-registry.md` 提到 workflow 已加入，但實際只看到 `.github/extensions/auto-npm-workflow/extension.mjs`。缺少固定的 lint/build/e2e/data artifact 驗證守門。

P1 - 測試與實際 production 路徑不同：Playwright 用 dev server，無法覆蓋 Vite build chunk、PWA generated assets、`dist/data` 複製、Nginx gzip/static cache 等 production 行為。Lighthouse 有 preview 路徑，但目前只是 warning。

P1 - 歷史 spec 漂移：README 與 `frontend/README.md` 已更新為 root workspaces + `backend/dist` + Vite copy；`docs/specs/001-*` 仍保留早期 `frontend/public/data` / root `data` 靜態資產敘述，後續若要把 spec 當目前契約，需另行更新。

已處理 - DDD/FSD 架構守門：已補上 ESLint 分層規則，禁止 external deep domain import、禁止 `shared` 依賴 `domains/app`、禁止 `domains` 反向依賴 `app`、禁止 domain 互相 import；shared UI 需要 domain UI 時改由上層注入 slot，未使用的 scenario 舊面板已移除。

P2 - 效能邊界需持續量測：SQLite 約 43.8 MB，PWA cache 上限設 50 MB；`warmAtlasRuntime()` 會預熱 SQL engine 與 database bytes。這對桌機可接受，但低記憶體手機、冷啟動或 Service Worker cache 壓力需要 production 指標守門。

P2 - 資料刷新可重現性：後端腳本對 MOE/NLSC/ArcGIS 有 retry 和 fallback URL，但沒有 timeout、固定 fixture 或來源快取層。外部服務慢或格式漂移時，`data:refresh` 的失敗定位會偏難。

## 6. 優化建議

立即處理：

- 已修 `infra/Dockerfile` 與 Cloud Build 路徑：部署使用 root npm workspace，build stage 會執行 `npm ci`、`npm run data:refresh`、`npm run build`，再從 `frontend/dist` 複製產物。
- 已補 SQLite worker reset：`resetAtlasSqliteCache()` 會重建 worker 狀態，build 後 SQLite worker client 也維持獨立 chunk。
- 已清理被追蹤的 generated/dependency artifacts：`services/`、舊 `data/`、`.vite-cache/`、`.firebase` hosting cache 不再留在 Git index，並由 ignore 規則守門。
- 建立最低 CI：`npm ci`、`npm run lint`、`npm run build`、production preview E2E、資料產物 smoke check。先以小而穩定為主。
- 更新 README 與 spec 的現況路徑，把 `backend/dist`、Vite `/data` plugin、Cloud Run/Firebase 流程寫成唯一版本。

中期重構：

- 持續收斂 Public API：目前 ESLint 已限制 external deep domain import 與 shared/app/domain 反向依賴；後續若新增 bounded context，需同步更新例外與 public API 規約。
- 拆 `App.tsx` 的責任：將 data gate、map props assembly、desktop/mobile props adapter 拆成小 hook 或 adapter，降低每次調整都碰 root component 的風險。
- 拆 `MapCanvas.tsx` 內 mobile/desktop overlay inline style，將固定尺寸/定位移到 CSS class，讓 mobile layout 可用 screenshot regression 守住。
- 把 worker message protocol 型別化，降低目前多處 `any`、`postMessage` shape 漂移造成的錯誤。
- 補資料建置契約測試：manifest hash、SQLite meta、validation summary、boundary coverage、幾筆代表學校/縣市查詢，先不用完整重跑外部下載。

長期方向：

- 建立 production performance budget：SQLite bytes、first data ready、main-thread blocking、map pan/zoom FPS、PWA cache hit/miss，都用 Lighthouse/Playwright trace 或自訂指標保存。
- 若手機冷啟動仍吃緊，再評估 county progressive loading、viewport school index、vector tile baseline precache；不要在未量測前大改成新渲染引擎。
- 資料刷新加入來源快取/fixture 模式，讓外部來源不可用時仍可跑契約測試與 CI。
- 逐步把治理/圖表/地圖 CSS 的超大檔拆成更小、可命名的 feature CSS，並刪除實驗殘留檔如 `mobile-map-optimized.css_new.css`。

## 7. 下一步任務建議

1. 修正 Cloud Run Docker build 路徑
   - 目標：讓 `infra/Dockerfile` 與目前 root workspaces 對齊。
   - 範圍：`infra/Dockerfile`、必要時 `infra/cloudbuild.yaml`。
   - 驗收：Docker build 不再引用 `services/frontend`；產物來自 `frontend/dist`；`backend/dist` 資料會被 build 流程複製到前端 `dist/data`。
   - 驗證命令：`docker build -f infra/Dockerfile -t tw-student-atlas:local .`

2. 修正 SQLite worker force refresh
   - 目標：確保資料更新後不會繼續查詢舊 DB。
   - 範圍：`frontend/src/shared/api/data/sqlite/sqliteWorkerClient.ts`、`frontend/src/shared/api/workers/sqlWorker.ts`、`frontend/src/shared/api/data/atlasSqlite.ts`。
   - 驗收：`resetAtlasSqliteCache()` 會重置 worker/init promise；`forceRefresh` 會抓新的 `education-atlas.sqlite?refresh=...`；worker 可 close old DB 後重建。
   - 驗證命令：`npm.cmd run lint -- --fix && npm.cmd run lint && npm.cmd run build`

3. 清理 git 追蹤中的舊產物
   - 目標：移除已被追蹤的 `services/*node_modules*`、舊 `data/*.sqlite`、舊 manifest 等生成/依賴檔。
   - 範圍：git index、`.gitignore`、必要的 README 說明。
   - 驗收：`git ls-files` 不再列出 node_modules、舊 `services/` 依賴樹或 root `data/education-atlas.sqlite`；工作樹 diff 可讀。
   - 驗證命令：`git ls-files | rg "(node_modules|^services/|^data/.*sqlite|^data/manifest\\.json)"`

4. 建立 production preview E2E 與 CI baseline
   - 目標：補上會檢查真實 build 產物的守門。
   - 範圍：`frontend/playwright.config.ts`、`frontend/package.json`、`.github/workflows/ci.yml`。
   - 驗收：保留 dev E2E 或新增 `test:e2e:prod`；CI 至少跑 `npm ci`、`npm run lint`、`npm run build`、production preview E2E。
   - 驗證命令：`npm.cmd run build && npm.cmd run test:e2e -w frontend`

5. 更新現況文件與資料路徑契約
   - 目標：讓 README/spec 與目前 `backend/dist` + Vite `/data` plugin + workspace 結構一致。
   - 範圍：`README.md`、`frontend/README.md`、`docs/specs/001-data-flow-optimization/*` 中與現況衝突的路徑段落。
   - 驗收：文件不再把 `services/`、root `data/` 或 `frontend/public/data` 描述為目前主路徑；保留歷史遷移脈絡但標明已過時。
   - 驗證命令：`rg -n "services/|frontend/public/data|repo-root data|root data|data/" README.md frontend/README.md docs/specs/001-data-flow-optimization`
