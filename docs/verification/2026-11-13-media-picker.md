# Hộp chọn và tải tệp — 2026-11-13

Hộp chọn dùng chung cho các upload field của Payload (ảnh chính, banner) và
Thêm tệp trong trình soạn bài. Hai tab Tải tệp lên / Thư viện, lưới chọn có dấu
chọn, thông tin tệp, tìm kiếm và nút xác nhận; không chèn ngay khi bấm ảnh.
Dùng BeforeListTable để thư viện trống vẫn có đầy đủ thao tác. Giữ truy vấn và
filterOptions do native drawer thực thi trên server, không mở rộng quyền.

Admin thấy lựa chọn công khai khi tải trong hộp chọn; upload trong Thư viện độc
lập vẫn riêng tư như trước. Chuyên viên không được tăng quyền công khai tệp.
Chỉ tự chọn tệp vừa tải khi nó có trong danh sách hợp lệ của field. Đợi native
refresh hoàn tất sau upload, giữ lỗi từng tệp khi tải thành công một phần, giữ
kiểm tra biên nhận và không tự gửi lại một upload chưa xác nhận.

Đường dẫn preview dự phòng dùng native file endpoint có kiểm tra quyền hoặc
đúng URL tài nguyên đóng gói. Không thay kho lưu trữ, schema hay ảnh đã có.

## Kiểm tra đã chạy

- TypeScript và production build đạt.
- 649 unit/domain tests đạt, gồm transport receipt/abort, công khai được yêu cầu
  rõ ràng trong payload, preview URL và bộ lọc/quyền sửa media.
- `scripts/test-media-picker-browser.mjs` chạy trên Chromium, viewport 320, 390,
  768 và 1280 px; hai cỡ nhỏ bật touch/mobile emulation.
- Kiểm tra ảnh chính chỉ có ảnh công khai; trình soạn bài có cả tệp công khai;
  ảnh riêng tư không hiện; xác nhận chọn trước khi chèn; không tràn ngang;
  nút xác nhận tối thiểu 44px; tiêu đề/nút đóng cùng hàng; đổi tab bằng phím mũi
  tên; ảnh thumbnail decode thành công; tìm không có kết quả vẫn tải lên được;
  lỗi upload vẫn ở tab upload; upload thành công chuyển thư viện/chọn đúng tệp;
  chèn ảnh thực vào Tiptap.
- Dùng server build, database `lvd_test` và tài khoản/bài/tệp giả. Mock POST
  upload thành công/thất bại và byte ảnh tại browser; không upload tới R2 thật.
  Giữ HTTPS guard của editor, dùng relative URL tương đương cho localhost HTTP.
- Ảnh kiểm tra nằm trong `apps/cms/test-results/media-picker/` (không commit).

Chưa kiểm tra trực tiếp Safari/iPhone thật. Đây là xác minh cục bộ, không phải
xác nhận đã triển khai production hoặc đã thử upload với tài khoản thật.
