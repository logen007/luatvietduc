import type { CollectionConfig } from "payload";
import { owner } from "../shared/access";
import { googleSessionStrategy } from "./session";
export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    strategies: [googleSessionStrategy],
    maxLoginAttempts: 5,
    lockTime: 600000,
    cookies: { sameSite: "Lax", secure: process.env.NODE_ENV === "production" },
  },
  hooks: {
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
    { name: "name", type: "text", required: true },
    {
      name: "role",
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
      name: "jurisdictions",
      type: "select",
      hasMany: true,
      options: ["VN", "DE"],
    },
  ],
};
