# Dockerfile

# 1. 基礎鏡像：使用 Node.js 穩定版本
FROM node:20-alpine

# 2. 設定工作目錄
WORKDIR /usr/src/app

# 3. 複製 package.json 和 package-lock.json (或 yarn.lock)
# 僅複製這些檔案可以利用 Docker 快取來加速建置
COPY package*.json ./

# 4. 安裝依賴 (例如 express, hjs, mysql2)
RUN npm install

# 5. 複製應用程式的所有程式碼
# 排除 .dockerignore 中列出的檔案 (如果有)
COPY . .

# 6. 暴露應用程式使用的埠號
# 您的應用程式運行在 8080 (與 compose.yaml 埠號映射對應)
EXPOSE 8080

# 7. 定義容器啟動時執行的命令
CMD [ "npm", "start" ]

# 注意：這要求您的 package.json 必須定義 "start": "node app.js" 或 "node index.js"
# 確保您的主啟動檔案名稱是正確的