
const db = require('./DB'); // Import từ database.js



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

//định nghĩa route ds User
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

///////////////////////////////ADMIN////////////////////////////////////