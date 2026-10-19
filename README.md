# Luật Việt Đức — bản duyệt HTML 0.4

Tin tức, đời sống và pháp luật dành cho người Việt tại Đức. Giao diện trắng, xám, đen; ảnh cũng được chuyển đen trắng.

## Xem trực tiếp

- Trang chủ: https://logen007.github.io/luatvietduc/#/
- Tin tức: https://logen007.github.io/luatvietduc/#/tin-tuc
- Sống ở Đức: https://logen007.github.io/luatvietduc/#/song-o-duc
- Cộng đồng: https://logen007.github.io/luatvietduc/#/cong-dong
- Tra cứu pháp luật: https://logen007.github.io/luatvietduc/#/tra-cuu
- Nguồn ảnh: https://logen007.github.io/luatvietduc/#/nguon-anh
- Sơ đồ và ghi chú: https://logen007.github.io/luatvietduc/#/so-do

## Nội dung và ảnh

Trang chủ ưu tiên tin có ảnh, đời sống, cộng đồng và các đường tra cứu ngắn. Giữ lại 10 lĩnh vực và các luồng hỏi đáp, lưu bài, gửi câu hỏi, tài khoản mô phỏng.

10 bài chọn lọc tóm tắt bằng tiếng Việt, dẫn nguồn gốc trong bài. Ngày nguồn tách biệt ngày đối chiếu 19/10/2026. Không phải hệ thống tin tức cập nhật tự động; bài cũ không giả lập thành tin mới. Chưa có người kiểm duyệt pháp lý được xác nhận.

8 ảnh có nguồn, 24 biến thể WebP đen trắng (600/1200/1800). 7 ảnh theo Unsplash License; ảnh Dong Xuan Center năm 2012 theo CC BY-SA 3.0, giữ ghi công và giấy phép cho bản chuyển đổi. Ảnh minh họa không phải bằng chứng về sự kiện hoặc hoàn cảnh của người trong ảnh. Xem assets/photo-sources.json và trang Nguồn ảnh.

## Mã nguồn

- index.html: khung, menu, hộp thoại.
- assets/styles.css: hệ giao diện và luồng tra cứu, đã chuyển màu trung tính.
- assets/newsroom.css: bố cục tin tức responsive.
- assets/content.js: dữ liệu hỏi đáp mẫu.
- assets/news-content.js: bài có nguồn và metadata ảnh.
- assets/newsroom.js: trang chủ, danh sách tin, chi tiết và nguồn ảnh.
- assets/app.js: điều hướng dùng chung và tương tác mô phỏng.
- assets/photos/: ảnh nội bộ, không hotlink.
- scripts/test-editorial.py: kiểm tra Chromium, 6 chiều rộng, màu, ảnh và các luồng cũ.

Chạy bằng static server, ví dụ python3 -m http.server 8000. Không cần build framework. GitHub Pages xuất bản main, thư mục root. Các tệp .migration là dữ liệu đối chiếu cho lần chuyển từ 0.3 sang 0.4, không chạy trong trình duyệt.

## Giới hạn

Form, email, OTP và câu hỏi riêng chỉ là bản bấm thử. Không có backend, không gửi email, không tiếp nhận hồ sơ. Chỉ nhập dữ liệu giả. Mã 123456 không phải cơ chế xác thực thật. Dữ liệu trong RAM, mất khi tải lại; không dùng localStorage/sessionStorage. CSP chặn kết nối dữ liệu ra ngoài. Hosting vẫn có thể có nhật ký truy cập thông thường.

Chưa cấu hình tên miền riêng hoặc VPS. Không thay đổi G2G Exam. Bản 0.3 giữ trong lịch sử Git tại f2cf16de10d68b0ee39af8e241f3849ba92344b3; bản wireframe đầu vẫn ở wireframe-v0.1.html.
