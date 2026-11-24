import { pool } from "../../../modules/shared/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await pool.query("SELECT (SELECT id FROM lvd_conversations LIMIT 1),(SELECT message_id FROM lvd_answer_jobs LIMIT 1)");
    return Response.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
