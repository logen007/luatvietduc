import { getPayload } from "payload";
import config from "../src/payload.config";
import { randomBytes } from "node:crypto";
// Email-only provisioning for Google login. Random local password is never returned or logged.
const email = process.env.OWNER_EMAIL?.toLowerCase();
if (!email || !/@(gmail|googlemail)\.com$/.test(email))
  throw new Error("OWNER_EMAIL must be a Gmail address");
const payload = await getPayload({ config });
try {
  const count = await payload.count({
    collection: "users",
    overrideAccess: true,
  });
  if (count.totalDocs)
    throw new Error(
      "Refusing: users already exist. Owner must review accounts manually.",
    );
  await payload.create({
    collection: "users",
    overrideAccess: true,
    context: { bootstrapOwner: true },
    data: {
      email,
      name: "Chủ hệ thống",
      role: "owner",
      jurisdictions: ["VN", "DE"],
      password: randomBytes(48).toString("base64url"),
    },
  });
  console.log(
    "Owner provisioned for verified Google sign-in. No password exposed.",
  );
} finally {
  await payload.destroy();
}
