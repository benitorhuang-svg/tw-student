# 專案架構指南：前端 DDD 與 FSD (Feature-Sliced Design) 實踐

本專案的前端 (`frontend`) 採用了結合 **領域驅動設計 (Domain-Driven Design, DDD)** 與 **特徵切片設計 (Feature-Sliced Design, FSD)** 的混合架構。

此架構的目標是：
1. **高內聚、低耦合**：讓業務邏輯集中，降低模組間的交互依賴。
2. **嚴格防腐層**：透過 Public API 與 Linting 規則防止架構隨著專案迭代而腐化。
3. **明確的職責邊界**：每個目錄都有清晰的定位，開發者能直覺地找到代碼位置。

---

## 📂 根目錄結構 (`src/`)

我們的 `src/` 被劃分為三個主要層級（Layer），依照依賴方向，**上層可以依賴下層，但下層絕不能依賴上層**：

1. **`app/`** (應用核心層)
2. **`domains/`** (業務領域層)
3. **`shared/`** (共用模組層)

### 1. `app/` (App 應用核心層)
負責整個應用程式的全域初始化、跨領域協調與骨架佈局。
- **`layouts/`**：存放全域性的佈局元件（如 `DashboardCanvas`, `DesktopAppLayout`），負責組裝各個 Domain 提供的區塊。
- **`providers/`**：跨領域的 Orchestrator (協調者) 與全域事件派發機制（如 `useEducationData`, `useAtlasDerivedState`, `useAtlasOrchestration`）。凡是同時組合 data hooks、derived state、URL sync、prefetch 或 scenario actions 的邏輯，都放在 `app/providers`；data/derived 子 hooks 分別放在 `app/providers/data` 與 `app/providers/derived`。
- **`store/`**：全域狀態管理庫，管理跨越整個應用的狀態（如 Zustand `useAtlasStore` 與 URL query 初始化 `useAtlasQueryState`）。舊的 local-state composition hooks 不再作為平行狀態模型保留。
- **`styles/`**：全域 CSS 樣式、主題變數 (Tokens) 以及 Reset CSS。

### 2. `domains/` (業務領域層)
將具體的業務邏輯以「領域 (Domain)」為單位進行切片。每個領域都是高度內聚的，負責特定的業務板塊。
目前的領域包含：
- `atlas/` (地圖探索)
- `education/` (教育指標數據)
- `scenario/` (情境與比較分析；目前只保留實際使用的 `FilterBar` 與 scenario CRUD)
- `analytics/` (分析圖表 UI；analytics 型別、formatter、summary helper 均在 `shared/lib/analytics`)

本輪邊界收斂後，`domains/education/ui` 擁有 School detail/table 工作流，`domains/analytics/ui` 擁有 overview/county analytics sidebar wrapper，`domains/atlas/ui` 擁有 Atlas shell、filters、tabs、footer、map UI 與 data-governance UI。`app/layouts` 只透過各 domain 的 `index.ts` Public API 組裝這些區塊。

**Domain 的內部結構：**
每個 Domain 內部再次採用 FSD 的組織方式：
- `ui/`：該領域專屬的 UI 組件。
- `model/`：該領域專屬的狀態管理、商業邏輯 Hooks 與型別定義。
- `utils/`：該領域專屬的純函式工具。
- ⭐️ **`index.ts` (Public API)**：
  每個 Domain 根目錄下的 `index.ts` 是該領域的**唯一對外接口**。`app/` 若要使用 domain 能力，必須透過 `index.ts` 匯入；`domains/*` 之間不得互相匯入，即使是 Public API 也不允許。跨 domain 的型別、純函式、資料 helper 與共用 UI 應下沉到 `shared/`，再由 `app/` 組裝。

### 3. `shared/` (共用核心層 Shared Kernel)
存放與特定業務領域無關、高度可重用的底層模組。
- **`api/`**：與後端通訊、資料庫操作相關的邏輯。包含 Web Workers (`workers/`) 與 SQLite 客戶端 (`data/sqlite/`)。
- **`lib/`**：底層共用邏輯。
  - `utils/`：純函式工具庫（如格式化、數學計算）。
  - `hooks/`：與業務無關的 React Hooks（區分 `app/` 與 `core/` 層級）。
- **`ui/`**：底層共用 UI 元件。
  - `components/`：只放不帶領域語意的跨頁 UI；目前保留 mobile drawer 這類通用殼。
  - `core/`：如各類 Chart 繪圖基礎組件 (RadarChart, ScatterPlotChart)。

---

## 🛡️ 架構防腐層 (Anti-Corruption Layer)

為確保此架構被嚴格遵守，我們在專案中部署了幾項強制性的防腐層機制：

### 1. 嚴格的 Public API 導入限制 (ESLint)
我們在 `eslint.config.js` 中配置了 `no-restricted-imports` 規則。
任何跨越 Domain 的引入，**絕對禁止直接深入 Domain 內部目錄**。

❌ **錯誤示範**：
```typescript
// 試圖直接存取內部 UI 檔案，這會引發 ESLint Error 🚫
import TaiwanExplorerMap from '@/domains/atlas/ui/TaiwanExplorerMap';
```

✅ **正確作法**：
```typescript
// 透過 Domain 的 index.ts (Public API) 引入 ✅
import { TaiwanExplorerMap } from '@/domains/atlas';
```

目前 ESLint 已將以下規則列為硬性錯誤：

- 外部不可使用 `@/domains/<domain>/ui/*`、`@/domains/<domain>/model/*`、`@/domains/<domain>/utils/*`。
- `app/` 若要使用 domain 能力，必須從 `@/domains/<domain>` 引入。
- domain 內部不可再直接引用其他 domain；`@/domains/<domain>` Public API 也只允許 `app/` 使用。若真的需要跨領域資料，先抽到 `shared` 或由 `app` 組裝。
- `src/domains/*` 內禁止以 `../../其他domain/ui/*`、`../../其他domain/model/*`、`../../其他domain/utils/*` 形式鑽入另一個 domain。
- `src/domains/*` 內禁止依賴 `@/app/*` 或相對路徑的 `app/` 模組；app 是最上層組裝層，不能被 domain 反向依賴。
- app orchestration hooks 只能放在 `app/providers`，不得回流到 `shared` 或 `domains`。
- `src/shared/*` 內禁止依賴 `@/domains/*` 或 `@/app/*`；shared 只能放 domain-neutral 的型別、hook、純函式、資料存取與共用 UI。

目前 `shared/` 的 analytics、atlas identity/type、investigation、scenario persistence/export helper 只保留 domain-neutral kernel；需要 domain UI 的地方由 `app/` 組裝。`shared/ui/core` 只保留可跨 domain 使用的 generic UI，例如 Accordion 與 chart primitives；Atlas filters/tabs/footer/map、School detail、Overview/County analytics panels 都必須放在所屬 domain。

### 2. 架構掃描 (`lint:architecture`)
除了 ESLint，專案也提供 `npm.cmd --workspace frontend run lint:architecture`，用程式化方式檢查 ESLint 不易完整覆蓋的架構規則：

- `shared` 不可依賴 `app` 或 `domains`。
- `domains/*` 不可依賴 `app`，也不可直接依賴其他 domain。
- 外部不可 deep import domain 內部檔案，只能使用 `@/domains/<domain>` Public API。
- 相對路徑不可跨 layer 或跨 domain。
- `src/components`、`src/hooks`、`src/lib`、`src/data`、`src/layouts`、`src/styles` 這類舊式 root 目錄不可回流。
- `shared/ui` 不可放入帶有 School、Atlas、County、Township、Scenario、Education、Governance、Map 等業務語意的 UI 或 CSS 檔案。
- import graph 不可有 cycle，且正式 source 檔必須從 `src/main.tsx` 可達。

### 3. 絕對路徑 Alias (`@/`)
我們在 `tsconfig.app.json` 與 `vite.config.ts` 中配置了 `@/` 指向 `src/` 目錄。
引入 `shared/` 與 `app/` 資源時，請一律使用 `@/shared/...` 或 `@/app/...`，避免過多 `../../../` 導致路徑脆弱。

### 4. 型別專屬引入 (`verbatimModuleSyntax`)
由於我們在 TypeScript 中開啟了 `verbatimModuleSyntax: true`，這有助於 Vite/Rollup 進行完美的 Tree-Shaking。
因此，當您只引入型別時，必須明確標示 `type`：

❌ **錯誤示範**：
```typescript
import { AtlasTab } from '@/app/store'; // Error
```

✅ **正確作法**：
```typescript
import { type AtlasTab } from '@/app/store';
// 或是
import type { AtlasTab } from '@/app/store';
```

---

## 🧭 開發決策指南 (Where to put my code?)

當您準備新增一段程式碼時，請依照以下決策樹決定位置：

1. **這是一個純粹的 UI 殼，還是包含業務邏輯？**
   - 不包含特定業務邏輯 (例如：一個通用的按鈕、圖表) ➡️ `src/shared/ui/`
2. **這牽涉到後端 API、資料庫或是 Web Worker 嗎？**
   - 是 ➡️ `src/shared/api/`
3. **這屬於某個特定的業務功能嗎 (例如：教育指標)？**
   - 是，而且只屬於單一領域 ➡️ `src/domains/對應領域/`
4. **這是一個需要協調多個業務領域的全域狀態或畫面佈局嗎？**
   - 是 ➡️ `src/app/`
