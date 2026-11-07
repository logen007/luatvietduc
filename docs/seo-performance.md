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
sizes và kích thước đúng; ảnh nền blur chỉ cần cỡ nhỏ. Tái tạo bằng:
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

Tài liệu chính thức:
- [Canonical](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
- [Phân trang](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading)
- [Đa ngôn ngữ](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Video và tốc độ](https://web.dev/learn/performance/video-performance)
