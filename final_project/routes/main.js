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
            body: html_content
        });
    });
}

// GET / - 第一層獨立的首頁 (包含 Start 按鈕)
app.get('/', function (req, res) {
    renderPage(res, 'index', '歡迎'); // 使用新的 index.hjs
});

// GET /app - 第二層主應用程式頁面 (包含三個 Tab)
app.get('/app', function (req, res) {
    // 假設我們在 app.hjs 中將導航列和 tab-content 放在一起
    // 在這裡讀取 navbar.hjs 的內容並傳給 app.hjs
    res.render('navbar', {}, (err, navbar_html) => {
        if (err) {
            console.error('Error rendering navbar:', err);
            return renderPage(res, 'app', '功能主頁', { navbar: '' });
        }
        // 將 navbar 的 HTML 傳遞給 app.hjs
        renderPage(res, 'app', '功能主頁', { navbar: navbar_html }); 
    });
});

// GET /search, /edit, /custom - 處理 Tab 內容的 HTMX 請求 (不帶 layout)
app.get('/search', function (req, res) {
    res.render('pages/search', {});
});

app.get('/edit', function (req, res) {
    res.render('pages/edit', {});
});

app.get('/custom', function (req, res) {
    res.render('pages/custom', {});
});

module.exports = app;