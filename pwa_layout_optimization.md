# 全台學生人數互動地圖：PWA 跨平台版面優化建議書 v2

這份指南統整了將「全台學生人數互動地圖分析平台」升級為 **「一頁寬高 (Full Viewport) PWA 原生級體驗」** 的具體策略與實作細節。

核心目標：消除傳統網頁的「捲動破碎感」與「點擊閃爍」，並為不同裝置打造最合適的互動情境。

---

## 執行路線圖 (Phased Rollout)

在開始各策略細節之前，先釐清整體執行節奏。避免一口氣改動太大導致回歸測試崩潰。

| 階段 | 範圍 | 改動檔案 | 風險 |
|------|------|---------|------|
| **Phase 0：CSS 鎖框** | 導入 `dvh`、SafeArea、`overscroll-behavior`、`viewport-fit=cover` | `index.html`, `index.css`, `App.css` | ⭐ 最低 — 不改任何 React 邏輯 |
| **Phase 1：Layout 分支** | 新增 `useIsMobile` Hook，在 `App.tsx` 最外層做條件渲染 (`DesktopLayout` / `MobileLayout`) | `App.tsx`, 新增 `hooks/useIsMobile.ts` 與 `layouts/` 資料夾 | ⭐⭐ 中等 — 改動集中在 App.tsx |
| **Phase 2：手機元件替換** | 逐一替換手機版的元件（過濾器用 Drawer、表格用 Card List、Bottom Nav 取代頂部 Tab） | 新增 `components/mobile/` 資料夾 | ⭐⭐ 中等 — 改動分散但獨立 |
| **Phase 3：手勢與動畫** | 加入左右滑動切換分頁 (Swipe)、Bottom Sheet 拖曳手勢、View Transitions | 依選型決定（framer-motion / 原生 CSS） | ⭐⭐⭐ 較高 — 需引入新套件 |

---

## 策略一：基礎容器與安全區域 (Phase 0)

> 這是最低風險、立竿見影的一步。不動 React，只修改 CSS 與 HTML。

### 1.1 全面導入 `100dvh` (Dynamic Viewport Height)

* **痛點：** 傳統 `100vh` 在 iOS Safari / Android Chrome 會因為網址列的伸縮而造成底部 UI 被裁切，以及佈局跳動。
* **目前問題位置：**
  * `App.css` 第 17 行：`html, body, #root { height: 100%; ... overflow: hidden; }`
  * `App.css` 第 20 行：`.app-shell { height: 100vh; ... }`
  * `App.css` 第 879 行：`.hero-panel { min-height: 100vh; ... }`
* **修改方式：**

```css
/* index.css — 全域 */
html, body, #root {
  height: 100%;      /* Fallback for older browsers */
  height: 100dvh;
  margin: 0;
  overflow: hidden;
}

/* App.css — .app-shell */
.app-shell {
  height: 100dvh;    /* 取代 100vh */
  /* ... 其餘不變 */
}
```

### 1.2 實作 SafeArea (安全區域避讓)

* **痛點：** 滿版 PWA 加入主畫面後，手機沒有網址列，但仍有瀏海 (Notch) / 動態島 / Home Indicator。如果不讓出空間，地圖控制項或 Footer 會被硬體 UI 遮住。
* **修改方式：** 在 `.app-shell` 加入 `env()` padding。

```css
.app-shell {
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
```

### 1.3 觸控體驗鎖定 (Touch Constraints)

* **`index.html` — viewport meta tag 修改：**

```html
<meta name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

> **注意：** 不建議加 `user-scalable=no`。
> 原因：這會封死視障使用者的放大功能，有無障礙合規風險。
> 替代方案：在地圖容器上單獨設定 `touch-action: manipulation;`（阻止雙擊放大但保留 pinch-zoom），面板區域則設定 `touch-action: pan-y;`。

* **CSS — 防止滑動穿透與橡皮筋效應：**

```css
html, body {
  overscroll-behavior: none;     /* 防止最外層 Pull-to-refresh */
}

.atlas-control-rail,
.atlas-analysis-column {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;   /* iOS 流暢滾動 */
  overscroll-behavior: contain;        /* 防止滾動穿透到 body */
}
```

### 1.4 PWA 啟動畫面色系

在 `index.html` 中補上 Apple-specific meta tags，確保 PWA 從主畫面啟動時不會閃白屏：

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

`vite.config.ts` 中的 manifest `theme_color: '#08111f'` 和 `background_color: '#08111f'` 已正確設定，無需更動。

---

## 策略二：桌機與手機的分離渲染策略 (Phase 1)

> 核心原則：State 與地圖共用，Layout Shell 分離，微觀元件漸進替換。

### 2.1 核心狀態與地圖元件：絕對共用（不拆分）

以下在任何情況下都**必須且只能維持一份**：

* 所有資料 Hook (`useEducationData`, `useAtlasDerivedState`, `useAtlasUrlSync`, ...)
* 所有篩選 State (`activeYear`, `educationLevel`, `selectedCountyId`, ...)
* `<TaiwanExplorerMap>` 元件實體 — Leaflet 地圖非常吃 Mount/Unmount 效能。在手機版與桌機版之間切換時，地圖必須透過 **Props / Portals** 傳遞，而不是各自 Mount 一份。

### 2.2 巨觀佈局 (Layout Shell)：依斷點條件渲染

* **不建議做法：** 單純用 CSS `@media` 把桌機雙欄 Grid 改成手機版。問題：DOM 結構不同（桌機是並排、手機是堆疊 + 底部抽屜），純 CSS 改不動元素的嵌套層級。
* **推薦做法：** 新增 `useIsMobile` Hook + 在 `App.tsx` 最外層做條件渲染。

```tsx
// hooks/useIsMobile.ts
import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT = 860

const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}

const getSnapshot = () =>
  window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
```

```tsx
// App.tsx (概念架構)
const isMobile = useIsMobile()

const mapElement = (
  <TaiwanExplorerMap {...mapProps} />
)

return (
  <div className="app-shell">
    {isMobile ? (
      <MobileAppLayout
        map={mapElement}
        tabs={tabItems}
        activeTab={activeTab}
        onSetActiveTab={setActiveTab}
        analysisPanel={<AtlasAnalysisPanel {...analysisPanelProps} />}
      />
    ) : (
      <div className="atlas-workbench">
        <AtlasControlRail ...>{mapElement}</AtlasControlRail>
        <AtlasAnalysisPanel {...analysisPanelProps} />
      </div>
    )}
    <AtlasFooter ... />
  </div>
)
```

桌機版的 DOM 架構完全保留現狀。手機版由 `MobileAppLayout` 負責重新安排嵌套。

### 2.3 微觀互動元件：針對手機優化 (Phase 2)

分批替換，每個元件獨立改動、獨立測試。

| 元件 | 桌機版 (維持現狀) | 手機版 (新建) |
|------|-------------------|---------------|
| 篩選器 (`FilterBar`) | 原生 `<select>` + 文字輸入 | 底部全螢幕 Drawer (`MobileFilterDrawer`) |
| 分頁 (`AtlasTabs`) | 頂部膠囊式 Segmented Control | Bottom Navigation Bar (`MobileBottomNav`) |
| 學校表格 (`SchoolDataTable`) | 多欄位 `<table>` 含排序 | 卡片列表 (`MobileSchoolCardList`) |
| 排行榜 (`InsightPanel`) | 可維持，但適度精簡列數 | 同上，但加上 Pull-to-load-more |
| 比較卡片 (`ComparisonPanel`) | 雙欄 Grid | 橫向滑動列 (Horizontal Scroll Snap) |

---

## 策略三：行動端佈局與分頁設計 (Phase 1–2)

> 手機版應摒棄「網頁導航」，改用「地圖疊加動態抽屜 (Map + Dynamic Bottom Sheet)」模式。

### 3.1 分頁操作區定位

* 取消桌機上方的膠囊切換，改為手機版底部的 **Bottom Navigation Bar**（3 個按鈕：概況 / 區域 / 學校，各帶 Icon）。
* 將 Bottom Nav 定位在 `position: fixed; bottom: env(safe-area-inset-bottom);`，確保閃避 Home Indicator。

```css
/* 手機版 Bottom Nav 範例 */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  display: flex;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 2000;
}

.mobile-bottom-nav__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 0.7rem;
  color: rgba(148, 163, 184, 0.7);
  transition: color 0.2s;
}

.mobile-bottom-nav__item--active {
  color: #38bdf8;
}
```

### 3.2 滾動記憶 (Scroll Restoration)

* **桌機版：** 可以維持三個分頁同時掛載 (`display: none` 隱藏非作用中分頁)，桌機效能足夠。
* **手機版：** 建議只常駐「概況總覽」（切換最頻繁），其餘兩個分頁維持 `lazy + Suspense`。
  但需要以 `useRef` 記錄各分頁的 `scrollTop`，在重新掛載時手動恢復。

```tsx
// 概念範例：手機版 scroll restoration
const scrollPositions = useRef<Record<AtlasTab, number>>({
  overview: 0,
  regional: 0,
  schools: 0,
})

const handleTabChange = (newTab: AtlasTab) => {
  // 記錄離開前的 scrollTop
  if (panelRef.current) {
    scrollPositions.current[activeTab] = panelRef.current.scrollTop
  }
  setActiveTab(newTab)
}

useEffect(() => {
  // 恢復進入後的 scrollTop
  if (panelRef.current) {
    panelRef.current.scrollTop = scrollPositions.current[activeTab]
  }
}, [activeTab])
```

> **原因：** 如果三個分頁的 DOM（包含 SVG 圖表與 Lazy 元件）同時掛載，低階手機可能因記憶體不足導致卡頓或瀏覽器回收 Tab。

### 3.3 轉場動畫

* **建議 Phase 1 先用 CSS 動畫：**

```css
.tab-content-enter {
  animation: fadeSlideUp 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

* **Phase 3 可考慮 View Transitions API（較新瀏覽器）：** 搭配 `document.startViewTransition()` 達成 Morph 動畫。但需要為不支援的瀏覽器準備 Fallback（即上方的 CSS 動畫）。

---

## 策略四：不同分析視圖的「彈性版面配比」

> 根據使用者當下意圖（看地圖 vs 看數據），動態調整地圖與面板的佔比。
> 此策略同時適用於桌機與手機。

### 4.1 手機版：三種視圖的 Stage 型態

透過 CSS 變數 `--map-h` 和 `--panel-h` 映射至 `data-mode` 屬性，地圖與面板之間的高度分配會隨 Tab 切換產生平滑過渡。

| 分頁 | 地圖高度 | 面板高度 | 使用者意圖 |
|------|---------|---------|-----------|
| **概況總覽** | 55–60dvh | 40–45dvh | 空間探索，先看地理熱度再決定下鑽 |
| **區域分析** | 25–30dvh | 70–75dvh | 比較對比，地圖退為選取工具 |
| **學校工作台** | 0–5dvh (隱藏) | 95–100dvh | 深度查閱，地圖完全讓位給數據 |

```css
@media (max-width: 860px) {
  .mobile-layout[data-mode="overview"]  { --map-h: 55dvh; --panel-h: 45dvh; }
  .mobile-layout[data-mode="regional"]  { --map-h: 28dvh; --panel-h: 72dvh; }
  .mobile-layout[data-mode="schools"]   { --map-h: 0;     --panel-h: 100dvh; }

  .mobile-map-stage {
    height: var(--map-h);
    transition: height 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
    overflow: hidden;
  }

  .mobile-panel {
    height: var(--panel-h);
    transition: height 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: 24px 24px 0 0;
  }
}
```

### 4.2 桌機版：動態面板寬度連動

桌機版目前固定 `--sidebar-w: minmax(360px, 39vw)`。可依分頁特性做彈性微調：

| 分頁 | 左側 (控制欄+地圖) | 右側 (分析面板) | 理由 |
|------|-------------------|---------------|------|
| **概況總覽** | 39vw (維持現狀) | 剩餘空間 | 地圖需要足夠空間 |
| **區域分析** | 35vw (略微壓縮) | 加大 | 比較卡片需要更多水平空間 |
| **學校工作台** | 32vw (壓縮地圖) | 最大化 | 學校表格多欄位需要寬度 |

```css
.atlas-workbench[data-mode="overview"]  { --sidebar-w: minmax(360px, 39vw); }
.atlas-workbench[data-mode="regional"]  { --sidebar-w: minmax(340px, 35vw); }
.atlas-workbench[data-mode="schools"]   { --sidebar-w: minmax(320px, 32vw); }

.atlas-workbench {
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  transition: grid-template-columns 0.35s ease;
}
```

### 4.3 各頁面的內容配置細節

#### 概況總覽 (Overview)

* **面板內容：**
  * 精簡版 `ScopePanel`：總人數 + Sparkline 趨勢 + 學制分佈條
  * `InsightPanel` 排行榜：點擊排行項目連動地圖 Focus
  * 桌機版保留 `OfflineMetricsPanel`；手機版隱藏（移至設定頁或漢堡選單）
* **手機版限定：**
  * 排行榜最多顯示前 5 名，附「查看更多」按鈕展開
  * ScopePanel 的文字描述折疊，只露出數字與圖表

#### 區域分析 (Regional)

* **面板內容：**
  * `ComparisonPanel` 比較卡片
  * `AnomalyPanel` 異常看板
* **桌機版：** 維持現有雙欄 Grid
* **手機版限定：**
  * 比較卡片改為 **Horizontal Scroll Snap** 橫向滑動列（每張卡片寬度 85vw，可左右滑動瀏覽多縣市）
  * AnomalyPanel 放在比較卡片下方，垂直滾動
  * 頂部設置「+ 加入比較」的快捷按鈕

#### 學校工作台 (Schools)

* **面板內容：**
  * 過濾器 (Sticky Header)
  * `SchoolDetailPanel` / `SchoolDataTable`
  * 單校趨勢圖 (Drawer/Modal)
* **桌機版：** 維持 `<table>` + 多欄排序 + 單校焦點卡片
* **手機版限定：**
  * 表格重構為 **Card List View**
    * 每張卡片一行：「🏫 校名 + 公/私標籤」
    * 二行：「學生數 (大字) + ▲/▼ 增減」
    * 三行：「學制 + 行政區」
  * 點擊卡片後，從底部滑出 Drawer 顯示該校歷年趨勢與完整屬性
  * 過濾器從「攤開式」改為「點擊展開式 Drawer」，節省首屏空間

---

## 策略五：效能與離線體驗 (Phase 0–1)

### 5.1 Service Worker 資料快取策略

目前 `vite.config.ts` 的 Workbox 設定已有基礎：
* globPatterns 包含 `*.json` 與 `*.topo.json`（地理邊界資料）
* runtimeCaching 處理 Google Fonts

**建議補強：**

* **教育資料 JSON：** 新增 Runtime Caching 規則，對 `data/` 目錄下的 JSON 使用 `StaleWhileRevalidate`，讓離線時仍可閱覽上次快取的統計資料。
* **地圖圖磚 (Tile)：** 為 Leaflet TileLayer 的圖磚 URL 加入 `CacheFirst` 規則（限大小），讓離線時地圖底圖至少顯示已瀏覽過的區域。

```ts
// vite.config.ts — workbox.runtimeCaching 補充
{
  urlPattern: /\/data\/.*\.json$/i,
  handler: 'StaleWhileRevalidate',
  options: {
    cacheName: 'education-data-json',
    expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
  },
},
{
  urlPattern: /^https:\/\/.*tile.*\.(png|jpg|pbf)$/i,
  handler: 'CacheFirst',
  options: {
    cacheName: 'map-tiles',
    expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
  },
},
```

### 5.2 地圖效能：避免 Remount

在策略二的條件渲染中，`<TaiwanExplorerMap>` 的實體**絕對不能**因為 `isMobile` 切換而被銷毀和重建。

**確保方式：**
* 在 `App.tsx` 中先 render 地圖元素為變數 `const mapElement = <TaiwanExplorerMap .../>`
* 再將此變數作為 Prop 傳遞給 `DesktopLayout` 或 `MobileLayout`
* 兩種 Layout 用 React Portal 或 Ref 把同一個 DOM Node 接入不同的容器位置

---

## 策略六：手機版現有 CSS 斷點的修正 (Phase 0)

目前 `App.css` 第 993–1006 行的 `@media (max-width: 860px)` 有一個致命問題：

```css
/* ⚠️ 目前的做法 — 破壞了一頁式體驗 */
@media (max-width: 860px) {
  html, body, #root, .app-shell { height: auto; overflow: auto; }
}
```

這行把 `height: auto; overflow: auto;` 加回去，等於放棄了 100dvh 的鎖框。手機使用者會看到一個可以無限往下滾動的長網頁，而非被包覆在一個 App Shell 裡。

**Phase 0 的即時修正（即使還沒導入 isMobile 條件渲染）：**

```css
@media (max-width: 860px) {
  /* 維持鎖框！不設 auto */
  .app-shell { height: 100dvh; overflow: hidden; }

  .atlas-workbench {
    grid-template-columns: 1fr;      /* 單欄 */
    grid-template-rows: 55dvh 1fr;   /* 上地圖、下面板 */
    padding: 0;
    gap: 0;
  }

  .atlas-control-rail {
    border-radius: 0;
    overflow: hidden;        /* 地圖區不需要滾動 */
  }

  .atlas-analysis-column {
    border-radius: 24px 24px 0 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}
```

這是在不動任何 React 程式碼的前提下，最快讓手機版從「長捲動網頁」變成「上下分割的 App」的方式。

---

## 對應程式碼檔案清單

| 檔案 | Phase 0 | Phase 1 | Phase 2 |
|------|---------|---------|---------|
| `frontend/index.html` | ✅ viewport meta | ✅ apple meta tags | — |
| `frontend/src/index.css` | ✅ dvh, overscroll | — | — |
| `frontend/src/App.css` | ✅ dvh, safe-area, 修正 860px 斷點 | ✅ data-mode 變數 | ✅ 手機元件樣式 |
| `frontend/src/App.tsx` | — | ✅ isMobile 分支 | — |
| `frontend/src/hooks/useIsMobile.ts` | — | ✅ 新建 | — |
| `frontend/src/layouts/MobileAppLayout.tsx` | — | ✅ 新建 | — |
| `frontend/src/components/mobile/*.tsx` | — | — | ✅ 新建各手機版元件 |
| `frontend/vite.config.ts` | — | — | ✅ Workbox runtimeCaching 補強 |
