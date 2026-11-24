# Bộ cài Luật Việt Đức

Giữ Next.js, Payload và PostgreSQL; mã nguồn tiếp tục sửa bình thường. Máy chủ
chạy gói đã build, không cần npm install, TypeScript, công cụ build hay Git.
PostgreSQL có volume riêng. Ảnh/tài liệu riêng dùng kết nối R2 hiện có; chỉ mục
Qdrant có volume riêng và tự dựng lại từ dữ liệu gốc. Worker tạo chỉ mục dùng
cùng image, không cài thêm một bộ thư viện.

## Cài mới

Cần máy Linux có Docker Engine, Docker Compose v2 hỗ trợ `--wait`, Python 3.
Gói CI mặc định dành cho amd64. Cần mạng để Docker lấy PostgreSQL/Qdrant lần đầu
và để dùng nhà cung cấp đã cấu hình. Đây là bộ cài cho VPS/container; hosting
chỉ chạy PHP không chạy được. Chừa RAM cho database, chỉ mục, web và hệ điều hành;
khuyến nghị bắt đầu với VPS 4 GB RAM rồi đo tải thực tế.

Tải và giải nén artifact **luatvietduc-portable** từ workflow **Portable package**.
Trong thư mục gói:

```sh
python3 lvd.py install --dir /srv/lvd-site --package . \
  --url https://example.com --port 3051
```

Trình cài tạo mật khẩu DB và khoá mã hoá ngẫu nhiên, chạy migration và kiểm tra
web/admin/CSS/font. Sau đó nhập tên, email và mật khẩu Admin (ít nhất 16 ký tự).
Nếu chạy không tương tác, tạo Admin bằng:

```sh
python3 /srv/lvd-site/lvd.py owner --dir /srv/lvd-site
```

Web chỉ mở tại `127.0.0.1:3051`. Nối reverse proxy HTTPS sẵn có tới cổng này;
trình cài không đổi DNS/proxy, không chiếm cổng 80/443 và không mở cổng database.
Đổi OAuth callback ở nhà cung cấp khi đổi tên miền. Cấu hình kết nối trong
`/admin/settings/connections`; việc lưu, kiểm tra và bật vẫn tách biệt.

Font Inter có sẵn trong gói. Font thương mại không được đưa lên Git/artifact.
Để giữ đúng font hiện tại, truyền `--fonts /duong-dan/thu-muc-font-da-cap-phep`
khi cài; các file này được giữ riêng khi cập nhật và đi cùng bản xuất mã hoá.

## Cập nhật

Tải gói mới đã qua kiểm tra, rồi chạy:

```sh
python3 /srv/lvd-site/lvd.py update --dir /srv/lvd-site --package /srv/goi-moi
```

Xác minh checksum, image ID, commit và danh mục migration trước khi thay bản
chạy. Cập nhật chỉ thay container ứng dụng và worker, giữ database/R2/font.
Nếu schema không đổi và web không qua health check, tự chạy lại image cũ.
Cập nhật có một khoảng dừng ngắn; chưa phải triển khai không gián đoạn.

Schema khác sẽ bị chặn. Sau khi rà soát migration và bản sao khôi phục, người
vận hành chủ động thêm `--migrate`. Chỉ chấp nhận danh mục migration nối tiếp,
không chạy down. Lỗi khi đổi schema giữ `operation.json` và dừng web/worker để
khôi phục có kiểm soát; không tự chạy mã cũ trên schema chưa biết tương thích.
Nếu mất điện giữa cập nhật, journal cũng chặn `start` cho tới khi được rà soát.
Không tự xoá image/volume; sau khi xác nhận bản mới, có thể gỡ riêng image cũ
không còn container tham chiếu bằng quy trình lưu giữ của máy chủ.

## Xuất và chuyển máy

Máy vận hành cần công cụ `age`. Tạo và giữ private identity ngoài máy chủ:

```sh
age-keygen -o recovery.key
python3 /srv/lvd-site/lvd.py backup --dir /srv/lvd-site \
  --recipient age1... --output /noi-an-toan/site.tar.gz.age
```

Đây là xuất thủ công; không đổi lịch sao lưu 03:00. Web/worker tạm dừng trong
lúc chụp DB và các tệp được tham chiếu, rồi chạy lại nếu trước đó đang chạy.
Gói mã hoá gồm dump PostgreSQL, file R2 gốc/các size/nguồn chỉnh sửa/tài liệu chat,
font và khoá mã hoá vault. Không chỉ xuất đường dẫn đến ảnh. Có checksum cho
từng file; bản xuất chỉ mang tên hoàn tất sau khi mã hoá xong. Giữ cùng gói
ứng dụng đúng phiên bản và private identity để phục hồi.

Chuyển gói ứng dụng, bản xuất và identity tới nơi khôi phục riêng:

```sh
python3 lvd.py restore --dir /srv/lvd-restored --package /srv/goi-goc \
  --archive /noi-an-toan/site.tar.gz.age --identity /noi-an-toan/recovery.key \
  --url https://example.com --port 3052
```

Chỉ nhận thư mục trống và đúng image gốc; không ghi đè site đang chạy. Kiểm tra
checksum trước khi khôi phục, giữ PAYLOAD_SECRET để giải mã kết nối. Khôi phục
R2 chỉ bổ sung tệp thiếu; từ chối ghi đè tệp đang có khác nội dung. Kho R2 vẫn
dùng cùng kết nối. Chuyển sang bucket/nhà cung cấp khác là thao tác riêng cần
rà soát. Không sao lưu cache/chỉ mục Qdrant vì có thể dựng lại.

Khôi phục xong **web vẫn dừng**. Dừng bản cũ trước khi bật bản mới để tránh hai
worker cùng xử lý. Sau đó chạy `start`, kiểm tra HTTPS và đăng nhập:

```sh
python3 /srv/lvd-restored/lvd.py start --dir /srv/lvd-restored
python3 /srv/lvd-restored/lvd.py status --dir /srv/lvd-restored
```

## Sao lưu Drive trong trang quản trị

Gói có adapter dùng lại worker Drive hiện có, cùng mã hoá, giữ 7 bản ngày và
1 bản tháng, kiểm tra tải xuống và khôi phục thử trong DB dùng một lần. Để
kích hoạt hàng chờ quản trị trên bản cài mới, cài `age`/`rclone` trên máy Linux
có systemd, rồi chạy với quyền root trên thư mục cài thuộc root:

```sh
python3 /srv/lvd-site/lvd.py install-timers --dir /srv/lvd-site
```

Chỉ tạo timer mang mã riêng của bản cài: hàng chờ kiểm tra mỗi phút, sao lưu
tự động lúc 03:00 Asia/Ho_Chi_Minh. Không tạo backup trong lúc cập nhật.
Kết nối và bật Drive tại `/admin/settings/backups`; chỉ coi là có bản sao
ngoài máy sau khi một tác vụ hoàn tất và kiểm tra khôi phục đạt. Khi chuyển
máy, dừng timer của bản cũ cùng web trước khi bật timer mới.

## Phát triển và phát hành gói

Tiếp tục sửa `apps/cms` và dùng quy trình hiện tại. Tạo gói từ commit chính xác
trên máy build hoặc CI có Docker (không chạy lệnh này trên máy chủ web):

```sh
python3 ops/portable/build.py --output /tmp/lvd-package --platform linux/amd64
python3 -m unittest discover -s ops/portable -p 'test_*.py' -v
python3 ops/portable/check-install.py --package /tmp/lvd-package
```

Docker multi-stage lấy Next standalone và trace riêng công cụ bảo trì, gộp
thư viện chung. Không xoá thư viện thủ công khỏi ứng dụng đang chạy. Quy trình
production hiện có, lịch sao lưu và policy đã ghim vẫn giữ nguyên; chuyển site
hiện tại sang bộ cài này là bước cắt chuyển riêng sau khi kiểm tra gói.
