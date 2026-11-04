# Cấu trúc đang chạy

Ứng dụng hiện hành ở `apps/cms`, phục vụ https://luatvietduc.com. Root `index.html`
và `assets/` là nguồn giao diện được giữ lại. `platform/` là bộ quy tắc nền; quyền,
giao dịch và API thực tế nằm trong CMS.

## Nơi sửa

| Phần | Module |
|---|---|
| Danh tính, logo, menu, footer công khai | `modules/shared/public-shell.mjs`, cùng hợp đồng cho React và adapter trang cũ |
| Phiên đăng nhập | `modules/shared/account-state.mjs`, hợp đồng `identity/contracts.ts`, React qua `session-client.ts` |
| Ngôn ngữ | `modules/shared/locale/de.json`, dùng chung cả hai bộ dựng |
| Cấu hình công khai | `modules/settings/view.ts`, client cache ở `client-store.ts` và `client.ts`, tách khỏi vault bí mật |
| Nhãn/mô tả admin | `modules/admin/presentation.ts`, `i18n.ts`, `pages.ts` |
| Giao thức HTTP | `modules/http/`, giữ đường dẫn cũ |
| API kiến thức | `modules/knowledge/http.ts`, nghiệp vụ trong `articles.ts` |
| Dữ liệu chat client/server | `modules/chat/contracts.ts` |
| Gửi tin, tiếp nhận, đóng/mở | `modules/chat/service.ts`, giao dịch PostgreSQL |
| Hàng chờ trả lời | `modules/assistant/queue.ts`, `worker.ts` |
| Căn cứ và phạm vi AI | `modules/assistant/`, `modules/rag/` |
| Tệp riêng tư | `modules/chat/files.ts`, kiểm tra quyền tại server |
| Kết nối | `modules/integrations/`, khóa mã hóa trong vault |
| Sao lưu/khôi phục thử | `modules/backup/`, `ops/backup/` |

## Gửi tin và trả lời

Header, tài khoản, chat và hộp thư dùng chung phiên React. Các lượt kiểm tra phiên
đồng thời chia sẻ một yêu cầu; thay tài khoản, vai trò, phạm vi hoặc mất phiên đổi
revision. Nội dung riêng tư được che ngay trong render và kết quả tải của revision
cũ bị bỏ qua. Quyền thực tế vẫn do server kiểm tra, không dựa vào cache client.
Cài đặt công khai dùng cache 30 giây, chia sẻ yêu cầu và cập nhật khi quay lại tab;
lỗi mạng giữ cấu hình công khai gần nhất, còn lỗi phiên xóa dữ liệu tài khoản.

Tin nhắn và job được lưu trong cùng giao dịch. Khách nhận xác nhận lưu trước khi
Gemini xử lý. Hai consumer có giới hạn dùng khóa/lease, nhận lại việc sau khi lease
hết hạn; job chỉ giữ tham chiếu, không sao chép hội thoại. Tiếp nhận bởi chuyên viên
hoặc câu hỏi mới hủy hiệu lực kết quả AI cũ. Pipeline hiện có vẫn kiểm tra nguồn,
hạn mức, điều kiện sử dụng, phiên bản và trạng thái hội thoại trước khi ghi phản hồi.

Frontend đọc nhanh khi chờ AI, giãn nhịp khi không thay đổi và ngủ khi tab ẩn.
Đây là polling thích nghi, chưa phải WebSocket/SSE. Worker chỉ bật ở production,
được tắt trong build/CI/candidate; không mở thêm cổng hay bật dịch vụ trả phí.

## CSS và phát hành

`presentation/modules.json` quản lý nguồn bundle; không sửa bundle riêng.
`live.css` là khung dùng chung; `customer-chat.css` chỉ trang chat tải;
`specialist-inbox.css` phục vụ hộp thư; `admin-theme.css` sinh từ CSS admin;
`editorial-ui.css` phục vụ nội dung trang chủ/các trang cũ.

CSS admin/công khai đi qua snapshot có checksum, đổi con trỏ nguyên tử và tự
phục hồi nếu kiểm tra phục vụ thất bại. Sửa React/logic cần build. Sửa schema dùng
triển khai đã rà soát, sao lưu và migration tương thích. Không bỏ kiểm tra để hứa
mọi thay đổi đều tức thời. Nhãn/mô tả admin sửa ở presentation.ts; quyền, validation,
hook và trường dữ liệu ở module nghiệp vụ. Không sửa migration lịch sử.

Đồng bộ bài viết đã bật AI sang knowledge và job lập chỉ mục vẫn diễn ra trong
cùng giao dịch qua trigger PostgreSQL, được quản lý bằng migration mới.

## Giới hạn

Các trang nội dung cũ còn adapter JavaScript; tài khoản/chat/bài viết dùng React.
Hai bộ dựng đã dùng chung hợp đồng cấu hình và phiên, chưa chuyển mọi trang sang
React. Nhập nguồn kiến thức cũ còn để sửa dữ liệu đã có; viết mới dùng bài viết +
checkbox AI. Kiểm tra cấu trúc không thay thế đo tải, đánh giá chất lượng pháp lý
hay đợt khôi phục Drive thật.
