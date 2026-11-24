# Phân loại hội thoại và thời hạn

Hội thoại mới chưa có ý định rõ ràng (chào hỏi, thử, câu rời rạc) được hỏi thêm,
xếp ưu tiên thấp và xóa sau 2 giờ không có tin nhắn mới. Hộp thư hiển thị thời
gian còn lại; tin nhắn mới đặt lại hạn, yêu cầu gửi lại cùng mã không đặt lại.

Nội dung có ý định thực tế nhưng thiếu dữ kiện được hỏi tiếp và giữ lịch sử.
Chỉ hội thoại đủ ngữ cảnh mới truy tìm nguồn được phép dùng, sau đó trả lời có
căn cứ hoặc chuyển chuyên viên. Lỗi bộ phân loại không biến nội dung mơ hồ
thành yêu cầu đã đủ điều kiện và không cho phép xóa.

Hội thoại cũ trước migration, lịch sử từng có nội dung hữu ích, tệp đính kèm,
chuyên viên tiếp nhận hoặc khách yêu cầu gặp chuyên viên được giữ lại.
Một câu cảm ơn không làm lịch sử đã được giữ trở thành dữ liệu có thể xóa.

Cleanup chạy theo lô tối đa 100, mỗi 30 giây; khóa từng hội thoại và bỏ qua khóa
đang bận/generation còn hoạt động. Thời hạn được thực thi ở cơ sở dữ liệu,
không phụ thuộc trình duyệt có mở. Xóa cascade chỉ cho hội thoại không tệp.

Migration bổ sung cột/trigger, giữ toàn bộ lịch sử cũ. Đưa bản mới lên qua lane
reviewed exact-SHA, sau backup và trước candidate. Có thể quay về image cũ mà
không xóa schema; trigger tiếp tục bảo vệ lịch sử và đặt lại hạn khi có tin mới.
