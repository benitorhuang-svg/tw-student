# ---------------------------------------------------------
# 第一階段：建置階段 (Build Stage)
# 使用 root npm workspace 安裝依賴、刷新資料並編譯前端
# ---------------------------------------------------------
FROM node:22-slim AS build-stage

WORKDIR /app

# 複製 package 檔案以利用 Docker 層快取 (Cache Layering)
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/
RUN npm ci --loglevel=error --no-fund --no-audit

# 複製其餘所有原始碼
# 注意：正式資料由 backend workspace 產生到 backend/dist，再由 Vite 複製到 frontend/dist/data。
COPY . .

# 刷新資料並執行前端建置
RUN npm run data:refresh
RUN npm run build

# ---------------------------------------------------------
# 第二階段：噴出階段 (Production Stage)
# 使用 Nginx 提供高性能的靜態資源服務
# ---------------------------------------------------------
FROM nginx:stable-alpine

# 從 build-stage 複製產出的 dist 目錄到 Nginx 預設路徑
COPY --from=build-stage /app/frontend/dist /usr/share/nginx/html

# 安裝 gzip 工具並預先壓縮大型 SQLite 檔案 (優化載入速度)
RUN apk add --no-cache gzip && \
    gzip -fk -9 /usr/share/nginx/html/data/education-atlas.sqlite

# 加入自訂 Nginx 配置處理 SPA 路由與緩存優化
RUN printf "server {\n\
    listen 8080;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # 安全標頭\n\
    add_header X-Content-Type-Options nosniff;\n\
    add_header X-Frame-Options DENY;\n\
    add_header Referrer-Policy strict-origin-when-cross-origin;\n\
    add_header Content-Security-Policy \"default-src 'self'; script-src 'self' 'wasm-unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; connect-src 'self' blob:; worker-src 'self' blob:\";\n\
\n\
    # 開啟 Gzip 靜態預壓縮與動態壓縮\n\
    gzip on;\n\
    gzip_static on;\n\
    gzip_vary on;\n\
    gzip_min_length 10240;\n\
    gzip_proxied expired no-cache no-store private auth;\n\
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json application/vnd.geo+json application/x-sqlite3;\n\
\n\
    # 處理 React SPA 路由\n\
    location / {\n\
        try_files \$uri \$uri/ /index.html;\n\
    }\n\
\n\
    # 對地圖資料與 JSON 檔案進行長期緩存 (省錢與效能關鍵)\n\
    location ~* \\.(json|topojson|sqlite|svg|png|ico|woff2|pbf)$ {\n\
        expires 7d;\n\
        # 移除 immutable 以免與 StaleWhileRevalidate 衝突\n\
        add_header Cache-Control \"public, max-age=604800\";\n\
    }\n\
}\n" > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
