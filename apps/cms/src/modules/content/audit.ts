import type {
  CollectionConfig,
  CollectionBeforeChangeHook,
  CollectionAfterChangeHook,
} from "payload";
import { sql } from "@payloadcms/db-postgres";
import { owner } from "../shared/access";
export const Audit: CollectionConfig = {
  slug: "audit-events",labels:{singular:"Sự kiện",plural:"Nhật ký thay đổi"},
  admin: { group: "Vận hành", useAsTitle: "action" },
  access: {
    create: () => false,
    read: owner,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: "action", type: "text", required: true },
    { name: "recordId", type: "text", required: true },
    { name: "actor", type: "relationship", relationTo: "users" },
    { name: "details", type: "json" },
  ],
};
// Lock inside the same Payload transaction, then reject a document read before a concurrent commit.
export const articleLock: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  collection,
}) => {
  if (originalDoc?.id) {
    if (!req.transactionID) throw new Error("Editorial transaction required");
    const id = await req.transactionID;
    const adapter = req.payload.db as unknown as {
      sessions: Record<
        string,
        {
          db: {
            execute: (
              query: unknown,
            ) => Promise<{ rows: Record<string, unknown>[] }>;
          };
        }
      >;
    };
    const tx = adapter.sessions[String(id)]?.db;
    if (!tx) throw new Error("Editorial transaction unavailable");
    const table = collection.slug === "knowledge" ? "knowledge" : "articles";
    const result = await tx.execute(
      sql`SELECT updated_at FROM ${sql.identifier(table)} WHERE id=${originalDoc.id} FOR UPDATE`,
    );
    const timestamp = result.rows[0]?.updated_at;
    if (
      !timestamp ||
      (timestamp instanceof Date
        ? timestamp.getTime()
        : new Date(String(timestamp)).getTime()) !==
        new Date(originalDoc.updatedAt).getTime()
    )
      throw new Error("Article changed concurrently. Reload before saving.");
  }
  return data;
};
export const auditArticle: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
  collection,
}) => {
  await req.payload.create({
    collection: "audit-events",
    req,
    overrideAccess: true,
    data: {
      action: `${collection.slug}.${operation}`,
      recordId: String(doc.id),
      actor: req.user?.id,
      details: {
        reviewState: doc.reviewState,
        status: doc._status,
        previousReview: previousDoc?.reviewState,
        previousStatus: previousDoc?._status,
      },
    },
  });
  return doc;
};
