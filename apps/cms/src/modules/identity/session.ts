import type { AuthStrategy } from "payload";
import { pool, hash } from "../shared/db";
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
    const token = cookieValue(headers, "lvd-session");
    if (!token || token.length > 100) return { user: null };
    const { rows } = await pool.query(
      "SELECT user_id FROM lvd_sessions WHERE token_hash=$1 AND expires_at>now()",
      [await hash(token)],
    );
    if (!rows[0]) return { user: null };
    try {
      const user = await payload.findByID({
        collection: "users",
        id: rows[0].user_id,
        overrideAccess: true,
      });
      return { user: { ...user, collection: "users" as const } };
    } catch {
      return { user: null };
    }
  },
};
