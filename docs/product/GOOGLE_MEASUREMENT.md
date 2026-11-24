# Google: thống kê và xác minh website

Admin → Cài đặt → Kết nối dịch vụ có ba mục riêng: Google Tag Manager,
Google Analytics 4 và Google Search Console. Nhập ID/mã xác minh, Lưu → Kiểm tra
→ Bật. Đổi cấu hình sẽ tắt mục đó đến khi kiểm tra và bật lại. Cấu hình dùng
vault mã hóa, kiểm tra Admin thực ở server, kiểm soát nguồn yêu cầu, giới hạn
lượt thao tác và phiên bản như các kết nối hiện có. Không cần API secret,
OAuth mới hoặc dựng lại ứng dụng khi đổi ID. Kiểm tra định dạng không chứng
minh quyền sở hữu, container đã xuất bản hay Google đã nhận dữ liệu.

GTM được ưu tiên khi cả GTM và GA4 cùng bật. GA4 trực tiếp chỉ chạy khi GTM tắt.
GTM cần trigger Custom Event `lvd_page_view`, lấy `page_location`, `page_path`
từ Data Layer; không gắn thêm History Change/All Pages page views tự động.
GA4 trực tiếp tắt `send_page_view`, gửi một lượt xem cho mỗi chuyển trang công
khai. Tắt Enhanced Measurement trong luồng GA4 để không đo trùng hoặc đọc form.
Không cấu hình thẻ quảng cáo, form hoặc nội dung cá nhân trong container.

Không tải Google khi cấu hình tắt, khi khách chưa đồng ý hoặc đã từ chối.
Khách có thể đổi lựa chọn bằng nút Thống kê; lưu lựa chọn 180 ngày, không có
mã định danh trong bản ghi lựa chọn. Rút đồng ý tải lại document để dừng mã
đã thực thi, kể cả thay đổi từ tab khác. Không chèn iframe noscript vượt qua
sự đồng ý. Chặn quảng cáo có thể ngăn thẻ chạy.

Chỉ đo tuyến nội dung công khai được liệt kê; bỏ qua URL có query/hash.
Không gửi nội dung hỏi đáp, tìm kiếm, biểu mẫu, ID tài khoản/hội thoại hay
email. Nếu mã Google đã chạy, chuyển sang trang riêng tư hoặc URL có query/hash
sẽ dùng document mới để không giữ tracker từ layout cũ. Điều hướng công khai
thông thường vẫn giữ router/cache. Container GTM do Admin kiểm soát và có thể
chứa mã ngoài phạm vi này, vì vậy chỉ xuất bản thẻ thống kê đã rà soát.

Search Console dùng meta `google-site-verification` trong HTML server, độc lập
với sự đồng ý thống kê. Dùng thuộc tính Tiền tố URL `https://luatvietduc.com/`,
xác minh bên Google rồi gửi `/sitemap.xml`. Thuộc tính Miền cần DNS riêng.
Không tự bật lập chỉ mục, gửi sitemap hay lấy báo cáo Search Console.

Migration `20261108_120000_google_measurement` chỉ mở rộng CHECK danh sách nhà
cung cấp, không thay cấu trúc/bản ghi cũ. Có lệnh triển khai đã rà soát riêng;
không thay engine tự triển khai hay chạy backup ngoài 03:00. Rollback ứng dụng
giữ nguyên các cấu hình mới; down migration từ chối khi chúng còn tồn tại.
