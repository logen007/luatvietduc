# Cấu trúc đang chạy

## Rà soát phục hồi tiếp theo — 2026-11-05

Trang tài khoản giữ mã verify/reset trong bộ nhớ của chính trang qua lỗi kiểm
tra phiên. Nút Thử lại dùng session store hiện có, không tải lại trang; rời luồng,
hoàn tất hoặc đăng nhập thì bỏ mã. Không thêm lưu trữ token hay thay xác thực.
Menu không lặp Liên hệ khi cấu hình đã có liên kết này.

Hai lượt đọc bài nguồn/bản nháp trong trình đổi ngôn ngữ giới hạn 15 giây; lỗi
mở lại thao tác và giữ nội dung đang sửa. Bấm lại bài kiến thức đang chọn cho
phép tải phiên bản mới sau xung đột, vẫn xác nhận bỏ nháp trước khi tải.

Xác nhận tạo hội thoại giữ ID trong lịch sử cục bộ, tối đa 100 mục. Lượt đọc cũ
không ghi đè ID mới; nội dung/trạng thái thật tiếp tục lấy từ transcript. Tìm hộp
thư chuẩn hóa từ khóa theo server, chờ debounce trước khi đọc trang đầu và giữ
nguyên chữ đang nhập. Không thay hàng chờ trả lời, quyền hay schema.

Kiểm tra: 203 unit, TypeScript, build và trình duyệt với dữ liệu giả. Có các ca
verify/reset→lỗi phiên→Thử lại, đọc nguồn dịch hết hạn, xung đột kiến thức và hủy
bỏ nháp, lịch sử lỗi sau tạo hội thoại, tìm từ trang 3 và từ khóa cùng nội dung.

## Rà soát luồng sử dụng 2026-11-05

Đổi chuyên mục tin giữ từ khóa, đặt lại trang và không khôi phục bộ lọc loại đã bỏ.
Form câu hỏi/liên hệ khai báo POST để dữ liệu không rơi vào URL trước hydration;
gửi nội dung vẫn qua handler hiện có, chưa có luồng gửi khi JavaScript bị tắt.

Lỗi xóa media tách khỏi lỗi lưu metadata: thử lại đúng thao tác, hủy giữ quyền
xác nhận, 404 được coi là tệp đã xóa. Hoàn tất upload hủy tìm kiếm đang chờ để
không ẩn tệp mới. Thay tệp đang xem xóa trạng thái lỗi/xác nhận/sao chép cũ.

Outbox giữ khóa theo hội thoại và nội dung chưa được xác nhận, kể cả khi đổi
hội thoại hoặc mở cuộc mới. Tối đa 50 yêu cầu chưa xác nhận; hết chỗ thì từ chối
yêu cầu mới, không bỏ khóa cũ. Xác nhận gửi giải phóng chỗ. Bộ nhớ này thuộc phiên
workspace hiện tại, không bảo đảm giữ khóa qua tải lại trang hoặc thay phiên.
Bản nháp chuyên viên giữ cả chữ và tệp khi đổi hội thoại, chỉ hiện sau lượt đọc
được phép. Thu hồi quyền rõ ràng xóa bản nháp và khóa gửi của hội thoại đó; lỗi
đọc tạm thời hoặc đóng hội thoại vẫn giữ nháp đã được phép.

Kiểm tra: 200 unit, TypeScript, build và trình duyệt trên dữ liệu giả. Luồng
trình duyệt gồm A→B→A, lỗi xác nhận gửi, mất quyền, retry xóa sau autosave và
upload trong lúc tìm kiếm. Không gọi nhà cung cấp hay ghi dữ liệu khách thật.

Ứng dụng hiện hành ở `apps/cms`, phục vụ https://luatvietduc.com. Root `index.html`
và `assets/` là nguồn giao diện được giữ lại. `platform/` là bộ quy tắc nền; quyền,
giao dịch và API thực tế nằm trong CMS.

## Nơi sửa

Sau lỗi lệch phiên bản kết nối, thẻ cài đặt có nút tải lại cấu hình an toàn.
Lượt đọc giữ ô đã sửa và khóa chỉ có trong bản nháp, cập nhật các ô chưa sửa;
lưu, kiểm tra và bật kết nối tiếp tục là các thao tác riêng do admin chọn.

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
| Mẫu trả lời chuyên viên | `modules/quick-replies/`; admin quản lý tại Hộp thư → Câu trả lời nhanh, chỉ chèn vào bản nháp |
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

Hội thoại dài giữ các lượt khách đã đồng ý xử lý: dữ kiện đầu và phần gần nhất trong ngân sách 12 KB; tối đa 80 tin gần nhất và 4 lượt khách đầu được đọc. Nội dung chuyên viên/ghi chú nội bộ không đưa vào ngữ cảnh model. Câu hỏi kế tiếp ưu tiên quốc gia vừa được khách xác nhận. Intake giới hạn câu hỏi, không lặp dữ kiện đã có; đổi chủ đề đặt lại các câu hỏi riêng của chủ đề.

Frontend đọc nhanh khi chờ AI, giãn nhịp khi không thay đổi và ngủ khi tab ẩn.
Gửi/tải tệp/chuyển trạng thái dùng khóa thao tác đồng bộ ở client. Mã gửi được giữ
để thử lại khi chưa có xác nhận lưu; sau xác nhận, khung nhập mở lại ngay và vòng
đọc transcript hiện có được đánh thức, không tải lại toàn bộ lịch sử sau mỗi tin.
Khi khách chủ động sang đăng nhập, cầu nối nháp chỉ giữ khóa gửi chưa xác nhận cho đúng nội dung và thứ tự tệp. Sau đăng nhập, chỉ khôi phục vào hội thoại đã được server xác nhận thuộc tài khoản; không tự gửi. Sửa nội dung/tệp sẽ dùng khóa mới. Đây là ngoại lệ giới hạn cho mất xác nhận rồi đăng nhập, không giữ outbox chung qua đổi tài khoản.
Kiểm tra nhóm tệp ở client diễn ra trước lượt tải đầu tiên; kiểm tra nội dung và
quyền tại server vẫn là bắt buộc. Helper client ở `modules/chat/client-operations.ts`.
Transport tệp ở `modules/chat/client-upload.ts` giới hạn mỗi lượt tải và đọc phản
hồi trong 90 giây, hủy khi workspace bị đóng/thay phiên. Lỗi ở tệp sau vẫn giữ
tệp đã hoàn tất và bản nháp; không tự gửi lại yêu cầu tải.
Đây là polling thích nghi, chưa phải WebSocket/SSE. Worker chỉ bật ở production,
được tắt trong build/CI/candidate; không mở thêm cổng hay bật dịch vụ trả phí.

## CSS và phát hành

`presentation/modules.json` quản lý nguồn bundle; không sửa bundle riêng.
Video hero chỉ gắn nguồn MP4 sau khi observer xác nhận đang hiển thị, tránh
đọc tệp video trước callback đầu tiên khi trang mở ở vị trí đã cuộn xuống dưới.
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
metadata, giữ URL/nội dung/phạm vi công khai. Admin có thể gỡ bản ghi và các
size liên quan khỏi thư viện bằng thao tác xóa; tệp giao diện trong mã vẫn giữ nguyên.

Migration bổ sung title/caption/description/uploadedBy; helper
`release-reviewed-media-metadata.py` ghim SHA/manifest và dùng engine/sao lưu
hiện có, không đổi policy triển khai. Kiểm tra dùng DB/R2 giả; probe production
riêng chỉ được chạy với cờ rõ ràng, tải một SVG riêng tư tạm, đọc đối chiếu rồi
xóa đúng tệp đó. Khóa R2 không xuất ra log. Luồng tương tác tham khảo
[WordPress Media Library](https://wordpress.org/documentation/article/media-library-screen/).

## Soạn kiến thức AI trong quản trị

Kiến thức AI dùng danh sách và trình soạn thảo Payload tại
`/admin/collections/knowledge`, dùng chung trình soạn nội dung với Bài viết.
`/admin/knowledge` chuyển hướng sau khi kiểm tra quyền. Có danh mục, tag,
tìm kiếm, bộ lọc và nháp/xuất bản; nội dung này vẫn riêng cho AI, không có
permalink/preview công khai. Danh sách loại các bản đồng bộ `articleOrigin`
từ Bài viết; các bản đó tiếp tục được quản lý tại Bài viết.

Dữ liệu/ID cũ được giữ nguyên, quan hệ danh mục/tag được thêm vào bảng chính
và bảng phiên bản. Nội dung rich-text dùng marker hiện hữu, được làm sạch phía
server rồi chuyển thành văn bản cho RAG/quy tắc. Văn bản cũ không có marker
không tự chuyển thành HTML. Các API kho kiến thức cũ vẫn kiểm tra quyền và
phiên bản để tương thích, không còn một trình soạn thứ hai trong điều hướng.
Quy tắc vẫn lưu trạng thái draft theo ràng buộc an toàn. Lưu bản nháp chỉ
lưu ý định; Xuất bản mới ghi cờ bật/tắt và nội dung được áp dụng. Ô trạng thái
đọc bản chính bằng quyền tài khoản hiện tại, không lấy cờ từ bản nháp để báo đã bật.

## Kho riêng cho AI và quy tắc — 01.23

Nền tảng kho riêng quản lý bài dành cho AI và quy tắc trả lời: tiêu đề,
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


## Củng cố nền tài khoản — 01.28

Payload tiếp tục sở hữu mật khẩu, xác minh email, JWT/session, CRUD, upload,
validation, lịch sử và quyền collection. Google dùng AuthStrategy chính thức;
không tự tạo JWT thay Payload hoặc thay bộ xác thực đang hoạt động.

| Trách nhiệm | Nguồn duy nhất |
|---|---|
| Cấp/đọc/thu hồi phiên Google | `identity/app-sessions.ts` |
| TTL phiên Google và cookie | `identity/session-policy.ts`, `session-cookies.ts` |
| Thu hồi phiên của cả hai phương thức | `identity/logout.ts` |
| Gắn thay đổi tài khoản vào lifecycle Payload | `identity/user-security.ts` |
| Quyền Admin/Chuyên viên/User cho admin và các service tùy biến | `identity/permissions.ts` |
| Trình soạn bài, danh mục, tệp, người dùng | Các collection và API chuẩn của Payload |

Đăng xuất thu hồi phiên Payload và Google trong cùng giao dịch. `allSessions`
áp dụng cho cả hai phương thức dù trình duyệt hiện chỉ có cookie mật khẩu.
Chuyển tài khoản Google thu hồi phiên trình duyệt trước khi cấp phiên mới;
đăng nhập mật khẩu cũng thu hồi cookie Google cũ. Cookie OAuth được xóa ở đúng
`/auth/google` để không sót một luồng đăng nhập đang mở. Không đổi thời hạn phiên
hoặc xóa hàng loạt phiên cũ khi triển khai.

Đổi mật khẩu qua CMS và đặt lại mật khẩu qua API native đều thu hồi phiên Google
trong chính giao dịch ghi tài khoản. Hook reset chỉ chạy sau khi Payload xác minh
reset token và kiểm tra mật khẩu. Thất bại/rollback giữ phiên cũ; sửa tên không
làm mất phiên. Đổi email hoặc thu hồi xác minh cũng thu hồi phiên. Bản ghi chưa
xác minh không được cấp hoặc sử dụng phiên Google.

Giữ nút và URL đăng xuất native; view được mở rộng qua extension point chính thức
của Payload. Chỉ báo thành công/chuyển tới đăng nhập khi máy chủ xác nhận; mất mạng
hiện lỗi và cho thử lại. Việc xóa dữ liệu riêng trong client và đồng bộ tab vẫn đi
qua session store hiện có, sau đó Payload phát sự kiện đăng xuất của nó.

Quyền vào admin/hộp thư/kho AI/dịch bài và điều hướng dùng chung bộ kiểm tra ba
role hiện hành. Quyền từng bản ghi và phạm vi Việt Nam/Đức tiếp tục do collection
và service hiện có kiểm tra tại server; UI chỉ hiển thị gợi ý điều hướng.

Kiểm tra trước/sau: bộ unit, 6 tổ hợp đăng xuất Google/mật khẩu/cả hai trên public
và native, dùng lại token cũ, CSRF, thiết bị khác, reset native, rollback ghi lỗi,
đổi tài khoản, quyền ba role, trình duyệt mobile/desktop và thử lại khi đăng xuất
lỗi. Các kiểm tra dùng tài khoản/AI/email/tệp giả; không gọi nhà cung cấp thật.
Helper `release-reviewed-identity-base.py` ghim commit và manifest của auth/access,
chỉ cho phép tệp hook Users đã rà soát trong đợt củng cố tiếp theo, dùng backup/candidate/rollback của
engine hiện có, không thay chính sách tự cập nhật và không cần migration DB.

## Rà soát song song sau 01.28

Ba vùng công khai, admin/tệp và hội thoại có người sửa riêng, hoạt động đồng thời.
Các tệp danh tính dùng chung được giao cho một người tại mỗi thời điểm; kiểm tra
DB/build/trình duyệt và phát hành do người tích hợp thực hiện. Agent kiểm tra chéo
những thay đổi đã hoàn thành trong khi vùng khác tiếp tục làm, không tự đẩy bản riêng.

Native/public đăng nhập dùng cùng cổng tiếp nhận mật khẩu theo tài khoản. Payload
tiếp tục xác thực mật khẩu, đếm sai và khóa tài khoản. JSON/multipart bị giới hạn
8 KiB, chuẩn hóa thành cùng một đối tượng trước khi chuyển cho native API. Đăng
xuất, cập nhật/reset và ghi phiên có thứ tự khóa nhất quán; snapshot tài khoản trước
đăng nhập gồm cả phiên và phạm vi, dùng pool đọc riêng có giới hạn chờ. Tạo/đổi
email dùng cùng khóa tiếp nhận trong giao dịch; tranh chấp trả 409 để thử lại,
không chờ trong khi giữ khóa bản ghi tài khoản.

Thư viện tệp giữ hộp chi tiết qua các lượt tự lưu, chỉ làm mới kết quả khi đóng;
lỗi lưu không xóa bản nhập. Khách đăng nhập giữa một lần gửi và thử lại vẫn dùng
đúng mã gửi của hội thoại đã chuyển vào tài khoản. Khôi phục trang từ lịch sử trình
duyệt che dữ liệu tài khoản cũ cho tới khi kiểm tra lại phiên, giữ nháp trong storage.

## Media theo luồng WordPress — 01.29

Lưới dùng chọn nhiều/xóa/hủy; bảng có checkbox, chọn trang và thanh tác vụ Apply.
Không dùng EditMany để sửa metadata media. Title/alt/caption/description sửa ở hộp
chi tiết hoặc trang sửa native. `MediaImageEditor` là luồng cắt, xoay, lật, thu nhỏ,
undo/redo và khôi phục riêng; không để song song nút crop native cũ.

Upload R2 có một bản ghi, giữ tệp chính và native `sizes.thumbnail/medium/large`.
Sharp sinh size không phóng lớn; cấu hình lần lượt 150×150 crop, tối đa600×600 và
1200×1200 giữ tỷ lệ. `bundled-families.json` xác nhận9 nhóm ảnh cũ bằng tên và kích
thước thực:43 ID/URL được giữ,17 alias được gắn `legacyParent`,26 mục được liệt kê.
`media-enumeration.ts` chỉ lọc list/count ngoài cùng; đọc ID và quan hệ cũ vẫn chạy.
Admin có thể tự gỡ bản ghi tệp đóng gói và các size khỏi Thư viện; tệp giao diện trong mã vẫn giữ nguyên. Giữ chặn thay nội dung vì các trang/CSS đang dùng.

`image-edit.ts` kiểm tra quyền, phiên bản và khóa backup→bản ghi trước khi xử lý.
Lần sửa pixel đầu giữ một bản nguồn riêng. Bản nguồn không công khai theo ảnh hiện
hành; chỉ Admin hoặc Chuyên viên sở hữu được đọc. Server quản lý toàn bộ prefix,
object key và descriptor; native storage không phục vụ namespace `originals/`.
API gốc/size vẫn kiểm tra quyền native; không dùng URL ký tạm hoặc gửi ảnh sang AI.

`captureMediaOwnedFiles` khóa bản ghi và chụp metadata trước xóa. Hook xóa chờ dọn
các tệp sở hữu rồi mới cho commit; lỗi giữ bản ghi để thử lại bằng delete idempotent.
R2 không thuộc giao dịch DB: sau lỗi một phần, một số tệp có thể đã bị xóa và bản
ghi còn lại là biên nhận để dọn tiếp. Không tuyên bố rollback khôi phục byte đã xóa.
Inventory backup dùng chung `storage/inventory.ts`, gồm tệp chính, mọi size và nguồn
giữ lại; không chỉ sao lưu filename của media. Migration mở rộng không xóa alias.
Down từ chối bỏ cột khi có size/nguồn mới; quay lại mã giữ schema để bảo toàn dữ liệu.


## Soạn bài định dạng và vòng đời tệp — 01.30

`content/ArticleEditor.tsx` dùng Tiptap, giữ trường body dạng chuỗi hiện có.
Bài cũ vẫn là văn bản; bài có định dạng dùng wrapper `data-lvd-richtext="1"`.
`article-body.ts` lọc HTML khi lưu/hiển thị, và cung cấp một bản văn bản thống nhất
cho mô tả, tìm kiếm, FAQ/RAG và kiểm tra trích dẫn. Dịch Groq phải giữ cấu trúc,
URL và bảng; lỗi hoặc thiếu nội dung giữ bản gốc. Giới hạn 16.000 ký tự không
tự cắt nội dung. Thư viện trong trình soạn chỉ cho chèn tệp công khai, không
tự đổi phạm vi tệp riêng tư. CSS soạn bài nằm riêng trong bundle admin.

Xóa R2 hoàn tất trong beforeDelete, trước khi Payload xóa bản ghi. Nếu xóa
hàng loạt gặp lỗi giữa chừng, metadata ảnh gốc/size còn để thử lại. Bản ghi
tệp đóng gói và size cũ có thể gỡ bằng quyền Admin; file giao diện trong mã
được giữ. Triển khai không tự xóa bản ghi hoặc file nào.

Đăng nhập quản trị dùng form native gọn và đăng nhập Google; hồ sơ ở
`/admin/account`. Link Đăng nhập công khai mở đúng mode signin, có liên kết
đăng ký và quên mật khẩu.


## Sửa lưu nháp và nội dung bảng — 01.30.03

Trình soạn giữ cấu trúc bảng dù các ô chưa có chữ, kể cả khi lưu nháp, mở lại
và hoàn tác. Các đoạn văn rỗng thông thường vẫn được chuẩn hóa về nội dung rỗng.
Khóa bài viết giữ main-row FOR UPDATE làm mutex, sau đó đọc latest version
trong câu lệnh riêng. So timestamp mới hơn giữa main và version với snapshot
Payload đã đọc; Save draft không cập nhật timestamp của main. Cách này giữ
chặn ghi đè từ bản cũ và đồng bộ SQL, đồng thời cho lưu nháp/xuất bản liên tiếp.

## Tải đầu và F5

Frontend layout đọc cài đặt công khai đã lọc cùng cookie `lvd-lang` trước khi dựng HTML.
`PublicSettingsProvider` giữ store riêng khi render server, và cung cấp snapshot ban đầu
bất biến cho hydration. Cache 30 giây và phục hồi cấu hình khi lỗi mạng vẫn được giữ.
Cookie VI/DE được cập nhật khi chuyển ngôn ngữ để lần tải kế tiếp không dựng tiếng Việt
rồi mới đổi sang tiếng Đức; sessionStorage cũ chỉ còn là đường tương thích khi chưa có
cookie. Hiệu ứng ASCII vẫn chỉ chạy khi chủ động đổi ngôn ngữ.

CSS quản trị/chat dùng precedence để được React đưa vào head trước khi kích hoạt trang.
Inter và font tiêu đề được preload, không nhúng font có license vào Git. Màn tài khoản
chờ kiểm tra phiên bằng trạng thái tải, không hiện tiêu đề đăng ký giả trước trang đăng
nhập/quên mật khẩu. Chế độ form được xác định ngay khi form gắn vào client.

`scripts/test-loading-stability.mjs` kiểm tra 56 trường hợp public VI/DE/mobile/desktop,
bao gồm F5, giữ script để so sánh HTML server với sau hydration; thêm 22 trường hợp admin.
Kiểm tra tên/menu/footer, ngôn ngữ, màu nền, CSS head và lỗi hydration. Đây không phải
cam kết CLS bằng 0 trên mọi mạng: ảnh/video, kết quả truy vấn và phiên đăng nhập vẫn có
trạng thái tải thật; font bị chặn hoặc mạng quá chậm vẫn có thể dùng font dự phòng.

RAG nhận `previousAnswer` chỉ để phân giải câu hỏi tiếp kiểu “ý thứ hai”. Helper
`groundedPreviousAnswer` yêu cầu tin assistant/ai, tối đa 7.000 ký tự, tất cả trích
nguồn đúng revision trong bộ nguồn hiện tại và từng đoạn khớp nguyên văn. Không
forward câu chuyên viên/ghi chú, nguồn đã đổi/rút hoặc đoạn không còn trong nguồn.
Bộ kiểm tra nguồn công khai/riêng và hội thoại 32 lượt nằm ở `test-rag-matrix.ts`.

## Ngữ cảnh câu trả lời ngắn khi tiếp nhận đất đai

Câu hỏi người đứng tên và giấy chứng nhận có khóa riêng. Các câu ngắn như
“Mẹ tôi”, “Có rồi”, “Meine Mutter”, “Ja” chỉ được gắn ngữ cảnh khi đang trả lời
đúng câu hỏi đó; không tự coi một câu có/không rời rạc là dữ kiện. Tin lưu giữ
nguyên văn. Nhãn ngữ cảnh chỉ dùng trong bộ tiếp nhận và lịch sử gửi model sau
khi lọc đồng ý xử lý; không đưa câu chuyên viên hoặc ghi chú vào model. Dữ kiện
khách tự thuật không phải xác minh quyền sở hữu. Đính chính sau đó vẫn thay thế
dữ kiện cũ; đổi chủ đề đặt lại phạm vi như trước.

## Đính chính dữ kiện khi tiếp nhận

Các lựa chọn hình thức đầu tư, mục đích cư trú, kỳ thi và giao dịch nhà đất được
đọc theo thứ tự hội thoại. Khách xác nhận lại sự chưa rõ thì mở lại đúng dữ kiện
đó; không dùng lựa chọn cũ để coi yêu cầu đã đủ. Khi khách cung cấp lựa chọn mới,
bộ tiếp nhận tiếp tục từ phần còn thiếu. Câu hỏi làm rõ sau một đính chính rõ
ràng dùng đúng mục còn thiếu tại chỗ, tránh model hỏi tiếp dựa trên điều vừa bị
rút lại. Không gọi model hoặc tra cứu trong bước hỏi lại này. Chính sách vẫn là
quy tắc Thu thập dữ kiện đang hiển thị trong Kiến thức AI; không thêm nhận định
pháp lý hay thay đổi điều kiện chuyển chuyên viên.

## Vụ việc mới trong cùng lĩnh vực

Bộ tiếp nhận tách phạm vi khi khách chủ động chuyển sang mảnh đất, hợp đồng
hoặc kỳ thi khác, kể cả vẫn trong cùng lĩnh vực. Dữ kiện người đứng tên, giấy
tờ và giai đoạn của vụ trước không hoàn thành dữ kiện cho vụ mới. Các cách nhắc
lại như “mảnh đất khác đó” hoặc “Das andere Grundstück” giữ phạm vi đang trao
đổi, không khởi động lại liên tục. Chỉ mang địa điểm sang khi khách xác nhận
cùng nơi/cùng quốc gia. Có kiểm tra hội thoại lưu trên DB thử, trả lời ngắn và
chỉ truy xuất nguồn khi vụ thứ hai đủ thông tin; giữ các kiểm tra đồng ý xử lý,
nguồn hiện hành và chuyên viên tiếp nhận.

## Đề nghị và từ chối gặp chuyên viên

Nhắc tới chuyên viên không tự động là yêu cầu chuyển cuộc trò chuyện. Bộ kiểm
tra phân biệt lời đề nghị hiện tại, lời từ chối và điều kiện “nếu không trả lời
được thì mới chuyển”. Đính chính từ chối sau lời đề nghị cũ được giữ theo thứ tự
hội thoại; đề nghị rõ ràng sau đó vẫn chuyển bình thường. Các kiểm tra hồ sơ cá
nhân, định danh và vượt quy tắc là nhánh riêng, không bị bỏ qua khi khách nói
chưa cần chuyên viên. Có kiểm tra luồng lưu hội thoại: chưa chuyển khi đang hỏi
thêm, rồi vào hàng chờ và dừng AI sau khi khách chủ động đổi ý gặp chuyên viên.
