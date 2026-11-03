import { randomUUID } from "node:crypto";
import { pool, transaction, hash } from "../shared/db";
import type { User } from "../../payload-types";
export type Actor = { user: User | null; guestHash: string };
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const deny = () => {
  throw new HttpError(403, "Bạn không có quyền truy cập hội thoại này.");
};
export const isStaff = (user: User | null) =>
  Boolean(user && ["owner", "support", "operations"].includes(user.role));
function countryAllowed(a: Actor, country: string) {
  return (
    a.user?.role === "owner" ||
    Boolean(a.user?.jurisdictions?.includes(country as "VN" | "DE"))
  );
}
function customer(a: Actor, c: any) {
  return (
    a.user?.id === c.user_id || (!c.user_id && a.guestHash === c.guest_hash)
  );
}
function allowed(a: Actor, c: any) {
  return (
    customer(a, c) ||
    (isStaff(a.user) &&
      countryAllowed(a, c.jurisdiction) &&
      (a.user?.role === "owner" || c.assigned_to === a.user?.id))
  );
}
export async function chatList(a: Actor) {
  const result = await pool.query(
    "SELECT id,title,jurisdiction,state,version,created_at,updated_at FROM lvd_conversations WHERE " +
      (a.user ? "user_id=$1" : "user_id IS NULL AND guest_hash=$1") +
      " ORDER BY updated_at DESC LIMIT 100",
    [a.user?.id ?? a.guestHash],
  );
  return result.rows;
}
export async function queue(a: Actor) {
  if (!isStaff(a.user)) deny();
  const countries =
    a.user?.role === "owner" ? ["VN", "DE"] : a.user?.jurisdictions || [];
  return (
    await pool.query(
      "SELECT id,jurisdiction,specialty,state,version,created_at,assigned_to FROM lvd_conversations WHERE jurisdiction=ANY($1) AND (state='queued' OR assigned_to=$2) ORDER BY created_at LIMIT 100",
      [countries, a.user!.id],
    )
  ).rows;
}
export async function createConversation(a: Actor, data: any) {
  if (!["VN", "DE"].includes(data.jurisdiction) || data.consent !== true)
    throw new HttpError(
      400,
      "Chọn quốc gia và đồng ý chuyển thông tin cho chuyên viên.",
    );
  const id = randomUUID();
  const result = await pool.query(
    "INSERT INTO lvd_conversations(id,user_id,guest_hash,jurisdiction,specialty,title) VALUES($1,$2,$3,$4,$5,'Cuộc trò chuyện mới') RETURNING id,state,version",
    [
      id,
      a.user?.id || null,
      a.user ? null : a.guestHash,
      data.jurisdiction,
      String(data.specialty || "general").slice(0, 100),
    ],
  );
  return result.rows[0];
}
export async function transcript(a: Actor, id: string, after = 0) {
  const { rows } = await pool.query(
    "SELECT * FROM lvd_conversations WHERE id=$1",
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
        },
        messages: [],
      };
    deny();
  }
  const staff = isStaff(a.user) && !customer(a, c);
  const messages = await pool.query(
    "SELECT id,role,body,internal,created_at FROM lvd_messages WHERE conversation_id=$1 AND id>$2 " +
      (staff ? "" : "AND internal=false ") +
      "ORDER BY id LIMIT 200",
    [id, after],
  );
  return {
    conversation: {
      id: c.id,
      title: c.title,
      jurisdiction: c.jurisdiction,
      state: c.state,
      version: c.version,
      assignedTo: c.assigned_to,
    },
    messages: messages.rows,
  };
}
export async function message(
  a: Actor,
  id: string,
  data: any,
  maxLength: number,
) {
  const body = String(data.body || "").trim(),
    key = String(data.key || "");
  if (!body || body.length > maxLength || !/^[\w-]{16,80}$/.test(key))
    throw new HttpError(400, "Tin nhắn hoặc mã gửi không hợp lệ.");
  return transaction(async (db) => {
    const c = (
      await db.query("SELECT * FROM lvd_conversations WHERE id=$1 FOR UPDATE", [
        id,
      ])
    ).rows[0];
    if (!c) throw new HttpError(404, "Không tìm thấy hội thoại.");
    if (!allowed(a, c)) deny();
    const own = customer(a, c),
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
      if (
        prior.actor_key !== actorKey ||
        prior.body !== body ||
        prior.internal !== internal
      )
        throw new HttpError(409, "Mã gửi đã dùng cho nội dung khác.");
      return { id: prior.id, duplicate: true };
    }
    if (c.state === "closed")
      throw new HttpError(409, "Hội thoại đã đóng. Hãy mở lại trước khi gửi.");
    if (
      !own &&
      (c.state !== "human" ||
        (c.assigned_to !== a.user?.id && a.user?.role !== "owner"))
    )
      throw new HttpError(409, "Cần nhận xử lý hội thoại trước khi trả lời.");
    const result = await db.query(
      "INSERT INTO lvd_messages(conversation_id,role,body,internal,actor_key,client_key) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
      [id, own ? "user" : "staff", body, internal, actorKey, key],
    );
    await db.query(
      "UPDATE lvd_conversations SET updated_at=clock_timestamp(),title=CASE WHEN title='Cuộc trò chuyện mới' THEN $2 ELSE title END WHERE id=$1",
      [id, body.slice(0, 75)],
    );
    return result.rows[0];
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
    const own = customer(a, c),
      staff = isStaff(a.user) && countryAllowed(a, c.jurisdiction);
    let state = c.state,
      assigned = c.assigned_to;
    if (data.action === "claim") {
      if (!staff) deny();
      if (c.state !== "queued")
        throw new HttpError(409, "Hội thoại đã được nhận.");
      state = "human";
      assigned = a.user!.id;
    } else if (data.action === "close") {
      if (!staff || (assigned !== a.user?.id && a.user?.role !== "owner"))
        deny();
      state = "closed";
    } else if (data.action === "reopen" || data.action === "handoff") {
      if (!own && !allowed(a, c)) deny();
      if (c.state === "human" && data.action === "handoff")
        return { state: c.state, version: c.version };
      state = "queued";
      assigned = null;
    } else throw new HttpError(400, "Thao tác không hợp lệ.");
    const r = await db.query(
      "UPDATE lvd_conversations SET state=$2,assigned_to=$3,version=version+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING state,version",
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
