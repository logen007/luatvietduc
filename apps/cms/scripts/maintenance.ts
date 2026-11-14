import { pool } from "../src/modules/shared/db";
try {
  await pool.query("DELETE FROM lvd_sessions WHERE expires_at<now()");
  await pool.query(
    "DELETE FROM lvd_rate_limits WHERE window_start<now()-interval '1 day'",
  );
  console.log(
    "Expired sessions and rate counters cleaned; no customer conversations deleted.",
  );
} finally {
  await pool.end();
}
