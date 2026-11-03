import { readFile } from "node:fs/promises";
import path from "node:path";
import {getPayload} from "payload";
import config from "@payload-config";
export const dynamic = "force-dynamic";
export async function GET() {
  let html = await readFile(
    path.join(process.cwd(), "public/frontend.html"),
    "utf8",
  );
  const payload=await getPayload({config});
  const settings=await payload.findGlobal({slug:'site-settings',overrideAccess:true});
  if(settings.publicIndexingEnabled)html=html.replace('noindex, nofollow','index, follow');
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    },
  });
}
