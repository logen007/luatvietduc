import {DOCUMENT_CONSENT_VERSION,validDocumentBatch} from './document-consent';
import {conversationTitle,recoveredConversationTitle,unnamedTitleContextSQL} from './conversation-title';
import {customerMetadata} from '../knowledge/citations';
import {avatarURL} from '../identity/avatar';
import {normalizeBrowserContext} from './browser-context';
import {customerConversationInfo} from './customer-facts';
import { randomUUID } from "node:crypto";
import { pool, transaction, hash } from "../shared/db";
import type { User } from "../../payload-types";
import {canEnterAdmin} from '../identity/permissions';
export type Actor = { user: User | null; guestHash: string };
import {HttpError} from '../http/errors';
export {HttpError} from '../http/errors';
const deny = () => {
  throw new HttpError(403, "Bạn không có quyền truy cập hội thoại này.");
};
export const isStaff = (user: User | null) => canEnterAdmin(user);
function countryAllowed(a: Actor, country: string) {
  return (
    isStaff(a.user) ||
    (country==='BOTH'&&Boolean(a.user?.jurisdictions?.length)) ||
    Boolean(a.user?.jurisdictions?.includes(country as "VN" | "DE"))
  );
}
export function isCustomer(a: Actor, c: any) {
  return (
    a.user?.id === c.user_id || (!c.user_id && a.guestHash === c.guest_hash)
  );
}
export function allowed(a: Actor, c: any) {
  return (
    isCustomer(a, c) ||
    (isStaff(a.user) && countryAllowed(a, c.jurisdiction))
  );
}
export async function chatList(a: Actor) {
  const result = await pool.query(
      "SELECT id,title,jurisdiction,state,version,ai_enabled,created_at,updated_at,id IN (SELECT conversation_id FROM lvd_chat_events WHERE action='customer.rename') AS \"customTitle\" ," + unnamedTitleContextSQL('c') + " AS title_context FROM lvd_conversations c WHERE " +
      (a.user ? "user_id=$1" : "user_id IS NULL AND guest_hash=$1") +
      " ORDER BY updated_at DESC LIMIT 100",
    [a.user?.id ?? a.guestHash],
  );
  return result.rows.map(({title_context,...row})=>({...row,title:recoveredConversationTitle(row.title,title_context,row.customTitle)}));
}
export async function queue(a: Actor) {
  if (!isStaff(a.user)) deny();
  const countries =
    ["VN", "DE", "BOTH"];
  return (
    await pool.query(
      "SELECT id,jurisdiction,specialty,state,version,created_at,assigned_to,(user_id IS NOT NULL) AS registered FROM lvd_conversations WHERE jurisdiction=ANY($1) AND ((state='queued' AND NOT ai_enabled) OR assigned_to=$2 OR state IN ('human','closed')) ORDER BY CASE WHEN assigned_to=$2 AND state='human' THEN 0 WHEN state='queued' AND user_id IS NOT NULL THEN 1 WHEN state='queued' THEN 2 ELSE 3 END,created_at LIMIT 100",
      [countries, a.user!.id],
    )
  ).rows;
}
export async function createConversation(a: Actor, data: any,options:{assistantEnabled?:boolean}={}) {
  const jurisdiction=data.jurisdiction||"BOTH";
  if (!["VN", "DE", "BOTH"].includes(jurisdiction) || data.consent !== true)
    throw new HttpError(
      400,
      "Thông tin tiếp nhận hội thoại chưa hợp lệ.",
    );
  const id = randomUUID();
  const result = await pool.query(
    "INSERT INTO lvd_conversations(id,user_id,guest_hash,jurisdiction,specialty,title,ai_enabled,privacy_notice_version,retain_history) VALUES($1,$2,$3,$4,$5,'Cuộc trò chuyện mới',$6,$7,$8) RETURNING id,state,version",
    [
      id,
      a.user?.id || null,
      a.user ? null : a.guestHash,
      jurisdiction,
      String(data.specialty || "general").slice(0, 100),
      Boolean(options.assistantEnabled&&data.mode!=='human'),
      data.privacyNoticeVersion==='chat-v2'?'chat-v2':'checkbox-v1',
      Boolean(a.user),
    ],
  );
  return result.rows[0];
}
export async function transcript(a: Actor, id: string, after = 0) {
  const { rows } = await pool.query(
    "SELECT c.*,"+unnamedTitleContextSQL('c')+" AS title_context,c.id IN (SELECT conversation_id FROM lvd_chat_events WHERE action='customer.rename') AS custom_title,u.name AS customer_name,u.email AS customer_email,u.phone AS customer_phone,u.location AS customer_location,u.avatar_id AS customer_avatar,u.updated_at AS customer_updated_at,u.created_at AS customer_created_at,agent.name AS assigned_name FROM lvd_conversations c LEFT JOIN users u ON u.id=c.user_id LEFT JOIN users agent ON agent.id=c.assigned_to WHERE c.id=$1",
    [id],
  );
  const c = rows[0];
  if (!c) throw new HttpError(404, "Không tìm thấy hội thoại.");
  if (!allowed(a, c)) {
    if (
      isStaff(a.user) &&
      countryAllowed(a, c.jurisdiction) &&
      c.state === "queued"
    )
      return {
        conversation: {
          id: c.id,
          title: "Yêu cầu chờ tiếp nhận",
          jurisdiction: c.jurisdiction,
          state: c.state,
          version: c.version,
          assignedTo: null,
          restricted:true,registered:Boolean(c.user_id),createdAt:c.created_at,
        },
        messages: [],
      };
    deny();
  }
  const staff = isStaff(a.user) && !isCustomer(a, c);
  const info=isStaff(a.user)?customerConversationInfo((await pool.query("SELECT id,role,body,metadata FROM lvd_messages WHERE conversation_id=$1 AND NOT internal AND COALESCE(metadata->>'kind','')<>'deleted' ORDER BY id DESC LIMIT 200",[id])).rows.reverse()):undefined;
  const messages = await pool.query(
    "SELECT id,role,body,internal,created_at,client_key,metadata,CASE WHEN role='staff' THEN (SELECT json_build_object('name',name,'id',id,'avatar',avatar_id,'updatedAt',updated_at) FROM users WHERE 'staff:'||users.id::text=lvd_messages.actor_key) END AS author_profile,COALESCE((SELECT json_agg(json_build_object('id',f.id,'name',f.name,'size',f.size,'mimeType',f.mime_type,'url','/service/chat-files/'||f.id)) FROM lvd_chat_files f WHERE f.message_id=lvd_messages.id AND f.ready=true),'[]'::json) AS attachments FROM lvd_messages WHERE conversation_id=$1 AND id>$2 AND COALESCE(metadata->>'kind','')<>'deleted' " +
      (staff ? "" : "AND internal=false ") +
      "ORDER BY id LIMIT 200",
    [id, after],
  );
  return {
    conversation: {
      id: c.id,
      title: recoveredConversationTitle(c.title,c.title_context,c.custom_title),
      customTitle:Boolean(c.custom_title),
      jurisdiction: c.jurisdiction,
      state: c.state,
      version: c.version,
      assignedTo: c.assigned_to,
      registered:Boolean(c.user_id),
      createdAt:c.created_at,updatedAt:c.updated_at,assignedName:staff?c.assigned_name:undefined,
      customer:isStaff(a.user)?{name:c.customer_name||(c.user_id?'Khách':'Khách vãng lai'),email:c.customer_email||null,phone:c.customer_phone||null,location:c.customer_location||null,avatarURL:avatarURL({id:c.user_id,avatar:c.customer_avatar,updatedAt:c.customer_updated_at}),createdAt:c.customer_created_at||null}:undefined,
      info,
      aiEnabled:c.ai_enabled,
      aiStartedAt:c.ai_started_at,
      aiMessageId:c.ai_message_id,
    },
    messages: messages.rows.map(({author_profile,...row})=>({...row,author_name:author_profile?.name||undefined,author_avatar_url:avatarURL(author_profile),metadata:staff?row.metadata:customerMetadata(row.metadata)})),
  };
}
export async function message(
  a: Actor,
  id: string,
  data: any,
  maxLength: number,
  context:{country?:unknown}={},
) {
  const fileIds = Array.isArray(data.fileIds)?data.fileIds:[];
  if(fileIds.length>4||new Set(fileIds).size!==fileIds.length||fileIds.some((v:unknown)=>typeof v!=="string"||!/^[a-f0-9-]{36}$/i.test(v)))throw new HttpError(400,"Tệp đính kèm không hợp lệ.");
  const body = String(data.body || "").trim(),
    key = String(data.key || "");
  if ((!body&&!fileIds.length) || body.length > maxLength || !/^[\w-]{16,80}$/.test(key))
    throw new HttpError(400, "Tin nhắn hoặc mã gửi không hợp lệ.");
  return transaction(async (db) => {
    const c = (
      await db.query("SELECT * FROM lvd_conversations WHERE id=$1 FOR UPDATE", [
        id,
      ])
    ).rows[0];
    if (!c) throw new HttpError(404, "Không tìm thấy hội thoại.");
    if (!allowed(a, c)) deny();
    const own = isCustomer(a, c),
      internal = !own && data.internal === true;
    const actorKey = own
      ? a.user
        ? "user:" + a.user.id
        : "guest:" + a.guestHash
      : "staff:" + a.user!.id;
    const prior = (
      await db.query(
        "SELECT * FROM lvd_messages WHERE conversation_id=$1 AND client_key=$2",
        [id, key],
      )
    ).rows[0];
    if (prior) {
      if(prior.metadata?.kind==='deleted')throw new HttpError(409,"Tin nhắn này đã được Admin xóa.");
      if (
        prior.actor_key !== actorKey ||
        prior.body !== body ||
        prior.internal !== internal || (prior.metadata?.documentConsent?.version||'')!==(own&&fileIds.length&&data.documentConsentVersion===DOCUMENT_CONSENT_VERSION?DOCUMENT_CONSENT_VERSION:'') || JSON.stringify(prior.metadata?.fileIds||[])!==JSON.stringify(fileIds)
      )
        throw new HttpError(409, "Mã gửi đã dùng cho nội dung khác.");
      return { id: prior.id, duplicate: true,role:prior.role };
    }
    if (c.state === "closed")
      throw new HttpError(409, "Hội thoại đã đóng. Hãy mở lại trước khi gửi.");
    if (
      !own &&
      c.state !== "human"
    )
      throw new HttpError(409, "Cần nhận xử lý hội thoại trước khi trả lời.");
    const documentConsent=own&&fileIds.length>0&&data.documentConsentVersion===DOCUMENT_CONSENT_VERSION;
    if(documentConsent&&data.aiConsentVersion!=='gemini-rag-v1')throw new HttpError(400,'Cần đồng ý cho AI xử lý tài liệu.');
    if(data.documentConsentVersion!==undefined&&!documentConsent)throw new HttpError(400,'Đồng ý xử lý tài liệu không hợp lệ.');
    if(fileIds.length){
      const files=await db.query("SELECT id,mime_type,size FROM lvd_chat_files WHERE id=ANY($1::uuid[]) AND conversation_id=$2 AND actor_key=$3 AND message_id IS NULL AND ready=true FOR UPDATE",[fileIds,id,actorKey]);
      if(files.rowCount!==fileIds.length)throw new HttpError(403,"Không thể gửi tệp này trong hội thoại.");
      if(documentConsent&&!validDocumentBatch(files.rows.map(f=>({mimeType:f.mime_type,size:Number(f.size)}))))throw new HttpError(400,'AI đọc tối đa 4 ảnh/PDF, tổng dung lượng 12 MB.');
    }
    const browserContext=own?normalizeBrowserContext(data.browserContext,context.country):undefined;
    const metadata:any={...(browserContext?{browserContext}:{}),...(own&&(!fileIds.length||documentConsent)&&data.aiConsentVersion==='gemini-rag-v1'?{aiConsent:{version:'gemini-rag-v1',provider:'google-gemini',at:new Date().toISOString()}}:{}),...(documentConsent?{documentConsent:{version:DOCUMENT_CONSENT_VERSION,provider:'google-gemini',at:new Date().toISOString(),fileIds}}:{}),...(fileIds.length?{fileIds}:{})};
    const result = await db.query(
      "INSERT INTO lvd_messages(conversation_id,role,body,internal,actor_key,client_key,metadata) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [id, own ? "user" : "staff", body, internal, actorKey, key, Object.keys(metadata).length?JSON.stringify(metadata):null],
    );
    // Local topic labels are available immediately, including conversations claimed by staff.
    // Manual names take precedence; retries return above without changing the title.
    const titleContext=own?(await db.query("SELECT body FROM lvd_messages WHERE conversation_id=$1 AND role='user' AND NOT internal AND COALESCE(metadata->>'kind','')<>'deleted' ORDER BY id DESC LIMIT 80",[id])).rows.reverse().map(row=>String(row.body)).join('\n'):'';
    await db.query(
      "UPDATE lvd_conversations SET title=CASE WHEN EXISTS(SELECT 1 FROM lvd_chat_events WHERE conversation_id=$1 AND action='customer.rename') THEN title ELSE COALESCE($3,title) END,updated_at=clock_timestamp(),ai_generation=CASE WHEN $2 THEN NULL ELSE ai_generation END,ai_started_at=CASE WHEN $2 THEN NULL ELSE ai_started_at END,ai_message_id=CASE WHEN $2 THEN NULL ELSE ai_message_id END WHERE id=$1",
      [id,own,own?conversationTitle(titleContext):null],
    );
    if(fileIds.length){
      await db.query("UPDATE lvd_chat_files SET message_id=$1,internal=$2 WHERE id=ANY($3::uuid[])",[result.rows[0].id,internal,fileIds]);
      if(own&&!documentConsent)await db.query("UPDATE lvd_conversations SET ai_enabled=false,ai_generation=NULL,ai_started_at=NULL,ai_message_id=NULL,state=CASE WHEN state='human' THEN state ELSE 'queued' END,version=version+1 WHERE id=$1",[id]);
    }
    if(own&&(!fileIds.length||documentConsent)&&c.state==='queued'&&c.ai_enabled)await db.query('INSERT INTO lvd_answer_jobs(message_id,conversation_id) VALUES($1,$2) ON CONFLICT(message_id) DO NOTHING',[result.rows[0].id,id]);
    return {...result.rows[0],role:own?'user':'staff'};
  });
}
export async function transition(a: Actor, id: string, data: any) {
  return transaction(async (db) => {
    const c = (
      await db.query("SELECT * FROM lvd_conversations WHERE id=$1 FOR UPDATE", [
        id,
      ])
    ).rows[0];
    if (!c) throw new HttpError(404, "Không tìm thấy hội thoại.");
    if (!Number.isInteger(data.version) || c.version !== data.version)
      throw new HttpError(409, "Hội thoại đã thay đổi. Vui lòng tải lại.");
    const own = isCustomer(a, c),
      staff = isStaff(a.user) && countryAllowed(a, c.jurisdiction);
    let state = c.state,
      assigned = c.assigned_to;
    if (data.action === "claim") {
      if (!staff) deny();
      if (c.state !== "queued")
        throw new HttpError(409, "Hội thoại đã được nhận.");
      // An explicit staff claim always overrides AI, including an active answer.
      // The same locked update below revokes its generation and advances version.
      state = "human";
      assigned = a.user!.id;
    } else if(data.action==='release'){
      if(!staff||c.state!=='human')throw new HttpError(403,'Chỉ chuyên viên được trả hội thoại đang xử lý về hàng chờ.');
      state='queued';assigned=null;
    } else if (data.action === "close") {
      if (!staff)
        deny();
      state = "closed";
    } else if (data.action === "reopen" || data.action === "handoff") {
      if (!own && !allowed(a, c)) deny();
      if (c.state === "human" && data.action === "handoff")
        return { state: c.state, version: c.version };
      if(c.state==='queued'&&!c.ai_enabled&&data.action==='handoff')return {state:c.state,version:c.version};
      state = "queued";
      assigned = null;
    } else throw new HttpError(400, "Thao tác không hợp lệ.");
    const r = await db.query(
      "UPDATE lvd_conversations SET state=$2,assigned_to=$3,ai_enabled=false,ai_generation=NULL,ai_started_at=NULL,ai_message_id=NULL,version=version+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING state,version",
      [id, state, assigned],
    );
    await db.query(
      "INSERT INTO lvd_chat_events(conversation_id,action,actor_id,version) VALUES($1,$2,$3,$4)",
      [id, data.action, a.user?.id, r.rows[0].version],
    );
    return r.rows[0];
  });
}
export async function rateLimit(key: string, limit = 60) {
  const result = await pool.query(
    "INSERT INTO lvd_rate_limits(key,window_start,count) VALUES($1,date_trunc('minute',now()),1) ON CONFLICT(key,window_start) DO UPDATE SET count=lvd_rate_limits.count+1 RETURNING count",
    [await hash(key)],
  );
  if (result.rows[0].count > limit)
    throw new HttpError(
      429,
      "Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.",
    );
}
