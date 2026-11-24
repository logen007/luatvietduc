# Kiểm tra tốc độ toàn bộ nhóm trang — 2026-11-08

## Phạm vi và cách đo

Chrome trên máy Mac, context mới cho từng trang; 390×844/DPR 2 và
1280×844/DPR 1. Có 36 đường dẫn × 2 kích thước = 72 lượt. Toàn bộ quản trị
được mở bằng tài khoản owner giả, PostgreSQL `lvd_test` riêng, không chứa dữ
liệu khách. Chặn kết nối nhà cung cấp bên ngoài trong ma trận này; không gửi
email, không gọi Gemini/Groq, không ghi R2 hoặc Drive. Máy chủ và DB thử đã dừng.
Các thông số tài nguyên bên dưới là phép đo local, không phải tốc độ production,
không dùng thời gian local để tuyên bố mức cải thiện độ trễ thực tế.

Trước thay đổi đã đọc 18 đường dẫn/nhóm trang production không đăng nhập (kể
cả các chế độ tài khoản, pháp luật Đức, chủ đề và bài tin). Admin/inbox khi chưa
đăng nhập chuyển về login; không coi phép đo đó là đo hộp thư đã đăng nhập.
Ảnh nền tài khoản cũ tải 410.206 byte, và mã Tiptap/ProseMirror xuất hiện trong
các script tải bởi trang đăng nhập quản trị.

## Kết quả thay đổi

- 48 biến thể AVIF cho 8 ảnh dùng chung: 2.571.611 byte so với cùng bộ WebP
  4.013.776 byte, giảm 35,9%. Tất cả nhỏ hơn WebP tương ứng, cùng kích thước
  và tỉ lệ crop. Giữ ảnh gốc, URL WebP, ID thư viện và metadata xã hội.
- Nền tài khoản: 410.206 → 78.232 byte (giảm 80,9%). CSS image-set có WebP
  dự phòng; bố cục, overlay và font không đổi.
- Dùng native picture cho thẻ bài, ảnh bài tin, ảnh nền bài viết và trang liên
  hệ. Kiểm tra Chrome DPR 2 với fetchPriority high: chỉ tải đúng một ảnh 960px,
  không tải WebP trước rồi tải thêm AVIF. Ép định dạng không hỗ trợ xác nhận
  WebP dự phòng vẫn hiển thị đúng.
- Thư viện tệp dùng ảnh xem trước 480px cho đúng 8 họ ảnh đóng gói, giữ đủ ảnh
  không crop. Không tải lại ảnh gốc lớn trong lưới. Không đổi URL/thumbnail
  của tệp tải lên, R2, URL có query hoặc đường dẫn riêng tư.
- Registry field Payload giữ entry nhẹ; Tiptap chỉ nhập khi thực sự mở editor.
  Ba chunk editor riêng khoảng 149 KB gzip không còn tải trên login/danh sách/
  hộp thư/cài đặt/hồ sơ. Không sửa logic editor: implementation được chuyển
  nguyên vẹn. Kiểm tra cả bài viết và kiến thức AI: HTML → trực quan, chữ đậm,
  bảng, lưu nháp và reload đều giữ đúng nội dung.

72 lượt đều trả trang thành công, không lỗi JavaScript, không tràn ngang.
Các trang admin không có editor không tải Tiptap/ProseMirror. 584 unit/domain
checks, TypeScript và production compilation đạt.

## Dịch chuyển bố cục còn ghi nhận

Không đồng nhất việc mở trang thành công với việc mọi chỉ số đã hoàn hảo.
Trong dữ liệu giả, admin vẫn có dịch chuyển khi các khối client hiện ra:
trang sao lưu khoảng 0,64 mobile/0,30 desktop, danh sách bài viết khoảng 0,36
ở desktop. Đây là việc còn cần xử lý riêng ở phần dựng khung chờ/đồng bộ giao
diện trước và sau hydration; bản này không che bằng cache dữ liệu riêng tư
hoặc mở form trước khi xác minh quyền. Các số dưới đây là CLS của một lượt
local, chưa phải percentile người dùng thực.

## Tài nguyên từng trang

Đơn vị KB thập phân; tổng transferSize tài nguyên, không gồm HTML navigation.
Một số ảnh bên dưới fold chưa tải. Nội dung DB giả khác production.

| Đường dẫn | Mobile KB | Desktop KB | CLS mobile | CLS desktop |
|---|---:|---:|---:|---:|
| `/` | 613.1 | 779.9 | 0.000 | 0.000 |
| `/tin-tuc` | 416.1 | 385.1 | 0.000 | 0.000 |
| `/phap-luat/viet-nam` | 339.7 | 325.3 | 0.000 | 0.000 |
| `/phap-luat/duc` | 305.4 | 345.3 | 0.000 | 0.000 |
| `/chu-de/hon-nhan-gia-dinh` | 304.2 | 316.1 | 0.000 | 0.000 |
| `/tin/kindergeld-2026` | 515.2 | 662.2 | 0.000 | 0.000 |
| `/gioi-thieu` | 379.5 | 449.1 | 0.000 | 0.000 |
| `/lien-he` | 337.2 | 379.4 | 0.000 | 0.000 |
| `/quyen-rieng-tu` | 295.3 | 307.2 | 0.000 | 0.000 |
| `/dieu-khoan` | 295.3 | 307.2 | 0.000 | 0.000 |
| `/tro-giup` | 338.7 | 349.4 | 0.000 | 0.000 |
| `/tai-khoan` | 356.7 | 400.7 | 0.260 | 0.000 |
| `/tai-khoan?mode=signin` | 355.6 | 400.7 | 0.268 | 0.000 |
| `/tai-khoan?mode=forgot` | 356.7 | 400.7 | 0.096 | 0.000 |
| `/hoi-dap` | 296.4 | 309.1 | 0.000 | 0.000 |
| `/admin/login` | 821.3 | 821.3 | 0.000 | 0.000 |
| `/admin` | 822.9 | 822.9 | 0.048 | 0.050 |
| `/admin/collections/articles` | 824.9 | 824.9 | 0.048 | 0.364 |
| `/admin/collections/media` | 1260.5 | 1370.9 | 0.048 | 0.052 |
| `/admin/collections/categories` | 825.0 | 823.7 | 0.048 | 0.052 |
| `/admin/collections/tags` | 823.7 | 823.7 | 0.048 | 0.052 |
| `/admin/knowledge` | 823.7 | 823.7 | 0.048 | 0.052 |
| `/admin/inbox` | 824.3 | 824.3 | 0.048 | 0.050 |
| `/admin/settings` | 822.9 | 822.9 | 0.048 | 0.050 |
| `/admin/settings/connections` | 824.3 | 824.3 | 0.048 | 0.052 |
| `/admin/settings/backups` | 824.9 | 824.9 | 0.643 | 0.303 |
| `/admin/account` | 822.9 | 822.9 | 0.048 | 0.052 |
| `/admin/articles/import` | 822.9 | 822.9 | 0.048 | 0.052 |
| `/admin/knowledge/rules` | 826.2 | 826.2 | 0.563 | 0.162 |
| `/admin/collections/users` | 823.7 | 823.7 | 0.048 | 0.052 |
| `/admin/collections/users/create` | 822.9 | 822.9 | 0.041 | 0.052 |
| `/admin/collections/quick-replies` | 823.7 | 823.7 | 0.048 | 0.052 |
| `/admin/globals/site-settings` | 823.2 | 823.2 | 0.040 | 0.052 |
| `/admin/collections/articles/create` | 979.7 | 979.7 | 0.162 | 0.107 |
| `/admin/collections/knowledge/create` | 978.8 | 978.8 | 0.254 | 0.052 |
| `/bai-viet/synthetic-speed-public` | 359.7 | 366.1 | 0.000 | 0.000 |
