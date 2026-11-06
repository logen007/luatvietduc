# Kiểm tra trả lời từ hai loại nguồn

Kiểm tra cơ sở dữ liệu/CMS thật trong `lvd_test`; Gemini và vector search dùng
phản hồi giả lập có kiểm soát. Không sửa dữ liệu website, gọi nhà cung cấp thật,
gửi email hay sử dụng hồ sơ khách. Đây là kiểm tra tính đúng của luồng và ranh
giới nguồn, không phải đánh giá chất lượng ngữ nghĩa hoặc tư vấn pháp luật.

- Xuất bản bài viết bật AI → mirror → job index → câu trả lời có link bài viết.
- Xuất bản kiến thức riêng → index → trả lời; không trả link quản trị/nội bộ.
- Kết hợp hai nguồn; nguồn Việt/Đức lẫn trong kết quả vector vẫn lọc lại bằng SQL.
- Bài chưa bật AI, bản nháp, kiến thức nháp, hết hạn rà soát và bài đã xóa không được dùng.
- Hội thoại 32 lượt hỏi/64 tin nhắn đổi qua lại hai nguồn; giữ dữ kiện mở đầu và đúng nguồn từng lượt.
- Hỏi thiếu dữ kiện, bổ sung rồi trả lời; ngoài phạm vi, thiếu đồng ý xử lý, hồ sơ cá nhân → giữ ranh giới hiện có.
- Model bịa đoạn, chọn sai nguồn, bỏ ngoại lệ, cắt đoạn, JSON lỗi, trả lời bị cắt, hết quota → không gửi câu trả lời không hợp lệ.
- Chuyển chuyên viên, nhận xử lý và trả lời đúng tác giả; câu khách tiếp theo không bật lại AI.
- Sửa nguồn trong lúc model xử lý → loại phản hồi cũ; tắt AI của bài loại nguồn ngay cả khi vector chưa dọn.

Đã tái hiện lỗi tham chiếu: model không nhận được câu trả lời trước khi khách hỏi
“ý thứ hai ở trên”. Bản sửa chỉ gửi câu trước làm dữ liệu tham chiếu khi toàn bộ
nguồn trích vẫn thuộc kết quả lấy hiện tại, còn hiệu lực, đúng phiên bản và mọi
đoạn đều khớp nguyên văn. Không đưa câu chuyên viên/ghi chú nội bộ vào trường này.
Nguồn trả lời vẫn phải chọn từ evidence hiện tại và qua kiểm tra trước lúc ghi.

Các bài kiểm tra nằm ở `scripts/test-rag-matrix.ts` và
`test/conversation-context.test.mjs`, được gọi từ bộ kiểm tra hệ thống hiện có.
