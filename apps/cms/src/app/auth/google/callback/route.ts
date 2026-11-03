import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { randomBytes } from "node:crypto";
import { getPayload } from "payload";
import config from "@payload-config";
import { pool, hash, transaction } from "../../../../modules/shared/db";
const keys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
export async function GET(req: Request) {
  const origin = process.env.APP_URL || "http://localhost:3000";
  const fail = () => {
    const r = NextResponse.redirect(
      origin + "/tai-khoan?error=google-login-failed",
    );
    r.cookies.delete({ name: "lvd-oauth", path: "/auth/google" });
    return r;
  };
  try {
    const url = new URL(req.url),
      jar = await cookies(),
      cookie = jar.get("lvd-oauth")?.value;
    if (!cookie || !url.searchParams.get("code")) return fail();
    const { payload: flow } = await jwtVerify(
      cookie,
      new TextEncoder().encode(process.env.PAYLOAD_SECRET),
      { algorithms: ["HS256"] },
    );
    if (flow.state !== url.searchParams.get("state")) return fail();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: url.searchParams.get("code")!,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: origin + "/auth/google/callback",
        grant_type: "authorization_code",
        code_verifier: String(flow.verifier),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return fail();
    const tokens = await response.json();
    const { payload: identity } = await jwtVerify(tokens.id_token, keys, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: process.env.GOOGLE_CLIENT_ID,
      algorithms: ["RS256"],
    });
    const email = String(identity.email || "").toLowerCase();
    if (
      identity.nonce !== flow.nonce ||
      identity.email_verified !== true ||
      !identity.sub ||
      !/@(gmail|googlemail)\.com$/.test(email)
    )
      return fail();
    const payload = await getPayload({ config });
    const existing = await pool.query(
      "SELECT user_id FROM lvd_google_identities WHERE subject=$1",
      [identity.sub],
    );
    let userId = existing.rows[0]?.user_id;
    if (!userId) {
      const users = await payload.find({
        collection: "users",
        where: { email: { equals: email } },
        overrideAccess: true,
        limit: 1,
      });
      const user =
        users.docs[0] ||
        (await payload.create({
          collection: "users",
          overrideAccess: true,
          context: { googleMember: true },
          data: {
            name: String(identity.name || email).slice(0, 100),
            email,
            password: randomBytes(48).toString("base64url"),
            role: "member",
          },
        }));
      const linked = await pool.query(
        "INSERT INTO lvd_google_identities(subject,user_id) VALUES($1,$2) ON CONFLICT(subject) DO UPDATE SET subject=EXCLUDED.subject RETURNING user_id",
        [identity.sub, user.id],
      );
      userId = linked.rows[0].user_id;
    }
    const token = randomBytes(32).toString("base64url");
    await pool.query(
      "INSERT INTO lvd_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
      [await hash(token), userId],
    );
    const guest = jar.get("lvd-guest")?.value;
    if (guest)
      await transaction(async (client) => {
        await client.query(
          "UPDATE lvd_conversations SET user_id=$1, guest_hash=NULL WHERE guest_hash=$2 AND user_id IS NULL",
          [userId, await hash(guest)],
        );
      });
    const result = NextResponse.redirect(origin + "/tai-khoan");
    result.cookies.set("lvd-session", token, {
      httpOnly: true,
      secure: origin.startsWith("https:"),
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    });
    result.cookies.delete({ name: "lvd-oauth", path: "/auth/google" });
    return result;
  } catch {
    return fail();
  }
}
