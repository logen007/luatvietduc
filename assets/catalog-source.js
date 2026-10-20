'use strict';
/* Source: client-supplied PLVN workbook. Titles are topics, NOT legal answers.
   Source sheet prefixes are retained even where two sheets both start with 11.
   Display labels follow the overview, except the Hộ tịch label follows its
   detailed sheet C3 (the overview has a missing v in và). No source is overwritten. */
(() => {
 const group=(id,title,sheet,firstRow,icon,text)=>({id,title,sheet,firstRow,icon,titles:text.split('\n')});
 window.LVD_CATALOG_SOURCE=Object.freeze({
  version:'0.7.0',jurisdiction:'Việt Nam',
  workbook:'Ban Việt Đức_Chủ đề bài viết theo PLVN.xlsx',
  workbookSha256:'b2c9785e15ebe4946f41b80b038e82d182e24cbfd9f6f1899d155527df3bfe4c',
  countDocument:'Thống kê số lượng theo từng sheet.docx',
  countDocumentSha256:'27ab21da7980c6c66c119c2213a980280bb486c64d31c18eb38cabb1c7c36f3f',
  expectedCounts:[20,15,20,16,16,16,16,20,19,22,23,22,20,18,20,20],
  expectedTotal:303,
  groups:[
   group('hon-nhan-gia-dinh','Hôn nhân và Gia đình','1. Hôn nhân & Gia Đình',4,'family',`Điều kiện và thủ tục đăng ký kết hôn
Kết hôn với người nước ngoài
Giấy xác nhận tình trạng hôn nhân
Ghi chú kết hôn tại Đức vào sổ hộ tịch Việt Nam
Chung sống như vợ chồng không đăng ký kết hôn
Quyền và nghĩa vụ giữa vợ chồng
Tài sản chung, tài sản riêng và thỏa thuận tài sản vợ chồng
Nợ chung, nợ riêng và nghĩa vụ trả nợ của vợ chồng
Ly hôn thuận tình và ly hôn đơn phương
Ly hôn khi một bên đang ở nước ngoài
Công nhận và ghi chú việc ly hôn tại Đức ở Việt Nam
Chia tài sản khi ly hôn và sau ly hôn
Xác định và nhận cha, mẹ, con
Quyền và nghĩa vụ chăm sóc, nuôi dưỡng, giáo dục con
Quyền nuôi con và thay đổi người trực tiếp nuôi con
Cấp dưỡng cho con và giữa các thành viên gia đình
Nhận con nuôi và quan hệ cha mẹ nuôi, con nuôi
Giám hộ, đại diện và quản lý tài sản của con
Đưa con về Việt Nam hoặc ra nước ngoài khi cha mẹ có bất đồng
Phòng ngừa, xử lý bạo lực gia đình và bảo vệ trẻ em`),
   group('quoc-tich','Quốc tịch','2. Quốc tịch',4,'globe',`Xác định có quốc tịch Việt Nam hay không
Giấy tờ chứng minh quốc tịch Việt Nam
Xác nhận nguồn gốc Việt Nam
Quốc tịch Việt Nam sau khi nhập quốc tịch Đức
Đồng thời có quốc tịch Việt Nam và quốc tịch Đức
Nhập quốc tịch Việt Nam
Trở lại quốc tịch Việt Nam
Thôi quốc tịch Việt Nam
Mất quốc tịch Việt Nam và hệ quả pháp lý
Quốc tịch của trẻ em sinh tại Đức
Quốc tịch của con khi cha mẹ có quốc tịch khác nhau
Quốc tịch của con khi cha mẹ thay đổi quốc tịch
Quốc tịch của con nuôi
Hồ sơ và thủ tục quốc tịch khi đang sinh sống tại Đức
Sử dụng giấy tờ do Đức cấp trong hồ sơ quốc tịch Việt Nam`),
   group('khai-sinh-ho-tich-giam-ho','Khai sinh, Hộ tịch và Giám hộ','3. Khai sinh, Hộ tịch và GH',4,'file',`Đăng ký khai sinh tại Việt Nam
Khai sinh cho trẻ em sinh tại Đức
Khai sinh khi cha mẹ có quốc tịch khác nhau
Khai sinh khi cha mẹ chưa đăng ký kết hôn
Đăng ký khai sinh muộn và đăng ký lại khai sinh
Bổ sung thông tin cha, mẹ vào giấy khai sinh
Thay đổi họ, tên
Sửa sai và bổ sung thông tin hộ tịch
Cấp bản sao và trích lục hộ tịch
Xử lý thông tin không thống nhất giữa giấy tờ Việt Nam và Đức
Ghi vào sổ hộ tịch Việt Nam các việc hộ tịch đã được giải quyết tại Đức
Đăng ký khai tử khi người thân mất tại Việt Nam hoặc Đức
Sử dụng giấy tờ do Đức cấp trong thủ tục hộ tịch tại Việt Nam
Thực hiện thủ tục hộ tịch khi đang ở nước ngoài
Xác định và lựa chọn người giám hộ
Giám hộ cho trẻ em
Giám hộ cho người trưởng thành
Đăng ký, thay đổi và chấm dứt giám hộ
Quyền, nghĩa vụ và việc giám sát người giám hộ
Đại diện và quản lý tài sản của người được giám hộ`),
   group('giay-to-tuy-than','Giấy tờ tùy thân','4. Giấy tờ tùy thân',4,'file',`Cấp, đổi và cấp lại thẻ căn cước
Số định danh cá nhân và thông tin dân cư
Cập nhật, sửa sai thông tin trên giấy tờ tùy thân
Định danh điện tử và sử dụng VNeID khi ở nước ngoài
Cấp hộ chiếu Việt Nam khi đang ở Đức
Đổi và cấp lại hộ chiếu Việt Nam
Giấy tờ đi lại khi không có hộ chiếu hợp lệ
Sử dụng hộ chiếu Việt Nam và hộ chiếu Đức khi có hai quốc tịch
Giấy tờ tùy thân cho trẻ em
Giấy tờ sử dụng tại Việt Nam đối với người gốc Việt chỉ có quốc tịch Đức
Chứng minh các giấy tờ Việt Nam và Đức thuộc cùng một người
Xử lý giấy tờ bị mất, hỏng hoặc hết hạn
Xử lý khác biệt về họ tên, ngày sinh và thông tin nhận dạng
Bản sao, chứng thực và bản dịch giấy tờ tùy thân
Sử dụng giấy tờ tùy thân trong giao dịch tại Việt Nam
Bảo vệ thông tin cá nhân và xử lý việc bị sử dụng giấy tờ để mạo danh`),
   group('thua-ke','Thừa kế','5. Thừa kế',4,'family',`Lập, sửa đổi và hủy bỏ di chúc
Di chúc lập tại Đức và việc sử dụng tại Việt Nam
Thừa kế theo di chúc
Thừa kế theo pháp luật
Xác định người thừa kế và phần di sản được hưởng
Xác định di sản và các khoản nợ người mất để lại
Quản lý, bảo quản tài sản khi chưa chia thừa kế
Khai nhận và thỏa thuận phân chia di sản
Từ chối nhận di sản
Thừa kế nhà ở và đất đai tại Việt Nam
Thừa kế tiền gửi, cổ phần, phần vốn góp và tài sản khác
Ủy quyền làm thủ tục thừa kế khi đang ở nước ngoài
Hồ sơ, thời hạn và thủ tục nhận thừa kế
Thuế, phí và sang tên tài sản thừa kế
Chuyển tiền thừa kế từ Việt Nam ra nước ngoài
Tranh chấp di chúc, quyền hưởng thừa kế và phân chia di sản`),
   group('hop-dong-giao-dich-dan-su','Hợp đồng và Giao dịch dân sự','6. Hợp đồng và Giao dịch dân sự',4,'pen',`Ký kết và hiệu lực của hợp đồng
Đặt cọc và bảo đảm thực hiện hợp đồng
Mua bán, trao đổi và tặng cho tài sản
Vay, cho vay
Thuê, cho thuê và mượn tài sản
Hợp đồng dịch vụ và thuê khoán công việc
Gia công, vận chuyển và gửi giữ tài sản
Ủy quyền và đại diện trong giao dịch
Thanh toán, giao nhận và xác nhận hoàn thành nghĩa vụ
Sửa đổi, hủy bỏ và chấm dứt hợp đồng
Giao dịch vô hiệu và xử lý hậu quả
Vi phạm hợp đồng, phạt vi phạm và bồi thường
Công chứng và chứng thực hợp đồng, giao dịch
Hợp đồng điện tử và giao dịch trực tuyến
Quyền lợi người tiêu dùng khi mua hàng, sử dụng dịch vụ
Ký kết hợp đồng và thực hiện giao dịch có yếu tố nước ngoài`),
   group('tranh-chap-dan-su','Tranh chấp dân sự','7. Tranh chấp dân sự',4,'shield',`Tranh chấp hợp đồng
Tranh chấp vay nợ và yêu cầu trả tiền
Tranh chấp đặt cọc
Tranh chấp quyền sở hữu và đòi lại tài sản
Tranh chấp hôn nhân và gia đình
Tranh chấp thừa kế
Tranh chấp nhà ở và đất đai
Yêu cầu bồi thường thiệt hại
Bảo vệ danh dự, hình ảnh và quyền riêng tư
Tranh chấp giữa người tiêu dùng và bên bán hàng, cung cấp dịch vụ
Thương lượng và hòa giải tranh chấp
Khởi kiện, hồ sơ, chứng cứ và án phí
Ủy quyền và tham gia vụ án khi đang ở nước ngoài
Yêu cầu ngăn chặn tẩu tán tài sản
Kháng cáo và đề nghị xem xét lại bản án
Thi hành án và thu hồi tiền, tài sản`),
   group('lao-dong-viec-lam-bhxh','Lao động, Việc làm và Bảo hiểm xã hội','8. Lao động, Việc làm và BHXH',4,'briefcase',`Điều kiện làm việc tại Việt Nam theo tình trạng quốc tịch
Tuyển dụng, thử việc và ký hợp đồng lao động
Giấy phép lao động và các trường hợp được miễn
Cấp, gia hạn và cấp lại giấy phép lao động
Tiền lương, thưởng, phụ cấp và các khoản khấu trừ
Thời giờ làm việc, nghỉ phép và làm thêm giờ
Thay đổi công việc, điều chuyển và tạm hoãn hợp đồng lao động
Nghỉ việc, chấm dứt hợp đồng và các khoản trợ cấp
Kỷ luật lao động và trách nhiệm bồi thường của người lao động
An toàn lao động, tai nạn lao động và bệnh nghề nghiệp
Tham gia và đóng bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp
Chế độ ốm đau, thai sản và quyền lợi khi nghỉ việc
Bảo lưu thời gian đóng và tiếp tục tham gia bảo hiểm xã hội
Lương hưu và nhận lương hưu khi đang ở Đức
Bảo hiểm xã hội một lần khi ra nước ngoài định cư
Trợ cấp thất nghiệp và hồ sơ hưởng chế độ
Quyền lợi bảo hiểm của thân nhân khi người tham gia qua đời
Làm việc từ Đức cho doanh nghiệp tại Việt Nam
Giải quyết tranh chấp tiền lương, hợp đồng và bảo hiểm
Thực hiện thủ tục lao động và bảo hiểm khi đang ở nước ngoài`),
   group('xuat-nhap-canh-cu-tru','Xuất nhập cảnh và Cư trú','9. Xuất nhập cảnh & Cư trú',3,'globe',`Giấy tờ nhập cảnh Việt Nam theo tình trạng quốc tịch
Thị thực Việt Nam cho người có hộ chiếu Đức
Thị thực điện tử và hồ sơ xin cấp
Miễn thị thực và giấy miễn thị thực cho người Việt ở nước ngoài, thân nhân
Gia hạn thời gian tạm trú và chuyển đổi mục đích thị thực
Cấp, đổi và cấp lại thẻ tạm trú
Điều kiện và thủ tục thường trú cho người có quốc tịch nước ngoài
Bảo lãnh vợ, chồng, con và thân nhân về Việt Nam
Xuất nhập cảnh cho trẻ em và người có hai quốc tịch
Khai báo tạm trú cho người nước ngoài ở khách sạn hoặc nhà người thân
Đăng ký thường trú khi trở về Việt Nam sinh sống
Đăng ký tạm trú và thông báo lưu trú đối với công dân Việt Nam
Xác nhận, cập nhật và điều chỉnh thông tin cư trú
Xóa đăng ký thường trú, tạm trú khi thay đổi nơi sinh sống
Thẻ đi lại của doanh nhân APEC (ABTC)
Xuất nhập cảnh khi hộ chiếu hoặc giấy tờ cư trú bị mất, hỏng, hết hạn
Lưu trú quá hạn và xử lý vi phạm về xuất nhập cảnh, cư trú
Tạm hoãn xuất cảnh, từ chối nhập cảnh và các vướng mắc tại cửa khẩu
Giấy tờ do Đức cấp trong hồ sơ nhập cảnh và cư trú tại Việt Nam`),
   group('nha-o-dat-dai','Nhà ở và Đất đai','10. Nhà ở và Đất đai',3,'home',`Điều kiện sở hữu nhà ở, nhận quyền sử dụng đất theo tình trạng quốc tịch
Kiểm tra giấy tờ, quy hoạch và tình trạng pháp lý nhà đất
Đặt cọc mua nhà, mua đất và xử lý tiền đặt cọc
Mua bán nhà ở và chuyển nhượng quyền sử dụng đất
Mua nhà đang xây dựng và nhà hình thành trong tương lai
Tặng cho và nhận tặng cho nhà đất
Nhận thừa kế và sang tên nhà đất thừa kế
Cấp lần đầu giấy chứng nhận quyền sử dụng đất, quyền sở hữu nhà ở
Cấp đổi, cấp lại và đính chính giấy chứng nhận nhà đất
Sang tên và cập nhật thay đổi thông tin nhà đất
Tách thửa, hợp thửa và chuyển mục đích sử dụng đất
Thời hạn sử dụng đất và gia hạn sử dụng đất
Thuê, cho thuê và thuê mua nhà ở
Ủy quyền giao dịch, quản lý và cho thuê nhà đất khi đang ở Đức
Thế chấp, giải chấp và xử lý tài sản bảo đảm là nhà đất
Góp vốn, hợp tác đầu tư và chuyển nhượng dự án bất động sản
Thuế, phí và các khoản tiền phải nộp khi giao dịch nhà đất
Thu hồi đất, bồi thường, hỗ trợ và tái định cư
Giấy phép xây dựng, sửa chữa và hoàn công nhà ở
Sở hữu, sử dụng và quản lý căn hộ chung cư
Tranh chấp quyền sở hữu, quyền sử dụng đất và ranh giới
Tranh chấp hợp đồng, bàn giao và quản lý nhà đất`),
   group('dau-tu-kinh-doanh-thuong-mai','Đầu tư, Kinh doanh và Thương mại','11. Đầu tư, Kinh doanh & TM',4,'briefcase',`Tư cách nhà đầu tư và điều kiện kinh doanh theo tình trạng quốc tịch
Lựa chọn mô hình doanh nghiệp, hộ kinh doanh và hình thức đầu tư
Kiểm tra pháp lý đối tác, doanh nghiệp và dự án trước khi đầu tư
Thành lập doanh nghiệp tại Việt Nam
Đăng ký dự án và giấy chứng nhận đăng ký đầu tư
Ngành nghề kinh doanh, điều kiện hoạt động và giấy phép chuyên ngành
Góp vốn, tăng vốn và tiến độ góp vốn
Mua, bán và chuyển nhượng cổ phần, phần vốn góp
Điều lệ công ty và thỏa thuận giữa thành viên, cổ đông
Quyền, nghĩa vụ của thành viên, cổ đông và người quản lý
Người đại diện theo pháp luật và ủy quyền điều hành từ Đức
Thay đổi đăng ký doanh nghiệp, chi nhánh và địa điểm kinh doanh
Điều chỉnh, chuyển nhượng và chấm dứt dự án đầu tư
Ưu đãi, hỗ trợ đầu tư và các điều kiện áp dụng
Thuê mặt bằng, nhà xưởng và địa điểm kinh doanh
Hợp đồng hợp tác đầu tư và hợp tác kinh doanh
Mua bán hàng hóa, phân phối và đại lý thương mại
Xuất nhập khẩu hàng hóa giữa Việt Nam và Đức
Kinh doanh trực tuyến và thương mại điện tử
Nhượng quyền thương mại
Báo cáo và nghĩa vụ tuân thủ trong hoạt động đầu tư, kinh doanh
Tạm ngừng kinh doanh, giải thể và chấm dứt hoạt động
Tranh chấp góp vốn, quản lý doanh nghiệp và hợp đồng thương mại`),
   group('tai-chinh-ngan-hang-bao-hiem','Tài chính, Ngân hàng và Bảo hiểm kinh doanh','11. Tài chính, NH & BHKD',3,'wallet',`Mở và sử dụng tài khoản ngân hàng tại Việt Nam
Tài khoản bằng đồng Việt Nam và ngoại tệ
Sử dụng ngân hàng trực tuyến và giao dịch khi đang ở Đức
Nhận kiều hối và chuyển tiền từ Đức về Việt Nam
Chuyển tiền từ Việt Nam sang Đức
Chuyển vốn đầu tư, lợi nhuận và tiền thu từ chuyển nhượng vốn
Chuyển tiền từ bán nhà đất, thừa kế và tặng cho
Chứng minh nguồn tiền và chuẩn bị hồ sơ chuyển tiền
Mua, bán ngoại tệ và các quy định về quản lý ngoại hối
Tiền gửi, tiết kiệm và quyền lợi của người gửi tiền
Vay ngân hàng, lãi suất và nghĩa vụ trả nợ
Thế chấp, bảo lãnh và xử lý tài sản bảo đảm
Ủy quyền giao dịch ngân hàng và quản lý tài khoản
Phong tỏa, hạn chế giao dịch và xử lý tài khoản khi chủ tài khoản qua đời
Giao dịch sai, mất tiền trong tài khoản và giao dịch không được phép
Lựa chọn, ký kết và kiểm tra hợp đồng bảo hiểm
Bảo hiểm nhân thọ, sức khỏe và tai nạn
Bảo hiểm tài sản và bảo hiểm trách nhiệm
Phạm vi bảo hiểm, điều khoản loại trừ và nghĩa vụ cung cấp thông tin
Đóng phí, thay đổi, chấm dứt hợp đồng và hoàn phí bảo hiểm
Hồ sơ yêu cầu chi trả quyền lợi và bồi thường bảo hiểm
Từ chối chi trả và giải quyết tranh chấp ngân hàng, bảo hiểm`),
   group('thue','Thuế','12. Thuế',3,'file',`Đăng ký thuế và cập nhật thông tin người nộp thuế
Xác định tình trạng cư trú để tính thuế tại Việt Nam
Thuế đối với tiền lương, tiền công và thu nhập từ dịch vụ
Thuế khi kinh doanh cá nhân, hộ kinh doanh và bán hàng trực tuyến
Thuế đối với thu nhập từ cho thuê nhà và tài sản
Thuế khi mua bán, chuyển nhượng nhà đất
Thuế đối với tài sản nhận thừa kế và quà tặng
Thuế đối với đầu tư vốn, cổ tức và chuyển nhượng vốn
Nghĩa vụ thuế khi có thu nhập ở cả Việt Nam và Đức
Áp dụng Hiệp định tránh đánh thuế hai lần giữa Việt Nam và Đức
Chứng từ thuế và việc xử lý khoản thuế đã nộp ở nước ngoài
Kê khai, nộp thuế và quyết toán thuế thu nhập cá nhân
Miễn, giảm và hoàn thuế
Thuế đối với doanh nghiệp và hoạt động đầu tư tại Việt Nam
Thuế đối với hoạt động xuất nhập khẩu hàng hóa
Hóa đơn, chứng từ và hồ sơ chứng minh giao dịch
Ủy quyền kê khai và thực hiện thủ tục thuế khi đang ở Đức
Chậm kê khai, chậm nộp, truy thu và xử phạt về thuế
Kiểm tra, thanh tra và làm việc với cơ quan thuế
Khiếu nại và khởi kiện quyết định, hành vi của cơ quan thuế`),
   group('so-huu-tri-tue','Sở hữu trí tuệ','13. Sở hữu trí tuệ',4,'bulb',`Tra cứu và kiểm tra khả năng bảo hộ thương hiệu, sản phẩm
Đăng ký và bảo vệ nhãn hiệu tại Việt Nam
Tên thương mại, tên miền và nhận diện thương hiệu
Bản quyền tác phẩm, hình ảnh, video và phần mềm
Sử dụng nội dung có bản quyền trên website và mạng xã hội
Sáng chế, giải pháp hữu ích và kiểu dáng công nghiệp
Bảo vệ bí mật kinh doanh và thông tin công nghệ
Bảo hộ tại Việt Nam đối với thương hiệu, tác phẩm và sản phẩm từ Đức
Gia hạn, duy trì và cập nhật thông tin đăng ký bảo hộ
Chuyển nhượng và cho phép sử dụng quyền sở hữu trí tuệ
Hợp đồng chuyển giao công nghệ và quyền sở hữu trí tuệ
Góp vốn và kiểm tra tài sản sở hữu trí tuệ khi đầu tư, mua doanh nghiệp
Nhãn hiệu, bản quyền và bí mật kinh doanh trong nhượng quyền thương mại
Hàng giả, hàng xâm phạm nhãn hiệu và sao chép sản phẩm
Xử lý xâm phạm bản quyền, nhãn hiệu trên môi trường trực tuyến
Yêu cầu chấm dứt vi phạm và bồi thường thiệt hại
Phản đối, khiếu nại và tranh chấp về quyền sở hữu trí tuệ
Ủy quyền đăng ký và bảo vệ quyền sở hữu trí tuệ khi đang ở Đức`),
   group('hinh-su','Hình sự','14. Hình sự',4,'shield',`Phân biệt tranh chấp dân sự với vụ việc có dấu hiệu tội phạm
Tố giác tội phạm và theo dõi việc giải quyết tin báo
Lừa đảo, chiếm đoạt tài sản và lừa đảo qua mạng
Trộm cắp và các hành vi xâm phạm tài sản
Giả mạo giấy tờ, danh tính và thông tin giao dịch
Xâm phạm tính mạng, sức khỏe, danh dự và nhân phẩm
Vụ việc liên quan đến ma túy và hàng hóa bị cấm
Trách nhiệm hình sự trong đầu tư, kinh doanh, thuế và kế toán
Vụ việc hình sự liên quan đến lao động, cư trú và xuất nhập cảnh
Quyền của người bị tố giác và người bị yêu cầu làm việc với cơ quan điều tra
Quyền khi bị bắt, tạm giữ hoặc tạm giam
Quyền của bị hại, người làm chứng và người có quyền lợi liên quan
Mời luật sư bào chữa và bảo vệ quyền lợi trong vụ án hình sự
Điều tra, truy tố, xét xử và các giấy tờ cần chuẩn bị
Tố giác và cung cấp tài liệu, chứng cứ khi đang ở Đức
Bồi thường thiệt hại và thu hồi tài sản trong vụ án hình sự
Kháng cáo và đề nghị xem xét lại bản án hình sự
Thi hành án hình sự, nghĩa vụ dân sự và xóa án tích
Hệ quả của bản án đối với cư trú, xuất nhập cảnh và hoạt động tại Việt Nam
Vụ án có yếu tố nước ngoài, tương trợ tư pháp và hỗ trợ lãnh sự`),
   group('to-tung-hanh-chinh','Tố tụng hành chính','15. Tố tụng hành chính',3,'file',`Nhận diện quyết định, hành vi hành chính ảnh hưởng đến quyền lợi
Lựa chọn khiếu nại hoặc khởi kiện hành chính
Thời hạn, thời hiệu và cơ quan có thẩm quyền giải quyết
Chuẩn bị đơn, hồ sơ và chứng cứ khiếu nại
Khiếu nại việc từ chối, chậm giải quyết hoặc không trả kết quả hồ sơ
Khiếu nại và khởi kiện quyết định xử phạt hành chính
Khiếu nại và khởi kiện về nhà đất, thu hồi đất và bồi thường
Khiếu nại và khởi kiện về thuế và các khoản phải nộp
Khiếu nại và khởi kiện về cư trú, hộ tịch, quốc tịch và giấy tờ cá nhân
Khiếu nại và khởi kiện về đầu tư, kinh doanh và giấy phép
Ủy quyền khiếu nại và tham gia vụ án khi đang ở Đức
Giấy tờ, chứng cứ từ Đức và việc sử dụng tại Việt Nam
Đối thoại trong quá trình giải quyết khiếu nại và vụ án hành chính
Nộp đơn, bổ sung hồ sơ và thụ lý vụ án hành chính
Yêu cầu tạm dừng thi hành quyết định và biện pháp bảo vệ khẩn cấp
Tham gia phiên tòa, án phí và chi phí tố tụng
Kháng cáo bản án và khiếu nại quyết định tố tụng
Đề nghị xem xét lại bản án theo thủ tục giám đốc thẩm, tái thẩm
Yêu cầu thi hành bản án hành chính và xử lý việc chậm thi hành
Yêu cầu bồi thường của Nhà nước trong vụ việc hành chính`)
  ]
 });
})();
