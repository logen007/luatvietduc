# Quy trình FAQ và trò chuyện — Luật Việt Đức

Quyết định của chủ hệ thống ngày 03/11/2026:
- Chuyên viên tự nhập và tự xuất bản FAQ trong quốc gia được phân quyền.
- Bắt đầu bằng câu hỏi – câu trả lời chuẩn hóa; không tự đọc toàn Internet.
- Phạm vi AI chính là tập FAQ được xuất bản, còn hiệu lực. Không dùng kiến thức vốn có của mô hình để bổ sung căn cứ.
- Dùng dịch vụ AI bên ngoài chỉ khi khách đồng ý riêng. Không dùng Higgsfield.
- Hồ sơ cá nhân, kết luận vụ việc, câu hỏi không đủ FAQ: chuyển chuyên viên.

## 1. Nạp FAQ

Chuyên viên vào `/kien-thuc` → Thêm FAQ (hoặc `/admin/collections/knowledge`). Mỗi bản ghi chỉ giải quyết một câu hỏi. Tên nguồn là câu hỏi chuẩn; nội dung theo mẫu:

```
CÂU TRẢ LỜI CHUẨN
[Nội dung được phép dùng]

ĐIỀU KIỆN ÁP DỤNG
[Đối tượng, tình huống và các điều kiện phải đủ]

KHÔNG ÁP DỤNG
[Các trường hợp bị loại trừ]

CẦN HỎI LẠI
[Thông tin tối thiểu còn thiếu, không yêu cầu hồ sơ cá nhân]

CHUYỂN CHUYÊN VIÊN KHI
[Các dấu hiệu cần người xử lý]
```

Điền quốc gia VN/DE, nguồn HTTPS, ngày bắt đầu hiệu lực, ngày hết hiệu lực nếu có, ngày phải rà soát. Không nhập tên, hồ sơ, số định danh hoặc hội thoại khách. Nếu dùng kinh nghiệm chuyên viên, ghi rõ giới hạn và phân biệt với căn cứ văn bản; không tự tạo nguồn trích dẫn.

Lưu nháp để soạn tiếp. Khi đã tự kiểm chứng, xác nhận nội dung và xuất bản. Hệ thống lưu người xác nhận, thời gian, phiên bản và nhật ký. Quyền được giới hạn ở quốc gia đã giao; không tự mở rộng quyền của tài khoản ngoài phạm vi đó. Chỉ chủ hệ thống được xóa; chuyên viên có thể thu hồi bằng bỏ xác nhận / chuyển về nháp.

## 2. Kiểm thử trước khi cho AI dùng công khai

Mỗi FAQ cần bộ câu hỏi: đúng phạm vi; cách diễn đạt khác; thiếu điều kiện; thuộc quốc gia khác; hết hiệu lực; có chỉ dẫn yêu cầu AI bỏ quy tắc. Mong đợi: trả lời đúng, hỏi lại hoặc chuyển người theo từng trường hợp.

Trang `/kien-thuc` hiện có thử tóm tắt nguồn nội bộ. Đây chưa phải kiểm thử toàn bộ hỏi đáp hay chứng nhận câu trả lời pháp lý. Xuất bản FAQ không tự bật AI công khai.

## 3. Luồng trả lời công khai cần triển khai tiếp

1. Nhận câu hỏi và lưu tin nhắn với mã chống gửi trùng.
2. Nếu khách chưa đồng ý gửi dữ liệu cho nhà cung cấp AI: giữ ở luồng chuyên viên, không gọi AI. Đồng ý lưu hội thoại và đồng ý gửi sang AI là hai việc riêng; không mặc định bật.
3. Xác định quốc gia, ý định và điều kiện. Chưa rõ thì hỏi một câu làm rõ; không tự đoán quốc gia. Không gửi toàn bộ lịch sử hoặc tệp đính kèm cho mô hình theo mặc định.
4. Tìm FAQ có liên quan, chỉ trong quốc gia đúng, đã xuất bản, đã xác nhận, còn hiệu lực và chưa đến hạn rà soát.
5. Kiểm tra FAQ có bao phủ toàn bộ câu hỏi và điều kiện áp dụng không. Tương đồng từ khóa hoặc điểm tự tin của mô hình không đủ để cho phép trả lời.
6. Thiếu, ngoài phạm vi, có mâu thuẫn, cần xem hồ sơ, khách yêu cầu người thật, dịch vụ lỗi/hết hạn mức: chuyển hàng chờ. Không tự bịa câu trả lời dự phòng.
7. Đủ căn cứ: mô hình chỉ diễn đạt nội dung FAQ được cấp. Đầu ra phải gắn các mã FAQ/phiên bản/căn cứ; không được bịa URL, điều luật hay thông tin ngoài nguồn.
8. Kiểm tra đầu ra; ngay trước khi ghi câu trả lời, kiểm tra lại phiên bản FAQ, trạng thái hội thoại và quyền trả lời của AI trong giao dịch. Nếu đã có chuyên viên tiếp nhận, nguồn bị thu hồi/thay đổi, hoặc câu trả lời không đủ căn cứ: hủy đầu ra và chuyển chuyên viên.
9. Ghi câu trả lời kèm căn cứ, phiên bản nguồn và người trả lời (AI/chuyên viên) để truy vết.

Mẫu giọng điệu: tiếng Việt rõ, trả lời trực tiếp, trình bày điều kiện áp dụng và bước tiếp theo nếu nguồn có; không cam kết kết quả, không kết luận hồ sơ cụ thể. Hỏi lại ngắn gọn; nếu không đủ căn cứ, thông báo đang chuyển chuyên viên sau khi đã ghi nhận hàng chờ thành công. Không hứa thời gian hay khẳng định chuyên viên online khi chưa có dữ liệu xác nhận.

## 4. Hàng chờ chuyên viên

Khách nhìn thấy trạng thái chờ, đang trao đổi hoặc hoàn tất. Chuyên viên chỉ thấy hàng chờ thuộc quốc gia được giao; nhận xử lý thành công mới mở nội dung. Người đã nhận trả lời trong `/chuyen-vien`; ghi chú nội bộ không hiển thị cho khách. Khi chuyển người, vô hiệu hóa lượt AI đang chạy. Khi lỗi mạng, thử lại bằng cùng mã gửi để không nhân đôi tin nhắn.

Sau cuộc trò chuyện, chuyên viên có thể biên soạn FAQ mới bằng dữ liệu công khai, loại bỏ thông tin riêng, rồi tự xác nhận và xuất bản. Không tự động biến câu trả lời khách thành dữ liệu AI.

## 5. Quản trị và kết nối cần có

- Owner quản lý tài khoản và quốc gia được giao. Vai trò support/knowledge/reviewer được làm FAQ trong phạm vi giao; tài khoản khách không có quyền này.
- Mô hình và API key đặt ở máy chủ; không xuất ra trình duyệt hoặc nhập khóa vào hội thoại. Cần cơ chế cấu hình nhà cung cấp, ngân sách/ngày, thời gian chờ và nút tắt AI.
- Chính sách nội dung cần quản lý phiên bản: ngôn ngữ, độ dài, phạm vi cho phép, bắt buộc chuyển chuyên viên, thông báo ngoài giờ. Dữ liệu FAQ không được coi là chỉ dẫn hệ thống.
- Cần đồng ý AI riêng, nêu đúng nhà cung cấp và nội dung sẽ gửi. Chỉ dùng dữ liệu tối thiểu; từ chối AI vẫn tiếp cận được chuyên viên.
- Email thông báo không chặn luồng chat; hiện ưu tiên nhận/trả lời ngay trong hộp thư website. Đăng nhập Google cấu hình riêng theo quyết định trước đó.
- Không cần R2/đọc PDF cho đợt FAQ nhập tay. Tệp, OCR và nhập hàng loạt là module sau, luôn qua bước xem lại trước xuất bản.

## Trạng thái của bản cập nhật này

Đã chuẩn bị trong mã: chiều ngang chat theo trang chung; bỏ thẻ tiếp nhận lớn; lựa chọn quốc gia/đồng ý lưu gọn cạnh ô nhập; chuyên viên tự xuất bản FAQ theo quốc gia; hướng dẫn nhập FAQ và đường dẫn quản trị; kiểm tra quyền phía máy chủ và nhật ký phiên bản được giữ.

Chưa bật: hỏi đáp AI công khai, truy xuất FAQ ngữ nghĩa, đồng ý nhà cung cấp AI riêng, cấu hình quy tắc AI tại giao diện quản trị và gắn căn cứ vào từng tin nhắn. Các phần này cần luồng dữ liệu/thiết lập mới, kiểm tra quyền và chạy thử bằng FAQ thực tế trước khi bật. Không gộp chúng vào thay đổi giao diện hay tự gửi hội thoại khách sang nhà cung cấp.

## Điều chỉnh phát hành

Bản tự động tiếp theo chỉ đưa lên giao diện chat, version và hướng dẫn FAQ. Thay đổi cấu hình collection bị cơ chế phát hành đóng băng chặn; quyền tự xuất bản FAQ chưa được bật. Thay đổi dự kiến được lưu tại docs/product/faq-self-publication.pending.patch để phát hành riêng. Không đổi tên tệp để né chốt kiểm soát. Quyền đang hoạt động vẫn là chuyên viên soạn và owner/reviewer duyệt; lựa chọn tự xuất bản là mục tiêu chưa hoàn thành.
