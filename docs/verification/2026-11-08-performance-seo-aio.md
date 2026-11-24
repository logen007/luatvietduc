# Rà soát tốc độ, SEO/AIO và cấu trúc — 2026-11-08

Phạm vi: website công khai đang chạy **01.39.19**, mã nguồn hiện hành và bản dựng
ứng viên kế tiếp. Chỉ đọc production; mọi phép thử có ghi dùng dữ liệu giả trong
PostgreSQL `lvd_test` cục bộ. Không gọi AI/email, không sửa dữ liệu khách.

## Website đang chạy

Đọc toàn bộ **109 URL** trong sitemap bằng tối đa 3 yêu cầu đồng thời:
- 109 phản hồi 200; mỗi trang có title, description, đúng một H1 và JSON-LD.
- Không có URL noindex trong sitemap; robots và sitemap index đều trả 200.
- `/tai-khoan`, `/hoi-dap` noindex/nofollow; không có trong sitemap.
- Thử `/tin-tuc?trang=2` khi chỉ có một trang tin trả về trang 1 hợp lệ;
  canonical không phải lỗi mất phân trang. Phân trang thật được kiểm tra riêng.
- Trung vị phản hồi đầu tiên **216 ms**. Đây là mẫu HTTP từ máy kiểm tra,
  không phải LCP/Lighthouse hoặc dữ liệu tốc độ của người dùng thực.

## Thay đổi

1. Tách `public-site/article-summary.ts`: chỉ chuyển rich text sang văn bản an toàn
   một lần cho mô tả và thời gian đọc. Trang bài viết dùng cùng kết quả trong
   metadata và JSON-LD qua React cache theo yêu cầu; lượt đọc tiếp theo vẫn kiểm
   tra xuất bản/thu hồi. Không lưu nội dung bài vào cache dùng chung nhiều yêu cầu.
2. Đọc danh sách bài và danh mục đồng thời khi độc lập, tra danh mục qua Map;
   giữ nguyên bộ lọc công khai, quốc gia, tìm kiếm, thứ tự và phân trang.
3. Chỉ giữ một bản nội dung giao diện công khai đã kiểm tra; fingerprint gồm
   đường dẫn snapshot và thông tin tệp. Đổi snapshot/sửa tệp có hiệu lực ở lượt
   đọc mới. Tệp hỏng/thiếu không lấy lại nội dung cũ. Không chứa tài khoản/chat.
4. Dùng lại hash ảnh lợi ích khi ảnh không đổi; URL vẫn đổi theo nội dung ảnh,
   kể cả chuyển snapshot. Không sửa ảnh/video do admin chọn.
5. Sitemap khử trùng lặp bằng Set, tăng tuyến tính thay vòng tìm lặp O(n²),
   giữ thứ tự/URL đầu tiên, escaping XML và ngày hợp lệ.
6. Metadata phân trang có số trang riêng bằng VI/DE; cho phép ảnh preview lớn
   chỉ trên trang được phép index. Canonical/hreflang vẫn chỉ mô tả URL thật;
   không khai tác giả/chứng chỉ/đánh giá không có căn cứ.

## Đo riêng phần xử lý local

Cùng mẫu thử, dữ liệu giả, làm nóng trước mỗi loạt; không suy ra mức giảm thời
gian tải toàn trang từ bảng này:

| Đo | Số lần | Trước (ms) | Sau (ms) |
| --- | ---: | ---: | ---: |
| Đọc nội dung giao diện đầy đủ | 300 | 61,66 | 8,51 |
| Tạo URL/hash 3 ảnh | 300 | 70,49 | 10,22 |
| Chuyển 12 bài rich text, mỗi bài 60 đoạn | 15 | 180,26 | 99,16 |
| XML sitemap 1.000 URL | 100 | 357,92 | 136,34 |

## Kiểm tra

- TypeScript, production build, **588** unit/domain checks đạt.
- **72** lượt mở trang local trên 390 px/DPR 2 và 1280 px: không lỗi JavaScript,
  không tràn ngang; CLS cao nhất **0,00551** trong cửa sổ đo của bộ kiểm tra.
- Hai ca chọn AVIF/WebP dự phòng đều chỉ tải một ảnh đúng cỡ.
- Hai ca editor Bài viết/kiến thức AI giữ định dạng và lưu/tải lại thành công.
- SEO trên 12 loại trang thật: bật/tắt indexing, metadata/JSON-LD, canonical,
  trang 2 với đủ bài, preview, private/search noindex, cặp VI/DE đã xuất bản,
  loại nháp và thu hồi bài/hreflang ngay đều đạt.
- Cache tệp kiểm tra sửa cùng thư mục, chuyển symlink, không đổi tệp, dữ liệu
  hỏng/thiếu, phục hồi và ngăn bên đọc sửa catalog dùng chung.

## Tốc độ cập nhật

Đọc lượt GitHub [42462623557](https://github.com/logen007/luatvietduc/actions/runs/42462623557)
(6086319, 01.39.19): tổng từ tạo đến hoàn tất 182 giây; CMS job 167 giây,
trong đó cài phụ thuộc 22 giây, TypeScript 9 giây, unit 35 giây, DB 3 giây,
system 30 giây, build 35 giây. Các job nhẹ chạy song song, không bị xếp sau CMS.
Đây là thời gian CI, không gồm dựng/đổi bản ở VPS.

Giữ luồng nhẹ cho copy/CSS/ảnh hỗ trợ và lưu cấu hình/media trong admin không
cần dựng ứng dụng. Sửa runtime lần này vẫn cần build thực. Đã có cache compiler
có giới hạn dung lượng và lịch sao lưu 03:00 riêng; không bỏ kiểm tra quyền,
biên dịch hay kiểm tra sức khỏe để rút ngắn số liệu. Không thêm browser audit
này vào postbuild hoặc workflow tự động.

## SEO/AIO còn phụ thuộc bên ngoài

Google nói SEO thông thường cũng áp dụng cho AI Overviews/AI Mode; không có
đánh dấu riêng bắt buộc. Rà lần này tập trung nội dung đọc được từ HTML,
canonical/sitemap và schema đúng dữ kiện. `/llms.txt` hiện 404 không phải lỗi
bắt buộc sửa cho Google. Không mở nội dung AI riêng cho crawler và không thay
quyền dùng dữ liệu để huấn luyện.

Chưa truy cập Search Console, không xác nhận Google đã index hoặc AI đã trích
nguồn, không cam kết thứ hạng. Nội dung chuyên môn, nguồn và ngày hiệu lực cần
được chuyên viên duy trì trong bài viết.

Nguồn chính thức:
- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google: Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Next: CI cache](https://nextjs.org/docs/app/guides/ci-build-caching)
