import assert from "node:assert/strict";
import { getPayload } from "payload";
import config from "../src/payload.config";
import { pool } from "../src/modules/shared/db";
const db = new URL(process.env.DATABASE_URL || ""),
  base = process.env.APP_URL || "http://localhost:3000";
if (
  !["localhost", "127.0.0.1"].includes(db.hostname) ||
  db.pathname !== "/lvd_test" ||
  !/^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(base)
)
  throw new Error("Local isolated HTTP test only");
const payload = await getPayload({ config });
try {
  const suffix = crypto.randomUUID(),
    password = crypto.randomUUID();
  const owner = await payload.create({
    collection: "users",
    overrideAccess: true,
    context: { bootstrapOwner: true },
    data: {
      name: "HTTP owner",
      email: `http-owner-${suffix}@example.invalid`,
      password,
      role: "owner",
    },
  });
  const staff = await payload.create({
    collection: "users",
    overrideAccess: false,
    user: owner,
    data: {
      name: "HTTP support",
      email: `http-support-${suffix}@example.invalid`,
      password,
      role: "support",
      jurisdictions: ["VN"],
    },
  });
  const login = await payload.login({
      collection: "users",
      data: { email: staff.email, password },
    }),
    staffHeaders = { authorization: `JWT ${login.token}` };
  const me = await fetch(base + "/service/me");
  assert.equal(me.status, 200);
  const cookie = me.headers.get("set-cookie")!.split(";")[0];
  const request = async (
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        origin: base,
        ...headers,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const create = await request(
    "/service/conversations",
    { jurisdiction: "VN", consent: true },
    { cookie },
  );
  assert.equal(create.status, 200);
  const c = await create.json();
  assert.equal((await request("/service/conversations/" + c.id)).status, 403);
  assert.equal(
    (
      await request(
        "/service/conversations/" + c.id + "/messages",
        { key: crypto.randomUUID(), body: "HTTP synthetic question" },
        { cookie },
      )
    ).status,
    200,
  );
  const queue = await (
    await request("/service/queue", undefined, staffHeaders)
  ).json();
  assert.ok(queue.some((r: any) => r.id === c.id));
  assert.ok(!("title" in queue[0]));
  const denied = await fetch(base + "/service/conversations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://attacker.invalid",
      cookie,
    },
    body: JSON.stringify({ jurisdiction: "VN", consent: true }),
  });
  assert.equal(denied.status, 403);
  assert.equal(
    (
      await request(
        "/service/conversations/" + c.id + "/transition",
        { action: "claim", version: 1 },
        staffHeaders,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "/service/conversations/" + c.id + "/messages",
        { body: "HTTP human reply", key: crypto.randomUUID() },
        staffHeaders,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await (
        await request("/service/conversations/" + c.id, undefined, { cookie })
      ).json()
    ).messages.length,
    2,
  );
  assert.equal(
    (await request("/service/knowledge-test", { id: 1 }, { cookie })).status,
    403,
  );
  for (const path of [
    "/",
    "/tro-chuyen",
    "/tai-khoan",
    "/chuyen-vien",
    "/bai-viet",
    "/admin/login",
    "/health/ready",
  ])
    assert.equal((await fetch(base + path)).status, 200, path);
  console.log(
    "HTTP checks passed: guest session, persistence, cross-session denial, redacted queue, CSRF rejection, claim and human reply, AI authorization, public/admin routes",
  );
} finally {
  await payload.destroy();
  await pool.end();
}
