// Explicitly pin a model with a published free tier. Never discover or fall
// back to an arbitrary paid/preview model. Billing still belongs to the Google
// project: use an API key from a project without billing enabled.
export const translationVendor='gemini';
export const translationModel='gemini-3.1-flash-lite';
export function isOtherProviderKey(key:string){return /^(?:xai-|grok_|crsr_)/i.test(key);}
