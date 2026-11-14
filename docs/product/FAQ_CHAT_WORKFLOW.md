# FAQ và trò chuyện — 01.04.00

## Quy trình cho chuyên viên

1. Vào `/admin/collections/knowledge/create` hoặc Kho kiến thức AI tại `/admin/knowledge`.
2. Mỗi FAQ giải quyết một câu hỏi. Điền câu hỏi chuẩn; câu trả lời đầy đủ điều kiện, trường hợp loại trừ và khi cần chuyển chuyên viên; nguồn HTTPS; quốc gia; hiệu lực và hạn rà soát.
3. Mỗi dòng trong **Cách hỏi khác đã được chuyên viên xác nhận** phải có cùng phạm vi với câu hỏi chuẩn. Tránh câu quá rộng. Không đưa tên, hồ sơ, số định danh hay hội thoại khách vào FAQ.
4. Lưu nháp để soạn tiếp. Chuyên viên support/knowledge/reviewer được tự xuất bản trong quốc gia đã giao; hệ thống lưu người, thời gian, phiên bản và nhật ký. Owner quản lý quyền. Chỉ owner xóa; chuyên viên thu hồi bằng bỏ xác nhận hoặc chuyển nháp.
5. Rà soát trước hạn. Nội dung hết hạn, chưa hiệu lực, bản nháp hoặc bị thu hồi không được trả lời. Không tự động biến câu trả lời khách thành FAQ.

## Khách hỏi → trả lời hoặc chuyển chuyên viên

- Khách chọn quốc gia trong ô nhập; không còn bảng tiếp nhận hay checkbox đồng ý. Thông tin riêng tư vẫn có đường dẫn cạnh ô nhập. Gửi có mã chống trùng; lịch sử nằm ở thanh bên, trên mobile mở bằng nút lịch sử.
- Hội thoại mới ưu tiên trợ lý khi `customerAIEnabled`, chat và kết nối Gemini đã bật. Khách có thể chủ động gặp chuyên viên. Hội thoại cũ vẫn ở luồng chuyên viên.
- Hệ thống đối chiếu câu hỏi chuẩn hoặc cách hỏi tương đương do chuyên viên nhập, sau khi chuẩn hóa hoa/thường, dấu và dấu câu. Đây là cổng phạm vi chặt; chưa có tìm kiếm ngữ nghĩa mở hoặc tự suy luận các trường hợp tương tự.
- Chỉ một FAQ phù hợp, đúng quốc gia, công khai, đã xuất bản/xác nhận, còn hiệu lực và chưa quá hạn rà soát mới được dùng. Trùng phạm vi, hồ sơ riêng, yêu cầu kết luận vụ việc, không có FAQ hoặc lỗi/hết hạn mức Gemini đều chuyển chuyên viên.
- Gemini nhận **chỉ FAQ công khai** (câu hỏi chuẩn, quốc gia và các đoạn trả lời). Không gửi câu hỏi riêng của khách, danh tính, lịch sử hay tệp. Vì không gửi dữ liệu khách cho nhà cung cấp nên không mặc định thay sự đồng ý riêng bằng checkbox đã tích sẵn. Việc gửi dữ liệu riêng trong tương lai cần luồng đồng ý riêng.
- Gemini chỉ nhóm các chỉ số đoạn theo tiêu đề cho phép. Bộ kiểm tra buộc giữ mọi đoạn nguyên văn, đúng thứ tự và xuất hiện đúng một lần. Không dùng kiến thức vốn có của mô hình để thêm luật hoặc tạo URL. Trả lời kèm căn cứ và dấu vết phiên bản.
- Ngay trước khi ghi, khóa và kiểm tra lại nguồn, phiên bản, cài đặt, kết nối và hội thoại. Nguồn đổi/thu hồi, người tiếp nhận hoặc khách gửi câu mới đều hủy lượt cũ. Lượt bị gián đoạn có thể thử lại an toàn, không nhân đôi câu trả lời.
- Chuyển chuyên viên là thay đổi trạng thái đã lưu, không chỉ thông báo giao diện. Chuyên viên chỉ thấy hàng chờ thuộc quốc gia được giao; nhận xử lý mới đọc được nội dung. Ghi chú nội bộ không gửi cho khách. Không hứa giờ phản hồi khi chưa có dữ liệu trực.

## Cài đặt và điều kiện vận hành

- Owner: `/admin/globals/site-settings` → **AI & FAQ**: bật/tắt trợ lý cho khách, giới hạn lượt/ngày và token. Chế độ thử nghiệm nguồn nội bộ tách riêng.
- `/admin/settings/connections`: lưu Gemini → kiểm tra → bật. Khóa được mã hóa, không xuất trong dữ liệu công khai. Kiểm tra model metadata chưa chứng minh quota sinh câu trả lời thực tế.
- `/admin/inbox`: nhận, trả lời, ghi chú, hoàn tất và mở lại hội thoại.
- Không cần R2 cho FAQ nhập tay. Đăng nhập Google và email là kết nối riêng; không chặn khách dùng chat.
- Không tự tạo FAQ pháp lý từ tiêu đề chủ đề. Muốn có câu trả lời thật cần chuyên viên nhập/xuất bản FAQ thật và kết nối Gemini hoạt động. Khi thiếu, hệ thống vẫn chuyển chuyên viên.

## Phát hành và kiểm chứng

Mã 01.04.00 bổ sung migration có kiểm soát cho trạng thái AI, căn cứ tin nhắn, cách hỏi tương đương và cài đặt. Quyền tự xuất bản được đưa vào cùng bản này; bản patch chờ cũ đã được thay thế. Giữ nguyên chính sách tự phát hành đã cài; migration đi qua đường bảo trì được rà soát một lần. Các chỉnh sửa giao diện thường tiếp theo chỉ cần đẩy GitHub.

Kiểm chứng bằng dữ liệu tổng hợp trong CI: quyền theo quốc gia, cô lập khách, idempotency, chuyển người trong lúc sinh câu trả lời, thu hồi/hết hạn FAQ, tắt kết nối/cài đặt và câu hỏi mới hủy lượt cũ. Không dùng hồ sơ khách để kiểm thử. Kết quả phát hành thực tế ghi trong bàn giao vận hành, không suy ra từ việc đẩy mã.
