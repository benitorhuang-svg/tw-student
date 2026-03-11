# Tasks: 資料流程優化與差異刷新

**Input**: 設計文件來自 `/specs/001-data-flow-optimization/`
**Prerequisites**: `plan.md`、`spec.md`，以及已存在的 `research.md`、`data-model.md`、`contracts/`、`quickstart.md`

**Tests**: 本功能明確要求契約、資料驗證與 E2E 更新；各 phase 皆包含可直接執行的驗收任務。

**Organization**: 任務依 dependency-ordered 拆成 `P0 / P1 / P2`。`P0` 先建立 `backend/` 工作區，再把 manifest、schema、validation report、差異刷新與治理 UI 鋪底到可開工；`P1` 處理 SQLite 去重與查詢相容層；`P2` 完成 canonical ID 遷移與舊契約清理。

## Latest Status Snapshot

- `P0` 已完成：manifest/schema/validation artifacts、差異刷新、治理面板版本摘要與 E2E 驗證均已落地。
- `P1` 已完成：SQLite 正規化表、`school_compositions`、前端 SQL reconstruction path 與 parity validation 已落地，build 與 targeted E2E 已通過。
- `P2` 已完成 canonical 深連結主路徑：query hydrate、URL sync、compare scenario、school detail / school-atlas cache key 與 legacy alias rewrite 已切到 canonical `countyCode` / `townCode`，名稱鍵僅保留讀取相容。
- 2026-03-10 最新 refresh 結果：`validation-report.json` 已為 `overallStatus: pass`，`missing-coordinates` 收斂為 0，`education-atlas.sqlite` 約 32.4 MB。
- 2026-03-10 最新前端回歸範圍：E2E 已新增 canonical county/town deep-link、legacy URL rewrite，以及 SQLite-backed school detail/composition 驗證案例。
- 2026-03-11 起需補做前後端分離：將 `frontend/scripts/` 資料處理邏輯搬遷到獨立 `backend/` 工作區，前端僅保留靜態資產讀取與 UI。

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: 可平行進行（不同檔案、且不依賴未完成任務）
- **[Story]**: 對應 user story：`[US1]` 可信資料探索、`[US2]` 可稽核資料治理、`[US3]` 可管理部署更新
- 每個 task 皆內含：檔案範圍、驗收點、依賴關係

## P0: Backend 工作區、契約鋪底與差異刷新

**Goal**: 建立 `backend/` 資料處理工作區，讓 refresh pipeline 能輸出 `manifest.json`、`schema/grade-map.json`、`validation-report.json`，前端能以 manifest 驅動差異刷新，治理 UI 能顯示本地/遠端版本與刷新摘要。

**Independent Test**: 執行 `npm run data:refresh` 後，`frontend/public/data/manifest.json`、`frontend/public/data/schema/grade-map.json`、`frontend/public/data/validation-report.json` 皆生成；前端「重新載入部署資料」在無變更時不重抓既有切片，在部分資產失敗時保留 last-known-good 資料並於治理面板顯示摘要。

- [ ] T001 更新 `specs/001-data-flow-optimization/contracts/manifest.contract.md`、`specs/001-data-flow-optimization/contracts/schema-grade-map.contract.md`、`specs/001-data-flow-optimization/contracts/validation-report.contract.md`、`specs/001-data-flow-optimization/contracts/school-data.contract.md`、`specs/001-data-flow-optimization/contracts/sqlite.contract.md`、`specs/001-data-flow-optimization/quickstart.md`；驗收：契約明確定義 P0 的 `backend/` 工作區責任、manifest/schema/validation/refresh UI 欄位、回退規則與驗證命令；依賴：無
- [ ] T002 [P] 建立 `backend/package.json`、`backend/scripts/refresh-official-data.mjs` 與相容指令入口；驗收：root `npm run data:refresh` 可透過 `backend/` 工作區執行，且輸出仍落在 `frontend/public/data/`；依賴：T001
- [ ] T003 [P] 擴充 `frontend/src/data/educationTypes.ts`、`frontend/src/data/educationData.ts` 的 manifest/schema/validation/refresh summary 型別與載入介面；驗收：前端型別可表達本地版本、遠端版本、asset diff、rollback 結果與 `schemaVersion`；依賴：T001
- [ ] T004 [P] 在 `backend/scripts/lib/assert-refresh-artifacts.mjs`、`frontend/tests/e2e/atlas.spec.ts` 補上 manifest 無變更、部分資產變更、manifest 無效三種驗收案例；驗收：測試案例可描述 no-change、partial-refresh、fallback-local 三條主路徑，且在功能未實作前可明確失敗；依賴：T001, T002
- [ ] T005 [US2] 更新 `backend/scripts/refresh-official-data.mjs` 串接 manifest/schema/validation helper，輸出 `frontend/public/data/manifest.json`、`frontend/public/data/schema/grade-map.json`、`frontend/public/data/validation-report.json`；驗收：`npm run data:refresh` 會把所有正式資產寫入 manifest，且 `validationSummary` 與 validation report 摘要一致；依賴：T002, T003
- [ ] T006 [US1] 更新 `frontend/src/data/educationData.ts`、`frontend/src/hooks/useEducationData.ts`，以本地/遠端 manifest 比對驅動差異刷新與局部回退；驗收：未變更資產不重抓、變更資產可逐項刷新、單一資產失敗時保留未受影響快取；依賴：T003, T004, T005
- [ ] T007 [US3] 更新 `frontend/src/components/DataGovernanceFlyout.tsx`，必要時調整 `frontend/src/App.tsx` 的資料流，顯示本地版本、遠端版本、schema 版本、成功/略過/失敗項目與回退摘要；驗收：治理面板可直接辨識 local/remote version、asset 變更數與 validation summary，不需要看 console；依賴：T006
- [ ] T008 [US3] 更新 `frontend/tests/e2e/atlas.spec.ts`、`specs/001-data-flow-optimization/quickstart.md` 完成 P0 驗收腳本；驗收：E2E 覆蓋 no-change refresh、partial-refresh rollback、治理面板版本摘要，quickstart 可直接照表執行；依賴：T006, T007

**Checkpoint**: 完成後即可開始在現有靜態切片策略上實作差異刷新與治理 UI，不需要先碰 SQLite 或 canonical ID 硬切。

---

## P1: SQLite 去重、school_compositions、查詢相容層

**Goal**: 讓 SQLite 改以正規化表為主，落地 `school_compositions`，並由查詢相容層維持現有前端 shape，避免 UI 在同一階段大面積重寫。

**Independent Test**: 執行 `npm run data:refresh` 後，`education-atlas.sqlite` 包含 `schools`、`school_year_metrics`、`school_compositions` 等正規化表；前端仍能正常讀出 summary/detail/bucket 與完全中學的 composition，且 validation report 會記錄 SQLite 體積與 parity 檢查結果。

- [ ] T009 [P] [US1] 在 `backend/scripts/lib/assert-refresh-artifacts.mjs`、`frontend/tests/e2e/atlas.spec.ts` 補上完全中學 `school_level_id` 分流、`school_compositions` 查詢與 SQLite parity 驗收案例；驗收：測試可驗證同一 `school_code` 下多個 `school_level_id` 不再互相覆寫，且舊 `payload_json` 路徑不足時會失敗；依賴：T005, T006
- [ ] T010 [US1] 重構 `backend/scripts/lib/build-atlas-sqlite.mjs`，建立 `schools`、`school_year_metrics`、`school_compositions`、`county_summaries`、`town_summaries`、`school_buckets`、`validation_meta` 等正規化表，並暫留 legacy fallback view；驗收：SQLite 主資料來源不再依賴完整 `payload_json`，且新表可承載 `school_level_id`、`value_status`、`band_id` 與治理欄位；依賴：T005
- [ ] T011 [P] [US2] 更新 `specs/001-data-flow-optimization/contracts/sqlite.contract.md`、`specs/001-data-flow-optimization/data-model.md`，鎖定 P1 正規化表與 legacy fallback 邊界；驗收：文件清楚標示哪些 view 僅供 fallback、何時可移除，以及 `school_compositions` 的欄位與驗證規則；依賴：T010
- [ ] T012 [US1] 更新 `frontend/src/data/atlasSqlite.ts`，優先用 SQL 查詢正規化表組裝 `EducationSummaryDataset`、`CountyDetailDataset`、`CountyBucketDataset`，並在必要時回退 legacy view；驗收：前端呼叫端維持既有 shape，查詢失敗時有明確 fallback 與 warning；依賴：T010
- [ ] T013 [US1] 更新 `frontend/src/data/educationData.ts`、`frontend/src/components/SchoolAnalysisView.tsx`、`frontend/src/components/SchoolCompositionChart.tsx`、`frontend/src/components/SchoolDetailPanel.tsx`，改接 P1 composition 與 `school_level_id` 語義；驗收：完全中學、年級 band、性別組成與年度趨勢可由 SQLite-backed data 正確呈現；依賴：T012
- [ ] T014 [US2] 更新 `backend/scripts/refresh-official-data.mjs`、`backend/scripts/lib/build-validation-report.mjs`、`backend/scripts/lib/assert-refresh-artifacts.mjs`，把 SQLite 體積比較、`school_compositions` 行數、query parity 納入 validation report；驗收：`validation-report.json` 可區分 blocking/warning/info，並記錄 migration 前後大小與 parity 結果；依賴：T010, T012
- [ ] T015 [US1] 更新 `frontend/tests/e2e/atlas.spec.ts`、`specs/001-data-flow-optimization/quickstart.md` 完成 P1 回歸驗收；驗收：E2E 與 quickstart 明確覆蓋完全中學、composition、SQLite fallback 與治理面板 parity 摘要；依賴：T009, T013, T014

**Checkpoint**: 完成後可先讓前端穩定吃正規化 SQLite 與 `school_compositions`，並保留短期 fallback，為 P2 canonical ID 收斂降低風險。

---

## P2: Canonical ID 遷移與舊契約清理

**Goal**: 讓邊界、切片、快取鍵、深連結與治理資訊全面以 canonical `countyCode` / `townCode` 對接，再安全淘汰只靠中文名稱或 `payload_json` 的舊契約。

**Independent Test**: 新舊 deep link 都可還原同一縣市/鄉鎮視圖；刷新與快取改以 canonical ID 驅動；完成一輪資料刷新後，validation report 不再出現 legacy canonical mismatch 的 blocking 問題，且 production 路徑不再依賴名稱型主鍵。

- [ ] T016 [P] [US2] 在 `frontend/tests/e2e/atlas.spec.ts`、`specs/001-data-flow-optimization/quickstart.md` 補上 canonical ID deep-link、legacy alias、cache key 遷移的驗收案例；驗收：測試能同時描述 canonical URL 與 legacy URL 轉接，並在遷移前對 join/key 問題給出明確失敗；依賴：T015
- [ ] T017 [US2] 更新 `backend/scripts/lib/build-boundary-files.mjs`、`backend/scripts/lib/build-official-dataset.mjs`，對 boundary、summary、detail、bucket、school-atlas 輸出雙寫 `countyCode` / `townCode` 與 legacy alias；驗收：新輸出資產可用 canonical code 對 boundary、slice 與學校資料做穩定 join，legacy 欄位僅保留相容用途；依賴：T015
- [ ] T018 [US1] 更新 `frontend/src/data/atlasBoundaries.ts`、`frontend/src/data/educationData.ts`、`frontend/src/hooks/useEducationData.ts`，讓 join、快取鍵與 manifest asset 對應優先使用 canonical ID，並保留 legacy 解析；驗收：縣市/鄉鎮下鑽、差異刷新、last-known-good rollback 在新舊 ID 下皆可運作；依賴：T017
- [ ] T019 [US3] 更新 `frontend/src/App.tsx`、`frontend/src/components/TaiwanExplorerMap.tsx`、`frontend/src/components/DataGovernanceFlyout.tsx`，使 URL、治理面板與刷新摘要改以 canonical ID 呈現並揭露 legacy alias 使用狀態；驗收：canonical deep-link 可直接還原畫面，治理面板可辨識是否仍走 legacy alias；依賴：T018
- [ ] T020 [US2] 清理 `backend/scripts/lib/build-atlas-sqlite.mjs`、`frontend/src/data/atlasSqlite.ts`、`specs/001-data-flow-optimization/contracts/school-data.contract.md`、`specs/001-data-flow-optimization/contracts/sqlite.contract.md` 的 legacy `payload_json` 與名稱型主鍵契約；驗收：production 路徑不再依賴中文名稱 join 或 payload view，contracts 明確標示已淘汰欄位與回退終止點；依賴：T014, T018, T019
- [ ] T021 [US3] 更新 `frontend/tests/e2e/atlas.spec.ts`、`backend/scripts/lib/assert-refresh-artifacts.mjs`、`specs/001-data-flow-optimization/quickstart.md` 完成 P2 最終驗收；驗收：E2E、資料驗證與手動驗收清單同時覆蓋 canonical deep-link、legacy 轉接、partial-refresh rollback 與舊契約清除；依賴：T016, T020

**Checkpoint**: 完成後資料契約可正式以 canonical ID 與正規化 SQLite 為主，舊欄位只剩文件化的淘汰紀錄，不再參與 production 主流程。

---

## Dependencies & Execution Order

### Phase Dependencies

- **P0**: 可立即開始，且是所有後續工作前置條件
- **P1**: 依賴 P0 完成，因為 SQLite 正規化要使用 P0 的 schema、validation 與 diff refresh 契約
- **P2**: 依賴 P1 完成，因為 canonical ID 清理需要先有穩定的 query compatibility 與 validation gate

### Phase Completion Order

- **P0 → P1 → P2**
- **MVP 建議**: 先完成 P0，即可交付 manifest-driven refresh、治理面板版本顯示與 validation report

### Detailed Task Graph

- `T001` → `T002`, `T003`, `T004`
- `T002`, `T003` → `T005`
- `T003`, `T004`, `T005` → `T006`
- `T006` → `T007`, `T008`
- `T005`, `T006` → `T009`
- `T005` → `T010`
- `T010` → `T011`, `T012`, `T014`
- `T012` → `T013`, `T014`
- `T009`, `T013`, `T014` → `T015`
- `T015` → `T016`, `T017`
- `T017` → `T018`
- `T018` → `T019`, `T020`
- `T014`, `T019` → `T020`
- `T016`, `T020` → `T021`

### User Story Dependencies

- **[US1] 可信資料探索**: 先吃到 P0 的 diff refresh 與 P1 的 `school_level_id` / composition 正規化，P2 再切換 canonical ID
- **[US2] 可稽核資料治理**: 從 P0 的契約與 validation report 開始，P1 補強 SQLite parity，P2 完成 canonical ID 與 legacy 清理
- **[US3] 可管理部署更新**: 主要落在 P0 的 manifest + UI 版本顯示，P2 再把 canonical deep-link 與 alias 資訊收斂

---

## Parallel Examples

### P0

```text
T002 backend/package 與 refresh 入口建立
T003 frontend/src/data/* 型別與載入介面擴充
T004 backend/scripts/lib/assert-refresh-artifacts.mjs 與 frontend/tests/e2e/atlas.spec.ts 驗收案例鋪底
```

### P1

```text
T011 specs/001-data-flow-optimization/contracts/sqlite.contract.md 與 data-model.md 文件對齊
T012 frontend/src/data/atlasSqlite.ts 查詢相容層
T014 backend/scripts/refresh-official-data.mjs 與 build-validation-report.mjs 的 SQLite parity 驗證
```

### P2

```text
T016 frontend/tests/e2e/atlas.spec.ts 與 quickstart.md 的 canonical ID 驗收案例
T017 backend/scripts/lib/build-boundary-files.mjs 與 build-official-dataset.mjs 的雙寫輸出
T019 frontend/src/App.tsx、frontend/src/components/TaiwanExplorerMap.tsx、frontend/src/components/DataGovernanceFlyout.tsx 的 canonical URL 與治理摘要更新
```

---

## Implementation Strategy

### MVP First

1. 完成 `T001` 到 `T008`，先把 `manifest.json`、`schema/grade-map.json`、`validation-report.json`、diff refresh 與治理面板版本摘要做完。
2. 驗證 P0 無回歸後，再進入 SQLite 去重與 `school_compositions`。
3. 最後才切 canonical ID 與清理舊契約，避免三條 migration 軸線同時爆開。

### Incremental Delivery

1. **P0**: 發布 manifest-driven refresh 與治理 UI 版本摘要。
2. **P1**: 發布正規化 SQLite 與 query compatibility layer。
3. **P2**: 發布 canonical ID 遷移完成版與 legacy cleanup。

### Notes

- 任務編號已按依賴順序排列，可直接照 `T001` 起跑。
- `[P]` 任務只在其前置任務完成後平行展開，避免同檔衝突。
- 每個 task 均已明確綁定檔案範圍、驗收點與依賴，供後續 LLM 或人工逐項執行。