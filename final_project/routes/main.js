const express = require('express');
const app = express.Router();

// 通用頁面渲染輔助函數
function renderPage(res, templateName, title, data = {}) {
    res.render(templateName, data, (err, html_content) => {
        if (err) {
            console.error(`Error rendering ${templateName} template:`, err);
            return res.status(500).send("Template Error: " + err.message);
        }
        res.render('layout', {
            title: title,
            body: html_content,
            // 傳遞給 layout 的參數，用於控制導航列顯示的 Tab 類型
            tabType: data.tabType || 'none' 
        });
    });
}

// GET / - 第一層獨立的首頁
app.get('/', function (req, res) {
    renderPage(res, 'index', '歡迎');
});

// GET /login - 登入頁面
app.get('/login', function (req, res) {
    // 渲染 views/auth/login.hjs，不需要 layout
    res.render('auth/login', {}, (err, html_content) => {
        if (err) {
            console.error("Error rendering login template:", err);
            return res.status(500).send("Template Error: " + err.message);
        }
        // 渲染 layout，但 body 塞入登入/註冊內容
        res.render('layout', {
            title: '會員登入/註冊',
            body: html_content,
            tabType: 'none' // 登入頁面不顯示 Tab 導航
        });
    });
});

// --- 主功能區 (登入/訪客後的頁面) ---

// GET /app/guest - 訪客存取 (僅 '搜尋' Tab)
app.get('/app/guest', function (req, res) {
    // 傳入 tabType: 'guest' 告訴 layout.hjs 顯示訪客導航
    renderPage(res, 'app', '訪客模式', { tabType: 'guest' });
});

// GET /app/member - 會員存取 (3 個 Tab 完整功能)
app.get('/app/member', function (req, res) {
    // 傳入 tabType: 'member' 告訴 layout.hjs 顯示完整導航
    renderPage(res, 'app', '功能主頁', { tabType: 'member' });
});

// --- Tab 內容 HTMX 請求 (不帶 layout) ---

app.get('/search', function (req, res) {
    res.render('pages/search', {});
});

app.get('/edit', function (req, res) {
    res.render('pages/edit', {});
});

app.get('/custom', function (req, res) {
    res.render('pages/custom', {});
});

app.get('/login-form', function (req, res) {
    res.render('auth/login', {});
});

app.get('/signup-form', function (req, res) {
    res.render('auth/signup', {});
});

module.exports = app;