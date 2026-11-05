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
| Mẫu trả lời chuyên viên | `modules/quick-replies/`; admin quản lý tại Cài đặt → Câu trả lời nhanh, chỉ chèn vào bản nháp |
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

`shared/locale/ascii-transition.ts` đổi ký tự trực tiếp trên các text node đang nhìn thấy trong 350ms, rồi khôi phục chính xác bản dịch. Không tạo lớp chữ phủ hay CSS highlight. Ký tự ASCII có độ rộng gần với chữ đích; thay đổi từ React hoặc tin nhắn mới được ưu tiên. Ô nhập chỉ đổi placeholder khi rỗng; nhãn select giữ nguyên giá trị. Hiệu ứng dừng khi người dùng thao tác, đổi kích thước, ẩn tab hoặc bật reduced motion. `ascii.ts` chứa bộ sinh khung chữ. Cơ chế cuộn tự động của trình duyệt không hủy hiệu ứng ở footer.

Menu admin dùng nút mở cố định của template ở mọi kích thước, giữ hỗ trợ bàn phím; nút mobile trùng lặp trong header được ẩn.
Quy tắc mobile hiện biểu tượng và vùng bấm 44px của nút cố định, ghi đè việc thư viện gốc ẩn biểu tượng dưới 768px.

Liên kết từ chủ đề đưa tiêu đề công khai vào ô soạn chat qua `chat/intake.ts`, không tự gửi hoặc tạo câu trả lời. Storage không khả dụng không làm treo việc khởi tạo. Browser check phân biệt H1 Thư viện với nhãn cùng tên ở footer.

## Kho kiến thức khi thao tác nhanh

`knowledge/useSources.ts` sở hữu danh sách, bộ lọc và polling khi tab đang mở. `shared/latest-request.ts` gộp lượt đọc cùng truy vấn, bỏ kết quả của lượt cũ và vô hiệu lượt đọc trước khi ghi đã thành công. Lỗi cập nhật danh sách được hiển thị riêng với lỗi ghi; xác nhận lưu không bị đổi thành thất bại vì lượt đọc sau đó. Thao tác chỉnh/lưu/lập chỉ mục dùng chốt đồng bộ để chặn nhấn lặp, và trang vượt phạm vi được đưa về trang còn hợp lệ.

Các lượt đọc phiên, cài đặt, API giao diện và kết nối có giới hạn chờ 15 giây, giữ nguyên các lượt ghi và cơ chế gửi lại hiện có. Nhãn ô nội dung/cách hỏi có phần chữ riêng, không bị lẫn với nội dung textarea.

## Hội thoại khi mạng chậm

Lệnh làm mới trong lúc đang đọc được gộp thành một lượt đọc ngay sau đó, thay vì bị bỏ qua hoặc chờ nhịp polling dài. Vòng đọc vẫn không chạy chồng và dừng khi ẩn/đóng trang. Kết quả tiếp nhận/hoàn tất/trả hàng chờ được áp dụng ngay từ xác nhận ghi, tách khỏi lỗi đọc tiếp theo; không tải hai transcript song song sau mỗi thao tác.

`chat/transition-receipt.ts` giữ trạng thái đã xác nhận và che dữ liệu ngay khi chuyên viên trả/mở lại hội thoại vào hàng chờ. Tiếp nhận không tự mở nội dung trước khi transcript đã kiểm tra quyền trả về. Lỗi mạng tạm thời giữ trạng thái gần nhất và bản nháp; lỗi mất quyền xóa transcript, tệp đang soạn và nội dung soạn khỏi màn hình. Hộp thư có nút thử lại, làm mới sau ghi vô hiệu kết quả cũ, và tự đưa phân trang về phạm vi còn hợp lệ. Server vẫn kiểm tra quyền, phiên bản và lưu chuyển trạng thái trong giao dịch.

## Cập nhật bảo mật 2026-11-05

Next.js được khóa ở16.4.5 theo [bản phát hành bảo mật chính thức](https://github.com/vercel/next.js/releases/tag/v16.4.5), nằm trong peer range của Payload3.92.1. Không suy ra website bị khai thác hoặc áp dụng mọi điều kiện của các advisory. Không thay schema, quyền người dùng, khóa dịch vụ hay chính sách triển khai.

`http/security-headers.mjs` cung cấp chính sách phản hồi cho Next: chống MIME sniffing, giới hạn nhúng trang cùng origin và referrer mặc định; admin/API/service/OAuth/tài khoản/chat dùng private,no-store và no-referrer. CSP chỉ giới hạn frame-ancestors, giữ bootstrap script và giao diện CMS hoạt động; đây không phải CSP chống XSS đầy đủ. Cache của tài nguyên công khai/immutable vẫn do Next và handler quản lý. Quyền tài nguyên tiếp tục kiểm tra trong service/collection.

Kiểm tra mới gồm unit cho chính sách và HTTP trong browser CI trên trang công khai, tài khoản và callback OAuth thiếu code (không gọi nhà cung cấp). Chỉ kiểm tra metadata thư viện và mã nguồn ở máy trong đợt này; không kiểm thử xâm nhập website thật. Kết quả CI/build mới chỉ được công bố khi đã quan sát.

Đối chiếu npm lock sau cập nhật:0high/critical,5moderate+8low là13 mục package chịu ảnh hưởng từ hai advisory gốc. [deepmerge4.3.1](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) chưa có bản vá được công bố; khả năng đi từ dữ liệu không tin cậy của website tới merge cần xác minh riêng. [esbuild0.18.20](https://github.com/advisories/GHSA-67mh-4wv8-2f99) nằm dưới loader của drizzle-kit; advisory áp dụng chế độ serve, chưa thấy lệnh khởi chạy chế độ đó trong mã ứng dụng/scripts đã rà. Không coi thống kê package là số lỗ hổng khai thác được trên website, và không dùng audit fix --force để hạ Payload về phiên bản không tương thích.

Đợt tiếp theo khóa riêng `@esbuild-kit/core-utils > esbuild` ở0.25.12, bỏ bản0.18.20 lồng bên trong. Loader chỉ dùng transformSync/transform trong đường mã đã đọc; unit tương thích kiểm tra cả hai kiểu biên dịch TypeScript, cùng các bước migration/system/build hiện có trong CI. Không đổi drizzle-kit/Payload hay dùng bản fork không chính thức. Kiểm tra metadata npm lock hiện còn0moderate/high/critical và9 mục package mức low, cùng phát sinh từ một advisory deepmerge chưa có bản vá. Đây không phải kết luận không còn lỗ hổng ứng dụng.

`backup/useBackups.ts` tách đọc trạng thái và xác nhận ghi, có giới hạn chờ GET, chốt thao tác và ranh giới phiên owner. `integrations/Panel.tsx` cũng che form ngay khi đổi/mất phiên và bỏ kết quả bất đồng bộ cũ. `chat/drafts.ts` sở hữu nháp theo hội thoại và cầu nối tạm thời qua trang tài khoản; chỉ khôi phục sau danh sách hội thoại do server xác nhận quyền. Chi tiết và giới hạn nằm trong `09-ux-review-20261105.md`.


## Tài khoản email — 01.20

Trang `/tai-khoan` dùng form nền đen, Google và email/mật khẩu; mặc định Create your account, chuyển Sign in trong cùng trang. `modules/identity/AccountForm.tsx` giữ phần form, `account-input.ts` lọc dữ liệu, `account-email.ts` tạo email VI/DE; POST `/service/auth/{action}` xử lý đăng ký, đăng nhập, xác minh, gửi lại và đặt lại mật khẩu. Mật khẩu dùng bộ hash và hạn chế đăng nhập của Payload; token đăng nhập chỉ được đặt trong cookie HttpOnly.

Đăng xuất công khai `/service/logout` và native `/api/users/logout` dùng chung
`identity/logout.ts`: kiểm tra cùng origin, xác thực độc lập cookie mật khẩu để
thu hồi phiên Payload, xóa phiên Google hiện tại trong DB rồi hết hạn cả hai
cookie. Không chỉ xóa trạng thái giao diện; token cũ không truy cập lại được API.
Các phiên trên thiết bị khác được giữ nguyên. Native admin vẫn dùng nút/luồng
đăng xuất sẵn có, không tạo một giao diện đăng xuất riêng.

Đăng ký công khai chỉ tạo User chưa xác minh. Hai cột bổ sung giữ tài khoản cũ đã xác minh; Google cấp mới được xác minh theo danh tính Google. Một đăng ký email chưa xác minh không giữ lại mật khẩu cũ khi chủ email đăng nhập bằng Google. Chỉ cookie khách HttpOnly của trình duyệt hiện tại được dùng để nối hội thoại sau đăng nhập; mã hội thoại không tự cấp quyền.

Resend cần được kiểm tra và bật trong `/admin/settings/connections` để gửi email xác minh/đặt lại mật khẩu. Khi chưa bật, API báo chưa sẵn sàng, không báo gửi thành công. Chủ hệ thống chọn tự gửi email thử; địa chỉ gửi đã sửa sang tên miền mail.luatvietduc.com đã xác minh, kết nối vẫn tắt chờ thao tác này. Không gửi email thật trong kiểm tra tự động.

Schema đi qua `release-reviewed-email-accounts.py`, ghim commit/manifest, kiểm tra CI, sao lưu và migration trước candidate; không đổi policy tự cập nhật. Quay lại mã cũ có thể giữ hai cột bổ sung. Down migration từ chối khi còn tài khoản chưa xác minh. Đã kiểm tra hệ thống với hộp thư giả: User-only, xác minh, cookie, nối đúng khách, CSRF, mật khẩu cũ bị từ chối sau reset và không tái dùng token.

## Bài viết Việt–Đức — 01.25

Mỗi bài có nhóm ngôn ngữ bất biến và tối đa một bản cho mỗi VI/DE. Hai bản giữ
permalink, lịch sử, xuất bản và quyền AI riêng. Trình viết bài dùng
`content/ArticleLanguages.tsx`; một nút cờ VI/DE ở thanh điều khiển mở bản nhập
tay, tự lưu thay đổi hiện tại thành bản nháp trước khi chuyển bài đã lưu. Bản
ngôn ngữ mới được tạo nháp rỗng, không gọi AI. Bài mới chưa lưu đổi trường ngôn
ngữ ngay và giữ nội dung đang nhập. Chỉ nút “Dịch bằng AI” gửi nội dung; kết quả
điền vào form và cần lưu, không ghi đè nếu form đã thay đổi trong lúc dịch.
`content/PermalinkField.tsx` sinh đường dẫn từ tiêu đề, chỉ chỉnh khi bấm Sửa;
permalink đã sửa tay hoặc đã lưu không tự thay theo tiêu đề. Các nhãn ô nhập
được ẩn trực quan, giữ tên truy cập và dùng placeholder.
Nhóm “Thông tin bổ sung” được bỏ khỏi form; các trường đã lưu và điều kiện hết
hạn vẫn được giữ. Nút VI/DE thay select ngôn ngữ của bài đã lưu.

`/service/articles/translations` yêu cầu quyền viết bài và phạm vi quốc gia,
JSON cùng origin, giới hạn lượt gọi; kiểm tra lại quyền và phiên bản sau khi
Grok trả về. Khóa theo nhóm chặn hai lượt dịch đồng thời, unique index bảo vệ
mỗi ngôn ngữ và thử lại trả cùng bản nháp. Lỗi/trả lời thiếu hoặc bài gốc thay đổi
không tạo bản dịch. Client giữ nội dung vừa sửa, báo lỗi có thể thử lại và hiện
thanh loading không giả phần trăm; reduced motion dùng thanh tĩnh.

Kết nối `translation` có API key mã hóa và trạng thái kiểm tra/bật riêng ở
/admin/settings/connections. Không kế thừa khóa hoặc cấu hình AI chat. Chỉ gửi
tiêu đề/nội dung bài được chuyên viên chủ động yêu cầu dịch, không gửi hội thoại
hay tệp của khách. Model tự chọn từ danh sách chính thức theo cơ chế đã có;
không đăng ký thanh toán. Dịch dùng Grok qua [xAI Responses](https://docs.x.ai/developers/rest-api-reference/inference/responses),
store=false và JSON schema nghiêm ngặt; kết quả vẫn được kiểm tra tại server, không coi JSON hợp lệ
là chứng nhận dịch đúng pháp lý.

Từ 01.27, kết nối dịch dùng marker vendor=xai bên trong dữ liệu mã hóa. Khóa Gemini
cũ bị vô hiệu tại điểm đọc/kiểm tra/bật, không bao giờ được gửi tới xAI; cần nhập
khóa xAI mới, lưu, kiểm tra và bật. AI chat vẫn dùng Gemini. Model dịch để trống
sẽ chọn bản Grok ổn định mới nhất có trong danh sách xAI, không dùng beta/code/image.

Migration bổ sung nhóm ngôn ngữ ở articles/versions và provider trong vault.
`release-reviewed-article-translations.py` ghim SHA/manifest, dùng backup và
candidate của engine đang cài, không sửa policy phát hành. Code rollback giữ
cột mới; down từ chối xóa nếu đã có bài liên kết hoặc khóa dịch. Kiểm tra hệ
thống dùng khóa/AI giả, không phát sinh gửi bài thật hoặc email.

## Thư viện tệp — 01.26

`storage/MediaLibrary.tsx` bọc ListQuery/Selection và EditMany/DeleteMany của Payload:
lưới/danh sách, lọc loại/ngày, tìm kiếm và chọn từng tệp/cả trang. Không chọn ngầm
các trang khác. `MediaUploader.tsx` tải nhiều tệp bằng chọn/kéo thả, có tiến độ và
báo lỗi từng tệp, tối đa 10 MB; dùng API upload và kiểm tra SVG của Payload.

`MediaDetails.tsx` mở hộp chi tiết có xem ảnh/video/audio, chuyển tệp, sửa title,
alt, caption, description, phạm vi, tự lưu có kiểm tra updatedAt, sao chép URL,
tải xuống và xóa có xác nhận. Các thao tác ghi vẫn dùng API native và media backup
lock; không tạo đường lưu/xóa bỏ qua quyền. Client giữ bản nhập khi lỗi hoặc
có xung đột, không tự ghi đè. Bộ chọn tệp trong các form khác giữ giao diện native.

Admin sửa metadata mọi tệp; chuyên viên tải và sửa/xóa tệp của mình. uploadedBy
do server gán và không đổi. Tệp đóng gói cho giao diện vẫn chọn được để sửa
metadata, giữ URL/nội dung/phạm vi công khai và chặn thay nội dung/xóa. Khi có
các tệp này trong lựa chọn, UI tắt xóa hàng loạt và giải thích lý do.

Migration bổ sung title/caption/description/uploadedBy; helper
`release-reviewed-media-metadata.py` ghim SHA/manifest và dùng engine/sao lưu
hiện có, không đổi policy triển khai. Kiểm tra dùng DB/R2 giả; probe production
riêng chỉ được chạy với cờ rõ ràng, tải một SVG riêng tư tạm, đọc đối chiếu rồi
xóa đúng tệp đó. Khóa R2 không xuất ra log. Luồng tương tác tham khảo
[WordPress Media Library](https://wordpress.org/documentation/article/media-library-screen/).

## Kho riêng cho AI và quy tắc — 01.23

`/admin/knowledge` chỉ quản lý bài riêng cho AI và quy tắc trả lời: tiêu đề,
nội dung, loại nội dung; lưu nháp hoặc bật sử dụng. Không tạo bài trong collection
articles, không hiển thị permalink công khai, không có khối nguồn nhập trực tiếp,
liên kết bài công khai hay danh sách mã hội thoại cần bổ sung. Bài công khai đã bật
AI vẫn đồng bộ riêng như trước; không được sửa qua API kho riêng.

Kiến thức riêng dùng RAG hiện có. Quy tắc có entryType=rule và ruleEnabled,
luôn giữ draft + approved=false bằng hook và CHECK tại DB để cả mã cũ cũng không
đưa quy tắc thành nguồn trả lời/công khai. Quy tắc bật được đọc theo phạm vi và
hiệu lực, đưa vào system instruction dưới các giới hạn cố định: chỉ dùng căn cứ
được phép, không bịa, không bỏ điều kiện và chuyển chuyên viên khi thiếu căn cứ.
Chúng không được embedding, chọn làm câu hỏi gợi ý hoặc trích dẫn. Mỗi quy tắc
4.000 ký tự; tối đa 20 quy tắc bật, tổng 16.000 ký tự. Đây là giới hạn prompt;
số bài kiến thức riêng vẫn phân trang và tìm bằng pipeline hiện hữu.

Ghi/thu hồi quy tắc có khóa giao dịch. Trước khi lưu câu trả lời, hệ thống khóa
đọc và so lại revision toàn bộ quy tắc đang áp dụng; thay đổi trong lúc tạo câu trả
lời làm phản hồi cũ mất hiệu lực. Cache formatter cũng chứa revision quy tắc.
Không gửi hồ sơ/tệp khách vào pipeline này, không cho quy tắc nới các kiểm tra
pháp lý/riêng tư đang có. Quy tắc không phải công cụ tạo thêm căn cứ pháp luật.

Nguồn nội bộ dùng địa chỉ admin; migration đổi các UUID source link cũ của nguồn
riêng sang admin và giữ phiên bản. Endpoint knowledge-source cũ trả 404, không
phục vụ thân bài. Tài khoản nhân sự đọc/sửa qua API admin có phân quyền. Khách
không truy cập catalog/native API, không thấy tiêu đề riêng trong gợi ý; câu trả
lời chỉ giữ tên căn cứ riêng, không liên kết công khai. Các source link cũ cũng
được lọc khi đọc lịch sử chat. Nội dung đã trả lời cho khách là phạm vi sử dụng
kiến thức được chủ hệ thống cho phép; đây không phải kho lưu bí mật hoặc hồ sơ cá nhân.

Migration bổ sung loại nội dung, cờ ruleEnabled, index quy tắc và ràng buộc
không xuất bản quy tắc. Không xóa bài/nguồn cũ; revision nguồn cũ chỉ đổi khi URL
nội bộ cần chuyển. Giữ hiệu lực/hết hạn đã lưu, mặc định xác nhận rà soát 90 ngày
khi nhân sự chủ động bật lại. Helper release-reviewed-private-knowledge.py ghim
SHA/manifest và dùng backup, migration, candidate hiện hữu; không đổi policy
triển khai. Down yêu cầu forward recovery để không mất nội dung/cờ quy tắc.

Đã kiểm tra trên DB thử sạch và provider giả: truy cập khách bị từ chối, không có
bài công khai, rule không vào RAG, giới hạn/thu hồi, đổi rule khi phản hồi đang tạo,
10.051 nguồn, bảo vệ expiry, luồng chuyên viên, form và giữ nháp trên mobile/desktop.
Không gửi hội thoại hoặc nội dung thật tới Gemini trong các kiểm tra này.
