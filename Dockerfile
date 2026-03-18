# ---------------------------------------------------------
# Step 1: Build Stage (基於 Node.js)
# ---------------------------------------------------------
FROM node:20-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 Root, Backend, Frontend 的 package 定義以利快取層級
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# 安裝所有相依套件 (包含後端與前端)
RUN npm install
RUN cd backend && npm install
RUN cd frontend && npm install

# 複製所有檔案
COPY . .

# 執行資料重新整理與前端建置
# 這會觸發 backend:scripts/refresh-official-data.mjs 並產生 frontend/dist
RUN npm run data:refresh
RUN npm run build

# ---------------------------------------------------------
# Step 2: Runtime Stage (基於極小的 Nginx)
# ---------------------------------------------------------
FROM nginx:stable-alpine

# 從 builder 階段複製打包好的靜態檔到 Nginx 預設路徑
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# 加入自訂 Nginx 配置處理 SPA 路由與緩存優化
RUN printf "server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # 處理 React SPA 路由\n\
    location / {\n\
        try_files \$uri \$uri/ /index.html;\n\
    }\n\
\n\
    # 對地圖資料與 JSON 檔案進行長期緩存 (省錢與效能關鍵)\n\
    location ~* \\.(json|topojson|sqlite|svg|png|ico|woff2)$ {\n\
        expires 7d;\n\
        add_header Cache-Control \"public, no-transform\";\n\
    }\n\
}\n" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
