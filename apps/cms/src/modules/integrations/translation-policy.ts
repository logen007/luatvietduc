// Keep article translation on one model offered by Groq Free. Do not discover
// or fall back to another model/tier. The account must remain on the Free plan.
export const translationVendor='groq';
export const translationModel='openai/gpt-oss-120b';
export function isGroqKey(key:string){return /^gsk_[A-Za-z0-9_-]{8,240}$/.test(key);}
