// const db = require('./DB'); // Import đối tượng db từ file kết nối database

// function checkAndUpdatePaymentStatus() {
//     const query = `
//         UPDATE dat_homestay
//         SET trang_thai_TT = 'đã hủy'
//         WHERE trang_thai_TT = 'chờ thanh toán'
//           AND NOW() > expiration_time
//     `;

//     db.query(query, (err, results) => {
//         if (err) {
//             console.error('Lỗi khi cập nhật trạng thái thanh toán:', err.message);
//             return;
//         }
//         console.log(`Cron job: Đã cập nhật ${results.affectedRows} bản ghi trạng thái thành "đã hủy".`);
//     });
// }

// // Chạy cron job ngay lập tức
// checkAndUpdatePaymentStatus();

// // Thiết lập cron job chạy định kỳ (mỗi 5 phút)
// setInterval(() => {
//     console.log('Cron job đang kiểm tra trạng thái thanh toán...');
//     checkAndUpdatePaymentStatus();
// }, 300000); // 300000ms = 5 phút
