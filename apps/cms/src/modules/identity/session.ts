import {authenticateRolePreview} from './role-preview-auth';
import type { AuthStrategy } from "payload";
import {appSessionUser} from './app-sessions';
export const cookieValue = (headers: Headers, name: string) =>
  headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + "="))
    ?.slice(name.length + 1);
export const googleSessionStrategy: AuthStrategy = {
  name: "google-session",
  authenticate: async ({ headers, payload }) => {
    const preview=await authenticateRolePreview(payload,headers);if(preview)return {user:preview};
    const token = cookieValue(headers, "lvd-session");
    const userId=await appSessionUser(token);
    if (!userId) return { user: null };
    try {
      const user = await payload.findByID({
        collection: "users",
        id: userId,
        overrideAccess: true,
      });
      return { user: { ...user, collection: "users" as const, _strategy:'google-session' } };
    } catch {
      return { user: null };
    }
  },
};
