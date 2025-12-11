const express = require('express');
const app = express.Router();
const crypto = require('crypto');

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

app.post('/api/register', function (req, res) {
    const { name, email, password } = req.body;

    // 檢查是否有遺漏的欄位
    if (!name || !email || !password) {
        return res.status(400).send("註冊失敗：所有欄位皆為必填項。");
    }

    // (1) 雜湊密碼 (使用 SHA-256)
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // (2) 執行 SQL 插入操作
    const sql = `INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`;
    const connection = req.app.get('connection'); // 假設 connection 已經從 app.js 注入到 req.app

    connection.query(sql, [name, email, hashedPassword], (err, result) => {
        if (err) {
            // 處理常見錯誤：例如 email 重複 (UNIQUE 限制)
            if (err.code === 'ER_DUP_ENTRY') {
                console.error("註冊失敗：Email 已被註冊。");
                // 這裡我們簡單重定向回註冊頁面並顯示訊息 (實際應用中應使用 Toast)
                return res.send(`
                    <script>
                        alert('註冊失敗：此電子郵件已被使用。');
                        window.location.href='/signup';
                    </script>
                `);
            }
            console.error("資料庫插入錯誤:", err);
            return res.status(500).send("註冊失敗：伺服器內部錯誤。");
        }

        console.log("新使用者註冊成功:", result.insertId);

        // 註冊成功後，重定向到登入頁面
        res.send(`
            <script>
                alert('註冊成功！請使用您的帳號密碼登入。');
                window.location.href='/login';
            </script>
        `);
    });
});

app.post('/api/login', function (req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send("登入失敗：請輸入帳號和密碼。");
    }

    // (1) 雜湊輸入的密碼
    const inputHashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // (2) 執行 SQL 查詢：通過 email 查找使用者
    const sql = `SELECT id, name, password FROM Users WHERE email = ?`;
    const connection = req.app.get('connection');

    connection.query(sql, [email], (err, results) => {
        if (err) {
            console.error("資料庫查詢錯誤:", err);
            return res.status(500).send("登入失敗：伺服器內部錯誤。");
        }

        if (results.length === 0) {
            // 找不到該 email 的使用者
            return res.send(`
                <script>
                    alert('登入失敗：電子郵件或密碼錯誤。');
                    window.location.href='/login';
                </script>
            `);
        }

        const user = results[0];

        // (3) 比對雜湊密碼
        if (user.password === inputHashedPassword) {
            // 登入成功！
            // *** 這裡應該設置 Session/Token，但我們暫時直接跳轉 ***
            console.log(`使用者 ${user.name} (ID: ${user.id}) 登入成功。`);

            // 跳轉到完整功能頁面
            return res.redirect('/app/user');
        } else {
            // 密碼不匹配
            return res.send(`
                <script>
                    alert('登入失敗：電子郵件或密碼錯誤。');
                    window.location.href='/login';
                </script>
            `);
        }
    });
});

app.get('/api/html/countries', function (req, res) {
    const sql = `SELECT name FROM countries_3nf ORDER BY name`;
    const connection = req.app.get('connection');

    connection.query(sql, (err, results) => {
        if (err) {
            console.error("獲取國家列表失敗:", err);
            return res.status(500).send('<option value="" disabled selected>-- 載入失敗 --</option>');
        }

        let htmlOptions = '<option value="" disabled selected>-- 選擇一個國家 --</option>';

        // 將結果轉換為 HTML 字串
        results.forEach(row => {
            // 使用模板字串生成 <option>
            htmlOptions += `<option value="${row.name}">${row.name}</option>`;
        });

        res.send(htmlOptions); // 直接回傳 HTML 字串
    });
});

app.get('/api/search/country_trend', function (req, res) {
    const countryName = req.query.country;

    if (!countryName) {
        return res.send("<p>請選擇一個國家來查看數據。</p>");
    }

    const sql = `
        SELECT Year, LifeExpectancy 
        FROM data1 
        WHERE Entity = ? 
        ORDER BY Year ASC
    `;

    // ===================================================
    // 【修正點】：新增連線變數的定義
    const connection = req.app.get('connection');
    // ===================================================

    // 檢查連線是否成功獲取 (僅供除錯，確保不是連線問題)
    if (!connection) {
        console.error("錯誤：無法獲取資料庫連線物件！");
        return res.status(500).send("<p>伺服器連線配置錯誤。</p>");
    }

    connection.query(sql, [countryName], (err, results) => {

        console.log(`國家趨勢查詢成功：${countryName}`);
        console.log("資料庫回傳的結果:", results);

        // ===================================================
        // 【修正點】: 檢查 results.length 是否為 0
        if (results.length === 0) {
            // 如果查無資料，則立即回傳，並使用 return 確保後續代碼不執行
            return res.send(`<p>查無 **${countryName}** 的預期壽命數據。</p>`);
        }
        // ===================================================

        // --- (A) 數據存在，開始生成 HTML 表格 ---
        let htmlTable = `
            <p>顯示國家：**${countryName}** (共 ${results.length} 筆記錄)</p>
            <table class="data-table" style="width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th>年份</th>
                        <th>預期壽命 (年)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        results.forEach(row => {

            // 由於您確認資料庫回傳大寫鍵，這裡使用大寫存取
            const yearRaw = row.Year;
            const leRaw = row.LifeExpectancy;

            // 安全處理 DECIMAL 數據
            let formattedLE = 'N/A';
            if (leRaw !== undefined && leRaw !== null) {
                const leNumber = parseFloat(leRaw);
                if (!isNaN(leNumber)) {
                    // 使用 4 位小數，避免精度損失
                    formattedLE = leNumber.toFixed(4);
                } else {
                    formattedLE = leRaw.toString();
                }
            }

            const yearValue = (yearRaw !== undefined && yearRaw !== null) ? yearRaw : 'N/A';

            htmlTable += `
                <tr>
                    <td>${yearValue}</td>
                    <td>${formattedLE}</td>
                </tr>
            `;
        });

        // --- (B) 封閉表格和樣式 ---
        htmlTable += `
                </tbody>
            </table>
            <style>
                .data-table th, .data-table td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                .data-table th {
                    background-color: #f2f2f2;
                }
            </style>
        `;

        // 成功回傳結果
        res.send(htmlTable);
    });
});

app.get('/api/html/years', function (req, res) {
    // 查詢 data1 表中所有不重複的年份，並按降序排列 (新年份在前面)
    const sql = `SELECT DISTINCT Year FROM data1 ORDER BY Year DESC`;
    const connection = req.app.get('connection');
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error("獲取年份列表失敗:", err);
            return res.status(500).send('<option value="" disabled selected>-- 載入失敗 --</option>');
        }
        
        let htmlOptions = '<option value="" disabled selected>-- 選擇年份 --</option>';
        
        // 將結果轉換為 HTML 字串
        results.forEach(row => {
            // 由於您的資料庫回傳大寫 Year，我們使用 row.Year
            const year = row.Year; 
            htmlOptions += `<option value="${year}">${year}</option>`;
        });
        
        res.send(htmlOptions); // 直接回傳 HTML 字串
    });
});

app.get('/api/search/subregion_rank', function (req, res) {
    // 1. 從前端獲取參數
    const regionCode = req.query.region_code; // 區域代碼 (例如: 142)
    const year = req.query.year;           // 年份 (例如: 2020)

    if (!regionCode || !year) {
        return res.send("<p>請選擇區域和年份來查看排名。</p>");
    }

    // 2. 組合 SQL 查詢
    const sql = `
        SELECT
            d1.Entity,
            d1.LifeExpectancy
        FROM data1 d1
        JOIN countries_3nf c3 ON d1.Entity = c3.name
        WHERE
            c3.region_code = ? AND
            d1.Year = ?
        ORDER BY
            d1.LifeExpectancy DESC
    `;

    const connection = req.app.get('connection');

    // 3. 執行查詢
    connection.query(sql, [regionCode, year], (err, results) => {
        if (err) {
            console.error("查詢區域排名失敗:", err);
            return res.status(500).send("<p>排名數據查詢失敗，請檢查資料庫和連線。</p>");
        }

        console.log(`區域排名查詢成功：區域代碼 ${regionCode}，年份 ${year}`);
        // console.log("資料庫回傳的結果:", results); // 可以註釋掉或保留

        if (results.length === 0) {
            return res.send(`<p>查無區域代碼 **${regionCode}** 在 **${year}** 年的數據。</p>`);
        }

        // 4. 生成 HTML 表格
        let htmlTable = `
            <p>顯示區域代碼：**${regionCode}**，年份：**${year}** (共 ${results.length} 筆記錄)</p>
            <table class="data-table" style="width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th>排名</th>
                        <th>國家/地區</th>
                        <th>預期壽命 (年)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let rank = 1;
        results.forEach(row => {
            // 資料庫回傳大寫鍵
            const countryName = row.Entity;
            const leRaw = row.LifeExpectancy;

            // 安全處理 DECIMAL 數據
            let formattedLE = 'N/A';
            if (leRaw !== undefined && leRaw !== null) {
                const leNumber = parseFloat(leRaw);
                if (!isNaN(leNumber)) {
                    formattedLE = leNumber.toFixed(2); // 顯示 2 位小數
                } else {
                    formattedLE = leRaw.toString();
                }
            }

            htmlTable += `
                <tr>
                    <td style="font-weight: bold;">${rank++}</td>
                    <td>${countryName}</td>
                    <td>${formattedLE}</td>
                </tr>
            `;
        });

        // 封閉表格和樣式
        htmlTable += `
                </tbody>
            </table>
            <style>
                /* ... (重複使用功能一的表格樣式) ... */
                .data-table th, .data-table td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                .data-table th {
                    background-color: #f2f2f2;
                }
                .data-table tr:nth-child(even) { /* 隔行換色 */
                    background-color: #f9f9f9;
                }
            </style>
        `;

        res.send(htmlTable);
    });
});

app.get('/api/search/region_max_le', function (req, res) {
    const regionCode = req.query.region_code;
    const year = req.query.year;

    if (!regionCode || !year) {
        return res.send("<p>請選擇區域和年份來查詢最大預期壽命。</p>");
    }

    // 1. 組合 SQL 查詢：使用 JOIN, WHERE, GROUP BY, MAX
    const sql = `
        SELECT
            s.subregion_name AS sub_region_name,
            MAX(d1.LifeExpectancy) AS max_life_expectancy
        FROM data1 d1
        JOIN countries_3nf c3 ON d1.Entity = c3.name
        JOIN subregions s ON c3.subregion_code = s.subregion_code 
        WHERE
            c3.region_code = ? AND
            d1.Year = ?
        GROUP BY
            s.subregion_name
        ORDER BY
            /* 【修正點】: 將最大預期壽命設為主要排序鍵 (降序) */
            max_life_expectancy DESC, 
            s.subregion_name ASC 
    `;

    const connection = req.app.get('connection');

    connection.query(sql, [regionCode, year], (err, results) => {
        if (err) {
            console.error("查詢區域最大預期壽命失敗:", err);
            return res.status(500).send("<p>數據查詢失敗，請檢查資料庫和連線。</p>");
        }

        console.log(`區域最大預期壽命查詢成功：區域代碼 ${regionCode}，年份 ${year}`);

        if (results.length === 0) {
            return res.send(`<p>查無區域代碼 **${regionCode}** 在 **${year}** 年的次區域數據。</p>`);
        }

        // 2. 生成 HTML 表格
        let htmlTable = `
            <p>區域代碼：**${regionCode}**，年份：**${year}** (共 ${results.length} 個次區域)</p>
            <table class="data-table" style="width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th>次區域</th>
                        <th>最大預期壽命 (年)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        results.forEach(row => {
            // 資料庫回傳的欄位名稱通常是小寫，或基於別名 (alias)
            // 這裡假設會回傳 sub_region_name 和 max_life_expectancy (基於 SQL AS 別名)
            const subRegionName = row.sub_region_name;
            const maxLERaw = row.max_life_expectancy;

            // 安全處理 DECIMAL 數據
            let formattedLE = 'N/A';
            if (maxLERaw !== undefined && maxLERaw !== null) {
                const leNumber = parseFloat(maxLERaw);
                if (!isNaN(leNumber)) {
                    formattedLE = leNumber.toFixed(2); // 顯示 2 位小數
                } else {
                    formattedLE = maxLERaw.toString();
                }
            }

            htmlTable += `
                <tr>
                    <td>${subRegionName}</td>
                    <td>${formattedLE}</td>
                </tr>
            `;
        });

        // 封閉表格和樣式
        htmlTable += `
                </tbody>
            </table>
            <style>
                /* ... (重複使用功能一的表格樣式) ... */
                .data-table th, .data-table td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                .data-table th {
                    background-color: #f2f2f2;
                }
            </style>
        `;

        res.send(htmlTable);
    });
});

app.get('/api/search/keyword', function (req, res) {
    // 1. 從前端獲取參數
    const keyword = req.query.keyword;

    if (!keyword || keyword.trim() === '') {
        return res.send("<p>請輸入至少一個關鍵字進行搜尋。</p>");
    }

    // 2. 組合 SQL 查詢：找出匹配國家在最新年份的預期壽命
    // 注意：我們使用 LIKE 進行部分匹配，並用 CONCAT('%', ?, '%') 組合參數。
    // 使用雙重 JOIN (或子查詢) 來找出每個國家在匹配 Entity 條件下的 MAX(Year) 數據。
    
    const searchKeyword = `%${keyword}%`;

    const sql = `
        SELECT
            d1.Entity,
            d1.LifeExpectancy,
            d1.Year
        FROM data1 d1
        INNER JOIN (
            /* 子查詢：找出每個匹配國家的最大年份 */
            SELECT
                Entity,
                MAX(Year) AS max_year
            FROM data1
            WHERE Entity LIKE ?
            GROUP BY Entity
        ) AS latest_data
        ON d1.Entity = latest_data.Entity AND d1.Year = latest_data.max_year
        
        ORDER BY
            d1.LifeExpectancy DESC
    `;

    const connection = req.app.get('connection');

    // 3. 執行查詢
    connection.query(sql, [searchKeyword], (err, results) => {
        if (err) {
            console.error("關鍵字查詢失敗:", err);
            return res.status(500).send("<p>關鍵字查詢失敗，請檢查資料庫和連線。</p>");
        }

        console.log(`關鍵字查詢成功：'${keyword}'，找到 ${results.length} 筆記錄。`);

        if (results.length === 0) {
            return res.send(`<p>找不到包含關鍵字 **${keyword}** 的國家數據。</p>`);
        }

        // 4. 生成 HTML 表格
        let htmlTable = `
            <p>關鍵字：**${keyword}**，找到 ${results.length} 筆最新數據。</p>
            <table class="data-table" style="width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th>排名</th>
                        <th>國家/地區</th>
                        <th>最近年份</th>
                        <th>預期壽命 (年)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        let rank = 1;
        results.forEach(row => {
            // 資料庫回傳大寫鍵
            const countryName = row.Entity;
            const leRaw = row.LifeExpectancy;
            const year = row.Year;
            
            // 安全處理數據
            let formattedLE = 'N/A';
            if (leRaw !== undefined && leRaw !== null) {
                const leNumber = parseFloat(leRaw);
                if (!isNaN(leNumber)) {
                    formattedLE = leNumber.toFixed(4); 
                } else {
                    formattedLE = leRaw.toString();
                }
            }

            htmlTable += `
                <tr>
                    <td style="font-weight: bold;">${rank++}</td>
                    <td>${countryName}</td>
                    <td>${year}</td>
                    <td>${formattedLE}</td>
                </tr>
            `;
        });
        
        // 封閉表格和樣式
        htmlTable += `
                </tbody>
            </table>
            <style>
                /* ... (重複使用功能一的表格樣式) ... */
                .data-table th, .data-table td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                .data-table th {
                    background-color: #f2f2f2;
                }
                .data-table tr:nth-child(even) { 
                    background-color: #f9f9f9;
                }
            </style>
        `;

        res.send(htmlTable);
    });
});

app.post('/api/edit/add_next_year', function (req, res) {
    const { country, year_to_add, life_expectancy } = req.body;

    if (!country || !year_to_add || !life_expectancy) {
        return res.send('<span style="color: red;">新增失敗：請填寫所有欄位。</span>');
    }

    const connection = req.app.get('connection');
    
    // 1. 查詢該國家對應的 Code (使用 alpha3 欄位)
    // 這裡使用 AS Code 是為了保持 Node.js 變數名稱與 data1 表格的 Code 欄位一致
    const selectCodeSql = `SELECT alpha3 AS Code FROM countries_3nf WHERE name = ?`; 
    
    connection.query(selectCodeSql, [country], (err, codeResults) => {
        if (err || codeResults.length === 0) {
            console.error("獲取 Code (alpha3) 失敗:", err || `找不到 ${country} 的代碼。`);
            return res.status(500).send(`<span style="color: red;">新增失敗：無法找到國家代碼，請檢查 countries_3nf 資料。</span>`);
        }

        // 確保我們存取 AS Code 的結果
        const countryCode = codeResults[0].Code; 

        // 2. 執行 INSERT INTO data1
        const insertSql = `
            INSERT INTO data1 (Entity, Code, Year, LifeExpectancy)
            VALUES (?, ?, ?, ?)
        `;
        
        connection.query(insertSql, [country, countryCode, parseInt(year_to_add), parseFloat(life_expectancy)], (err, result) => {
            if (err) {
                console.error("新增記錄失敗:", err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.send(`<span style="color: red;">新增失敗：${country} 在 ${year_to_add} 年的記錄已存在，請使用更新功能。</span>`);
                }
                return res.status(500).send(`<span style="color: red;">新增失敗：伺服器/資料庫錯誤。</span>`);
            }

            console.log(`新增記錄成功: ${country} (${year_to_add})，Code: ${countryCode}`);
            res.send(`<span style="color: green;">成功新增 ${country} (${countryCode}) 在 ${year_to_add} 年的預期壽命記錄。</span>`);
        });
    });
});

app.post('/api/edit/update_record', function (req, res) {
    const { country, year, life_expectancy } = req.body;

    if (!country || !year || !life_expectancy) {
        return res.send('<span style="color: red;">更新失敗：請填寫所有欄位。</span>');
    }

    // 使用 UPDATE 語句
    const sql = `
        UPDATE data1
        SET LifeExpectancy = ?
        WHERE Entity = ? AND Year = ?
    `;
    const connection = req.app.get('connection');

    connection.query(sql, [parseFloat(life_expectancy), country, parseInt(year)], (err, result) => {
        if (err) {
            console.error("更新記錄失敗:", err);
            return res.status(500).send(`<span style="color: red;">更新失敗：伺服器/資料庫錯誤。</span>`);
        }
        
        // 檢查是否有記錄被實際更新
        if (result.affectedRows === 0) {
            return res.send(`<span style="color: orange;">⚠️ 更新完成，但 ${country} 在 ${year} 年的記錄不存在。</span>`);
        }

        console.log(`更新記錄成功: ${country} (${year})`);
        res.send(`<span style="color: green;">成功更新 ${country} 在 ${year} 年的預期壽命。</span>`);
    });
});

app.post('/api/edit/delete_range', function (req, res) {
    const { country, start_year, end_year } = req.body;

    if (!country || !start_year || !end_year) {
        return res.send('<span style="color: red;">刪除失敗：請填寫所有欄位。</span>');
    }

    // 檢查起始年份和結束年份的邏輯
    if (parseInt(start_year) > parseInt(end_year)) {
        return res.send('<span style="color: red;">刪除失敗：起始年份必須小於或等於結束年份。</span>');
    }

    // 使用 DELETE 語句，並使用 BETWEEN 進行範圍刪除
    const sql = `
        DELETE FROM data1
        WHERE Entity = ? 
        AND Year BETWEEN ? AND ?
    `;
    const connection = req.app.get('connection');

    connection.query(sql, [country, parseInt(start_year), parseInt(end_year)], (err, result) => {
        if (err) {
            console.error("刪除記錄失敗:", err);
            return res.status(500).send(`<span style="color: red;">刪除失敗：伺服器/資料庫錯誤。</span>`);
        }

        const affectedCount = result.affectedRows;
        console.log(`刪除記錄成功: ${country}, 範圍 ${start_year}-${end_year}，共 ${affectedCount} 筆。`);
        
        if (affectedCount === 0) {
            return res.send(`<span style="color: orange;">⚠️ 刪除完成，但 ${country} 在該年份範圍內沒有找到記錄。</span>`);
        }

        res.send(`<span style="color: green;">✅ 成功刪除 ${country} 從 ${start_year} 年到 ${end_year} 年共 ${affectedCount} 筆記錄。</span>`);
    });
});

app.get('/api/custom/multi_trend', function (req, res) {
    // 1. 從前端獲取參數：多個國家名稱 (以逗號分隔的字串)
    const countriesString = req.query.countries;

    if (!countriesString) {
        return res.status(400).send("請選擇至少一個國家進行對比。");
    }

    // 將逗號分隔的字串轉換為陣列
    const countryList = countriesString.split(',').map(c => c.trim());

    // 2. 組合 SQL 查詢：查詢所有選定國家歷年的數據
    // 我們使用 IN (?) 來傳入國家列表
    const sql = `
        SELECT
            Entity,
            Year,
            LifeExpectancy
        FROM data1
        WHERE Entity IN (?) 
        ORDER BY
            Entity, Year ASC
    `;

    const connection = req.app.get('connection');

    connection.query(sql, [countryList], (err, results) => {
        if (err) {
            console.error("查詢多國家趨勢失敗:", err);
            return res.status(500).send("數據查詢失敗，請檢查資料庫和連線。");
        }

        if (results.length === 0) {
            return res.status(404).send("查無所選國家組合的數據。");
        }

        // 3. 將扁平化的 SQL 結果轉換為 Highcharts 所需的結構 (Series 陣列)
        const seriesDataMap = new Map();

        results.forEach(row => {
            // 資料庫回傳大寫鍵
            const entity = row.Entity;
            const year = row.Year;
            const leRaw = row.LifeExpectancy; 
            
            // 轉換預期壽命為數字
            const lifeExpectancy = parseFloat(leRaw);

            if (isNaN(lifeExpectancy)) return; // 忽略無效數據

            if (!seriesDataMap.has(entity)) {
                seriesDataMap.set(entity, { name: entity, data: [] });
            }
            
            // Highcharts 的數據點格式為 [x, y]，這裡 x=Year, y=LifeExpectancy
            // 注意：x 軸的年份必須是數字
            seriesDataMap.get(entity).data.push([year, lifeExpectancy]);
        });

        // 轉換 Map 為 Highcharts 期望的陣列格式
        const highchartsSeries = Array.from(seriesDataMap.values());

        // 4. 以 JSON 格式回傳
        res.json(highchartsSeries);
    });
});

module.exports = app;