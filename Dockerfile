# ---------------------------------------------------------
# 直接部署本地已建置完成的檔案 (Bypassing external download 403 errors)
# ---------------------------------------------------------
FROM nginx:stable-alpine

# 複製本地已建置好的 frontend/dist 目錄到 Nginx 預設路徑
COPY frontend/dist /usr/share/nginx/html

# 安裝 gzip 工具並預先壓縮大型 SQLite 檔案
RUN apk add --no-cache gzip && \
    gzip -fk -9 /usr/share/nginx/html/data/education-atlas.sqlite

# 加入自訂 Nginx 配置處理 SPA 路由與緩存優化
RUN printf "server {\n\
    listen 8080;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
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
        add_header Cache-Control \"public, max-age=604800, immutable\";\n\
    }\n\
}\n" > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
