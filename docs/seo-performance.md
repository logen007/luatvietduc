# SEO và tốc độ

Nội dung công khai dùng metadata riêng cho từng loại trang, ảnh Open Graph/Twitter,
JSON-LD Organization/WebSite/WebPage và Article/NewsArticle + BreadcrumbList.
Không khai báo tác giả cá nhân, đánh giá hay FAQ chưa có căn cứ hiển thị.

`modules/public-site/seo.ts` giữ quy tắc metadata, canonical, robots, schema và XML.
`Page.tsx` định nghĩa mô tả theo trang; trang bài viết lấy từ nội dung thực.
Thư viện Việt Nam dùng canonical `/phap-luat/viet-nam`; nhóm Việt Nam dùng
`/chu-de/{id}`. Mỗi trang phân trang có canonical riêng. Tìm kiếm/bộ lọc không
lập chỉ mục. Chỉ cặp bài VI/DE thực sự đã xuất bản mới có hreflang; việc đổi ngôn
ngữ của giao diện bằng cookie không tạo ra URL dịch giả.

Sitemap chia tối đa 1.000 bài mỗi tệp, đọc qua quyền công khai, chỉ có bài đã xuất
bản/được duyệt/có nội dung và các trang công khai. Thu hồi bài có hiệu lực ngay.
Không thêm kiến thức AI riêng, tài khoản, hội thoại, API hoặc admin. Các vùng này
có noindex và cấm cache; robots tôn trọng nút bật lập chỉ mục trong Cài đặt website.
Robots/sitemap không cache để thay đổi của admin có hiệu lực trên lượt đọc mới.

Ảnh đóng gói có 3 cỡ WebP 480/960/1440 trong `assets/optimized-photos`, giữ nguyên
ảnh nguồn và bản ghi Thư viện. `photos.ts` + `photo-sizes.json` cung cấp srcset,
sizes và kích thước đúng; thẻ danh sách dùng ảnh cắt 1.6:1 riêng để không tải
thừa phần ảnh dọc, còn ảnh trong bài giữ đầy đủ; ảnh nền blur chỉ cần cỡ nhỏ. Tái tạo bằng:
`cd apps/cms && node scripts/optimize-public-photos.mjs`.

Video điện thoại 1280px có cùng 25,04 giây/các cảnh của bản gốc, 2.575.244 byte
so với 11.771.155 byte. Bản máy tính giữ nguyên. Chỉ tải video khi trang đã tải,
hero hiện trong màn hình và không bật tiết kiệm dữ liệu/giảm chuyển động; nút
phát chủ động vẫn hoạt động. Poster được ưu tiên; ảnh phía dưới tải khi cần.

Font giữ Inter/Articulat. Link CSS font trực tiếp thay CSS import, ưu tiên đúng
subset tiếng Việt để tránh lượt tải latin-ext dư. Chỉ tài nguyên đóng gói công
khai có browser cache 1 giờ; không cache HTML riêng tư, API, phiên hay tệp khách.

Kiểm tra: `npm test`, `npm run typecheck`, production build, bộ trình duyệt hiện
có và `node --import tsx scripts/test-public-seo.mjs` (chỉ DB `lvd_test` cục bộ).
Kiểm tra SEO gồm robots bật/tắt, 12 loại trang thật, metadata/JSON-LD, tìm kiếm,
trang riêng tư, cặp dịch đã xuất bản, loại bài nháp và thu hồi ngay.

Search Console cần xác minh bằng tài khoản quản lý tên miền và gửi
`https://luatvietduc.com/sitemap.xml`; chưa tuyên bố đã gửi hay Google đã index.
Không có cam kết thứ hạng hoặc điểm PageSpeed cố định.

## Đợt tối ưu tải trang 2026-11-08

Đo đọc trang công khai bằng Chrome, viewport 390×844/DPR 2, mỗi trang một context
mới. Lượt không giới hạn mạng ghi nhận TTFB 271–374 ms trên Trang chủ, Tin tức,
Thư viện Việt Nam và Hỏi đáp. Một mẫu mạng 2 Mbps/100 ms, CPU chậm 4 lần ghi nhận
LCP Trang chủ 2.60 giây, Tin tức 1.20 giây. Đây là mẫu chẩn đoán trước thay đổi,
không phải dữ liệu người dùng thực, điểm Lighthouse hoặc cam kết tốc độ.

- Đóng gói đúng 13 logo đối tác hiện có tại `assets/logos/`, giữ SVG vector;
  raster WebP chất lượng 82, tối đa 440×120 cho vùng hiển thị 220×60. Tổng nguồn
  228.683 byte → 85.006 byte (giảm 63%). Không còn chờ hai origin ngoài cho dải
  logo; dùng cache tài nguyên công khai hiện có. Giữ bộ lọc trắng, thứ tự và tên.
- `AppLink` giữ tải trước các điểm đến phổ biến, còn bài viết/bộ lọc chỉ tải
  trước khi hover/focus/touch. Không phát hàng loạt lượt đọc trang động cho cả
  danh sách. Khóa không tải trước trang riêng tư, cảnh báo bản nháp, Back/Forward,
  Next Link và hành vi mở tab/tải tệp vẫn giữ nguyên.
- Các thành phần dịch không ghi lại cùng cookie/ngôn ngữ HTML ở mỗi nhãn.
  Kiểm tra 50 thành phần: một lần ghi ban đầu, thêm một lần khi đổi ngôn ngữ.

TypeScript và 581 unit/domain checks đạt. Kiểm tra bổ sung bao gồm ý định điều
hướng, bàn phím/cảm ứng, trang riêng tư, đổi bộ lọc, cookie và nguồn logo tái tạo
được. Chưa có phép đo tốc độ production sau khi triển khai bản này; số giảm
63% là dung lượng logo, không phải toàn trang. Không thay video admin đã chọn,
không cache dữ liệu hội thoại/tài khoản hay nới quyền truy cập.

Tài liệu chính thức:
- [Canonical](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
- [Phân trang](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading)
- [Đa ngôn ngữ](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Video và tốc độ](https://web.dev/learn/performance/video-performance)

## Rà soát tiếp toàn bộ nhóm trang — 2026-11-08

Đã thêm AVIF cùng WebP dự phòng cho ảnh dùng chung, giảm 35,9% tổng dung lượng
bộ ảnh; nền tài khoản giảm 80,9%. Lưới thư viện dùng preview nhẹ của ảnh đóng
gói, không thay ảnh gốc hoặc thumbnail R2. Editor được tải riêng khi mở vùng
soạn thảo, không kéo Tiptap vào login và các trang quản trị không dùng editor.

Xác minh 72 lượt mở trang local trên mobile/desktop, 2 trường hợp chọn định dạng
ảnh và lưu/reload 2 loại editor. Các chỉ số production trước thay đổi và giới
hạn phép đo, bao gồm CLS admin còn cao ở một số trang, được ghi đầy đủ tại
[biên bản kiểm tra](verification/2026-11-08-site-speed.md). Không tuyên bố mức
cải thiện LCP production từ phép đo localhost.

## Ổn định giao diện trong lúc tải — lượt tiếp theo 2026-11-08

Sửa khung menu trước hydration, khoảng trống nút chuyển vai trò, form Drive,
quy tắc trả lời, tài khoản và editor. Đo local: CLS sao lưu 0,643 → 0, quy tắc
0,563 → 0, đăng ký mobile 0,260 → 0,0011; không suy ra tốc độ production từ
các số này. Xem [báo cáo ổn định bố cục](verification/2026-11-08-layout-stability.md).
Không thay cache/ACL/phiên, schema hoặc lịch sao lưu.
