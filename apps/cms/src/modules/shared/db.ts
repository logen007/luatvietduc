import pg from "pg";
const shared = globalThis as unknown as { lvdPool?: pg.Pool };
export const pool = (shared.lvdPool ??= new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
}));
export async function transaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export const hash = async (value: string) => {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(value).digest("hex");
};
