const db = require('./DB'); // Import từ database.js
const express = require('express');
const axios = require('axios');
require('./cron-job');
const multer = require('multer');
const path = require('path');
const moment = require('moment');
/////////////////////////////////////////////////
const app = express();
const bodyParser = require('body-parser');  // Thư viện để xử lý dữ liệu POST
const crypto = require('crypto');
///////////////////////////////////////////////
const fs = require('fs'); 
var cors = require('cors');
const { METHODS } = require('http');
const { log } = require('console');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//    ngrok config add-authtoken 2p3piWeNUIuaWIP4lo3SWohbuDI_3zKkyrwRCqb5KEFh9671u
//    ngrok http http://localhost:3000

//   03/07    9704 0000 0000 0018    NGUYEN VAN A	OTP

//////////////////////////////////////conect Da ta/////////////////////////////////

app.get('/donhangchuacoc', (req, res) => {
    // Query JOIN 3 bảng để lấy thông tin đầy đủ, thêm id_DatHomestay
    let sql = `
        SELECT 
            dh.id_DatHomestay, 
            dh.id_homestay,
            dh.ngay_dat,
            dh.ngay_tra,
            dh.tong_tien_dat,
            dh.TT_Thanhtoan,
            h.ten_homestay,
            u.ten_user,
            u.sdt_user,
            u.email_user
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
            dh.TT_Thanhtoan = "chưa đặt cọc"
    `;

    db.query(sql, (err, data) => {
        if (err) {
            console.error('Lỗi lấy danh sách đơn hàng:', err);
            res.status(500).json({ "thongbao": "Lỗi lấy danh sách đơn hàng", err });
        } else {
            res.status(200).json(data);
        }
    });
});

app.delete('/donhangchuacoc/:id', function (req, res){
    let id = req.params.id;
    let sql = `DELETE FROM dat_homestay WHERE id_DatHomestay =?`
    db.query(sql, id, (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi xóa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã xóa sản phẩm thành công"});
    })
})
app.get('/donhangdacoc', (req, res) =>{
    let sql = `SELECT 
            dh.id_DatHomestay,  -- Thêm trường id_DatHomestay
            dh.id_homestay,
            dh.ngay_dat,
            dh.ngay_tra,
            dh.tong_tien_dat,
            dh.TT_Thanhtoan,
            h.ten_homestay,
            u.ten_user,
            u.sdt_user,
            u.email_user
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
            dh.TT_Thanhtoan = 'đã đặt cọc' `
    db.query (sql, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗii lấy list donhang", err});
        else res.json(data);
    })
})
app.get('/donhangdacoc/:id', (req, res) => {
    const { id } = req.params; // Lấy id từ URL
    const sql = `
        SELECT 
            dh.id_DatHomestay,  
            dh.id_homestay,
            dh.ngay_dat,
            dh.ngay_tra,
            dh.tong_tien_dat,
            dh.TT_Thanhtoan,
            h.ten_homestay,
            u.ten_user,
            u.sdt_user,
            u.email_user
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
            dh.TT_Thanhtoan = 'đã đặt cọc'
        AND 
            dh.id_DatHomestay = ?
    `;

    db.query(sql, [id], (err, data) => {
        if (err) {
            res.status(500).json({ thongbao: "Lỗi lấy chi tiết đơn hàng", err });
        } else if (data.length === 0) {
            res.status(404).json({ thongbao: "Không tìm thấy đơn hàng với ID này" });
        } else {
            res.json(data[0]); // Trả về chi tiết đơn hàng
        }
    });
});

app.put('/donhangdacoc/:id', (req, res) => {
    const { id } = req.params;
    const {
        ngay_dat,
        ngay_tra,
        tong_tien_dat,
        id_user,
        created_at,
        TT_Thanhtoan, // Trạng thái thanh toán
        tien_coc_truoc, // Tiền cọc đã trả trước
        tien_can_thanhtoan, // Tiền cần thanh toán
        voucher // Voucher giảm giá (nếu có)
    } = req.body;

    // Kiểm tra đầu vào hợp lệ
    if (!id || !ngay_dat || !ngay_tra || !tong_tien_dat || !id_user || !created_at || !TT_Thanhtoan || !tien_coc_truoc || !tien_can_thanhtoan) {
        return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin.' });
    }

    // Câu truy vấn cập nhật
    const sqlUpdate = `
        UPDATE dat_homestay 
        SET 
            ngay_dat = ?, 
            ngay_tra = ?, 
            tong_tien_dat = ?, 
            id_user = ?, 
            created_at = ?, 
            TT_Thanhtoan = ?, 
            tien_coc_truoc = ?, 
            tien_can_thanhtoan = ?, 
            voucher = ?
        WHERE id_DatHomestay = ?`;

    // Thực hiện cập nhật dữ liệu
    db.query(
        sqlUpdate,
        [ngay_dat, ngay_tra, tong_tien_dat, id_user, created_at, TT_Thanhtoan, tien_coc_truoc, tien_can_thanhtoan, voucher, id],
        (err, result) => {
            if (err) {
                console.error('Lỗi khi cập nhật dữ liệu:', err);
                return res.status(500).json({ error: 'Lỗi khi cập nhật dữ liệu.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Không tìm thấy đơn đặt homestay.' });
            }

            res.status(200).json({ message: 'Cập nhật thành công!' });
        }
    );
});
app.delete('/donhangdacoc/:id', function (req, res){
    let id = req.params.id;
    let sql = `DELETE FROM dat_homestay WHERE id_DatHomestay =?`
    db.query(sql, id, (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi xóa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã xóa sản phẩm thành công"});
    })
})

app.get('/donhangdathanhtoan', (req, res) =>{
    let sql = `SELECT 
            dh.id_DatHomestay,  -- Thêm trường id_DatHomestay
            dh.id_homestay,
            dh.ngay_dat,
            dh.ngay_tra,
            dh.tong_tien_dat,
            dh.TT_Thanhtoan,
            h.ten_homestay,
            u.ten_user,
            u.sdt_user,
            u.email_user
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
            dh.TT_Thanhtoan = 'đã thanh toán' `
    db.query (sql, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗii lấy list donhang", err});
        else res.json(data);
    })
})
app.delete('/donhang/:id', function (req, res){
    let id = req.params.id;
    let sql = `DELETE FROM dat_homestay WHERE id_DatHomestay =?`
    db.query(sql, id, (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi xóa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã xóa sản phẩm thành công"});
    })
})

//check voucher
app.get("/donhangdacoc/:id", (req, res) => {
    const { id } = req.params;
  
    const sql = `
      SELECT dh.id_DatHomestay, hs.ten_homestay, dh.ten_user, dh.tong_tien_dat, dh.tien_coc_truoc
      FROM don_hang dh
      JOIN homestay hs ON dh.id_homestay = hs.id_homestay
      WHERE dh.id_DatHomestay = ?;
    `;
  
    db.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Lỗi truy vấn:", err);
        return res.status(500).json({ message: "Lỗi khi lấy dữ liệu đơn hàng" });
      }
  
      if (results.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }
  
      res.json(results[0]);
    });
  });
  // Route để cập nhật trạng thái thanh toán
// Cập nhật thông tin thanh toán trong bảng dat_homestay
app.put('/donhangdathanhtoan/:id', (req, res) => {
    const orderId = req.params.id;
    const { TT_Thanhtoan, tong_tien_dat } = req.body;
  
    console.log('Dữ liệu nhận được từ frontend:', req.body);  // In ra để kiểm tra
  
    // Nếu dữ liệu bị thiếu
    if (!TT_Thanhtoan || !tong_tien_dat) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin.' });
    }
  
    const sqlQuery = `UPDATE dat_homestay SET TT_Thanhtoan = ?, tong_tien_dat = ? WHERE id_DatHomestay = ?`;
  
    db.query(sqlQuery, [TT_Thanhtoan, tong_tien_dat, orderId], (err, result) => {
      if (err) {
        console.error('Lỗi khi cập nhật:', err);
        return res.status(500).json({ error: 'Có lỗi xảy ra khi cập nhật thông tin thanh toán!' });
      }
  
      console.log('Kết quả cập nhật:', result);  // Xem kết quả truy vấn SQL
  
      if (result.affectedRows > 0) {
        return res.status(200).json({ message: 'Cập nhật thành công!' });
      } else {
        return res.status(404).json({ error: 'Không tìm thấy đơn hàng với ID này.' });
      }
    });
  });
app.post("/don_hang", async (req, res) => {
    const { id_DatHomestay, ngay_giao_dich } = req.body;

    try {
        const [result] = await pool.execute(
            `INSERT INTO don_hang (id_DatHomestay, ngay_giao_dich)
             VALUES (?, ?)`,
            [id_DatHomestay, ngay_giao_dich]
        );
        res.json({ message: "Thêm giao dịch mới thành công.", id: result.insertId });
    } catch (error) {
        console.error("Lỗi thêm giao dịch:", error);
        res.status(500).json({ error: "Lỗi server." });
    }
});

///////donhang///////////

//axios PAYMENT
var accessKey = 'F8BBA842ECF85';
var secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
app.post('/payment', async(req, res)=> {
    const { amount } = req.body; // Nhận số tiền từ client
    if (!amount) {
      return res.status(400).json({
        statusCode: 400,
        message: "Số tiền không hợp lệ.",
      });
    }
    var orderInfo = 'pay with MoMo';
    var partnerCode = 'MOMO';
    var redirectUrl = 'http://localhost:3001/thanks';
    var ipnUrl = 'https://8f57-171-250-122-93.ngrok-free.app/callback';
    var requestType = "payWithMethod";
    // var amount = '50000';
    var orderId = partnerCode + new Date().getTime();
    var requestId = orderId;
    var extraData ='';
    var orderGroupId ='';
    var autoCapture =true;
    var lang = 'vi';
    
    //before sign HMAC SHA256 with format
    //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
    var rawSignature = "accessKey=" + accessKey + "&amount=" + amount + "&extraData=" + extraData + "&ipnUrl=" + ipnUrl + "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&partnerCode=" + partnerCode + "&redirectUrl=" + redirectUrl + "&requestId=" + requestId + "&requestType=" + requestType;
    //puts raw signature
    console.log("--------------------RAW SIGNATURE----------------")
    console.log(rawSignature)
    //signature
    const crypto = require('crypto');
    var signature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
    console.log("--------------------SIGNATURE----------------")
    console.log(signature)
    
    //json object send to MoMo endpoint
    const requestBody = JSON.stringify({
        partnerCode : partnerCode,
        partnerName : "Test",
        storeId : "MomoTestStore",
        requestId : requestId,
        amount : amount,
        orderId : orderId,
        orderInfo : orderInfo,
        redirectUrl : redirectUrl,
        ipnUrl : ipnUrl,
        lang : lang,
        requestType: requestType,
        autoCapture: autoCapture,
        extraData : extraData,
        orderGroupId: orderGroupId,
        signature : signature
    });
    //option for axios
    const options ={
        method :"POST",
        url:"https://test-payment.momo.vn/v2/gateway/api/create",
        headers:{
            'Content-type': 'application/json',
            'Content-length':Buffer.byteLength(requestBody)
        },
        data: requestBody
    }
        let result;
        try{
            result = await axios(options);
            return res.status(200).json(result.data);
        } catch(error){
            return res.status(500).json({
                statusCode:500,
                message: "L��i khi gửi yêu cầu đến MoMo",
              
            })
        }
})

app.post('/BookingRoom', (req, res) => {
    const { id_user, id_homestay, ngay_dat, ngay_tra, tong_tien_dat, trang_thai_TT, created_at } = req.body;
    
    // Kiểm tra các trường bắt buộc
    if (!id_user || !id_homestay || !ngay_dat || !ngay_tra || !tong_tien_dat || !trang_thai_TT || !created_at) {
        return res.status(400).json({ message: 'Tất cả các trường là bắt buộc.' });
    }

    // Tính toán thời gian hết hạn (15 phút sau thời điểm tạo)
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 1);

    // Chèn thông tin đặt phòng vào bảng `dat_homestay`
    const insertQuery = `
      INSERT INTO dat_homestay (id_user, id_homestay, ngay_dat, ngay_tra, tong_tien_dat, trang_thai_TT, created_at, expiration_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertQuery, [id_user, id_homestay, ngay_dat, ngay_tra, tong_tien_dat, trang_thai_TT, created_at, expirationTime.toISOString()], (err, results) => {
        if (err) {
            console.error('Lỗi khi thêm dữ liệu vào dat_homestay:', err);
            return res.status(500).json({ message: 'Có lỗi xảy ra khi đặt phòng.', error: err.message });
        }
        
        res.status(200).json({
            message: 'Đặt phòng thành công',
            bookingId: results.insertId,
        });
    });
});

app.post("/callback", async (req, res) => {
    console.log("MoMo callback:: ", req.body); // Log thông tin callback từ MoMo

    const { orderId, resultCode } = req.body;

    try {
        if (!orderId) {
            return res.status(400).json({ message: "Thiếu orderId trong callback." });
        }

        if (resultCode === 0) { // Thanh toán thành công
            const query = `
                UPDATE dat_homestay
                SET trang_thai_TT = 'đã thanh toán', order_id = ?
                WHERE order_id IS NULL AND trang_thai_TT = 'chờ thanh toán'
            `;

            const [results] = await db.query(query, [orderId]); // Sử dụng Promise
            if (results.affectedRows > 0) {
                console.log(`Thanh toán thành công: Cập nhật trạng thái cho orderId: ${orderId}`);
                return res.status(200).json({ message: "Thanh toán thành công." });
            } else {
                console.log(`Không thể cập nhật: Trạng thái đã bị hủy hoặc thanh toán.`);
                return res.status(400).json({ message: "Giao dịch không khả dụng để cập nhật." });
            }
        } else { // Thanh toán thất bại
            console.log(`Thanh toán thất bại cho orderId: ${orderId}`);
            return res.status(200).json({ message: "Thanh toán thất bại." });
        }
    } catch (error) {
        console.error("Lỗi khi xử lý callback từ MoMo:", error.message);
        return res.status(500).json({ message: "Lỗi khi xử lý callback." });
    }
});

app.post('/booking/homestay', (req, res) => {
    const { id_homestay, ngay_dat, ngay_tra, tong_tien_dat, id_user } = req.body;

    // Kiểm tra tính hợp lệ của ngày
    console.log('Dữ liệu nhận tại backend:', { ngay_dat, ngay_tra });
    
    if (!moment(ngay_dat, 'DD/MM/YYYY', true).isValid() || 
        !moment(ngay_tra, 'DD/MM/YYYY', true).isValid()) {
        return res.status(400).json({ error: 'Ngày nhận hoặc ngày trả không hợp lệ' });
    }

    const formattedNgayDat = moment(ngay_dat, 'DD/MM/YYYY').format('YYYY-MM-DD');
    const formattedNgayTra = moment(ngay_tra, 'DD/MM/YYYY').format('YYYY-MM-DD');

    // Kiểm tra logic ngày trả > ngày nhận
    if (new Date(formattedNgayTra) <= new Date(formattedNgayDat)) {
        return res.status(400).json({ error: 'Ngày trả phòng phải lớn hơn ngày nhận phòng' });
    }

    // Kiểm tra Homestay tồn tại
    db.query('SELECT * FROM homestay WHERE id_homestay = ?', [id_homestay], (err, rows) => {
        if (err) {
            console.error('Lỗi truy vấn:', err);
            return res.status(500).json({ error: 'Lỗi hệ thống.' });
        }

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy Homestay.' });
        }

        // Chèn dữ liệu đặt phòng vào cơ sở dữ liệu
        const sqlInsert = `
            INSERT INTO dat_homestay 
            (id_homestay, ngay_dat, ngay_tra, tong_tien_dat, id_user, TT_Thanhtoan) 
            VALUES (?, ?, ?, ?, ?, 'chưa đặt cọc')`;

        db.query(sqlInsert, [id_homestay, formattedNgayDat, formattedNgayTra, tong_tien_dat, id_user], (err) => {
            if (err) {
                console.error('Lỗi khi thêm đặt phòng:', err);
                return res.status(500).json({ error: 'Không thể lưu dữ liệu đặt phòng vào hệ thống.' });
            }
            res.status(200).json({ message: 'Đặt phòng thành công!' });
        });
    });
});
app.put('/booking/homestay/:id', (req, res) => {
    const { id } = req.params;

    // Câu lệnh SQL để cập nhật trạng thái TT_Thanhtoan thành "đã đặt cọc"
    const sqlUpdate = `
        UPDATE dat_homestay 
        SET TT_Thanhtoan = 'đã đặt cọc' 
        WHERE id_DatHomestay = ?`;

    db.query(sqlUpdate, [id], (err, result) => {
        if (err) {
            console.error('Lỗi khi cập nhật trạng thái:', err);
            return res.status(500).json({ error: 'Lỗi hệ thống.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
        }

        res.status(200).json({ message: 'Cập nhật trạng thái thành công!' });
    });
});
app.put('/booking/homestay/:id', (req, res) => {
    const { id } = req.params;

    // Câu lệnh SQL để cập nhật trạng thái TT_Thanhtoan thành "đã đặt cọc"
    const sqlUpdate = `
        UPDATE dat_homestay 
        SET TT_Thanhtoan = 'đã đặt cọc' 
        WHERE id_DatHomestay = ?`;

    db.query(sqlUpdate, [id], (err, result) => {
        if (err) {
            console.error('Lỗi khi cập nhật trạng thái:', err);
            return res.status(500).json({ error: 'Lỗi hệ thống.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
        }

        res.status(200).json({ message: 'Cập nhật trạng thái thành công!' });
    });
});


////////chay dung
// app.post("/callback", async (req, res) => {
//     console.log("callback:: ");
//     console.log(req.body); // Log thông tin callback từ MoMo

//     // Lấy thông tin từ request body
//     const { orderId, resultCode } = req.body;

//     try {
//         if (resultCode === 0) {  // Nếu thanh toán thành công (resultCode là 0)
//             // Cập nhật orderId vào bảng dat_homestay
//             await db.query(
//                 `UPDATE dat_homestay SET trang_thai_TT = 'đã thanh toán' , order_id = ? WHERE order_id IS NULL`,
//                 [orderId] // Chèn orderId vào cột order_id
//             );
//             console.log(`Cập nhật orderId thành công cho orderId: ${orderId}`);
//             return res.status(200).json({ message: "Cập nhật trạng thái: Thanh toán thành công." });
//         } else {
//             // Nếu thanh toán thất bại, không cần làm gì thêm (bỏ qua)  
//             await db.query(
//                 `UPDATE dat_homestay SET trang_thai_TT = 'Thanh toán thất bại', order_id = ? WHERE order_id IS NULL`,
//                 [orderId] // Cập nhật orderId và trạng thái
//             );
//             console.log(`Thanh toán thất bại cho orderId: ${orderId}`);
//             return res.status(200).json({ message: "Thanh toán thất bại." });
//         }
//     } catch (error) {
//         console.error("Lỗi khi cập nhật orderId:", error.message);
//         return res.status(500).json({ message: "Lỗi khi xử lý callback từ MoMo." });
//     }
// });

// Kiểm tra trạng thái giao dịch
app.post("/transaction-status", async(req, res)=> {   
    const { orderId } = req.body;
    const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=MOMO&requestId=${orderId}`;

    const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

    const requestBody = JSON.stringify({
        partnerCode: "MOMO",
        requestId: orderId,
        orderId,
        signature,
        language: 'vi'
    });

    const options = {
        method: "POST",
        url: "https://test-payment.momo.vn/v2/gateway/api/query",
        headers: {
            'Content-type': 'application/json',
            'Content-length': Buffer.byteLength(requestBody)
        },
        data: requestBody
    };

    try {
        let result = await axios(options);
        return res.status(200).json(result.data);
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            message: "Lỗi khi kiểm tra trạng thái thanh toán"
        });
    }
});

// Hàm cập nhật trạng thái thanh toán trong cơ sở dữ liệu
async function updatePaymentStatus(orderId, status) {
    // Cập nhật trạng thái thanh toán vào cơ sở dữ liệu của bạn (ví dụ MongoDB, MySQL, v.v.)
    console.log(`Cập nhật trạng thái thanh toán của đơn hàng ${orderId}: ${status}`);
    // Ví dụ: await db.update({ orderId }, { status });
}


/////////////////////////////////////////////////////////////////////////////////////////////

//lay voucher
app.get('/vouchers', (req, res) => {
    db.query('SELECT * FROM vouchers', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Lỗi khi truy vấn dữ liệu' });
        }
        res.status(200).json(results); // Trả về tất cả các vouchers
    });
});
app.post('/add-voucher', function (req, res){
    let data = req.body;
    let sql = `INSERT INTO vouchers SET?`
    db.query(sql, data, (err, data) => {
        if(err) 
            res.json({"thongbao": "Lỗi thêm vouchers", err});
        else 
            res.json({"thongbao":"Đã thêm vouchers thành công"});
    })
})

app.post('/check-voucher', (req, res) => {
    const { ma_voucher } = req.body;
    console.log(ma_voucher);

    // Kiểm tra mã voucher có được cung cấp không
    if (!ma_voucher) {
        return res.status(400).json({ success: false, message: "Vui lòng cung cấp mã voucher." });
    }

    // Truy vấn cơ sở dữ liệu
    const query = 'SELECT * FROM vouchers WHERE ma_voucher = ?';
    db.query(query, [ma_voucher], (err, results) => {
        if (err) {
            console.error('Lỗi khi truy vấn cơ sở dữ liệu:', err);
            return res.status(500).json({ success: false, message: "Lỗi server." });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mã voucher không tồn tại hoặc không hợp lệ. Vui lòng kiểm tra lại."
            });
        }

        const voucher = results[0];
        const currentDate = new Date();
        const expirationDate = new Date(voucher.ngay_het_han);

        // Kiểm tra ngày hết hạn
        if (currentDate > expirationDate) {
            return res.status(400).json({ success: false, message: "Mã voucher đã hết hạn." });
        }

        // Kiểm tra số lượng còn lại
        if (voucher.so_luong <= 0) {
            return res.status(400).json({ success: false, message: "Mã voucher đã được sử dụng hết." });
        }

        // Trả về kết quả nếu voucher hợp lệ
        return res.status(200).json({
            success: true,
            message: "Mã voucher hợp lệ.",
            data: {
                giam_gia: voucher.giam_gia,
                ngay_het_han: voucher.ngay_het_han,
                so_luong: voucher.so_luong
            }
        });
    });
});

// lấy user
app.get('/user', function(req, res) {
    db.query(`SELECT * FROM users; `,(err, data) => {
      if (err) res.json({"thongbao": "lỗi lấy user", err });
      else res.json(data);
    })
})

// Cấu hình lưu trữ file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'uploads')); // Thư mục lưu trữ file
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname)); // Đặt tên file
    },
  });
  const upload = multer({ storage }); // Tạo middleware Multer
// Endpoint xử lý tải ảnh đại diện
app.post('/user/:id_user/avatar', upload.single('avatar'), (req, res) => {
    const userId = req.params.id_user;
    const avatarFile = req.file;
  
    if (!avatarFile) {
      return res.status(400).json({ "thongbao": "Chưa tải lên file" });
    }
  
    // Tạo đường dẫn cho ảnh đại diện
    const avatarPath = `/uploads/${avatarFile.filename}`;  // Lưu ảnh với tên mới
    const avatarUrl = `http://localhost:3000${avatarPath}`;
  
    // Cập nhật URL ảnh đại diện trong cơ sở dữ liệu
    const sql = `UPDATE users SET avatar = ? WHERE id_user = ?`;
    db.query(sql, [avatarPath, userId], (err, result) => {
      if (err) {
        return res.status(500).json({ "thongbao": "Lỗi khi cập nhật ảnh đại diện", err });
      }
  
      // Trả về đường dẫn ảnh đại diện đã cập nhật
      res.json({ avatarPath });
    });
  });
  
  // Đảm bảo phục vụ các ảnh tải lên dưới dạng tĩnh
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  
//thanhtim loc
//   app.post('/ngaydat', async (req, res) => {
//     const { checkIn, checkOut } = req.body;
//     try {
//         const [rooms] = await db.query(
//             ` SELECT * FROM homestay WHERE id_homestay NOT IN (
//                 SELECT DISTINCT id_homestay 
//                 FROM dat_homestay 
//                 WHERE (ngay_dat <= ? AND ngay_tra >= ?)
//             )
//             `,
//             [checkOut, checkIn]
//         );
//         res.json(rooms);
//     } catch (err) {
//         console.error(err); // Xem chi tiết lỗi
//         res.status(500).json({ message: 'Lỗi server' });
//     }
// });

//lấy tất cả loaiHomestay
app.get('/loaihomestay', function(req, res){
    let sql = `SELECT * FROM loai_homestay`
    db.query (sql, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗi lấy list homestay", err});
        else res.json(data);
    })
})

//lấy theo loại homestay
app.get('/loaihomestay', function(req, res){
    let id_loai = parseInt(req.params.id_loai)
    if (isNaN(id_loai) || id_loai <= 0) {
        res.json({"thongbao":"Không biết loại", "id_loai": id_loai}); return;
    }
    let sql = `SELECT * FROM loai_homestay WHERE id_Loai =?`
    db.query(sql, id_loai, (err, data)=>{
        if(err) res.json({"thongbao":"Lỗi lấy  loai", err});
        else res.json(data[0]);
    })
})

// //lấy tất cả Homestay
app.get('/homestay', function(req, res){
    let sql = `SELECT * FROM homestay`
    db.query (sql, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗi lấy list homestay", err});
        else res.json(data);
    })
})

  //lấy tất cả Homestay theo id
app.get('/homestay/:id', function(req, res) {
    const id = parseInt(req.params.id); // Lấy `id` từ URL và chuyển thành số nguyên
    // Kiểm tra tính hợp lệ của `id`
    if (isNaN(id) || id <= 0) {
        res.json({ "thongbao": "ID không hợp lệ", "id": id });
        return;
    }
    // Truy vấn cơ sở dữ liệu để lấy homestay theo `id`
    let sql = `SELECT * FROM homestay WHERE id_homestay = ?`;
    db.query(sql, [id], (err, data) => {
        if (err) {
            res.json({ "thongbao": "Lỗi lấy homestay", err });
        } else if (data.length === 0) {
            res.json({ "thongbao": "Không tìm thấy homestay với ID này" });
        } else {
            res.json(data[0]); // Trả về homestay đầu tiên (theo `id`)
        }
    });
});

// API lấy danh sách homestay liên quan
app.get("/homestaylienquan/:id", function (req, res) {
    let id = parseInt(req.params.id || 0);
    if (isNaN(id) || id <= 0) {
      res.json({ "thong bao": "Không biết homestay", id: id });
      return;
    }
    let sql = `SELECT * FROM homestay, hinh_homestay, hinh_anh
     WHERE id_Loai = ? AND homestay.id_homestay = hinh_homestay.id_homestay 
    AND hinh_homestay.id_hinh = hinh_anh.id_hinh ORDER BY homestay.id_homestay desc LIMIT 4`;
    db.query(sql, id, (err, data) => {
      if (err) res.json({ thongbao: "Lỗi lấy homestay", err });
      else res.json(data);  // Trả về toàn bộ danh sách homestay
    });
});

// Lấy danh sách homestay theo loại
app.get('/homestay/:id_loai', function(req, res) {
    let id_loai = parseInt(req.params.id_loai);
    
    // Kiểm tra id_loai hợp lệ
    if (isNaN(id_loai) || id_loai <= 0) {
        res.json({ "thongbao": "Không biết loại", "id_loai": id_loai });
        return;
    }
    // Truy vấn lấy danh sách homestay theo id_loai
    let sql = `SELECT * FROM homestay WHERE id_loai = ?`;
    db.query(sql, id_loai, (err, data) => {
        if (err) {
            res.json({ "thongbao": "Lỗi lấy danh sách homestay", err });
        } else if (data.length === 0) {
            res.json({ "thongbao": "Không tìm thấy homestay nào cho loại này" });
        } else {
            res.json(data); // Trả về danh sách homestay
        }
    });
});

// API lấy danh sách hình ảnh của homestay
app.get('/dshinhanh', (req, res) => {
    const id_homestay = req.params.id;

    const query = `
    SELECT *
    FROM homestay, hinh_homestay, hinh_anh
    WHERE homestay.id_homestay = hinh_homestay.id_homestay 
    AND hinh_homestay.id_hinh = hinh_anh.id_hinh
    `;
    db.query(query, [id_homestay], (err, results) => {
        if (err) {
            console.error('Error fetching images:', err);
            return res.status(500).send('Server error');
        }
        res.json(results);
    });
});

// ct homestay
app.get('/ct_homestay/:id', (req, res) => {
    let id = parseInt(req.params.id || 0);
    if (isNaN(id) || id <= 0) {
        res.json({ "thong bao": "Không biết homestay", id: id });
        return;
    }
    console.log('Request homestay ID:', id);
    let sql = 'SELECT * FROM homestay WHERE id_homestay = ?';
    db.query(sql, [id], (err, rows) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ message: 'Internal server error' });
        } else if (rows.length > 0) {
            res.json(rows[0]); // Trả về homestay đầu tiên
        } else {
            res.status(404).json({ message: 'Homestay not found' });
        }
    });
});

//lấy theo loại homestay trong loại
app.get('/homestayTrongLoai/:id_loai', function(req, res){
    let id_Loai = parseInt(req.params.id_loai)
    if (isNaN(id_Loai) || id_Loai <= 0) {
        res.json({"thongbao":"Không biết loại", "id_Loai": id_Loai}); return;
    }
    let sql = `SELECT *  FROM homestay WHERE id_Loai =? ORDER BY id_homestay desc`
    db.query(sql, id_Loai, (err, data)=>{
        if(err) res.json({"thongbao":"Lỗi lấy sản phẩm trong loai", err});
        else res.json(data);
    })
})

// Xử lý form liên hệ
app.post('/contact', (req, res) => {
    const { name, email, message } = req.body;

    // Kiểm tra xem có giá trị nào trống không
    if (!name || !email || !message) {
        return res.status(400).json({ "thongbao": "Vui lòng điền đầy đủ thông tin!" });
    }
    const sql = 'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)';
    db.query(sql, [name, email, message], (err, result) => {
        if (err) {
            console.error("Lỗi khi lưu dữ liệu:", err);
            return res.status(500).json({ "thongbao": "Lỗi khi gửi tin nhắn" });
        }
        res.status(200).json({ "thongbao": "Gửi tin thành công!" });
    });
});

// Lấy tất cả đánh giá cho một homestay
app.get('/danhgia/:id_homestay', (req, res) => {
    const { id_homestay } = req.params;
    const sql = 'SELECT * FROM danh_gia WHERE id_homestay = ?';
    db.query(sql, [id_homestay], (err, results) => {
        if (err) {
            console.error("Lỗi khi lấy đánh giá:", err);
            return res.status(500).json({ "thongbao": "Đã có lỗi khi lấy đánh giá" });
        }
        res.json(results);
    });
});

// Thêm một đánh giá
app.post('/danhgia', (req, res) => {
    const { id_homestay, ten_user, noi_dung, sao } = req.body;
    if (!id_homestay || !ten_user || !noi_dung || !sao) {
        return res.status(400).json({ "thongbao": "Vui lòng điền đầy đủ các trường" });
    }
    const sql = 'INSERT INTO danh_gia (id_homestay, ten_user, noi_dung, sao) VALUES (?, ?, ?, ?)';
    db.query(sql, [id_homestay, ten_user, noi_dung, sao], (err) => {
        if (err) {
            console.error("Lỗi khi thêm đánh giá:", err);
            return res.status(500).json({ "thongbao": "Đã có lỗi khi thêm đánh giá" });
        }
        res.json({ "thongbao": "Đánh giá đã được thêm thành công" });
    });
});

// Cập nhật một đánh giá
app.put('/danhgia/:id', (req, res) => {
    const { id } = req.params;
    const { ten_user, noi_dung, sao } = req.body;

    if (!ten_user || !noi_dung || !sao) {
        return res.status(400).json({ "thongbao": "Vui lòng cung cấp thông tin hợp lệ" });
    }

    const query = 'UPDATE danh_gia SET ten_user = ?, noi_dung = ?, sao = ? WHERE id = ?';
    db.query(query, [ten_user, noi_dung, sao, id], (error, results) => {
        if (error) {
            console.error("Lỗi khi cập nhật đánh giá:", error);
            return res.status(500).json({ "thongbao": "Cập nhật không thành công" });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ "thongbao": "Không tìm thấy đánh giá" });
        }
        res.json({ "thongbao": "Đánh giá đã được cập nhật thành công" });
    });
});

// Xóa một đánh giá
app.delete('/danhgia/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM danh_gia WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error("Lỗi khi xóa đánh giá:", err);
            return res.status(500).json({ "thongbao": "Đã có lỗi khi xóa đánh giá" });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ "thongbao": "Không tìm thấy đánh giá" });
        }
        res.json({ "thongbao": "Đánh giá đã được xóa thành công" });
    });
});

// Đăng ký, Đăng nhập
app.post('/Register', (req, res) => {
    let data = req.body;
    let sql = `INSERT INTO users SET ?`;
    db.query(sql, data, (err, data) => {
        if (err) res.json({ "thongbao": "Tài khoản đã tồn tại", err })
        else {
            res.json({ "thongbao": "Tạo tài khoản thành công", data });
        }
    });
})

//dung
// app.post('/login', (req, res) => {
//     const { email_user, pass_user } = req.body;

//     // Kiểm tra dữ liệu đầu vào
//     if (!email_user || !pass_user ) {
//         return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
//     }

//     // SQL query để tìm người dùng theo email
//     const sql = 'SELECT * FROM users WHERE email_user = ?';
//     db.query(sql, [email_user], (err, results) => {
//         if (err) {
//             return res.status(500).json({ message: 'Có lỗi xảy ra', err });
//         }

//         if (results.length === 0) {
//             return res.status(401).json({ message: 'Email không tồn tại hoặc không chính xác!' });
//         }

//         const user = results[0];

//         if (pass_user !== user.pass_user) {
//             return res.status(401).json({ message: 'Mật khẩu không chính xác!' });
//         }

//         // Kiểm tra vai trò (role_id) của người dùng
//         if (user.role_id === 1) {
//             // Người dùng bình thường
//             res.status(200).json({
//                 message: 'Đăng nhập thành công',
//                 user: {
//                     id_user: user.id_user,
//                     ten_user: user.ten_user,
//                     email_user: user.email_user,
//                     sdt_user: user.sdt_user,
//                     role_id: user.role_id,
//                     redirectTo: '/'  // Đường dẫn cho người dùng
//                 }
//             });
//         } else if (user.role_id === 2) {
//             // Quản trị viên
//             res.status(200).json({
//                 message: 'Đăng nhập thành công với quyền admin',
//                 user: {
//                     id: user.id_user,
//                     name: user.ten_user,
//                     email: user.email_user,
//                     dien_thoai: user.sdt_user,
//                     role: user.role_id,
//                     redirectTo: '/admin'  // Đường dẫn cho quản trị viên
//                 }
//             });
//         } else {
//             // Vai trò không xác định
//             res.status(403).json({ message: 'Vai trò người dùng không xác định' });
//         }
//     });
// });

app.post('/login', (req, res) => {
    const { email_user, pass_user } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!email_user || !pass_user) {
        return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
    }

    // SQL query để tìm người dùng theo email
    const sql = 'SELECT * FROM users WHERE email_user = ?';
    db.query(sql, [email_user], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Có lỗi xảy ra', err });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Email không tồn tại hoặc không chính xác!' });
        }

        const user = results[0];

        // Kiểm tra mật khẩu
        if (pass_user !== user.pass_user) {
            return res.status(401).json({ message: 'Mật khẩu không chính xác!' });
        }

        // Logic xử lý dựa trên role
        let redirectTo = '/';
        let roleDescription = '';

        if (user.role_id === 0) {
            // ADMIN
            redirectTo = '/admin';
            roleDescription = 'Quản trị viên';
        } else if (user.role_id === 1) {
            // STAFF
            redirectTo = '/staff';
            roleDescription = 'Nhân viên';
        } else if (user.role_id === 2) {
            // USER
            redirectTo = '/';
            roleDescription = 'Người dùng';
        } else {
            // Vai trò không hợp lệ
            return res.status(403).json({ message: 'Vai trò người dùng không xác định' });
        }

        // Trả về phản hồi
        res.status(200).json({
            message: `Đăng nhập thành công với vai trò ${roleDescription}`,
            user: {
                id_user: user.id_user,
                ten_user: user.ten_user,
                email_user: user.email_user,
                sdt_user: user.sdt_user,
                role: user.role_id,
                redirectTo: redirectTo
            }
        });
    });
});

//thay dỏi pass
app.post('/change-password/:id', (req, res) => {
    const { old_password, new_password, confirm_password } = req.body;
    const id_user = req.params.id;  // Lấy id_user từ tham số URL

    // Kiểm tra dữ liệu đầu vào
    if (!old_password || !new_password || !confirm_password) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin.' });
    }

    // Kiểm tra mật khẩu mới và mật khẩu nhập lại
    if (new_password !== confirm_password) {
        return res.status(400).json({ message: 'Mật khẩu mới và mật khẩu nhập lại không khớp.' });
    }

    // SQL query để lấy thông tin người dùng dựa vào id_user
    const sql = 'SELECT * FROM users WHERE id_user = ?';
    db.query(sql, [id_user], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Có lỗi xảy ra khi truy vấn dữ liệu.', err });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }

        const user = results[0];

        // Kiểm tra mật khẩu cũ có khớp không
        if (old_password !== user.pass_user) {
            return res.status(401).json({ message: 'Mật khẩu cũ không chính xác.' });
        }

        // SQL query để cập nhật mật khẩu mới
        const updateSql = 'UPDATE users SET pass_user = ? WHERE id_user = ?';
        db.query(updateSql, [new_password, id_user], (updateErr, updateResult) => {
            if (updateErr) {
                return res.status(500).json({ message: 'Có lỗi xảy ra khi cập nhật mật khẩu.', updateErr });
            }

            if (updateResult.affectedRows === 0) {
                return res.status(400).json({ message: 'Không thể cập nhật mật khẩu. Vui lòng thử lại.' });
            }

            // Trả về thông báo thành công
            res.status(200).json({ message: 'Đổi mật khẩu thành công.' });
        });
    });
});

app.post('/user', async (req, res) => {
    try {
        const { id, ...updatedData } = req.body;

        // Tìm người dùng theo id và cập nhật thông tin
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updatedData },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: 'Người dùng không tồn tại' });
        }

        res.json(updatedUser);
    } catch (error) {
        console.error('Có lỗi xảy ra:', error);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

app.get('/user', function (req, res){
    let sql = `SELECT * FROM users`
    db.query (sql, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗii lấy list user", err});
        else res.json(data);
    })
})

app.get('/user/:id', function (req, res) {
    const userId = req.params.id;  // Lấy id từ tham số URL
  
    // Truy vấn thông tin người dùng theo id
    let sql = `SELECT * FROM users WHERE id_user = ?`;  // Dùng tham số để tránh SQL Injection
    db.query(sql, [userId], (err, data) => {
      if (err) {
        // Nếu có lỗi khi truy vấn
        return res.status(500).json({ "thongbao": "Lỗi khi lấy thông tin người dùng", err });
      }
  
      if (data.length === 0) {
        // Nếu không tìm thấy người dùng với id tương ứng
        return res.status(404).json({ "thongbao": "Người dùng không tìm thấy" });
      }
  
      // Lấy thông tin người dùng
      const user = data[0];
  
         // Kiểm tra avatar và gán giá trị mặc định nếu không có avatar
         const avatar = user.avatar || "../../image/user2.png";  // Gán avatar mặc định nếu không có
      // Kiểm tra từng trường và gán "Chưa cập nhật" nếu trường đó không có giá trị
      const userData = {
        id_user: user.id_user || "Chưa cập nhật",
        ten_user: user.ten_user || "Chưa cập nhật",
        sdt_user: user.sdt_user || "Chưa cập nhật",
        email_user: user.email_user || "Chưa cập nhật",
        address: user.address || "Chưa cập nhật",
        gender: user.gender || "Chưa cập nhật",
        dob: user.dob || "Chưa cập nhật",
        old_password: user.old_passwordb || "Chưa cập nhật",
        new_password: user.new_password || "Chưa cập nhật",
        confirm_password: user.confirm_password || "Chưa cập nhật",
        avatar: avatar  // Thêm avatar vào dữ liệu người dùng
      };
  
      // Trả về thông tin người dùng đã xử lý
      res.json({ user: userData });
    });
});
  
app.put('/user/:id', function (req, res) {
    const userId = req.params.id;  // Lấy id người dùng từ URL
    let { ten_user, sdt_user, email_user, address, gender, dob } = req.body;  // Lấy dữ liệu từ body
    
    // Kiểm tra và nếu không có giá trị thì gán thành chuỗi rỗng
    ten_user = ten_user || '';
    sdt_user = sdt_user || '';
    email_user = email_user || '';
    address = address || '';
    gender = gender || '';
    dob = dob || '';
  
    // Kiểm tra xem các trường bắt buộc có tồn tại hay không
    // if (!ten_user || !sdt_user || !email_user || !address || !gender || !dob) {
    //   return res.status(400).json({ "thongbao": "Vui lòng cung cấp đầy đủ thông tin để cập nhật" });
    // }
  
    // Cập nhật thông tin người dùng trong cơ sở dữ liệu
    let sql = `
      UPDATE users 
      SET 
        ten_user = ?, 
        sdt_user = ?, 
        email_user = ?, 
        address = ?, 
        gender = ?, 
        dob = ? 
      WHERE id_user = ?
    `;
  
    // Thực thi câu lệnh SQL
    db.query(sql, [ten_user, sdt_user, email_user, address, gender, dob, userId], (err, result) => {
      if (err) {
        return res.status(500).json({ "thongbao": "Lỗi khi cập nhật thông tin người dùng", err });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ "thongbao": "Người dùng không tìm thấy" });
      }
  
      // Trả về thông báo thành công
      res.json({ "thongbao": "Cập nhật thông tin người dùng thành công" });
    });
});

// API kiểm tra email
app.post('/check-email', (req, res) => {
    const { email } = req.body;
  
    const query = 'SELECT * FROM users WHERE email_user = ?';
    db.query(query, [email], (err, results) => {
      if (err) {
        console.error('Lỗi truy vấn:', err);
        return res.status(500).json({ error: 'Lỗi server' });
      }
  
      if (results.length > 0) {
        // Nếu tìm thấy email trong cơ sở dữ liệu
        return res.json({ exists: true });
      } else {
        // Nếu không tìm thấy email
        return res.json({ exists: false });
      }
    });
});

//đặt mật khẩu mới
app.post('/reset-password', (req, res) => {
    const { email_user, phone_number, new_password } = req.body;

    // Kiểm tra nếu thiếu dữ liệu
    if (!email_user || !phone_number || !new_password) {
        return res.status(400).json({ message: '*Thiếu dữ liệu*' });
    }

    // Tìm người dùng dựa trên email và số điện thoại
    const sqlSelect = 'SELECT * FROM users WHERE email_user = ? AND sdt_user = ?';
    db.query(sqlSelect, [email_user, phone_number], (err, results) => {
        if (err) {
            console.error('Lỗi khi tìm người dùng:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Email hoặc số điện thoại không đúng' });
        }

        // Cập nhật mật khẩu mới
        const sqlUpdate = 'UPDATE users SET pass_user = ? WHERE email_user = ? AND sdt_user = ?';
        db.query(sqlUpdate, [new_password, email_user, phone_number], (err) => {
            if (err) {
                console.error('Lỗi khi cập nhật mật khẩu:', err);
                return res.status(500).json({ message: 'Lỗi khi cập nhật mật khẩu' });
            }

            res.status(200).json({ message: 'Cập nhật mật khẩu thành công' });
        });
    });
});

///////////////////////////////ADMIN////////////////////////////////////

// API lấy danh sách hình ảnh của homestay
app.get('/admin/homestay', (req, res) => {
    const id_homestay = req.params.id;

    const query = `
    SELECT *
    FROM homestay, hinh_homestay
    WHERE homestay.id_homestay = hinh_homestay.id_homestay 
    
    `;
    db.query(query, [id_homestay], (err, results) => {
        if (err) {
            console.error('Error fetching images:', err);
            return res.status(500).send('Server error');
        }
        res.json(results);
    });
});

// show loại homestay trong admin
app.get('/admin/loai', function (req, res){
    let sql = `SELECT * FROM loai_homestay`
    db.query (sql, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗi lấy list sp", err});
        else res.json(data);
    })
})

app.get('/admin/homestay/:id', (req, res) => {
    const id_homestay = req.params.id;

    const query = `
    SELECT *
    FROM homestay
    LEFT JOIN hinh_homestay ON homestay.id_homestay = hinh_homestay.id_homestay
    WHERE homestay.id_homestay = ?
    `;

    db.query(query, [id_homestay], (err, results) => {
        if (err) {
            console.error('Error fetching homestay details:', err);
            return res.status(500).send('Server error');
        }

        if (results.length === 0) {
            return res.status(404).send('Homestay not found');
        }

        res.json(results);
    });
});

//định nghĩa route lấy chi tiết 1 loại homestay trong admin
app.get('/admin/loai/:id', function (req, res) {
    let id = parseInt(req.params.id);
    if (id <= 0){
        res.json({"thongbao":"Không tìm thấy sản phẩm", "id": id}); return;
    }
    let sql = `SELECT * FROM loai_homestay WHERE id_Loai = ?`
    db.query(sql, id, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗi lấy 1 sp", err});
        else res.json(data[0]);
    })
})

app.post('/admin/homestay', (req, res) => {
    const { ten_homestay, gia_homestay, mota, danh_gia, TrangThai, id_Loai, url_hinh } = req.body;

    if (!ten_homestay || !gia_homestay || !id_Loai || !url_hinh || typeof TrangThai === 'undefined') {
        return res.status(400).send('Please provide all required fields: ten_homestay, gia_homestay, id_Loai, TrangThai, and url_hinh.');
    }

    // Thêm homestay vào bảng Homestay
    const homestayQuery = `
    INSERT INTO Homestay (ten_homestay, gia_homestay, mota, danh_gia, TrangThai, id_Loai)
    VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(homestayQuery, [ten_homestay, gia_homestay, mota, danh_gia || "Chưa đánh giá", TrangThai, id_Loai], (err, result) => {
        if (err) {
            console.error('Error adding new homestay:', err);
            return res.status(500).send('Server error');
        }

        const homestayId = result.insertId;

        // Thêm hình ảnh vào bảng hinh_homestay cho homestay vừa tạo
        const imageQuery = `
        INSERT INTO hinh_homestay (id_homestay, url_hinh)
        VALUES (?, ?)
        `;

        db.query(imageQuery, [homestayId, url_hinh], (err) => {
            if (err) {
                console.error('Error adding image:', err);
                return res.status(500).send('Server error while adding image');
            }

            res.json({
                message: 'Homestay đã được thêm thành công'
            });
        });
    });
});

app.put('/admin/homestay/:id', (req, res) => {
    const { id } = req.params;
    const { ten_homestay, gia_homestay, mota, danh_gia, TrangThai, id_Loai, url_hinh } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!ten_homestay || !gia_homestay || !id_Loai || !url_hinh || typeof TrangThai === 'undefined') {
        return res.status(400).send('Please provide all required fields: ten_homestay, gia_homestay, id_Loai, TrangThai, and url_hinh.');
    }

    // Cập nhật bảng Homestay
    const updateHomestayQuery = `
    UPDATE Homestay 
    SET ten_homestay = ?, gia_homestay = ?, mota = ?, danh_gia = ?, TrangThai = ?, id_Loai = ?
    WHERE id_homestay = ?
    `;

    db.query(
        updateHomestayQuery,
        [ten_homestay, gia_homestay, mota, danh_gia || "Chưa đánh giá", TrangThai, id_Loai, id],
        (err, result) => {
            if (err) {
                console.error('Error updating homestay:', err);
                return res.status(500).send('Server error while updating homestay');
            }

            // Kiểm tra xem homestay có tồn tại hay không
            if (result.affectedRows === 0) {
                return res.status(404).send('Homestay not found');
            }

            // Cập nhật hình ảnh trong bảng hinh_homestay
            const updateImageQuery = `
            UPDATE hinh_homestay 
            SET url_hinh = ?
            WHERE id_homestay = ?
            `;

            db.query(updateImageQuery, [url_hinh, id], (err) => {
                if (err) {
                    console.error('Error updating image:', err);
                    return res.status(500).send('Server error while updating image');
                }

                res.json({
                    message: 'Homestay đã được cập nhật thành công'
                });
            });
        }
    );
});

//định nghĩa route xóa sản phẩm
app.delete('/admin/homestay/:id', function (req, res){
    let id = req.params.id;
    let sql = `DELETE FROM homestay WHERE id_homestay =?`
    db.query(sql, id, (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi xóa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã xóa sản phẩm thành công"});
    })
})
//Định nghĩa route thêm loại
app.post('/admin/loai', function (req, res){
    let data = req.body;
    let sql = `INSERT INTO loai_homestay SET?`
    db.query(sql, data, (err, data) => {
        if(err) 
            res.json({"thongbao": "Lỗi thêm sản phẩm", err});
        else 
            res.json({"thongbao":"Đã thêm sản phẩm thành công", "id_sp": data.insertId});
    })
})

//định nghĩa route sửa loại homestay
app.put('/admin/loai/:id', function (req, res){
    let id = req.params.id;
    let data = req.body;
    let sql = `UPDATE loai_homestay SET? WHERE id_Loai =?`
    db.query(sql, [data, id], (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi sửa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã sửa sản phẩm thành công"});
    })
})

//định nghĩa route xóa loại homestay
app.delete('/admin/loai/:id', function (req, res){
    let id = req.params.id;
    let sql = `DELETE FROM loai_homestay WHERE id_Loai =?`
    db.query(sql, id, (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi xóa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã xóa sản phẩm thành công"});
    })
})  

// Endpoint POST để thêm nhanvien///////////////////////////////////////////////////////////////////////////////
//chi lay role 1
app.get('/admin/nhanvien/role', function (req, res) {
    let sql = `SELECT * FROM users WHERE role_id = 1`; // Lọc chỉ người dùng có role_id = 1
    db.query(sql, (err, data) => {
        if (err) {
            res.json({ "thongbao": "Lỗi lấy list user", err });
        } else {
            res.json(data);
        }
    });
});
app.get('/admin/nhanvien', function (req, res){
    let sql = `SELECT * FROM users`
    db.query (sql, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗii lấy list user", err});
        else res.json(data);
    })
})

app.get('/admin/nhanvien/:id', function (req, res){
    let id = parseInt(req.params.id);
    if (id <= 0){
        res.json({"thongbao":"Không tìm thấy sản phẩm", "id": id}); return;
    }
    let sql = `SELECT * FROM users WHERE id_user = ?`
    db.query(sql, id, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗi lấy 1 sp", err});
        else res.json(data[0]);
    })
})

//định nghĩa route sửa loại homestay
app.put('/admin/nhanvien/:id', function (req, res){
    let id = req.params.id;
    let data = req.body;
    let sql = `UPDATE users SET? WHERE id_user =?`
    db.query(sql, [data, id], (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi sửa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã sửa sản phẩm thành công"});
    })
})

//định nghĩa route xóa loại homestay
app.delete('/admin/nhanvien/:id', function (req, res){
    let id = req.params.id;
    let sql = `DELETE FROM users WHERE id_user =?`
    db.query(sql, id, (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi xóa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã xóa sản phẩm thành công"});
    })
})  
app.post('/admin/nhanvien', function (req, res) {
    // Lấy dữ liệu từ body của request
    const { ten_user, email_user, sdt_user, pass_user, role_id } = req.body; // Thay đổi từ 'password' thành 'pass_user'
  
    // Kiểm tra dữ liệu nhập vào
    if (!ten_user || !email_user || !sdt_user) {
      return res.status(400).json({ "thongbao": "Vui lòng điền đầy đủ thông tin người dùng!" });
    }
  
    // Gán giá trị mặc định nếu không có pass_user hoặc role_id
    const finalPassword = pass_user || '0000'; // Mật khẩu mặc định là '0000' nếu không có pass_user
    const finalRoleId = role_id || 1; // Vai trò mặc định là 1 nếu không có role_id
  
    // SQL query để thêm người dùng vào cơ sở dữ liệu
    let sql = `INSERT INTO users (ten_user, email_user, sdt_user, pass_user, role_id) 
               VALUES (?, ?, ?, ?, ?)`; // Thay 'password' thành 'pass_user'
  
    // Thực hiện truy vấn để thêm người dùng mới
    db.query(sql, [ten_user, email_user, sdt_user, finalPassword, finalRoleId], (err, result) => {
      if (err) {
        console.error('Có lỗi khi thêm người dùng:', err);
        return res.status(500).json({ "thongbao": "Lỗi khi thêm người dùng", err });
      }
  
      // Nếu thêm thành công, trả về thông báo
      res.status(201).json({ "thongbao": "Thêm người dùng thành công!", data: result });
    });
  });
// Endpoint POST để thêm nhanvien///////////////////////////////////////////////////////////////////////////////
//định nghĩa route ds User//////////////////////////////////////////////////////////////////////////////////////
//chi lay role 1
app.get('/admin/user/role', function (req, res) {
    let sql = `SELECT * FROM users WHERE role_id = 2`; // Lọc chỉ người dùng có role_id = 1
    db.query(sql, (err, data) => {
        if (err) {
            res.json({ "thongbao": "Lỗi lấy list user", err });
        } else {
            res.json(data);
        }
    });
});
app.get('/admin/user', function (req, res){
    let sql = `SELECT * FROM users`
    db.query (sql, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗii lấy list user", err});
        else res.json(data);
    })
})

app.get('/admin/user/:id', function (req, res){
    let id = parseInt(req.params.id);
    if (id <= 0){
        res.json({"thongbao":"Không tìm thấy sản phẩm", "id": id}); return;
    }
    let sql = `SELECT * FROM users WHERE id_user = ?`
    db.query(sql, id, (err, data) =>{
        if(err) res.json({"thongbao":"Lỗi lấy 1 sp", err});
        else res.json(data[0]);
    })
})

//định nghĩa route sửa loại homestay
app.put('/admin/user/:id', function (req, res){
    let id = req.params.id;
    let data = req.body;
    let sql = `UPDATE users SET? WHERE id_user =?`
    db.query(sql, [data, id], (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi sửa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã sửa sản phẩm thành công"});
    })
})

//định nghĩa route xóa loại homestay
app.delete('/admin/user/:id', function (req, res){
    let id = req.params.id;
    let sql = `DELETE FROM users WHERE id_user =?`
    db.query(sql, id, (err, d) => {
        if(err) 
            res.json({"thongbao": "Lỗi xóa sản phẩm", err});
        else 
            res.json({"thongbao":"Đã xóa sản phẩm thành công"});
    })
})  

app.post('/admin/user', function (req, res) {
    // Lấy dữ liệu từ body của request
    const { ten_user, email_user, sdt_user, pass_user, role_id } = req.body; // Thay đổi từ 'password' thành 'pass_user'
  
    // Kiểm tra dữ liệu nhập vào
    if (!ten_user || !email_user || !sdt_user) {
      return res.status(400).json({ "thongbao": "Vui lòng điền đầy đủ thông tin người dùng!" });
    }
  
    // Gán giá trị mặc định nếu không có pass_user hoặc role_id
    const finalPassword = pass_user || '0000'; // Mật khẩu mặc định là '0000' nếu không có pass_user
    const finalRoleId = role_id || 2; // Vai trò mặc định là 1 nếu không có role_id
  
    // SQL query để thêm người dùng vào cơ sở dữ liệu
    let sql = `INSERT INTO users (ten_user, email_user, sdt_user, pass_user, role_id) 
               VALUES (?, ?, ?, ?, ?)`; // Thay 'password' thành 'pass_user'
  
    // Thực hiện truy vấn để thêm người dùng mới
    db.query(sql, [ten_user, email_user, sdt_user, finalPassword, finalRoleId], (err, result) => {
      if (err) {
        console.error('Có lỗi khi thêm người dùng:', err);
        return res.status(500).json({ "thongbao": "Lỗi khi thêm người dùng", err });
      }
  
      // Nếu thêm thành công, trả về thông báo
      res.status(201).json({ "thongbao": "Thêm người dùng thành công!", data: result });
    });
});
//định nghĩa route ds User//////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////ADMIN////////////////////////////////////
// app.listen(3000, () => console.log("ung dung chay voi port 3000"))
const port = 3000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

