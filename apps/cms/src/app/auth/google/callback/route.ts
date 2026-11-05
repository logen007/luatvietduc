import {linkGuestConversations} from '../../../../modules/chat/guest-account';
import { activeValues } from "../../../../modules/integrations/store";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { randomBytes } from "node:crypto";
import { getPayload } from "payload";
import config from "@payload-config";
import { pool, hash } from "../../../../modules/shared/db";
import {createAppSession} from '../../../../modules/identity/app-sessions';
import {revokeBrowserSessions} from '../../../../modules/identity/logout';
import {setGoogleSession} from '../../../../modules/identity/session-cookies';
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
    const google = await activeValues("google");
    if (!google) return fail();
    const url = new URL(req.url),
      jar = await cookies(),
      cookie = jar.get("lvd-oauth")?.value;
    if (!cookie || !url.searchParams.get("code")) return fail();
    const { payload: flow } = await jwtVerify(
      cookie,
      new TextEncoder().encode(process.env.PAYLOAD_SECRET),
      { algorithms: ["HS256"] },
    );
    if (flow.clientId !== google.clientId || flow.state !== url.searchParams.get("state")) return fail();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: url.searchParams.get("code")!,
        client_id: google.clientId,
        client_secret: google.clientSecret,
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
      audience: google.clientId,
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
      // An unverified password signup must not retain a password chosen before
      // the verified Google owner first signs in with this email address.
      if(users.docs[0]&&(users.docs[0] as { _verified?:boolean })._verified===false){
        await payload.update({collection:'users',id:users.docs[0].id,overrideAccess:true,context:{googleVerified:true},data:{password:randomBytes(48).toString('base64url')}});
      }
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
    await revokeBrowserSessions(req,payload);
    const token=await createAppSession(Number(userId));
    const guest = jar.get("lvd-guest")?.value;
    if (guest&&/^[\w-]{43}$/.test(guest))await linkGuestConversations(Number(userId),await hash(guest));
    const requested=typeof flow.conversationId==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(flow.conversationId)?flow.conversationId:null;
    const ownsRequested=requested&&(await pool.query('SELECT id FROM lvd_conversations WHERE id=$1 AND user_id=$2',[requested,userId])).rowCount===1;
    const result = NextResponse.redirect(origin+(ownsRequested?'/tro-chuyen?conversation='+encodeURIComponent(requested!):'/tai-khoan'));
    setGoogleSession(result,token);
    return result;
  } catch {
    return fail();
  }
}
