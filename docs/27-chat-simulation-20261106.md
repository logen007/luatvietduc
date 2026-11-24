# Mô phỏng hội thoại — 2026-11-06

Dữ liệu giả, tài khoản `.invalid`, PostgreSQL thử nghiệm trên loopback. Không gửi email, hội thoại thật hay tệp thật tới nhà cung cấp.

| Trường hợp | Kết quả |
| --- | --- |
| RAG 24 lượt khách / 48 tin nhắn; câu tiếp nối sau câu trả lời | Giữ dữ kiện ban đầu trong ngữ cảnh, nguồn được kiểm tra trước khi ghi |
| Intake VI/DE: lời mở đầu ngắn, đầu tư, cư trú, gia đình, thừa kế, việc làm, nhà đất, thuế, hợp đồng | Hỏi dữ kiện theo chủ đề; giới hạn 8 câu; không tự sinh kết luận pháp lý |
| Sửa quốc gia; đổi chủ đề; quay lại chủ đề; tham chiếu cùng quốc gia | Không dùng câu đã hỏi của chủ đề cũ; hỏi lại địa điểm khi chưa rõ |
| 40 tin nhắn; gửi nhanh hai lần; mất xác nhận ở 3 lượt; đọc lịch sử chồng nhau | Không tạo trùng; không xóa bản nháp mới bằng xác nhận cũ |
| Đóng/mở, tiếp nhận, đổi hội thoại, phiên mất quyền | Giữ ranh giới quyền và chốt chuyển chuyên viên; không mở nội dung chỉ từ xác nhận ghi |
| Trình duyệt: 38 tin lịch sử, gửi khách vãng lai đã lưu nhưng mất xác nhận, đăng nhập email, gửi lại | Cùng khóa gửi, tổng 39 tin; không trùng |
| Cùng luồng trên với tệp đính kèm | Giữ đúng liên kết tệp; không bị lỗi tệp đã dùng |
| Nguồn bị rút, quy tắc đổi, chuyên viên tiếp nhận trong lúc AI xử lý | Bài kiểm tra hiện có tiếp tục chặn phản hồi lỗi thời |

Đã sửa: ngữ cảnh bị mất sau câu AI trả lời; hỏi làm rõ quá sớm kết thúc; nhận nhầm đại từ thành quốc gia; trạng thái chủ đề/địa điểm cũ; khóa thử gửi bị mất khi chuyển qua đăng nhập.

Ngữ cảnh có giới hạn 12 KB, giữ lượt khách đầu và gần nhất; chỉ dùng lượt có đồng ý xử lý. Embedding dùng đầu/cuối truy vấn trong 1.800 byte. Đây là kiểm tra luồng, quyền, nguồn và khả năng phục hồi. Gemini/Qdrant được mô phỏng; không phải đánh giá chất lượng ngữ nghĩa của model thật hoặc độ đúng của tư vấn pháp luật.
