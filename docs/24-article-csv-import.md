# Nhập bài viết bằng CSV

Trong Admin: **Bài viết → Tất cả bài viết**, chọn **Nhập CSV**. **CSV mẫu** nằm ngay cạnh nút nhập. Admin và Chuyên viên được nhập; User không được truy cập.

1. Tải CSV mẫu. Mẫu trong Admin lấy toàn bộ danh mục/tag đang có, bao gồm danh mục con. Mẫu công khai `/examples/bai-viet-mau.csv` gồm 16 danh mục pháp luật, 6 danh mục tin tức và các ví dụ.
2. Sửa bằng Excel và lưu CSV UTF-8. Mỗi lần tối đa 200 bài, 2 MB. Có thể dùng dấu phẩy hoặc dấu chấm phẩy làm dấu phân cột. Ô nhiều dòng phải được đặt trong dấu ngoặc kép theo CSV.
3. Chọn tệp, bấm **Tiếp tục** để ghép cột. Cột tiêu chuẩn tự được nhận diện; cột khác có thể ghép thủ công hoặc chọn **Không nhập**. Bắt buộc ghép Tiêu đề và Nội dung. Bấm **Kiểm tra tệp**, sửa các dòng lỗi rồi kiểm tra lại.
4. Bấm **Nhập N bài**. Permalink đã có sẽ được bỏ qua, không ghi đè. Nếu còn dòng lỗi, toàn bộ tệp chưa được lưu.

Các cột:

| Cột | Giá trị |
|---|---|
| title | Tiêu đề, bắt buộc, tối đa 240 ký tự |
| slug | Để trống để tự tạo từ tiêu đề |
| body | Nội dung bắt buộc, tối đa 16.000 ký tự; văn bản hoặc HTML được làm sạch bằng bộ soạn thảo hiện có |
| categories | Slug hoặc tên danh mục đang có; nhiều giá trị ngăn cách bằng `|`; slug phân biệt danh mục trùng tên |
| tags | Slug hoặc tên tag đang có; nhiều giá trị ngăn cách bằng `|` |
| language | `vi` (mặc định), `de` |
| kind | `article` (mặc định), `news`, `question` |
| status | `draft` (mặc định), `published` |
| ai_allowed | `false` (mặc định), `true`; vẫn tuân thủ quy tắc xuất bản/duyệt hiện hành |
| source_url | Địa chỉ nguồn HTTPS, không bắt buộc |
| jurisdiction | `BOTH` (mặc định), `VN`, `DE` |

Danh mục/tag chưa có cần tạo trong mục quản lý tương ứng. CSV không tạo taxonomy hoặc sửa bài hiện có ngầm. Các bài mẫu đều để nháp và không bật AI; thay nội dung mẫu trước khi sử dụng.

Nghiệp vụ dùng Payload Local API với quyền người đang đăng nhập, cùng một giao dịch cho cả tệp, dùng lại các hook kiểm duyệt/làm sạch nội dung/audit/lập chỉ mục. Khóa giao dịch tuần tự hóa các lượt import; unique permalink bảo vệ cả khi tạo bài từ luồng khác. Nhập lại cùng tệp bỏ qua permalink đã có. Không gọi AI, đọc URL nguồn hoặc gửi email trong khi import.
