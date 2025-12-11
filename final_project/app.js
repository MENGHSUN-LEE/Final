const express = require('express');
const db = require('mysql2'); 
const app = express();
const configs = require('./config');
const path = require('path');

app.set('view engine', 'hjs');
app.set('views', path.join(__dirname, 'views'));

// 建立資料庫連線
const connection = db.createConnection(configs.db);

connection.connect((err) => {
    if (err) {
        console.log("Error connecting to database: ", err);
        // 不再強制退出，以便在沒有資料庫連線的情況下也能運行空架構
        // process.exit();
        console.log("Database connection failed. Running in standalone mode.");
    } else {
        console.log("Connected to database: final_db");
    }
});

app.set('connection', connection);
// 設置靜態檔案路徑 (例如 CSS/JS/圖片)
app.use(express.static("public")); 
// 處理表單資料
app.use(express.urlencoded({ extended: true })); 
// 處理 JSON 請求
app.use(express.json());

// --- 註冊路由模組 (routes) ---

// 新增 mainRouter
const mainRouter = require('./routes/main');
mainRouter.connection = connection; // 注入連線
app.use('/', mainRouter); 

// 啟動伺服器
app.listen(80, function () {
    console.log('Web server listening on port 80!');
    console.log('Go to http://localhost/home');
});