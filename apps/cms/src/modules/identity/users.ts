import {APIError, type CollectionConfig} from "payload";
import { owner } from "../shared/access";
import { activeValues } from "../integrations/store";
import { googleSessionStrategy } from "./session";
export const Users: CollectionConfig = {
  slug: "users", labels:{singular:"Tài khoản",plural:"Tài khoản & phân quyền"},admin:{group:"Vận hành",useAsTitle:"name"},
  auth: {
    strategies: [googleSessionStrategy],
    maxLoginAttempts: 5,
    lockTime: 600000,
    cookies: { sameSite: "Lax", secure: process.env.NODE_ENV === "production" },
  },
  hooks: {beforeOperation:[async ({operation,args})=>{if(["forgotPassword","resetPassword"].includes(operation)&&!(await activeValues("email")))throw new APIError("Email chưa được cấu hình. Liên hệ chủ hệ thống.",503);return args}],
    beforeChange: [
      ({ req, operation, data }) => {
        if (
          operation === "create" &&
          req.user?.role !== "owner" &&
          req.context.bootstrapOwner !== true &&
          req.context.googleMember !== true
        )
          throw new Error("Offline owner provisioning required");
        if (req.context.googleMember === true) data.role = "member";
        return data;
      },
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
    admin: ({ req }) => Boolean(req.user && req.user.role !== "member"),
  },
  fields: [
    { name: "name",label:"Tên hiển thị", type: "text", required: true },
    {
      name: "role",label:"Vai trò",
      type: "select",
      required: true,
      defaultValue: "member",
      options: [
        "owner",
        "operations",
        "editor",
        "reviewer",
        "publisher",
        "knowledge",
        "support",
        "member",
      ],
      access: {
        create: ({ req }) => req.user?.role === "owner",
        update: ({ req }) => req.user?.role === "owner",
      },
    },
    {
      name: "jurisdictions",label:"Quốc gia được phân quyền",
      type: "select",
      hasMany: true,
      options: ["VN", "DE"],
    },
  ],
};
