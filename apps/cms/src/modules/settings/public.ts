import type { Payload } from "payload";
export async function siteSettings(payload: Payload) {
  return payload.findGlobal({ slug: "site-settings", overrideAccess: true });
}
export async function connectionStatus() {
  const { activeValues } = await import('../integrations/store');
  const [google, storage, email, ai] = await Promise.all(['google','r2','email','ai'].map(p => activeValues(p as 'google'|'r2'|'email'|'ai')));
  return {google:Boolean(google), storage:Boolean(storage), email:Boolean(email), ai:Boolean(ai), customerAI:false};
}
