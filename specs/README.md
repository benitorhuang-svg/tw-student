# specs 文件索引

目前 `specs/` 已依屬性重新整理，根目錄只保留仍在維護的主線規格：

- `001-core-atlas/`：核心互動、地圖下鑽、URL 狀態、分析工作台與學校視圖。
- `002-platform-delivery/`：GitHub Pages、PWA、部署與交付層需求。
- `archive/`：歷次迭代稿與已封存的實驗方向，作為設計脈絡參考，不再視為現行主規格。

## 舊編號對照

- `001-interactive-edu-map` + `002-streamed-county-atlas` + `005-leaflet-atlas-workbench` + `006-marker-cluster-shareable-scenarios`
  已彙整到 `001-core-atlas/` 的主規格敘述。
- `004-pages-pwa-local-view`
  已整理為 `002-platform-delivery/`。
- `003-local-db-prefetch-atlas`
  保留在 `archive/`，作為曾評估過的資料層實驗，不列為現行基線。

## 維護原則

- 先更新 `001-core-atlas/` 或 `002-platform-delivery/` 對應文件，再修改程式。
- 若只是保留歷史脈絡，移入 `archive/`，不要再新增新的流水號主資料夾。
- 所有規格文件維持繁體中文。