import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { randomBytes } from "node:crypto";
import { hash, pool } from "../../../modules/shared/db";
import { cookieValue } from "../../../modules/identity/session";
import * as chat from "../../../modules/chat/service";
import { testSource } from "../../../modules/knowledge/test-source";
import {replyToMessage} from '../../../modules/assistant/reply';
import {activeValues} from '../../../modules/integrations/store';
import {knowledgeArticles,writeKnowledgeArticle} from '../../../modules/knowledge/articles';
import {sendContact} from '../../../modules/contact/service';
import {
  siteSettings,
  connectionStatus,
} from "../../../modules/settings/public";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
async function route(
  req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const segments = (await context.params).path,
      method = req.method,
      path = segments.join("/"),
      url = new URL(req.url);
    const payload = await getPayload({ config }),
      { user } = await payload.auth({ headers: req.headers });
    let guest = cookieValue(req.headers, "lvd-guest"),
      fresh = false;
    if (!guest || !/^[\w-]{43}$/.test(guest)) {
      guest = randomBytes(32).toString("base64url");
      fresh = true;
    }
    const actor: chat.Actor = { user, guestHash: await hash(guest) };
    // Private polling needs only authentication and its own scoped query.
    let settingsPromise:ReturnType<typeof siteSettings>|null=null;
    const settings = () => settingsPromise??=siteSettings(payload);
    let data: any = {};
    if (method === "POST") {
      const origin = process.env.APP_URL || "http://localhost:3000";
      if (req.headers.get("origin") !== origin)
        throw new chat.HttpError(403, "Nguồn yêu cầu không hợp lệ.");
      if (!req.headers.get("content-type")?.startsWith("application/json"))
        throw new chat.HttpError(415, "Yêu cầu JSON.");
      const reader = req.body?.getReader();
      let size = 0,
        text = "";
      if (reader) {
        const decoder = new TextDecoder();
        for (;;) {
          const item = await reader.read();
          if (item.done) break;
          size += item.value.length;
          if (size > 16000) {
            await reader.cancel();
            throw new chat.HttpError(413, "Nội dung quá lớn.");
          }
          text += decoder.decode(item.value, { stream: true });
        }
      }
      try {
        data = JSON.parse(text || "{}");
      } catch {
        throw new chat.HttpError(400, "JSON không hợp lệ.");
      }
      if(!data||typeof data!=='object'||Array.isArray(data))throw new chat.HttpError(400,'Nội dung không hợp lệ.');
      await chat.rateLimit(
        user ? "user:" + user.id : "guest:" + actor.guestHash,
      );
      await chat.rateLimit("global-post", 600);
    }
    let result: unknown;
    if (path === "me" && method === "GET")
      result = {
        user: user
          ? {
              id: user.id,
              name: user.name,
              role: user.role,
              jurisdictions: user.jurisdictions,
            }
          : null,
        connections: await connectionStatus(),
      };
    else if (path === "logout" && method === "POST") {
      const token = cookieValue(req.headers, "lvd-session");
      if (token)
        await pool.query("DELETE FROM lvd_sessions WHERE token_hash=$1", [
          await hash(token),
        ]);
      const response = json({ ok: true });
      for (const name of ["lvd-session", "payload-token"])
        response.cookies.delete(name);
      return response;
    } else if (path === "contact" && method === "POST")
      result = await sendContact(data);
    else if (path === "conversations" && method === "GET")
      result = await chat.chatList(actor);
    else if (path === "conversations" && method === "POST") {
      if ((await settings()).chatEnabled === false)
        throw new chat.HttpError(503, "Tiếp nhận chat đang tạm dừng.");
      result = await chat.createConversation(actor, data,{assistantEnabled:(await settings()).customerAIEnabled!==false&&Boolean(await activeValues('ai'))});
    } else if (path === "queue" && method === "GET")
      result = await chat.queue(actor);
    else if (
      segments[0] === "conversations" &&
      segments[1] &&
      /^[\da-f-]{36}$/i.test(segments[1])
    ) {
      const id = segments[1];
      if (segments.length === 2 && method === "GET") {
        const after = Number(url.searchParams.get("after") || 0);
        if (!Number.isSafeInteger(after) || after < 0)
          throw new chat.HttpError(400, "Cursor không hợp lệ.");
        result = await chat.transcript(actor, id, after);
      } else if (segments[2] === "messages" && method === "POST") {
        if ((await settings()).chatEnabled === false)
          throw new chat.HttpError(503, "Tiếp nhận chat đang tạm dừng.");
        const sent = await chat.message(
          actor,
          id,
          data,
          (await settings()).maxMessageLength || 2000,
        );
        if(sent.role==='user')await replyToMessage(actor,id,sent.id,await settings());
        result=sent;
      } else if(segments[2]==='answer'&&method==='POST'){
        if((await settings()).chatEnabled===false)throw new chat.HttpError(503,'Tiếp nhận chat đang tạm dừng.');
        if(typeof data.messageId!=='string'||!/^\d{1,19}$/.test(data.messageId))throw new chat.HttpError(400,'Tin nhắn không hợp lệ.');
        await replyToMessage(actor,id,data.messageId,await settings());result={ok:true};
      } else if (segments[2] === "transition" && method === "POST")
        result = await chat.transition(actor, id, data);
      else throw new chat.HttpError(404, "Không tìm thấy chức năng.");
    } else if(path === "knowledge-articles" && method === "GET") {
      result=await knowledgeArticles(payload,user,url.searchParams.get("id"));
    } else if(path === "knowledge-articles" && method === "POST") {
      result=await writeKnowledgeArticle(payload,user,data);
    } else if (path === "knowledge-sources" && method === "GET") {
      if (!user || !["owner", "reviewer", "knowledge", "support"].includes(user.role))
        throw new chat.HttpError(403, "Chỉ dành cho nhân sự kiến thức.");
      const sources = await payload.find({
        collection: "knowledge",
        user,
        overrideAccess: false,
        where: {
          and: [
            { approved: { equals: true } },
            { _status: { equals: "published" } },
          ],
        },
        limit: 100,
      });
      result = sources.docs.map((s) => ({
        id: s.id,
        title: s.title,
        jurisdiction: s.jurisdiction,
        reviewDueAt: s.reviewDueAt,
      }));
    } else if (path === "knowledge-test" && method === "POST")
      result = await testSource(payload, user, Number(data.id), await settings());
    else if (path === "connections" && method === "GET") {
      if (user?.role !== "owner")
        throw new chat.HttpError(403, "Chỉ chủ hệ thống.");
      result = {
        ...(await connectionStatus()),
        database: (await pool.query("SELECT 1")).rowCount === 1,
      };
    } else throw new chat.HttpError(404, "Không tìm thấy chức năng.");
    const response = json(result);
    if (fresh && (path === "me" || (path === "conversations" && method === "POST")))
      response.cookies.set("lvd-guest", guest, {
        httpOnly: true,
        secure: (process.env.APP_URL || "").startsWith("https:"),
        sameSite: "lax",
        path: "/",
        maxAge: 2592000,
      });
    return response;
  } catch (error) {
    if (error instanceof chat.HttpError)
      return json({ error: error.message }, error.status);
    console.error(
      "Service failure",
      error instanceof Error ? error.name : "Error",
    );
    return json(
      { error: "Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại." },
      500,
    );
  }
}
export const GET = route;
export const POST = route;
