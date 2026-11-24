# Rà soát tiếp: ổn định lúc tải trang — 2026-11-08

## Phạm vi

Tiếp nối phép đo ảnh/chunk ở `2026-11-08-site-speed.md`. Dùng cùng Chrome,
PostgreSQL `lvd_test` và tài khoản giả; chặn kết nối ngoài localhost. Không dùng
hội thoại, tệp hoặc khóa production. Đây là đo local, không phải tốc độ hay
percentile người dùng thật trên website đang chạy.

Ma trận 36 đường dẫn × mobile 390px/DPR 2 và desktop 1280px/DPR 1: 72 lượt,
bao gồm trang chủ, thư viện VN/DE, chủ đề, tin tức, bài tin, bài viết CMS,
giới thiệu, liên hệ, trợ giúp, chính sách, tài khoản, hỏi đáp và toàn bộ nhóm
admin. Tất cả trả trang thành công, không lỗi JavaScript hoặc tràn ngang.
Editor vẫn không tải trên các trang admin không soạn thảo; ảnh AVIF và WebP
fallback mỗi trường hợp chỉ tải một ảnh; cả hai collection lưu nháp/reload
nội dung có chữ đậm và bảng thành công.

Sau sửa bổ sung khung editor và vị trí nút ngôn ngữ, đo lại 15 lượt: tài khoản
đăng ký/đăng nhập/quên mật khẩu và tạo bài viết/kiến thức, ở 390/1280/1700px.
Không dựng lại ứng dụng trong khi máy chủ thử đang phục vụ một ma trận.

## Nguyên nhân và thay đổi

- Native Payload có trạng thái menu từ server nhưng CSS cũ chỉ đặt chiều rộng
  sau hydration. Ngoài ra Payload đóng menu mặc định dưới 1440px, trong khi
  icon rail của dự án bắt đầu từ 1025px. Khung desktop nay có chiều rộng ngay
  từ lần vẽ đầu, đồng bộ rail trong giai đoạn đọc viewport/preference. Không
  thay provider, preference hoặc quyền; menu vẫn mở/đóng theo native state.
- Nút đổi vai trò đợi xác minh phiên rồi mới chèn trước menu. Server chỉ chừa
  chỗ khi viewer đủ điều kiện; placeholder inert/disabled. Nút thực và các
  yêu cầu đổi vai trò vẫn đợi kiểm tra phiên như trước.
- Drive configuration trước đây chèn cả form lên trên những card đã vẽ.
  Dùng chính khung form/cấu hình công khai để giữ kích thước khi tải, không
  có giá trị bí mật hoặc thao tác được trước khi đọc đúng revision.
- Quy tắc trả lời dùng khung theo danh mục quy tắc mặc định, không đẩy phần
  giới hạn xuống sau khi API trả về. Các ô chờ không có nội dung quy tắc riêng
  hoặc hành động lưu; dữ liệu thật vẫn qua endpoint có quyền.
- Tài khoản giữ khung chờ theo chế độ URL; không công bố form đăng ký trước
  khi biết trạng thái phiên. Không đổi đăng nhập/khôi phục/token/cache.
- Khung editor giữ chỗ trong lúc tải chunk và khởi tạo. Nút ngôn ngữ chỉ
  xuất hiện tại thanh công cụ, không vẽ ở thân form rồi chuyển vị trí.

## Mức dịch chuyển bố cục quan sát được (CLS)

Một lượt/context mới, không phải benchmark mạng production. Giá trị rất nhỏ
vẫn có thể khác giữa các lần chạy hoặc nội dung thực khác fixture.

| Trang | Mobile trước → sau | Desktop trước → sau |
| --- | ---: | ---: |
| Tài khoản đăng ký | 0,260 → 0,0011 | <0,0001 → <0,0001 |
| Tổng quan admin | 0,048 → 0 | 0,052 → 0 |
| Danh sách bài viết | 0,048 → 0 | 0,364 → 0,0003 |
| Sao lưu | 0,643 → 0 | 0,305 → 0 |
| Quy tắc trả lời | 0,563 → 0 | 0,162 → 0 |
| Tạo bài viết | 0,162 → 0 | 0,107 → 0,0055 |
| Tạo kiến thức | 0,254 → 0,0011 | 0,052 → 0,0021 |

Ở 1700px, tạo bài viết khoảng 0,0039; tạo kiến thức khoảng 0,0015. Các select
native vẫn có thay đổi nhỏ lúc khởi tạo; không tuyên bố mọi trang CLS bằng 0.
Không che các dịch chuyển bằng cache dữ liệu riêng tư, mở form trái quyền hay
nới giới hạn phiên.

## Kiểm tra hồi quy

Bộ rà soát explicit `test-loading-stability.mjs` bổ sung observer CLS, ngưỡng
0,1, bên cạnh kiểm tra màu/chữ trước và sau tải. Không gắn browser audit vào
postbuild hoặc làm chậm mọi lần triển khai thường lệ.

Bản cuối: production build và TypeScript đạt; 584/584 unit/domain checks đạt.
56 lượt trước/sau tải công khai ở VI/DE và 22 lượt admin đều qua kiểm tra màu,
chữ và CLS ≤ 0,1. Luồng menu mở/thu gọn, nút role tab/icon, owner → support,
khôi phục owner và các từ chối truy cập trong preview đều đạt; không đổi role
được lưu của tài khoản. Máy chủ thử và DB đã dừng sau khi hoàn tất.
