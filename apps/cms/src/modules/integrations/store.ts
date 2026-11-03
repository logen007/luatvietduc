import { pool, transaction } from '../shared/db';
import { integrationCatalog, type Provider, type Values } from './catalog';
import { seal, unseal } from './crypto';
import { IntegrationError, mergeValues } from './validation';
type Row = { provider: Provider; encrypted_values: string; enabled: boolean; version: number; check_state: string; checked_at: string | null; updated_at: string };
const envValues = (p: Provider): Values => {
  const e = process.env;
  if (p === 'drive') return {clientId:'',clientSecret:'',ageRecipient:''};
  if (p === 'google') return { clientId: e.GOOGLE_CLIENT_ID || '', clientSecret: e.GOOGLE_CLIENT_SECRET || '' };
  if (p === 'ai') return { apiKey: e.GEMINI_API_KEY || '', model: e.GEMINI_MODEL || '' };
  if (p === 'r2') return { endpoint: e.R2_ENDPOINT || '', bucket: e.R2_BUCKET || '', accessKeyId: e.R2_ACCESS_KEY_ID || '', secretAccessKey: e.R2_SECRET_ACCESS_KEY || '' };
  return { apiKey: e.RESEND_API_KEY || '', fromAddress: e.EMAIL_FROM_ADDRESS || '', fromName: e.EMAIL_FROM_NAME || 'Luật Việt Đức' };
};
export async function readRow(provider: Provider): Promise<Row | null> {
  try { return (await pool.query('SELECT * FROM lvd_integrations WHERE provider=$1', [provider])).rows[0] || null; }
  catch (e) { if ((e as { code?: string }).code === '42P01') return null; throw e; }
}
export async function activeValues(provider: Provider): Promise<Values | null> {
  const row = await readRow(provider);
  if (row) return row.enabled ? unseal(provider, row.encrypted_values) : null;
  const values = envValues(provider);
  return integrationCatalog[provider].fields.every(f => values[f.key]) ? values : null;
}
export async function safeConnection(provider: Provider) {
  const row = await readRow(provider), values = row ? unseal(provider, row.encrypted_values) : envValues(provider);
  const fields: Values = {}, stored: Record<string, boolean> = {};
  for (const field of integrationCatalog[provider].fields) {
    if (field.secret) stored[field.key] = Boolean(values[field.key]);
    else fields[field.key] = values[field.key] || '';
  }
  return { provider, values: fields, stored, version: row?.version || 0,
    enabled: row ? row.enabled : Boolean(await activeValues(provider)),
    checkState: row?.check_state || 'untested', checkedAt: row?.checked_at || null,
    source: row ? 'admin' : 'environment' };
}
export async function saveConnection(provider: Provider, input: unknown, expected: number, actor: number) {
  return transaction(async db => {
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['lvd-integration:' + provider]);
    const row: Row | undefined = (await db.query('SELECT * FROM lvd_integrations WHERE provider=$1 FOR UPDATE', [provider])).rows[0];
    if (!Number.isInteger(expected) || (row?.version || 0) !== expected) throw new IntegrationError(409, 'Cấu hình đã thay đổi. Tải lại trước khi lưu.');
    const values = mergeValues(provider, row ? unseal(provider, row.encrypted_values) : envValues(provider), input);
    if (provider === 'r2') {
      const old = row ? unseal(provider, row.encrypted_values) : envValues(provider);
      if ((old.bucket && old.bucket !== values.bucket) || (old.endpoint && old.endpoint !== values.endpoint)) {
        if ((await db.query('SELECT 1 FROM media LIMIT 1')).rowCount) throw new IntegrationError(409, 'Đã có tệp. Cần chuyển dữ liệu trước khi đổi bucket hoặc endpoint; anh vẫn có thể thay khóa truy cập.');
      }
    }
    const version = expected + 1;
    // Saving a new revision pauses the connection until the owner tests and enables it.
    await db.query(`INSERT INTO lvd_integrations(provider,encrypted_values,version,updated_by) VALUES($1,$2,$3,$4)
      ON CONFLICT(provider) DO UPDATE SET encrypted_values=$2,version=$3,enabled=false,check_state='untested',checked_at=NULL,updated_by=$4,updated_at=now()`, [provider, seal(provider, values), version, actor]);
    await db.query('INSERT INTO lvd_integration_events(provider,action,actor_id,version) VALUES($1,$2,$3,$4)', [provider,'save',actor,version]);
    return { version };
  });
}
export async function storedValues(provider: Provider, expected: number) {
  const row = await readRow(provider);
  if (!row || row.version !== expected) throw new IntegrationError(409, 'Hãy lưu cấu hình và tải lại trước khi kiểm tra.');
  return { row, values: unseal(provider, row.encrypted_values) };
}
export async function markCheck(provider: Provider, version: number, state: string, actor: number) {
  return transaction(async db => {
    const result = await db.query('UPDATE lvd_integrations SET check_state=$3,checked_at=now() WHERE provider=$1 AND version=$2 RETURNING provider', [provider,version,state]);
    if (!result.rowCount) throw new IntegrationError(409, 'Cấu hình đã thay đổi trong lúc kiểm tra.');
    await db.query('INSERT INTO lvd_integration_events(provider,action,actor_id,version) VALUES($1,$2,$3,$4)', [provider,'test.'+state,actor,version]);
  });
}
export async function setEnabled(provider: Provider, version: number, enabled: boolean, actor: number) {
  return transaction(async db => {
    const row: Row | undefined = (await db.query('SELECT * FROM lvd_integrations WHERE provider=$1 FOR UPDATE', [provider])).rows[0];
    if (!row || row.version !== version) throw new IntegrationError(409, 'Cấu hình đã thay đổi. Tải lại trước khi tiếp tục.');
    if (enabled && !['passed','configured'].includes(row.check_state)) throw new IntegrationError(409, 'Kiểm tra cấu hình trước khi bật.');
    const next = version + 1;
    await db.query('UPDATE lvd_integrations SET enabled=$2,version=$3,updated_by=$4,updated_at=now() WHERE provider=$1', [provider,enabled,next,actor]);
    await db.query('INSERT INTO lvd_integration_events(provider,action,actor_id,version) VALUES($1,$2,$3,$4)', [provider,enabled?'enable':'disable',actor,next]);
  });
}
