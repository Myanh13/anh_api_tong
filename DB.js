const mysql = require('mysql');
// const multer = require('multer');

// Tạo kết nối
const db = mysql.createConnection({
    host: 'bgq0zloanrc41mpwrymy-mysql.services.clever-cloud.com',
    user: 'ukpuldbrcm38x0h3',
    password: '4i8oafrcHe4ZXICqwzbD',
    // port: 3306,
    database: 'bgq0zloanrc41mpwrymy'
});

db.connect(err => {
    if (err) {
        console.error("Lỗi kết nối database:", err.message);
        process.exit(1);
    }
    console.log("Đã kết nối database từ database.js");
});

module.exports = db; // Export đối tượng db
