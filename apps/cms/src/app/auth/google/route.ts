import { activeValues } from "../../../modules/integrations/store";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
export async function GET() {
  const google = await activeValues("google");
  if (!google)
    return NextResponse.redirect(
      new URL(
        "/tai-khoan?error=google-not-configured",
        process.env.APP_URL || "http://localhost:3000",
      ),
    );
  const origin = process.env.APP_URL || "http://localhost:3000",
    state = randomBytes(32).toString("base64url"),
    nonce = randomBytes(32).toString("base64url"),
    verifier = randomBytes(32).toString("base64url");
  const { createHash } = await import("node:crypto");
  const token = await new SignJWT({ state, nonce, verifier, clientId: google.clientId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(process.env.PAYLOAD_SECRET));
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  Object.entries({
    client_id: google.clientId,
    redirect_uri: origin + "/auth/google/callback",
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = NextResponse.redirect(url);
  response.cookies.set("lvd-oauth", token, {
    httpOnly: true,
    secure: origin.startsWith("https:"),
    sameSite: "lax",
    path: "/auth/google",
    maxAge: 600,
  });
  return response;
}
