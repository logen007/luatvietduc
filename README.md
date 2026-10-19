# Luật Việt Đức — HTML prototype 0.3

Bản duyệt UX cho chuyên trang pháp luật dành cho người Việt tại Đức. Mục tiêu: hiện đại, gọn, dễ tra cứu; chuyển 13 mẫu wireframe thành giao diện HTML có thể bấm thử.

## Xem bản duyệt

- Trang chủ: https://logen007.github.io/luatvietduc/#/
- Sơ đồ, đối chiếu 13 mẫu và ghi chú: https://logen007.github.io/luatvietduc/#/so-do
- Tra cứu: https://logen007.github.io/luatvietduc/#/tra-cuu
- Bài mẫu: https://logen007.github.io/luatvietduc/#/hoi-dap/uy-quyen-quan-ly-nha
- Gửi câu hỏi mẫu: https://logen007.github.io/luatvietduc/#/gui-cau-hoi

## Những thay đổi cần duyệt

Menu chính còn Tra cứu / Cẩm nang & Tin / Về chuyên trang. Trang chủ ưu tiên tìm kiếm và 6 tình huống. Giữ nguyên 10 lĩnh vực chuyên môn phía sau; tình huống, lĩnh vực, hỏi đáp dùng chung dữ liệu và URL bài viết.

Bộ lọc, phân trang, tìm không dấu, đọc bài, lưu bài, biểu mẫu, xác thực và trao đổi riêng đều có tương tác mẫu. Mobile là bố cục thích ứng, không phải ảnh desktop được thu nhỏ. Tài khoản hiển thị bằng tên chức năng thay cho nhãn Plus.

## Giới hạn quan trọng

Đây KHÔNG phải website tiếp nhận hồ sơ hoặc tư vấn pháp luật thật. Các bài là dữ liệu minh họa, chưa có kết luận pháp lý hay chuyên gia kiểm duyệt được xác nhận.

Không có backend, API dữ liệu, đăng nhập thật, gửi email, bản tin thật hoặc lưu hồ sơ. Mã 123456 chỉ phục vụ thao tác mô phỏng, tuyệt đối không dùng cho hệ thống xác thực thật. Mọi dữ liệu biểu mẫu, câu hỏi, tùy chọn và bài lưu chỉ nằm trong bộ nhớ trang; tải lại sẽ xóa dữ liệu. Không nhập thông tin thật. Chính sách trên trang là vị trí trình bày bản dự thảo, chưa được duyệt pháp lý.

CSP chặn kết nối dữ liệu từ JavaScript và gửi form ra ngoài. Không tích hợp analytics. Nhà cung cấp hosting vẫn có thể có nhật ký truy cập thông thường. Repository và bản duyệt công khai; noindex không phải kiểm soát truy cập.

## Mã nguồn

- `index.html`: khung giao diện, menu và hộp thoại.
- `assets/styles.css`: hệ thiết kế và responsive.
- `assets/content.js`: 10 lĩnh vực, 6 tình huống, dữ liệu bài mẫu dùng chung.
- `assets/app.js`: điều hướng hash, render, tương tác và dữ liệu mô phỏng trong RAM.
- `scripts/test-prototype.py`: kiểm tra Chromium, 6 chiều rộng và các luồng chính; xuất ảnh và báo cáo trong `build/qa`.
- `.nojekyll`: phục vụ mã tĩnh trên GitHub Pages.

Không cần công cụ build để chạy web. Dùng một static server, ví dụ `python3 -m http.server 8000`, rồi mở `http://localhost:8000`. Bộ đóng gói QA còn xuất một file HTML tự chứa, mở trực tiếp được mà không cần server.

## Thử các luồng chính

1. Tìm `uy quyen`, mở bài, xem mục nguồn, gửi câu hỏi từ bài.
2. Nhấn Lưu bài khi chưa đăng nhập; chọn tài khoản mẫu hoặc dùng email giả và mã 123456; trở về bài đang đọc.
3. Mở form, nhấn Điền thông tin mẫu, đánh dấu đồng ý minh họa, gửi thử, theo dõi rồi gửi bổ sung.

Bản cũ được giữ trong lịch sử Git tại commit `43a7d7a6dcd14cf58591932f08092e94c736882e`. Các hash cũ WF01–WF13 được ánh xạ sang giao diện mới.

## Phạm vi triển khai

Nguồn GitHub Pages: main, thư mục root. Chưa cấu hình tên miền riêng hoặc VPS; không thay đổi repo G2G Exam. Trước vận hành cần nội dung đã kiểm duyệt, pháp nhân, chính sách dữ liệu, backend, email, phân quyền, lưu trữ và tiêu chí nghiệm thu riêng.

Nguồn yêu cầu: `Yeu_cau_Sitemap_User_Flow_Wireframe_Viet_kieu_Duc.docx` và các quyết định UX trong cuộc trao đổi về dự án Luật Việt Đức. Bản này là đề xuất duyệt giao diện, không tự thay đổi các cam kết pháp lý/vận hành đang chờ xác nhận.
