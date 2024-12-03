const mysql = require('mysql');
// const multer = require('multer');

// Tạo kết nối
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'paradiso'
});

db.connect(err => {
    if (err) {
        console.error("Lỗi kết nối database:", err.message);
        process.exit(1);
    }
    console.log("Đã kết nối database từ database.js");
});

module.exports = db; // Export đối tượng db
