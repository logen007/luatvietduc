'use strict';
// Prototype fixtures only. No legal conclusions, professional identities or verified sources are fabricated.
window.LVD_CONTENT = Object.freeze({
  version: '0.3.0',
  topics: [
    ['gia-dinh','Gia đình, dân sự, quốc tịch','family'],
    ['lao-dong','Lao động và việc làm','briefcase'],
    ['cu-tru','Xuất nhập cảnh và cư trú','globe'],
    ['nha-dat','Nhà đất và bất động sản','home'],
    ['dau-tu','Đầu tư và khởi sự kinh doanh','briefcase'],
    ['ngan-hang','Ngân hàng, tài chính, chuyển tiền','wallet'],
    ['thue','Thuế','file'],
    ['so-huu-tri-tue','Sở hữu trí tuệ','bulb'],
    ['hinh-su','Hình sự','shield'],
    ['hanh-chinh','Khiếu nại và tố tụng hành chính','file']
  ],
  situations: [
    ['uy-quyen','Ủy quyền từ Đức','Giải quyết công việc tại Việt Nam','pen'],
    ['thua-ke','Nhận thừa kế','Tài sản và quyền lợi của gia đình','family'],
    ['nha-dat','Nhà đất tại Việt Nam','Sở hữu, mua bán và quản lý','home'],
    ['giay-to','Quốc tịch & giấy tờ','Hộ tịch, hộ chiếu và thủ tục','file'],
    ['dau-tu','Đầu tư về Việt Nam','Kinh doanh và thành lập công ty','briefcase'],
    ['tien-thue','Thuế & chuyển tiền','Nghĩa vụ thuế và quản lý tài chính','wallet']
  ],
  articles: [
    {id:'uy-quyen-quan-ly-nha',title:'Tôi ở Đức có thể ủy quyền quản lý nhà tại Việt Nam?',topic:'nha-dat',situations:['uy-quyen','nha-dat'],country:'Việt Nam – Đức',type:'qa',summary:'Những thông tin cần làm rõ về phạm vi ủy quyền, giấy tờ và nơi sử dụng văn bản.',keywords:'uy quyen giay uy quyen ky giay dai dien quan ly nha bat dong san',checks:['Công việc dự kiến giao cho người đại diện','Giấy tờ và tình trạng của tài sản','Nơi văn bản dự kiến được sử dụng']},
    {id:'nhan-thua-ke-tai-viet-nam',title:'Tôi được thừa kế tại Việt Nam thì bắt đầu từ đâu?',topic:'gia-dinh',situations:['thua-ke','nha-dat'],country:'Việt Nam',type:'qa',summary:'Làm rõ thông tin về di sản, quan hệ gia đình và những bên liên quan trước khi tra cứu sâu hơn.',keywords:'thua ke di san di chuc nha dat gia dinh',checks:['Loại tài sản được nhắc đến','Thông tin về di chúc, nếu có','Những người và giấy tờ có liên quan']},
    {id:'kiem-tra-giay-to-mua-nha',title:'Cần tìm hiểu giấy tờ gì trước khi mua nhà tại Việt Nam?',topic:'nha-dat',situations:['nha-dat'],country:'Việt Nam',type:'qa',summary:'Tổ chức các câu hỏi về người mua, bất động sản và hồ sơ của giao dịch.',keywords:'mua nha so do sang ten quyen so huu bat dong san',checks:['Thông tin người dự kiến đứng tên','Loại nhà đất đang tìm hiểu','Hồ sơ giao dịch hiện có']},
    {id:'ho-chieu-quoc-tich',title:'Tôi cần làm rõ vấn đề quốc tịch trước khi đổi hộ chiếu?',topic:'gia-dinh',situations:['giay-to'],country:'Việt Nam – Đức',type:'qa',summary:'Phân biệt nhu cầu về quốc tịch với nhu cầu đổi hoặc cấp giấy tờ.',keywords:'quoc tich ho chieu giay to hai quoc tich',checks:['Giấy tờ hiện đang sử dụng','Nhu cầu cần giải quyết','Thông tin cần được chuyên gia làm rõ']},
    {id:'uy-quyen-nhan-thua-ke',title:'Có thể nhờ người thân ở Việt Nam làm thủ tục thừa kế?',topic:'gia-dinh',situations:['uy-quyen','thua-ke'],country:'Việt Nam – Đức',type:'qa',summary:'Tìm hiểu điểm giao nhau giữa đại diện, ủy quyền và công việc liên quan đến di sản.',keywords:'uy quyen thua ke dai dien nguoi than di san',checks:['Công việc muốn nhờ người thân thực hiện','Thông tin về di sản','Tình trạng giấy tờ và trao đổi giữa các bên']},
    {id:'chuyen-tien-tu-duc',title:'Chuyển tiền từ Đức về Việt Nam cần tìm hiểu những gì?',topic:'ngan-hang',situations:['tien-thue'],country:'Việt Nam – Đức',type:'qa',summary:'Xác định mục đích chuyển tiền và các nhóm thông tin cần hỏi trước khi giao dịch.',keywords:'chuyen tien kieu hoi ngan hang ngoai hoi tai khoan',checks:['Mục đích chuyển tiền','Bên gửi và bên nhận dự kiến','Những thông tin cần hỏi đơn vị cung cấp dịch vụ']},
    {id:'thu-nhap-hai-nuoc',title:'Có thu nhập tại hai nước, tôi nên bắt đầu tra cứu thuế ở đâu?',topic:'thue',situations:['tien-thue','dau-tu'],country:'Việt Nam – Đức',type:'qa',summary:'Tách các câu hỏi về nguồn thu nhập, kỳ tính thuế và phạm vi quốc gia.',keywords:'thue thu nhap hai nuoc cu tru thue ca nhan',checks:['Loại và nguồn thu nhập','Thời gian phát sinh thu nhập','Quốc gia liên quan đến từng khoản thu']},
    {id:'dau-tu-thanh-lap-cong-ty',title:'Muốn mở công ty tại Việt Nam, tôi cần làm rõ điều gì trước?',topic:'dau-tu',situations:['dau-tu'],country:'Việt Nam',type:'qa',summary:'Tổ chức nhu cầu về ngành nghề, người góp vốn và mô hình kinh doanh dự kiến.',keywords:'dau tu mo cong ty thanh lap doanh nghiep kinh doanh von',checks:['Ngành nghề dự định kinh doanh','Thông tin về người góp vốn','Mục tiêu và cách thức hoạt động dự kiến']},
    {id:'dang-ky-ket-hon',title:'Đang sống ở Đức, tôi tra cứu việc đăng ký kết hôn như thế nào?',topic:'gia-dinh',situations:['giay-to'],country:'Việt Nam – Đức',type:'qa',summary:'Bắt đầu từ nơi dự định thực hiện công việc và giấy tờ hiện có.',keywords:'ket hon hon nhan gia dinh ho tich giay to',checks:['Nơi dự định thực hiện công việc','Giấy tờ hộ tịch hiện có','Yếu tố liên quan đến hai nước']},
    {id:'hop-dong-lao-dong-viet-nam',title:'Trở về Việt Nam làm việc, tôi cần đọc kỹ phần nào của hợp đồng?',topic:'lao-dong',situations:[],country:'Việt Nam',type:'qa',summary:'Một điểm vào cho các câu hỏi về hợp đồng, công việc và điều kiện làm việc.',keywords:'lao dong viec lam hop dong tien luong bao hiem',checks:['Công việc và nơi làm việc dự kiến','Các điều khoản đang cần làm rõ','Tài liệu được bên tuyển dụng cung cấp']},
    {id:'nhap-canh-viet-nam',title:'Về Việt Nam thăm gia đình, tôi cần tra cứu loại giấy tờ nào?',topic:'cu-tru',situations:['giay-to'],country:'Việt Nam',type:'qa',summary:'Tìm theo nhu cầu chuyến đi và giấy tờ đang sử dụng, thay vì đoán tên thủ tục.',keywords:'nhap canh cu tru thi thuc visa mien thi thuc ho chieu',checks:['Giấy tờ dùng cho chuyến đi','Mục đích và thời gian dự kiến','Những thông tin cần kiểm tra tại nguồn chính thức']},
    {id:'bao-ve-thuong-hieu',title:'Kinh doanh tại Việt Nam, tôi tìm hiểu bảo vệ thương hiệu ở đâu?',topic:'so-huu-tri-tue',situations:['dau-tu'],country:'Việt Nam',type:'qa',summary:'Điểm bắt đầu cho các câu hỏi về nhãn hiệu và tài sản trí tuệ.',keywords:'nhan hieu thuong hieu so huu tri tue ban quyen',checks:['Tên hoặc dấu hiệu dự kiến sử dụng','Sản phẩm và dịch vụ liên quan','Phạm vi thị trường cần tìm hiểu']},
    {id:'tim-hieu-quyen-to-tung',title:'Người thân liên quan một vụ việc hình sự: cần tìm hiểu quyền gì?',topic:'hinh-su',situations:[],country:'Việt Nam',type:'qa',summary:'Nhận diện nhu cầu cần trao đổi với người có chuyên môn, không mô tả vụ việc riêng tại đây.',keywords:'hinh su to tung luat su quyen nguoi than',checks:['Giai đoạn vụ việc cần tìm hiểu','Vai trò của người liên quan','Đầu mối chuyên môn cần kết nối']},
    {id:'khi-nao-khieu-nai',title:'Tôi cần phân biệt khiếu nại và khởi kiện hành chính như thế nào?',topic:'hanh-chinh',situations:[],country:'Việt Nam',type:'qa',summary:'Sắp xếp câu hỏi về quyết định, cơ quan liên quan và điều chưa rõ.',keywords:'khieu nai khoi kien hanh chinh quyet dinh',checks:['Quyết định hoặc hành vi đang được đề cập','Cơ quan và bên liên quan','Nội dung cần được giải thích']},
    {id:'cam-nang-uy-quyen',title:'Ủy quyền từ Đức: bắt đầu từ đúng câu hỏi.',topic:'gia-dinh',situations:['uy-quyen'],country:'Việt Nam – Đức',type:'guide',summary:'Một lộ trình đọc gọn, kết nối các vấn đề cần tìm hiểu khi giải quyết công việc từ xa.',keywords:'cam nang uy quyen dai dien giay to',checks:['Xác định công việc muốn thực hiện','Tìm câu hỏi phù hợp trong thư viện','Trao đổi riêng khi cần làm rõ trường hợp cụ thể']},
    {id:'cam-nang-tai-san',title:'Quản lý tài sản từ xa: sắp xếp thông tin trước khi trao đổi.',topic:'nha-dat',situations:['nha-dat','thua-ke'],country:'Việt Nam',type:'guide',summary:'Mẫu cấu trúc cẩm nang, giúp người đọc theo dõi nhu cầu theo từng bước.',keywords:'cam nang nha dat tai san quan ly tu xa',checks:['Tổng hợp điều mình đang cần tìm hiểu','Chọn nhóm câu hỏi liên quan','Ghi lại những điểm chưa được giải đáp']},
    {id:'cam-nang-nguon-tin',title:'Đọc một bài pháp luật: kiểm tra phạm vi và nguồn ở đâu?',topic:'gia-dinh',situations:['giay-to'],country:'Việt Nam – Đức',type:'guide',summary:'Giới thiệu vị trí hiển thị nguồn, người kiểm duyệt và thời điểm rà soát trong thiết kế.',keywords:'cam nang nguon tin kiem duyet phap luat',checks:['Đọc phạm vi bài viết','Xem khu vực nguồn và kiểm duyệt','Tìm cách góp ý khi thấy thông tin cần làm rõ']},
    {id:'tin-phap-luat-viet-nam',title:'Bản tin pháp luật Việt Nam — vị trí dành cho nội dung đã duyệt.',topic:'hanh-chinh',situations:[],country:'Việt Nam',type:'news',summary:'Bài mẫu để duyệt giao diện tin tức. Chưa có sự kiện hoặc thông tin pháp luật mới được công bố.',keywords:'tin viet nam phap luat cap nhat',checks:[]},
    {id:'tin-phap-luat-duc',title:'Bản tin từ Đức — nguồn chính thức được trình bày như thế nào?',topic:'cu-tru',situations:['giay-to'],country:'Đức',type:'news',summary:'Bài mẫu để duyệt cách dẫn nguồn. Không phải bản tin pháp luật Đức thực tế.',keywords:'tin duc phap luat nguon',checks:[]}
  ]
});
