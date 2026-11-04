import type { GlobalConfig } from "payload";
import { owner } from "../shared/access";
const https = (v: unknown) => {
  if (!v) return true;
  try {
    return new URL(String(v)).protocol === "https:" || "Chỉ chấp nhận HTTPS";
  } catch {
    return "URL không hợp lệ";
  }
};
export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Cài đặt website",
  admin: { group: "Vận hành" },
  access: { read: owner, update: owner },
  fields: [{ type: "tabs", tabs: [
{label:"Nhận diện",fields:[{
      name: "siteName",
      label: "Tên website",
      type: "text",
      defaultValue: "Luật Việt Đức",
    },
{
      name: "tagline",
      label: "Giới thiệu ngắn",
      type: "textarea",
      defaultValue: "Thông tin pháp luật Việt Nam – Đức.",
    },
{ name: "logo", label: "Logo", type: "upload", relationTo: "media" },
{
      name: "accentColor",
      label: "Màu nhấn",
      type: "text",
      defaultValue: "#176FFF",
      validate: (v: unknown) =>
        /^#[\da-fA-F]{6}$/.test(String(v)) || "Nhập mã màu #RRGGBB",
    }]},
{label:"Điều hướng & mạng xã hội",fields:[{
      name: "socialLinks",
      label: "Mạng xã hội",
      admin:{components:{Field:"./modules/settings/SocialLinksField#SocialLinksField"}},
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "url", type: "text", required: true, validate: https },
      ],
    },
{
      name: "navigation",
      label: "Menu bổ sung",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        {
          name: "url",
          type: "text",
          required: true,
          validate: (v: unknown) =>
            String(v).startsWith("/admin")
              ? "Không dùng liên kết quản trị"
              : /^\/(?!\/)|^#\//.test(String(v)) || "Chỉ dùng đường dẫn nội bộ",
        },
      ],
    }]},
{label:"Hỗ trợ & trò chuyện",fields:[{
      name: "supportNotice",
      label: "Thông báo hỗ trợ",
      type: "textarea",
      defaultValue:
        "Yêu cầu được lưu vào hàng chờ. Chuyên viên phản hồi trong cuộc trò chuyện khi tiếp nhận.",
    },
{
      name: "officeHours",
      label: "Giờ trực (chỉ hiển thị, không tự hứa thời gian phản hồi)",
      type: "text",
    },
{
      name: "timeZone",
      label: "Múi giờ",
      type: "select",
      defaultValue: "Europe/Berlin",
      options: ["Europe/Berlin", "Asia/Ho_Chi_Minh"],
    },
{
      name: "chatEnabled",
      label: "Cho phép tiếp nhận chat",
      type: "checkbox",
      defaultValue: true,
    },
{
      name: "retentionDays",
      label: "Thời hạn lưu hội thoại (ngày; xóa cần quy trình riêng)",
      type: "number",
      min: 30,
      max: 3650,
      defaultValue: 365,
    },
{
      name: "maxMessageLength",
      label: "Độ dài tin nhắn tối đa",
      type: "number",
      min: 100,
      max: 10000,
      defaultValue: 2000,
    }]},
{label:"AI & kho FAQ",fields:[{
      name:'customerAIEnabled',label:'Ưu tiên trợ lý AI từ FAQ đã xuất bản',type:'checkbox',defaultValue:true,
      admin:{description:'AI tìm theo ý nghĩa trong bài viết đã xuất bản và còn hiệu lực. Khách được thông báo trước khi gửi câu hỏi sang Gemini; hồ sơ nhạy cảm chuyển chuyên viên. Thiếu căn cứ hoặc lỗi dịch vụ sẽ chuyển chuyên viên.'},
    },{
      name: "aiMode",
      label: "Thử AI nội bộ",
      type: "select",
      defaultValue: "internal-only",
      options: [
        { label: "Tắt", value: "off" },
        { label: "Chỉ thử nội bộ, dữ liệu công khai", value: "internal-only" },
      ],
    },
{
      name: "aiDailyRequests",
      label: "Hạn mức gọi AI mỗi ngày",
      type: "number",
      min: 0,
      max: 1000,
      defaultValue: 20,
    },
{
      name: "aiMaxOutputTokens",
      label: "Token đầu ra tối đa",
      type: "number",
      min: 100,
      max: 2000,
      defaultValue: 700,
    }]},
{label:"Chính sách & tìm kiếm",fields:[{
      name: "footerText",
      label: "Nội dung chân trang",
      type: "textarea",
      defaultValue:
        "Thông tin tham khảo; không thay thế việc xem xét hồ sơ cụ thể.",
    },
{
      name: "privacyText",
      label: "Bổ sung chính sách thông tin",
      type: "textarea",
    },
{
      name: "publicIndexingEnabled",
      label: "Cho phép công cụ tìm kiếm lập chỉ mục",
      type: "checkbox",
      defaultValue: false,
    }]}
]}],
};
