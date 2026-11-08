import {deleteInboxConversation} from '../../../modules/chat/delete-conversation';
import {articleImportRequest} from '../../../modules/content/article-import';
import {rolePreviewRequest} from '../../../modules/identity/role-preview';
import {knowledgeRequest} from '../../../modules/knowledge/http';
import {readJsonRequest} from '../../../modules/http/request';
import {specialistInbox} from '../../../modules/chat/inbox';
import {uploadChatFile,downloadChatFile,MAX_CHAT_FILE} from '../../../modules/chat/files';
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { randomBytes } from "node:crypto";
import { hash, pool } from "../../../modules/shared/db";
import { cookieValue } from "../../../modules/identity/session";
import {logoutRequest} from '../../../modules/identity/logout';
import * as chat from "../../../modules/chat/service";
import {requestAnswer} from '../../../modules/assistant/queue';
import {activeValues} from '../../../modules/integrations/store';
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
    const payload = await getPayload({ config });
    if(path==='role-preview')return rolePreviewRequest(req,payload);
    if(path==='logout'&&method==='POST')return logoutRequest(req,payload);
    const { user } = await payload.auth({ headers: req.headers });
    if(path==='article-import')return articleImportRequest(req,payload,user);
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
    if(segments[0]==='chat-files'&&segments.length===2&&method==='GET'&&/^[a-f0-9-]{36}$/i.test(segments[1]))return await downloadChatFile(actor,segments[1]);
    if(segments[0]==='conversations'&&segments[2]==='files'&&segments.length===3&&method==='POST'&&/^[a-f0-9-]{36}$/i.test(segments[1])){
      if(req.headers.get('origin')!==(process.env.APP_URL||'http://localhost:3000'))throw new chat.HttpError(403,'Nguồn yêu cầu không hợp lệ.');
      if((await settings()).chatEnabled===false)throw new chat.HttpError(503,'Tiếp nhận chat đang tạm dừng.');
      await chat.rateLimit('file:'+(user?.id||actor.guestHash),15);await chat.rateLimit('global-chat-file',100);
      if(Number(req.headers.get('content-length'))>MAX_CHAT_FILE)throw new chat.HttpError(413,'Tệp vượt quá 10 MB.');
      const reader=req.body?.getReader();if(!reader)throw new chat.HttpError(400,'Chưa chọn tệp.');
      const chunks:Buffer[]=[];let size=0;
      for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>MAX_CHAT_FILE){await reader.cancel();throw new chat.HttpError(413,'Tệp vượt quá 10 MB.');}chunks.push(Buffer.from(part.value));}
      let name='';try{name=decodeURIComponent(req.headers.get('x-file-name')||'');}catch{throw new chat.HttpError(400,'Tên tệp không hợp lệ.');}
      if(!name||name.length>180)throw new chat.HttpError(400,'Tên tệp tối đa 180 ký tự.');
      return json(await uploadChatFile(actor,segments[1],name,Buffer.concat(chunks)));
    }
    let data: Record<string,unknown> = {};
    if (method === "POST") {
      data=await readJsonRequest(req,path==='knowledge-articles'?96000:16000);
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
              rolePreview: (user as import('../../../modules/identity/role-preview-auth').PreviewUser).rolePreview,
              role: user.role,
              jurisdictions: user.jurisdictions,
            }
          : null,
        connections: await connectionStatus(),
      };
    else if (path === "contact" && method === "POST")
      result = await sendContact(data);
    else if (path === "conversations" && method === "GET")
      result = await chat.chatList(actor);
    else if (path === "conversations" && method === "POST") {
      if ((await settings()).chatEnabled === false)
        throw new chat.HttpError(503, "Tiếp nhận chat đang tạm dừng.");
      result = await chat.createConversation(actor, data,{assistantEnabled:(await settings()).customerAIEnabled!==false&&Boolean(await activeValues('ai'))});
    } else if(path === "inbox" && method === "GET")
      result=await specialistInbox(actor,{view:url.searchParams.get("view")||undefined,query:url.searchParams.get("q")||undefined,page:Number(url.searchParams.get("page")||1)});
    else if (path === "queue" && method === "GET")
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
      } else if (segments.length === 3 && segments[2] === "messages" && method === "POST") {
        if ((await settings()).chatEnabled === false)
          throw new chat.HttpError(503, "Tiếp nhận chat đang tạm dừng.");
        const sent = await chat.message(
          actor,
          id,
          data,
          (await settings()).maxMessageLength || 2000,
          {country:req.headers.get('cf-ipcountry')},
        );
        result=sent;
      } else if(segments.length===3&&segments[2]==='delete'&&method==='POST'){
        result=await deleteInboxConversation(actor,id,data.version,data.updatedAt);
      } else if(segments[2]==='answer'&&method==='POST'){
        if((await settings()).chatEnabled===false)throw new chat.HttpError(503,'Tiếp nhận chat đang tạm dừng.');
        if(typeof data.messageId!=='string'||!/^\d{1,19}$/.test(data.messageId))throw new chat.HttpError(400,'Tin nhắn không hợp lệ.');
        await requestAnswer(actor,id,data.messageId);result={ok:true};
      } else if (segments[2] === "transition" && method === "POST")
        result = await chat.transition(actor, id, data);
      else throw new chat.HttpError(404, "Không tìm thấy chức năng.");
    } else if(path.startsWith('knowledge-')) {
      result=await knowledgeRequest({payload,user,path,method,url,data,settings});
    } else if (path === "connections" && method === "GET") {
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
