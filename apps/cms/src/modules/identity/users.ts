import {accountEmail} from './account-email';
import {roleOptions} from './roles';
import {APIError, type CollectionConfig} from "payload";
import { owner } from "../shared/access";
import { activeValues } from "../integrations/store";
import { googleSessionStrategy } from "./session";
import {canEnterAdmin} from './permissions';
import {trackAccountOperation,guardAccountLogin,revokeResetSessions,revokeChangedCredentials,retireGoogleSessionOnLogin} from './user-security';
import {guardPasswordLoginEmailMutation} from './password-login';
import {verifyEmailEndpoint} from './verify-email';
export const Users: CollectionConfig = {
  slug: "users", labels:{singular:"Người dùng",plural:"Người dùng"},admin:{group:"Vận hành",useAsTitle:"name",defaultColumns:["name","email","role","updatedAt"],listSearchableFields:["name","email"],description:"Admin quản lý hệ thống. Chuyên viên quản lý nội dung và trả lời khách. User sử dụng website và hội thoại cá nhân.",components:{beforeListTable:["./modules/identity/UserRoleTabs#UserRoleTabs"]}},
  auth: {
    strategies: [googleSessionStrategy],
    verify: {
      generateEmailSubject:({req})=>accountEmail('verify','',req?.context).subject,
      generateEmailHTML:({req,token})=>accountEmail('verify',token,req?.context).html,
    },
    forgotPassword: {
      generateEmailSubject:args=>accountEmail('reset','',args?.req?.context).subject,
      generateEmailHTML:args=>accountEmail('reset',args?.token||'',args?.req?.context).html,
    },
    maxLoginAttempts: 5,
    lockTime: 600000,
    cookies: { sameSite: "Lax", secure: process.env.NODE_ENV === "production" },
  },
  endpoints:[verifyEmailEndpoint],
  hooks: {beforeOperation:[async ({operation,args})=>{if(operation==="create"&&args.req.context.publicMember!==true)args.disableVerificationEmail=true;if(["forgotPassword","resetPassword"].includes(operation)&&!(await activeValues("email")))throw new APIError("Email chưa được cấu hình. Liên hệ chủ hệ thống.",503);return args},trackAccountOperation],
    beforeValidate:[revokeResetSessions],
    beforeLogin:[guardAccountLogin],
    afterLogin:[retireGoogleSessionOnLogin],
    beforeChange: [
      ({ req, operation, data }) => {
        if (
          operation === "create" &&
          req.user?.role !== "owner" &&
          req.context.bootstrapOwner !== true &&
          req.context.googleMember !== true &&
          req.context.publicMember !== true
        )
          throw new Error("Offline owner provisioning required");
        if (req.context.googleMember === true || req.context.publicMember === true) data.role = "member";
        if(operation==='create')data._verified=req.context.publicMember!==true;
        if(req.context.googleVerified===true||req.context.verifiedReset===true)data._verified=true;
        if(data.role&&!roleOptions.some(option=>option.value===data.role))throw new APIError("Chỉ hỗ trợ Admin, Chuyên viên và User.",400);
        if(operation==='create'&&data.role==='support'&&!data.jurisdictions?.length)data.jurisdictions=["VN","DE"];
        return data;
      },
      guardPasswordLoginEmailMutation,
      revokeChangedCredentials,
    ],
  },
  access: {
    create: owner,
    read: ({ req }) =>
      req.user?.role === "owner"
        ? true
        : req.user
          ? { id: { equals: req.user.id } }
          : false,
    update: owner,
    delete: owner,
    admin: ({ req }) => canEnterAdmin(req.user),
  },
  fields: [
    { name: "name",label:"Tên hiển thị", type: "text", required: true },
    {
      name: "role",label:"Vai trò",
      type: "select",
      required: true,
      defaultValue: "member",
      options: roleOptions,
      admin:{position:"sidebar",description:"Chỉ Admin được thay đổi vai trò."},
      access: {
        create: ({ req }) => req.user?.role === "owner",
        update: ({ req }) => req.user?.role === "owner",
      },
    },
    {
      name: "jurisdictions",label:"Phạm vi chuyên môn",
      type: "select",
      hasMany: true,
      options: [{label:"Việt Nam",value:"VN"},{label:"Đức",value:"DE"}],
      admin:{position:"sidebar",condition:(_data,siblingData)=>siblingData.role==='support',description:"Chuyên viên làm việc trong phạm vi được giao."},
    },
  ],
};
