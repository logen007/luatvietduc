import type { Payload } from "payload";
export async function siteSettings(payload: Payload) {
  return payload.findGlobal({ slug: "site-settings", overrideAccess: true });
}
export function connectionStatus() {
  return {
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
    storage: [
      "R2_BUCKET",
      "R2_ENDPOINT",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
    ].every((k) => Boolean(process.env[k])),
    email: false,
    ai: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL),
    customerAI: false,
  };
}
