> Ứng dụng đang chạy: [luatvietduc.com](https://luatvietduc.com), mã nguồn tại `apps/cms`.
> Xem [cấu trúc hiện hành](docs/07-current-structure.md). Phần dưới mô tả prototype
> được giữ làm nguồn giao diện; không phải trạng thái backend hiện tại.

# Luật Việt Đức — 1.4.0

[Website](https://logen007.github.io/luatvietduc/) · [Thư viện Việt Nam](https://logen007.github.io/luatvietduc/#/phap-luat/viet-nam) · [Pháp luật Đức](https://logen007.github.io/luatvietduc/#/phap-luat/duc)

Chuyên trang thông tin pháp luật cho cộng đồng người Việt tại Đức. Trang chủ đặt khung chat lớn ở trung tâm, tiếp theo là logo, hai hệ thống pháp luật, tin tức rồi lĩnh vực. Hai thẻ pháp luật dùng cờ Việt Nam và Đức với tỷ lệ riêng của từng cờ. Thiết kế dùng một mẫu tham khảo duy nhất: [MindCloud](https://mindcloud.co/), với gradient xanh navy–xanh dương, khối than chì, nền sáng, Roobert và các đường kẻ mảnh. Đội ngũ chuyên gia nằm trong trang Giới thiệu.

## Hình ảnh và bố cục 1.3

- Trang chủ dùng khung chat gốc, cờ quốc gia và ba ảnh tin. Bỏ nhãn Việt Nam ↔ Đức, dòng mô tả cộng đồng và CTA hỏi thêm. Các minh họa của phiên bản trước vẫn được lưu trong `assets/illustrations/`, không xuất hiện trong giao diện mới.
- Ba chân dung chính thức của Dương Thành Tâm, Võ Nguyễn Bảo Trâm và Nguyễn Xuân Phước, dẫn hồ sơ nguồn Bizlawyer; giữ ảnh xám gốc, chỉ nén WebP. Nguồn ở `assets/team/sources.json`.
- Logo và ảnh tin vẫn giữ nguồn hiện có. Không tạo lại logo hoặc khuôn mặt nhân sự bằng AI.

## Nội dung và trạng thái dịch vụ

- Pháp luật Việt Nam: 16 lĩnh vực, 303 tiêu đề chủ đề giữ nguyên danh mục nguồn. Đây là danh mục định hướng, không phải 303 câu trả lời được kiểm duyệt.
- Pháp luật Đức: 16 lĩnh vực; nội dung chi tiết đang biên tập.
- Hai nhánh dùng chung giao diện thư viện trong `assets/catalog.js`: cờ chọn hệ thống, breadcrumb, tiêu đề, tìm kiếm, tab lĩnh vực/chủ đề, thẻ lĩnh vực, bộ lọc, kết quả và điều hướng. Đức hiện có 0 chủ đề, tìm kiếm được 16 lĩnh vực. Mọi liên kết và biểu mẫu giữ nhánh đang xem; ngôn ngữ giao diện độc lập với hệ thống pháp luật. Các URL Việt Nam cũ vẫn hoạt động.
- Giao diện Việt/Đức; 7 từ khóa tìm kiếm tiếng Đức phổ biến được quy đổi về dữ liệu tiếng Việt. Tiêu đề pháp luật nguồn không bị tự động dịch thành ý kiến chuyên môn.
- Đội ngũ: 9 hồ sơ theo nguồn Bizlawyer, liên kết hồ sơ gốc.
- Logo: 3 ảnh từ carousel G2G Career và 10 từ Bizlawyer, mỗi URL một lần. Tải trực tiếp từ nguồn chính thức; nguồn được lưu trong `assets/site-features.js`. Giao diện chỉ hiển thị logo và điều khiển, không có đoạn ghi chú. Không suy diễn quan hệ với Luật Việt Đức. Tự chạy chậm, pause hover/focus/nút, kéo/vuốt, phím mũi tên và reduced-motion.
- Bỏ khối cẩm nang khỏi trang chủ và bỏ các liên kết Cẩm nang tại Đức/Để lại thông tin khỏi điều hướng. Các URL bài viết cũ vẫn hoạt động.
- Hỏi đáp gợi ý chủ đề liên quan. Chưa có AI trả lời, chuyển chuyên gia, xác thực tài khoản hoặc máy chủ tiếp nhận biểu mẫu; không hiển thị xác nhận gửi thành công giả.

## Mã nguồn và chạy cục bộ

Trang tĩnh, không cần build framework. Chạy `python3 -m http.server 8000` từ thư mục gốc. GitHub Pages xuất bản nhánh `main`, thư mục root.

- `index.html`: khung trang, menu, ngôn ngữ, chính sách tài nguyên.
- `assets/steel-ui.js`: trang chủ có khung chat và gợi ý câu hỏi.
- `assets/terms-alignment.css`: lớp thiết kế cuối cùng dùng chung; được tải sau các stylesheet nền.
- `assets/typography.css`, `assets/fonts/`: Roobert Regular, Medium và SemiBold đầy đủ dấu tiếng Việt, được lưu cùng website. Chủ site xác nhận giấy phép webfont ngày 2026-11-01; giữ nguyên dữ liệu font và ghi nguồn trong `assets/fonts/sources.json`.
- `assets/flags/`: cờ Việt Nam 2:3 và Đức 3:5 bằng SVG, cùng nguồn đối chiếu.
- `assets/catalog-source.js`, `assets/catalog.js`: 16 lĩnh vực, 303 chủ đề, tìm kiếm, chi tiết và phân trang.
- `assets/site-features.js`, `assets/bilingual.js`: hai nhánh pháp luật, đội ngũ, slider và ngôn ngữ.
- `assets/chat-first.js`, `assets/app.js`: hỏi đáp, điều hướng và trạng thái biểu mẫu.
- `assets/news-content.js`, `assets/newsroom.js`, `assets/photos/`: tin, ảnh và nguồn. Giữ ghi công/giấy phép trong `photo-sources.json` và `illustration-sources.json`.

## Kiểm thử

GitHub Actions chạy kiểm tra cú pháp JavaScript và các bài Playwright: `test-chat.py`, `test-fonts.py`, `test-catalog.py`, `test-terms-layout.py`, `test-bilingual-v090.py`, `test-slider.py`, `test-color-theme.py`, `test-jurisdiction-parity.py`. Cài `playwright==1.55.0`, `Pillow>=11,<13` và Chromium để chạy cục bộ. Kiểm tra đối chiếu Việt Nam/Đức bao gồm 60 lượt xem, 64 trang lĩnh vực VI/DE, tìm kiếm, trạng thái rỗng, định tuyến và phóng to chữ 200%. Các kiểm tra còn lại bao gồm 303 tiêu đề nguồn, 6 kích thước màn hình, hành trình tìm kiếm, ngôn ngữ, font, biểu mẫu và chuyển động logo. Workflow xuất bản đối chiếu nội dung thực tế trên Pages với bản trong repo.

Không lưu câu hỏi hay biểu mẫu trên máy chủ. Hội thoại ở trong bộ nhớ trang; ngôn ngữ dùng sessionStorage. CSP chỉ cho phép font nội bộ và giới hạn logo theo nguồn, chặn kết nối dữ liệu ứng dụng ra ngoài.
