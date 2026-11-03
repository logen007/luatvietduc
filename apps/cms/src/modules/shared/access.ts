import type { Access } from "payload";
export const owner: Access = ({ req }) => req.user?.role === "owner";
export const nobody: Access = () => false;
