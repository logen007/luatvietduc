# Luật Việt Đức — 1.1.0

[Website](https://logen007.github.io/luatvietduc/) · [Thư viện Việt Nam](https://logen007.github.io/luatvietduc/#/phap-luat/viet-nam) · [Pháp luật Đức](https://logen007.github.io/luatvietduc/#/phap-luat/duc)

Chuyên trang thông tin pháp luật cho cộng đồng người Việt tại Đức. Trang chủ ưu tiên tìm kiếm, hai hệ thống pháp luật, lĩnh vực, tin tức và đội ngũ Bizlawyer. Thiết kế lấy cảm hứng từ bố cục hình–chữ của Privy, Ferndesk và Weave, dùng màu đỏ trầm, giấy ấm, Geist và Geist Mono. Nội dung trang chủ gói trong 320 từ, kể cả các tiêu đề tin gốc và ghi nguồn.

## Hình ảnh 1.1

- Ba minh họa 3D nguyên bản: cầu nối tri thức, hồ sơ Việt Nam và hồ sơ Đức. Tạo bằng Imagegen, là hình biểu trưng, không phải tài liệu hoặc biểu trưng nhà nước. WebP responsive 18–74 KB; prompt và nguồn ở `assets/illustrations/`.
- Ba chân dung chính thức của Dương Thành Tâm, Võ Nguyễn Bảo Trâm và Nguyễn Xuân Phước, dẫn hồ sơ nguồn Bizlawyer; giữ ảnh xám gốc, chỉ nén WebP. Nguồn ở `assets/team/sources.json`.
- Logo và ảnh tin vẫn giữ nguồn hiện có. Không tạo lại logo hoặc khuôn mặt nhân sự bằng AI.

## Nội dung và trạng thái dịch vụ

- Pháp luật Việt Nam: 16 lĩnh vực, 303 tiêu đề chủ đề giữ nguyên danh mục nguồn. Đây là danh mục định hướng, không phải 303 câu trả lời được kiểm duyệt.
- Pháp luật Đức: 16 lĩnh vực; nội dung chi tiết đang biên tập.
- Giao diện Việt/Đức; 7 từ khóa tìm kiếm tiếng Đức phổ biến được quy đổi về dữ liệu tiếng Việt. Tiêu đề pháp luật nguồn không bị tự động dịch thành ý kiến chuyên môn.
- Đội ngũ: 9 hồ sơ theo nguồn Bizlawyer, liên kết hồ sơ gốc.
- Logo: 3 ảnh từ carousel G2G Career và 10 từ Bizlawyer, mỗi URL một lần. Tải trực tiếp từ nguồn chính thức, ghi nguồn chung; không suy diễn quan hệ với Luật Việt Đức. Tự chạy chậm, pause hover/focus/nút, kéo/vuốt, phím mũi tên và reduced-motion.
- Bỏ khối cẩm nang khỏi trang chủ và bỏ các liên kết Cẩm nang tại Đức/Để lại thông tin khỏi điều hướng. Các URL bài viết cũ vẫn hoạt động.
- Hỏi đáp gợi ý chủ đề liên quan. Chưa có AI trả lời, chuyển chuyên gia, xác thực tài khoản hoặc máy chủ tiếp nhận biểu mẫu; không hiển thị xác nhận gửi thành công giả.

## Mã nguồn và chạy cục bộ

Trang tĩnh, không cần build framework. Chạy `python3 -m http.server 8000` từ thư mục gốc. GitHub Pages xuất bản nhánh `main`, thư mục root.

- `index.html`: khung trang, menu, ngôn ngữ, chính sách tài nguyên.
- `assets/steel-ui.js`: trang chủ ưu tiên thư viện.
- `assets/terms-alignment.css`: lớp thiết kế cuối cùng dùng chung; được tải sau các stylesheet nền.
- `assets/typography.css`: Geist/Geist Mono đầy đủ dấu tiếng Việt.
- `assets/catalog-source.js`, `assets/catalog.js`: 16 lĩnh vực, 303 chủ đề, tìm kiếm, chi tiết và phân trang.
- `assets/site-features.js`, `assets/bilingual.js`: hai nhánh pháp luật, đội ngũ, slider và ngôn ngữ.
- `assets/chat-first.js`, `assets/app.js`: hỏi đáp, điều hướng và trạng thái biểu mẫu.
- `assets/news-content.js`, `assets/newsroom.js`, `assets/photos/`: tin, ảnh và nguồn. Giữ ghi công/giấy phép trong `photo-sources.json` và `illustration-sources.json`.

## Kiểm thử

GitHub Actions chạy kiểm tra cú pháp JavaScript và các bài Playwright: `test-chat.py`, `test-fonts.py`, `test-catalog.py`, `test-terms-layout.py`, `test-bilingual-v090.py`, `test-slider.py`. Cài `playwright==1.55.0`, `Pillow>=11,<13` và Chromium để chạy cục bộ. Các kiểm tra bao gồm 303 tiêu đề nguồn, 6 kích thước màn hình, hành trình tìm kiếm, ngôn ngữ, font, biểu mẫu và chuyển động logo. Workflow xuất bản đối chiếu nội dung thực tế trên Pages với bản trong repo.

Không lưu câu hỏi hay biểu mẫu trên máy chủ. Hội thoại ở trong bộ nhớ trang; ngôn ngữ dùng sessionStorage. CSP giới hạn font và logo theo nguồn, chặn kết nối dữ liệu ứng dụng ra ngoài.
