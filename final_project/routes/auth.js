const express = require('express');
const app = express.Router();
const crypto = require('crypto'); // 用於簡單密碼雜湊

// 通用 SQL 錯誤處理輔助函數 (參考實驗手冊的 doSQL 精神)
function handleSQL(SQL, parms, res, callback) {
    app.connection.execute(SQL, parms, function (err, data) {
        if (err) {
            console.log("SQL Error: ", err); // 伺服器端日誌
            // 以 404 狀態碼回傳錯誤訊息給 HTMX 處理
            res.status(404).send(err.sqlMessage);
        } else {
            callback(data); // 成功則執行回調函數
        }
    });
}

// 密碼雜湊輔助函數
function hashPassword(password) {
    // 簡單的 SHA-256 雜湊，實務上應使用 bcrypt 或 scrypt
    return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /signup - 處理用戶註冊
app.post('/signup', function (req, res) {
    // 註冊表單欄位
    const { suCompany, suEmail, suPhone, suPassword, suPlan } = req.body;
    const hashedPassword = hashPassword(suPassword);

    if (!suEmail || !suPassword) {
        return res.status(400).send("Email and password are required.");
    }

    let SQL = "INSERT INTO Users (company, email, phone, password, plan) VALUES (?, ?, ?, ?, ?)";
    let parms = [suCompany, suEmail, suPhone, hashedPassword, suPlan];

    app.connection.execute(SQL, parms, function (err, data) {
        if (err) {
            console.log("SQL Error: ", err); 
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).send("註冊失敗：此電子郵件已註冊。");
            }
            return res.status(500).send("註冊失敗：伺服器發生錯誤。");

        } else {
            const message = `Account created successfully for ${suEmail}! Please log in.`;
            res.send(`<div remove-me="10s" style="background-color: #28a745; color: white;">${message}</div>
                      <script>
                        document.getElementById('page-signup').classList.add('hidden');
                        document.getElementById('page-login').classList.remove('hidden');
                      </script>
                     `); 
        }
    });
});

// POST /login - 處理用戶登入
app.post('/login', function (req, res) {
    const { loginEmail, loginPassword } = req.body;
    const hashedPassword = hashPassword(loginPassword);

    let SQL = "SELECT ID, company, plan FROM Users WHERE email = ? AND password = ?";

    handleSQL(SQL, [loginEmail, hashedPassword], res, function (data) {
        if (data.length > 0) {
            res.set('HX-Redirect', '/dashboard');
            res.send("Login successful.");
        } else {
            res.status(401).send("Invalid email or password.");
        }
    });
});

// GET /dashboard - 簡單的登入後頁面
app.get('/dashboard', function (req, res) {
    res.send('<h1 class="text-center">Welcome to the Dashboard!</h1><p class="text-center">You are logged in.</p>');
});

module.exports = app;