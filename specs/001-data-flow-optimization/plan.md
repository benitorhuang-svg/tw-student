# Implementation Plan: 資料流程優化與差異刷新

**Branch**: `[001-data-flow-optimization]` | **Date**: 2026-03-10 | **Spec**: `/specs/001-data-flow-optimization/spec.md`
**Input**: Feature specification from `/specs/001-data-flow-optimization/spec.md`

## Summary

本功能以維持 `frontend/public/data/` 靜態切片策略為前提，新增獨立 `backend/` 資料處理工作區，將 refresh/build pipeline 與前端 UI 消費職責拆開。P0 先完成 `backend/` 建置入口、`manifest.json`、`schema/grade-map.json`、資料契約鋪底、差異刷新流程與 UI 版本顯示；P1 將 SQLite 改為正規化主路徑，移除重複 `payload_json`、補上 `school_compositions` 並建立查詢相容層；P2 再把行政區 canonical ID 擴展為所有邊界與切片的正式主鍵，並有計畫地淘汰舊契約。

此計畫直接對應目前 repo 的六個關鍵落點：`backend/scripts/refresh-official-data.mjs` 負責輸出 manifest、schema 與驗證報告；`backend/scripts/lib/*.mjs` 承接邊界、正式資料與 SQLite 建置；`frontend/src/hooks/useEducationData.ts` 接管差異刷新狀態機；`frontend/src/data/atlasSqlite.ts` 提供 P1 查詢相容層；`frontend/src/components/DataGovernanceFlyout.tsx` 顯示本地版本、遠端版本、更新摘要、驗證與回退訊息；root scripts 負責串接前後端工作區命令。

## Technical Context

**Language/Version**: TypeScript 5.9、React 19.2、Vite 7、Node.js 20+、ESM 腳本  
**Primary Dependencies**: React 19、sql.js 1.14、csv-parse、shpjs、topojson-client、topojson-server、vite-plugin-pwa、Playwright、ESLint  
**Storage**: `frontend/public/data/` 下的多行 JSON / TopoJSON / SQLite 靜態資產，搭配瀏覽器 memory cache、Cache API、Service Worker 快取  
**Testing**: `npm run lint`、`npm run build`、`npm run test:e2e`、資料刷新後的自動驗證報告與手動 quickstart 驗證  
**Target Platform**: GitHub Pages 風格的靜態 PWA，支援桌面與行動瀏覽器；資料刷新與建置在 Windows / Node 環境執行  
**Project Type**: 靜態 Web 應用程式 + 前端資料建置管線  
**Performance Goals**: 首次載入體積不可顯著增加；P0 後重新載入部署資料只下載變更切片；P1 後 SQLite 體積相較現況明顯下降並量測記錄  
**Constraints**: 不新增常駐後端 API；保持 `public/data/` 為主要交付；`backend/` 只負責資料處理與建置；JSON 必須多行可讀；P0-P2 期間需支援新舊契約共存與局部回退  
**Scale/Scope**: 全台 22 縣市、8 個學年度、縣市 detail/bucket/school-atlas/township 邊界切片與一份全台 SQLite；同時涵蓋部署刷新、治理 UI、資料契約與遷移設計

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate

- `互動探索優先`: PASS。此次調整不改變全台 → 縣市 → 鄉鎮 → 學校的下鑽路徑，只在治理面板補充版本、驗證與更新結果。
- `先更新規格，再進行實作`: PASS。此 feature 先完成 `spec.md`、`plan.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md` 後才進入實作。
- `正式資料可追溯與異常透明`: PASS。manifest、schema、validation report、地理 audit metadata 與時間維度語義會寫入正式契約，不只存在腳本內部。
- `效能優化必須可驗證`: PASS。計畫包含 manifest/hash 驗證、SQLite 體積比較、差異刷新下載量與回退驗證。
- `邊界清楚，優先靜態交付`: PASS。所有變更都建立在現有靜態資產與前端快取，`backend/` 只作為 build workspace，不新增 API 層。
- `所有規格文件以繁體中文為準`: PASS。

### Post-Design Gate

- PASS。Phase 1 設計仍維持靜態交付與互動主路徑，未引入違反憲章的新基礎設施。
- PASS。SQLite 正規化僅作為前端離線/查詢層優化，不替代 `public/data/` 靜態資產策略。
- PASS。所有遷移都定義相容與回退方案，沒有要求使用者手動清空所有本地資料。

## Project Structure

### Documentation (this feature)

```text
specs/001-data-flow-optimization/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── manifest.contract.md
│   ├── schema-grade-map.contract.md
│   ├── school-data.contract.md
│   ├── sqlite.contract.md
│   └── validation-report.contract.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── package.json
└── src/
    ├── refresh-official-data.mjs
    ├── config/
    ├── pipeline/
    │   ├── build-atlas-sqlite.mjs
    │   ├── build-boundary-files.mjs
    │   ├── build-official-dataset.mjs
    │   └── build-validation-report.mjs
    └── shared/
        ├── build-grade-map.mjs
        ├── build-manifest.mjs
        ├── hash-file.mjs
        └── refresh-helpers.mjs
frontend/
├── public/
│   └── data/
│       ├── buckets/
│       ├── counties/
│       ├── school-atlas/
│       ├── townships/
│       ├── area-coordinate-lookup.json
│       ├── county-boundaries.topo.json
│       ├── education-atlas.sqlite
│       └── education-summary.json
├── src/
│   ├── components/
│   │   └── DataGovernanceFlyout.tsx
│   ├── data/
│   │   ├── atlasBoundaries.ts
│   │   ├── atlasSqlite.ts
│   │   ├── educationData.ts
│   │   └── educationTypes.ts
│   └── hooks/
│       └── useEducationData.ts
└── tests/
    └── e2e/
```

**Structure Decision**: 採 `frontend/` Web app + `backend/` 資料處理工作區的雙工作區結構。`backend/` 專責官方資料刷新、切片建置、SQLite 與治理產物輸出，目標輸出仍落在 `frontend/public/data/`；`frontend/` 只保留資料讀取、快取協調與 UI 元件。

## Implementation Workstreams

### Workstream A: Backend 工作區與靜態資料契約鋪底（P0）

- 建立 `backend/` 工作區，將 `refresh-official-data.mjs` 與建置 helper 自 `frontend/scripts/` 遷移到 `backend/scripts/`。
- 在 `backend/scripts/refresh-official-data.mjs` 新增 manifest、schema、validation report 寫出流程。
- 在 `frontend/public/data/schema/` 新增 `grade-map.json`，將學制、年級、學位、班別 band、性別維度收斂為單一來源。
- 在 `frontend/src/data/educationTypes.ts` 與讀取層補上 manifest、schema、時間維度語義與 audit metadata 型別。
- 在 `frontend/src/hooks/useEducationData.ts` 改為 manifest 驅動的差異刷新，不再暴力清空所有快取。
- 在 `frontend/src/components/DataGovernanceFlyout.tsx` 顯示本地版本、遠端版本、schema 版本、更新摘要與局部失敗回退結果。

### Workstream B: SQLite 正規化與查詢相容層（P1）

- 在 `backend/scripts/lib/build-atlas-sqlite.mjs` 新增 `school_compositions` 等正規化表，停止把 summary/detail/bucket 以整份 `payload_json` 作為預設主儲存。
- 在 `frontend/src/data/atlasSqlite.ts` 建立查詢相容層，以 SQL 查詢組裝既有 `EducationSummaryDataset`、`CountyDetailDataset`、`CountyBucketDataset` 形狀，減少 UI 變更面。
- 將 `school_level_id` 與時間維度語義擴充到 SQLite 與前端資料模型，消除完全中學覆寫風險。

### Workstream C: Canonical ID 與舊契約淘汰（P2）

- 在 `backend/scripts/lib/build-boundary-files.mjs` 與 `backend/scripts/lib/build-official-dataset.mjs` 明確雙寫 `countyCode` / `townCode` 與顯示名稱，先保留舊欄位映射再逐步退場。
- 讓 boundary、summary、detail、school-atlas、bucket、SQLite 全面改用 canonical ID 互相對應。
- 於 P2 驗證穩定後，移除只靠中文名稱或僅以 `school_code` 識別的舊路徑。

## Phase Delivery Plan

| Phase | 目標 | 主要修改區域 | 交付物 | 驗收門檻 |
|------|------|--------------|--------|----------|
| P0 | 建立 backend 工作區、版本辨識、共用 schema、資料契約鋪底與差異刷新 | `backend/scripts/refresh-official-data.mjs`, `backend/scripts/lib/*`, `educationTypes.ts`, `useEducationData.ts`, `DataGovernanceFlyout.tsx` | `backend/` workspace、`manifest.json`, `schema/grade-map.json`, `validation-report.json`, UI 版本顯示 | manifest/hash 一致、未變更切片不重抓、局部更新可回退 |
| P1 | 完成 SQLite 去重與 `school_compositions` 落地 | `backend/scripts/lib/build-atlas-sqlite.mjs`, `atlasSqlite.ts`, 必要型別與查詢層 | 正規化 SQLite、查詢相容層、體積比較紀錄 | 查詢結果與舊版一致、SQLite 體積下降、composition 可直接查詢 |
| P2 | 收斂 canonical ID 與淘汰舊契約 | `backend/scripts/lib/build-boundary-files.mjs`, `backend/scripts/lib/build-official-dataset.mjs`, `educationTypes.ts`, 各切片讀取/轉接處 | 全資產 canonical ID、舊欄位淘汰清單、相容映射移除 | 邊界/切片/SQLite 對 ID 一致，深連結與治理 UI 無回歸 |

## Migration Strategy

### P0 Migration

- 採雙軌輸出：保留現有 `education-summary.json`、`counties/*.json`、`buckets/*.json`、`school-atlas/*.json`、`education-atlas.sqlite`，新增 `manifest.json`、`schema/grade-map.json`、`validation-report.json`，並先以相容 wrapper 保持 root / frontend 指令可呼叫新的 `backend/` 入口。
- `useEducationData.refreshData()` 先讀遠端 manifest，再比對本地 manifest；只有 hash 改變的資產才強制 refresh。若 manifest 缺失或不合法，退回既有全量 refresh 邏輯，但不刪除最後成功版本的本地快取。
- UI 先顯示版本資訊與更新摘要，不改變主要探索流程。

### P1 Migration

- SQLite builder 先雙寫新表與舊 view，一個短週期內由 `atlasSqlite.ts` 以 feature flag 或偵測式查詢優先讀新表，查無再回退 view。
- `school_level_id` 與 `school_compositions` 成為前端主要查詢來源，但資料 shape 維持與現行 hook/元件相容，避免大面積改 UI。
- 以資料庫體積、查詢結果與 build 驗證報告作為切換 gate；確認穩定後停止寫入舊 `payload_json` view。

### P2 Migration

- 邊界與切片先雙寫 `countyId/townshipId` 與 `countyCode/townCode` 的對照欄位，前端讀取層先接受兩者，再逐步以 canonical ID 為唯一鍵。
- 深連結、快取鍵、SQLite 主鍵與治理報表統一改用 canonical ID，中文名稱僅保留顯示用途。
- 在至少一次完整資料刷新、build、lint、e2e 與手動驗證通過後，移除舊欄位與相容轉接。

## Validation Strategy

- 在 `refresh-official-data.mjs` 尾端加入驗證階段，輸出 `validation-report.json` 與 console 摘要。
- 驗證規則分為 `blocking` 與 `warning`：主鍵衝突、manifest/hash 不一致、縣市或鄉鎮彙總錯誤、composition 合計錯誤列為阻擋；缺座標、地理解析可信度不足、估算值比例偏高列為警示。
- 每個驗證項目需記錄規則名稱、嚴重度、影響資產、影響筆數、代表 sample、建議處置。
- P0 驗證 manifest/schema 契約與差異刷新；P1 增加 SQLite 體積比較、composition 行數與查詢一致性；P2 增加 canonical ID 覆蓋率與舊欄位殘留檢查。

## Testing Strategy

- 靜態檢查：每個 phase 皆執行 `npm run lint`、`npm run build`。
- 資料建置：每次調整 `refresh-official-data.mjs` 或 `build-atlas-sqlite.mjs` 後執行 `npm run data:refresh`，確認輸出的 manifest、schema、validation 與 SQLite 正常。
- 合約測試：以固定 fixture 或 build 後抽樣檢查 `manifest.json`、`schema/grade-map.json`、`validation-report.json`、SQLite schema 是否符合本 feature contracts。
- 整合測試：檢查 `useEducationData` 在「無變更」「部分切片變更」「manifest 損毀」「單一切片下載失敗」四種情境的狀態轉移與快取回退。
- E2E：使用既有 Playwright 流程補上資料治理面板版本顯示、刷新按鈕、局部失敗提示與完全中學查詢結果不覆寫。
- 手動回歸：依 quickstart 驗證 desktop/mobile、深連結、縣市/鄉鎮下鑽、治理面板與離線重新整理場景。

## Rollback Strategy

- 前端保留最後一份成功載入的本地 manifest 與其對應快取；若遠端 manifest 或單一切片下載失敗，僅回退受影響資產並在 UI 顯示部分更新失敗。
- P1 在移除 `payload_json` 前至少保留一版雙寫/雙讀期間；若新查詢層結果異常，可立即回切使用舊 view。
- P2 在 canonical ID 全面切換前保留名稱對照與 legacy lookup；若某縣市 mapping 失敗，可先回退該縣切片生成，而不阻斷其他縣市發布。
- 發布層面保留上一版 `public/data/` 產物作為 last-known-good 基線，必要時整批回滾資產與 manifest。

## Risks & Mitigations

| 風險 | 說明 | 緩解方式 |
|------|------|----------|
| manifest 與實際資產不同步 | 版本資訊正確但 bytes/hash 與實檔不一致會讓差異刷新誤判 | build 尾端重新讀檔回算 hash；不一致直接阻擋輸出 |
| P1 查詢相容層與舊結果不一致 | SQL 組裝可能漏掉現行 JSON 的衍生欄位 | 保留雙讀比對、將差異輸出到 validation report，再停寫舊 view |
| canonical ID 切換造成 deep link 或快取鍵斷裂 | 既有 URL 和本地快取以中文名稱或舊 id 為主 | P2 前先維持 legacy alias map；URL 解析同時接受新舊鍵 |
| backend 遷移期間路徑錯置 | build 腳本搬移後，輸出目錄與既有 npm scripts 容易失效 | 先建立 `backend/` wrapper 與共用 path config，確保輸出仍鎖定 `frontend/public/data/` |
| refresh 腳本複雜度上升 | 同時處理資料刷新、manifest、驗證與雙寫遷移 | 將 hashing、validation、schema 生成功能拆成 `backend/scripts/lib/` 可測試模組 |
| UI 顯示過多治理資訊干擾主流程 | 版本與驗證資訊若直接塞入主畫面會影響探索 | 限定於 `DataGovernanceFlyout` 與刷新狀態區呈現，主流程僅保留必要提示 |

## Complexity Tracking

本計畫沒有憲章違規項目，無需額外豁免。
