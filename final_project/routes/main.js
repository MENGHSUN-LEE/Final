const express = require('express');
const app = express.Router();

// --- 應用程式所需資料 (包含 Font Awesome 圖示) ---
const ALL_TABS = [
    { id: 'tab-search', label: '<i class="fa-solid fa-magnifying-glass"></i> 搜尋', url: '/search', active: true },
    { id: 'tab-edit', label: '<i class="fa-solid fa-pen-to-square"></i> 編輯', url: '/edit', active: false },
    { id: 'tab-custom', label: '<i class="fa-solid fa-chart-line"></i> 自選功能', url: '/custom', active: false },
];

const GUEST_TABS = [
    { id: 'tab-search', label: '<i class="fa-solid fa-magnifying-glass"></i> 搜尋', url: '/search', active: true },
];

// --- 新增: 動態生成 Navbar HTML 的函式 ---
function generateNavbarHtml(tabs) {
    // 使用 Array.map() 將每個 Tab 資料物件轉換為 HTML 連結字串
    const linksHtml = tabs.map(tab => {
        const activeClass = tab.active ? 'active' : '';
        // 注意：這裡使用 ES6 模板字串 (反引號 `) 進行拼接
        return `
            <a id="${tab.id}" 
               class="nav-link ${activeClass}" 
               href="#${tab.url}" 
               data-content-url="${tab.url}"
            >
                ${tab.label}
            </a>
        `;
    }).join(''); // 將所有連結字串連接成一個單一的 HTML 字串
    
    return linksHtml;
}

// --- 通用頁面渲染輔助函數 (保持不變) ---
function renderPage(res, templateName, title, data = {}) {
    res.render(templateName, data, (err, html_content) => {
        if (err) {
            console.error(`Error rendering ${templateName} template:`, err);
            return res.status(500).send("Template Error: " + err.message);
        }
        res.render('layout', {
            title: title,
            body: html_content
        });
    });
}

// --- 路由定義 ---

// GET / - 首頁 (登入/註冊選項)
app.get('/', function (req, res) {
    renderPage(res, 'index', '歡迎'); 
});

// GET /signup - 註冊頁面
app.get('/signup', function (req, res) {
    renderPage(res, 'signup', '註冊'); 
});

// GET /app/user - 一般使用者主應用程式頁面 (完整 Tab)
app.get('/app/user', function (req, res) {
    const navbarHtml = generateNavbarHtml(ALL_TABS); // 直接生成 HTML
    
    // 渲染 app.hjs (作為 body 內容)
    res.render('app', {}, (err, app_body_html) => {
        if (err) {
            console.error("APP RENDER FAILED (User):", err);
            return res.status(500).send("App Render Error");
        }
        
        // 渲染 layout.hjs
        res.render('layout', {
            title: '功能主頁 - 完整功能',
            body: app_body_html,
            navbar_content: navbarHtml, // 傳遞生成的 HTML 字串
            isAppPage: true 
        });
    });
});

// GET /app/guest - 訪客主應用程式頁面 (僅搜尋 Tab)
app.get('/app/guest', function (req, res) {
    const navbarHtml = generateNavbarHtml(GUEST_TABS); // 直接生成 HTML
    
    res.render('app', {}, (err, app_body_html) => {
        if (err) {
            console.error("APP RENDER FAILED (Guest):", err);
            return res.status(500).send("App Render Error");
        }

        res.render('layout', {
            title: '功能主頁 - 訪客模式',
            body: app_body_html,
            navbar_content: navbarHtml, // 傳遞生成的 HTML 字串
            isAppPage: true
        });
    });
});

// GET /search, /edit, /custom - 處理 Tab 內容的 HTMX 請求
app.get('/search', function (req, res) {
    res.render('search', {}); // 確保這裡沒有 'pages/'
});

app.get('/edit', function (req, res) {
    res.render('edit', {}); // 確保這裡沒有 'pages/'
});

app.get('/custom', function (req, res) {
    res.render('custom', {}); // 確保這裡沒有 'pages/'
});

app.get('/login', function (req, res) {
    renderPage(res, 'login', '登入頁面'); 
});

module.exports = app;