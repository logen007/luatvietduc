# Kết nối trong quản trị

Vào Admin → **Kết nối** (đường dẫn `/quan-tri`). Chỉ tài khoản owner được đọc thông tin cấu hình và thay đổi kết nối.

1. Điền các ô tương ứng và bấm **Lưu cấu hình**.
2. Bấm **Kiểm tra kết nối**; với email, nút này gửi một email đến chính địa chỉ tài khoản owner đang đăng nhập.
3. Kiểm tra đạt thì bấm **Bật sử dụng**. Có thể tắt tại đây. Lưu một bản sửa mới sẽ tạm tắt riêng kết nối đó.

Ô khóa đã lưu hiển thị thông báo giữ nguyên; không trả khóa về trình duyệt. Nhập khóa mới nếu muốn thay. Cấu hình được mã hóa AES-256-GCM với khóa dẫn xuất từ PAYLOAD_SECRET của máy chủ. Sao lưu cơ sở dữ liệu phải đi cùng quy trình bảo quản khóa máy chủ; đổi PAYLOAD_SECRET cần kế hoạch chuyển khóa, không tự đổi.

## Google

Google Cloud → OAuth Client loại Web application. Điền Client ID/Client Secret, thêm redirect URI `https://luatvietduc.com/auth/google/callback` trong Google Cloud. Kiểm tra tại website chỉ xác nhận định dạng; cần đăng nhập Google thật để xác nhận Client Secret, consent screen và redirect URI. Nút bật không cấp quyền hay chấp nhận điều khoản thay chủ tài khoản. Quyền sử dụng chỉ gồm openid/email/profile; không Gmail hay Drive.

## AI

Điền API key Google Gemini và tên model đang dùng trong tài khoản của mình. Kiểm tra chỉ đọc metadata model, không gửi câu hỏi hay hồ sơ khách. Dùng khóa đã bật cho thử nghiệm FAQ nội bộ. Không tự bật AI trả lời khách.

## Cloudflare R2

Điền endpoint S3 chính thức, tên bucket, Access Key ID và Secret Access Key của khóa giới hạn theo bucket. Dùng bucket riêng tư. Kiểm tra quyền truy cập bucket không tải lên/xóa tệp. Website tiếp tục kiểm tra quyền trước khi phục vụ file. Khi đã có file, không cho đổi bucket/endpoint để tránh mất đường dẫn; có thể thay khóa của cùng bucket. Chuyển bucket là một quy trình di chuyển dữ liệu riêng.

## Email

Dùng Resend: điền API key, địa chỉ gửi đã xác minh tên miền và tên người gửi. Kiểm tra gửi một thư vào email của owner, không gửi đến khách. Thông báo API chấp nhận chưa đồng nghĩa thư đã đến hộp thư; chủ tài khoản kiểm tra thư đến/spam. Khi bật, adapter gửi email của hệ thống dùng cấu hình này và chức năng khôi phục mật khẩu mới được cho phép. Chưa thêm các email thông báo chat tự động.

## Phát hành

Bản này có migration cộng thêm hai bảng kết nối/nhật ký và hai cột lưu đường dẫn media. Không xóa dữ liệu cũ. Cần lượt phát hành bảo trì được duyệt riêng: GitHub CI đạt → kiểm tra SHA và checksum migration → khóa phát hành → build → sao lưu/kiểm tra bản sao lưu → chạy migration → kiểm tra candidate riêng → đổi web → kiểm tra công khai. Nếu đổi web lỗi thì quay lại image cũ; không chạy down migration trên dữ liệu thật. Dùng `ops/deploy/release-reviewed-integrations.py`; không sửa, đổi tên file hoặc bỏ điều kiện của bộ tự cập nhật để né chốt kiểm soát.

Sau khi bản này được đưa lên và ghi nhận làm mốc, các lần đổi khóa trong admin có hiệu lực khi bấm bật, không cần VPS hay phát hành lại. Các lần sửa code giao diện tiếp tục GitHub → luồng tự cập nhật cũ.

Nguồn tài liệu: [Payload email](https://payloadcms.com/docs/email/overview), [R2 authentication](https://developers.cloudflare.com/r2/api/tokens/), [R2 jurisdiction](https://developers.cloudflare.com/r2/reference/data-location/). Phiên bản thư viện lấy đúng từ lockfile dự án.
