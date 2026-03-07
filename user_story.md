全台灣教育就讀人數地圖分析專案規格書 (Project Specification)
為了詳細且完整地描述這個專案，建議從數據層、地理層、應用層與技術層四個維度來定義。以下是完整的規格建議：

1. 專案目標 (Project Objectives)
視覺化洞察：透過地圖直觀呈現全台各縣市不同學制（幼稚園、小學、中學、大學）的學生密度。
決策支援：協助使用者分析城鄉教育資源差距與人口流動趨勢。
互動體驗：提供即時篩選、年度對比與詳細資訊呈現。
2. 數據來源與定義 (Data Sources & Definitions)
數據來源：
教育部統計處：教育部開放資料（各級學校學生人數、縣市別）。
內政部戶政司：行政區域界線 GeoJSON。
核心指標 (KPIs)：
student_count：就讀人數。
school_count：學校數量。
edu_level：教育階段（幼、國小、國中、高中職、大專院校）。
public_private：公私立別。
year_academic：學年度。
3. 功能需求 (Functional Requirements)
A. 互動地圖 (Interactive Map)
面量圖 (Choropleth Map)：以顏色深淺表示人數多寡（例如：人數越多顏色越深）。
點聚圖 (Cluster Map)：顯示具體學校位置（縮放至特定層級時）。
圖標懸停 (Hover Tooltip)：顯示縣市名稱、總人數、前三大熱門學校等。
B. 篩選與控制 (Filters & Controls)
維度篩選：
縣市選擇（全台、單一縣市、北中南東區分）。
教育階段（幼稚園至大學）。
學制分類（公立/私立）。
時間軸控制：可切換不同學年度查看趨勢變化。
C. 統計圖表 (Data Visualizations)
趨勢折線圖：選定縣市的歷年學生人數變化。
比例圓餅圖：公私立或男女生比例。
橫向條型圖：縣市間的排名對比。
4. UI/UX 設計規範 (Design Aesthetics)
風格定位：現代簡約、數據驅動（Modern Data-Driven Dashboard）。
配色方案：
幼稚園：淺黃/綠（清新成長）。
國小/國中：藍/青（知識穩定）。
大學：深紫色/深藍（學術專業）。
微交互：地圖縮放平滑動畫、數值變動時的數字跳動效果。
5. 系統架構 (Technical Architecture)
前端框架：React.js / Next.js
地圖庫：Leaflet.js / Mapbox GL JS / D3.js (處理 GeoJSON)
圖表庫：Recharts / Chart.js
數據緩存：利用 SWR 或 React Query 處理大規模數據讀取。
6. 專案階段 (Roadmap)
數據整理：下載教育部 CSV，進行格式清理與欄位統整。
原型開發：建立地圖基礎架構與 GeoJSON 整合。
功能實現：串接篩選邏輯與動態圖表。
性能優化：處理地圖大量節點渲染優化。
部署上線：部署至 Vercel/Netlify 並配置 SEO。