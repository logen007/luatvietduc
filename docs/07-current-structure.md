# Cấu trúc đang chạy

Ứng dụng hiện hành ở `apps/cms`, phục vụ https://luatvietduc.com. Root `index.html`
và `assets/` là nguồn giao diện được giữ lại. `platform/` là bộ quy tắc nền; quyền,
giao dịch và API thực tế nằm trong CMS.

## Nơi sửa

| Phần | Module |
|---|---|
| Danh tính, logo, menu, footer công khai | `modules/shared/public-shell.mjs`, `Header.tsx`, `Footer.tsx` |
| Phiên đăng nhập | `modules/shared/account-state.mjs`, hợp đồng `identity/contracts.ts`, React qua `session-client.ts` |
| Ngôn ngữ | `modules/shared/locale/de.json`, dùng chung cả hai bộ dựng |
| Cấu hình công khai | `modules/settings/view.ts`, client cache ở `client-store.ts` và `client.ts`, tách khỏi vault bí mật |
| Nhãn/mô tả admin | `modules/admin/presentation.ts`, `i18n.ts`, `pages.ts` |
| Menu, lối tắt, nhóm cài đặt admin | `modules/admin/navigation-model.ts`; chỉ gợi ý hiển thị, không thay quyền server |
| Điều hướng từ bài viết công khai | `modules/content/navigation.ts`; kiến thức về Thư viện, tin tức về Tin tức |
| Giao thức HTTP | `modules/http/`, giữ đường dẫn cũ |
| API kiến thức | `modules/knowledge/http.ts`, nghiệp vụ trong `articles.ts` |
| Dữ liệu chat client/server | `modules/chat/contracts.ts` |
| Gửi tin, tiếp nhận, đóng/mở | `modules/chat/service.ts`, giao dịch PostgreSQL |
| Hàng chờ trả lời | `modules/assistant/queue.ts`, `worker.ts` |
| Căn cứ và phạm vi AI | `modules/assistant/`, `modules/rag/` |
| Tệp riêng tư | `modules/chat/files.ts`, kiểm tra quyền tại server |
| Kết nối | `modules/integrations/`, khóa mã hóa trong vault |
| Sao lưu/khôi phục thử | `modules/backup/`, `ops/backup/` |

## Gửi tin và trả lời

Header, tài khoản, chat và hộp thư dùng chung phiên React. Các lượt kiểm tra phiên
đồng thời chia sẻ một yêu cầu; thay tài khoản, vai trò, phạm vi hoặc mất phiên đổi
revision. Nội dung riêng tư được che ngay trong render và kết quả tải của revision
cũ bị bỏ qua. Quyền thực tế vẫn do server kiểm tra, không dựa vào cache client.
Cài đặt công khai dùng cache 30 giây, chia sẻ yêu cầu và cập nhật khi quay lại tab;
lỗi mạng giữ cấu hình công khai gần nhất, còn lỗi phiên xóa dữ liệu tài khoản.

Tin nhắn và job được lưu trong cùng giao dịch. Khách nhận xác nhận lưu trước khi
Gemini xử lý. Hai consumer có giới hạn dùng khóa/lease, nhận lại việc sau khi lease
hết hạn; job chỉ giữ tham chiếu, không sao chép hội thoại. Tiếp nhận bởi chuyên viên
hoặc câu hỏi mới hủy hiệu lực kết quả AI cũ. Pipeline hiện có vẫn kiểm tra nguồn,
hạn mức, điều kiện sử dụng, phiên bản và trạng thái hội thoại trước khi ghi phản hồi.

Frontend đọc nhanh khi chờ AI, giãn nhịp khi không thay đổi và ngủ khi tab ẩn.
Gửi/tải tệp/chuyển trạng thái dùng khóa thao tác đồng bộ ở client. Mã gửi được giữ
để thử lại khi chưa có xác nhận lưu; sau xác nhận, khung nhập mở lại ngay và vòng
đọc transcript hiện có được đánh thức, không tải lại toàn bộ lịch sử sau mỗi tin.
Kiểm tra nhóm tệp ở client diễn ra trước lượt tải đầu tiên; kiểm tra nội dung và
quyền tại server vẫn là bắt buộc. Helper client ở `modules/chat/client-operations.ts`.
Đây là polling thích nghi, chưa phải WebSocket/SSE. Worker chỉ bật ở production,
được tắt trong build/CI/candidate; không mở thêm cổng hay bật dịch vụ trả phí.

## CSS và phát hành

`presentation/modules.json` quản lý nguồn bundle; không sửa bundle riêng.
`live.css` là khung dùng chung; `customer-chat.css` chỉ trang chat tải;
`specialist-inbox.css` phục vụ hộp thư; `admin-theme.css` sinh từ CSS admin;
`editorial-ui.css` phục vụ các trang công khai; `09-native-pages.css` chỉ bổ sung bố cục trong `.lvd-public-site`.

CSS admin/công khai đi qua snapshot có checksum, đổi con trỏ nguyên tử và tự
phục hồi nếu kiểm tra phục vụ thất bại. Sửa React/logic cần build. Sửa schema dùng
triển khai đã rà soát, sao lưu và migration tương thích. Không bỏ kiểm tra để hứa
mọi thay đổi đều tức thời. Nhãn/mô tả admin sửa ở presentation.ts; quyền, validation,
hook và trường dữ liệu ở module nghiệp vụ. Không sửa migration lịch sử.

Đồng bộ bài viết đã bật AI sang knowledge và job lập chỉ mục vẫn diễn ra trong
cùng giao dịch qua trigger PostgreSQL, được quản lý bằng migration mới.

## Giới hạn

Trang chủ, thư viện, tin tức và các trang thông tin đã dùng React/SSR như tài
khoản, chat và bài viết. Bộ dựng cũ được giữ làm nguồn tham chiếu và quay lại bản
cũ, không tải trong các trang mới. Nhập nguồn kiến thức cũ còn để sửa dữ liệu đã
có; viết mới dùng bài viết + checkbox AI. Kiểm tra cấu trúc không thay thế đo tải, đánh giá chất lượng pháp lý
hay đợt khôi phục Drive thật.

## Rà soát cấu trúc 2026-11-04

Website có ba khu vực: nội dung công khai, tài khoản/chat và quản trị dưới `/admin`.
`/quan-tri`, `/kien-thuc`, `/chuyen-vien` là chuyển tiếp tương thích tới admin;
`/bai-viet` chuyển tới danh sách tin. Không tạo thêm màn hình quản trị ở các địa chỉ cũ.

Menu, lối tắt dashboard và các nhóm cài đặt admin dùng chung một mô hình. Quyền
truy cập/ghi dữ liệu vẫn nằm ở collection và service. Chỉ Admin và Chuyên viên
được hiển thị điều hướng admin; nút viết mới cần quyền tạo tương ứng. Admin nhìn
thấy Người dùng trước Cài đặt; Cài đặt luôn ở cuối. Menu công khai chuẩn hóa `#/...` sang URL riêng. Adapter nhỏ chuyển các bookmark
hash cũ, giữ từ khóa, bộ lọc và ngữ cảnh hội thoại.

## Trang công khai — 01.18.00

`modules/public-site/` chia theo trách nhiệm:

| Phần | Nguồn |
|---|---|
| Dữ liệu công khai, truy vấn có phân trang | `server.ts` |
| Phân loại URL, truy vấn, tương thích đường cũ | `routes.ts`, `shared/public-shell.mjs` |
| Trang chủ, video, logo, thứ tự khối | `Home.tsx` |
| Thư viện, danh mục, chủ đề | `Library.tsx`, `search.ts` |
| Tin tức và bài công khai cũ | `News.tsx`, `legacy-news.ts` |
| Giới thiệu, đội ngũ, chính sách, trợ giúp | `Information.tsx` |
| Form liên hệ | `Contact.tsx`; gửi email ở `modules/contact/` |
| Khung trang và thành phần nhỏ | `Frame.tsx`, `ui.tsx` |
| Metadata và sitemap | `seo.ts`, `app/robots.ts`, `app/sitemap.xml/`, `app/sitemaps/` |
| Bản sao nội dung nguyên mẫu | `content.json`; tái tạo bằng `scripts/import-public-content.mjs` |

URL chính: `/thu-vien`, `/phap-luat/viet-nam`, `/phap-luat/duc`,
`/chu-de/{nhom}`, `/tin-tuc`, `/tin/{bai-cu}`, `/bai-viet/{slug}`,
`/gioi-thieu`, `/lien-he`, `/quyen-rieng-tu`, `/dieu-khoan`, `/tro-giup`.
303 tiêu đề Việt Nam vẫn chỉ là danh mục chủ đề. Khi bài tương ứng được xuất bản
và duyệt, URL chủ đề chuyển sang bài CMS. Không tạo nội dung trả lời cho nhánh Đức.

Truy vấn công khai áp dụng quyền collection, trạng thái published + approved và
phân trang; cache React chỉ dùng trong cùng lượt dựng trang. Trang chủ chỉ nhận
thông tin nhóm gọn, không gửi cả 303 tiêu đề xuống trình duyệt. Tin công khai cũ
được giữ từ bản sao nguồn khi bản nhập nháp còn nguyên. Sửa nháp, thu hồi, đã duyệt
hoặc xóa bản nhập sẽ chặn bản sao; nội dung nháp riêng không được dùng làm fallback.
Đây không phải việc duyệt bài hoặc cấp quyền AI cho dữ liệu cũ.

`publicIndexingEnabled` điều khiển đồng nhất robots.txt, metadata trang công khai
và sitemap. Tắt thì không cho lập chỉ mục, sitemap rỗng; bật thì chỉ URL công khai
đủ điều kiện mới xuất hiện. Sitemap chia 1.000 bài mỗi tệp. Trang tìm kiếm/bộ lọc,
chủ đề chưa có bài, nhánh trống, tài khoản, chat, admin và API không được lập chỉ mục.
Không thay giá trị cài đặt đang lưu, schema hay luật phân quyền trong đợt chuyển này.

Kiểm tra: unit, build, truy vấn trên DB thử riêng, HTTP với hai trạng thái lập chỉ
mục, bài nháp/thu hồi, bookmark cũ, mobile và đổi ngôn ngữ giao diện. Không gửi AI,
email hay đọc dữ liệu khách trong quá trình kiểm tra. Đây không phải đo tải thực tế.

Nguồn kiến thức nhập mới là Bài viết + “Cho phép dùng cho AI”; trình sửa nguồn cũ
chỉ giữ để bảo trì dữ liệu đã có. Không loại bỏ nguồn cũ hoặc xóa dữ liệu trong đợt này.

## Review UX — bản sửa sau 01.18.00

Biểu mẫu nguồn kiến thức cũ và kết nối dùng cảnh báo thay đổi chưa lưu; khóa kết nối không được đưa vào lưu nháp trên trình duyệt. Trang kết nối phân biệt hết phiên, thiếu quyền và lỗi có thể thử lại. Chat có trạng thái khởi tạo và thử lại, giữ nguyên giới hạn phiên, lưu tin và chuyển chuyên viên. Lựa chọn sắp xếp thư viện áp dụng cả truy vấn bài CMS, trước phân trang.

Bundle editorial-ui.js chỉ còn adapter bookmark native; giữ tên tệp/version để tương thích kiểm tra triển khai. Các fragment renderer cũ vẫn nằm trong nguồn tham chiếu. Kiểm tra giao diện CMS chạy trong postbuild của workflow hiện hữu ở CI, không sửa policy phát hành và không yêu cầu vào VPS.

## Chuyển ngôn ngữ và ngữ cảnh câu hỏi

`shared/locale/ascii-transition.ts` tạo lớp chữ ASCII trang trí cho các nhãn vừa đổi VI/DE, giữ nguyên DOM bản dịch và accessible name; chỉ các chữ đang nhìn thấy được xử lý. Hiệu ứng 320ms được hủy khi thao tác tiếp, cuộn, đổi kích thước hoặc ẩn tab, và bỏ qua khi bật reduced motion. `ascii.ts` chứa bộ sinh khung chữ có kiểm tra riêng.

Liên kết từ chủ đề đưa tiêu đề công khai vào ô soạn chat qua `chat/intake.ts`, không tự gửi hoặc tạo câu trả lời. Storage không khả dụng không làm treo việc khởi tạo. Browser check phân biệt H1 Thư viện với nhãn cùng tên ở footer.

## Kho kiến thức khi thao tác nhanh

`knowledge/useSources.ts` sở hữu danh sách, bộ lọc và polling khi tab đang mở. `shared/latest-request.ts` gộp lượt đọc cùng truy vấn, bỏ kết quả của lượt cũ và vô hiệu lượt đọc trước khi ghi đã thành công. Lỗi cập nhật danh sách được hiển thị riêng với lỗi ghi; xác nhận lưu không bị đổi thành thất bại vì lượt đọc sau đó. Thao tác chỉnh/lưu/lập chỉ mục dùng chốt đồng bộ để chặn nhấn lặp, và trang vượt phạm vi được đưa về trang còn hợp lệ.

Các lượt đọc phiên, cài đặt, API giao diện và kết nối có giới hạn chờ 15 giây, giữ nguyên các lượt ghi và cơ chế gửi lại hiện có. Nhãn ô nội dung/cách hỏi có phần chữ riêng, không bị lẫn với nội dung textarea.
