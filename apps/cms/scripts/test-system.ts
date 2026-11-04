import assert from "node:assert/strict";
import { getPayload, type PayloadRequest } from "payload";
import config from "../src/payload.config";
import { pool } from "../src/modules/shared/db";
import * as chat from "../src/modules/chat/service";
import * as integrations from "../src/modules/integrations/store";
import {seal} from '../src/modules/integrations/crypto';
import {mediaWriteGuard} from '../src/modules/backup/media-lock';
import {GET as readKnowledgeSource} from '../src/app/service/knowledge-source/[token]/route';
import {writeKnowledgeArticle,knowledgeArticles} from '../src/modules/knowledge/articles';
import {testSharedKnowledge} from './test-shared-knowledge';
import {testEditorial} from './test-editorial';
import {testRag} from './test-rag';
import {testAssistant} from './test-assistant';
const url = new URL(process.env.DATABASE_URL || "");
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.pathname !== "/lvd_test"
)
  throw new Error("Isolated test database only");
const payload = await getPayload({ config });
try {
  const password = crypto.randomUUID(),
    suffix = crypto.randomUUID();
  const owner = await payload.create({
    collection: "users",
    overrideAccess: true,
    context: { bootstrapOwner: true },
    data: {
      name: "System test owner",
      email: `sys-${suffix}@example.invalid`,
      password,
      role: "owner",
    },
  });
  // Vault tests run only in the isolated CI database; no provider request is made.
  await integrations.saveConnection('ai', {apiKey:'synthetic-secret-not-a-real-key',model:'test-model'}, 0, owner.id);
  const safe = await integrations.safeConnection('ai');
  assert.equal(safe.values.apiKey, undefined);
  assert.equal(safe.stored.apiKey, true);
  assert.equal(safe.enabled, false);
  const raw = (await pool.query("SELECT encrypted_values FROM lvd_integrations WHERE provider='ai'")).rows[0].encrypted_values;
  assert.ok(!raw.includes('synthetic-secret-not-a-real-key'));
  await assert.rejects(() => integrations.setEnabled('ai',1,true,owner.id), /Kiểm tra/);
  await integrations.markCheck('ai',1,'passed',owner.id);
  await integrations.setEnabled('ai',1,true,owner.id);
  assert.equal((await integrations.activeValues('ai'))?.apiKey,'synthetic-secret-not-a-real-key');
  await assert.rejects(() => integrations.saveConnection('ai',{apiKey:'',model:'test-model'},1,owner.id), /thay đổi/);
  await integrations.saveConnection('ai',{apiKey:'',model:'changed-model'},2,owner.id);
  assert.equal(await integrations.activeValues('ai'),null);
  await assert.rejects(() => integrations.markCheck('ai',2,'passed',owner.id), /thay đổi/);
  const parallel = await Promise.allSettled([
    integrations.saveConnection('ai',{apiKey:'',model:'concurrent-one'},3,owner.id),
    integrations.saveConnection('ai',{apiKey:'',model:'concurrent-two'},3,owner.id),
  ]);
  assert.equal(parallel.filter(result=>result.status==='fulfilled').length,1);
  await pool.query("DELETE FROM lvd_integration_events WHERE provider='ai'");
  await pool.query("DELETE FROM lvd_integrations WHERE provider='ai'");
  await integrations.saveConnection('drive',{clientId:'synthetic.apps.googleusercontent.com',clientSecret:'synthetic-secret',ageRecipient:'age1'+'a'.repeat(58)},0,owner.id);
  await pool.query("UPDATE lvd_integrations SET encrypted_values=$1 WHERE provider='drive'",[seal('drive',{clientId:'synthetic.apps.googleusercontent.com',clientSecret:'synthetic-secret',ageRecipient:'age1'+'a'.repeat(58),refreshToken:'synthetic-refresh-token',folderId:'synthetic-folder'})]);
  const safeDrive=JSON.stringify(await integrations.safeConnection('drive'));
  assert.ok(!safeDrive.includes('synthetic-secret')&&!safeDrive.includes('synthetic-refresh-token')&&!safeDrive.includes('synthetic-folder'));
  await integrations.saveConnection('drive',{clientId:'synthetic.apps.googleusercontent.com',clientSecret:'',ageRecipient:'age1'+'a'.repeat(58)},1,owner.id);
  assert.ok(!(await integrations.storedValues('drive',2)).values.refreshToken,'Changing Drive settings revokes app-side saved authorization');
  await pool.query("DELETE FROM lvd_integration_events WHERE provider='drive'");
  await pool.query("DELETE FROM lvd_integrations WHERE provider='drive'");
  const backupJobs=await Promise.allSettled([1,2].map(()=>pool.query("INSERT INTO lvd_backup_jobs(id,kind,requested_by) VALUES($1,'backup',$2)",[crypto.randomUUID(),owner.id])));
  assert.equal(backupJobs.filter(r=>r.status==='fulfilled').length,1,'Only one backup/restore job may be active');
  await pool.query('DELETE FROM lvd_backup_jobs WHERE requested_by=$1',[owner.id]);
  await pool.query("UPDATE lvd_backup_runtime SET media_locked_until=now()+interval '1 minute' WHERE id=1");
  const mediaTransaction=await payload.db.beginTransaction();assert.ok(mediaTransaction);
  try{await assert.rejects(()=>mediaWriteGuard({req:{payload,transactionID:mediaTransaction} as unknown as PayloadRequest}),/Đang sao lưu/);}
  finally{await payload.db.rollbackTransaction(mediaTransaction);await pool.query('UPDATE lvd_backup_runtime SET media_locked_until=NULL WHERE id=1');}
  const staff = await payload.create({
    collection: "users",
    overrideAccess: false,
    user: owner,
    data: {
      name: "Support VN",
      email: `support-${suffix}@example.invalid`,
      password,
      role: "support",
      jurisdictions: ["VN"],
    },
  });
  const other = await payload.create({
    collection: "users",
    overrideAccess: false,
    user: owner,
    data: {
      name: "Support VN 2",
      email: `support2-${suffix}@example.invalid`,
      password,
      role: "support",
      jurisdictions: ["VN"],
    },
  });
  const foreign = await payload.create({
    collection: "users",
    overrideAccess: false,
    user: owner,
    data: {
      name: "Support DE",
      email: `de-${suffix}@example.invalid`,
      password,
      role: "support",
      jurisdictions: ["DE"],
    },
  });
  const guest = { user: null, guestHash: crypto.randomUUID() },
    stranger = { user: null, guestHash: crypto.randomUUID() },
    agent = { user: staff, guestHash: "" },
    agent2 = { user: other, guestHash: "" };
  const c = await chat.createConversation(guest, {
    jurisdiction: "VN",
    consent: true,
  });
  await assert.rejects(() => chat.transcript(stranger, c.id), /quyền/);
  await assert.rejects(
    () =>
      chat.transition({ user: foreign, guestHash: "" }, c.id, {
        action: "claim",
        version: 1,
      }),
    /quyền/,
  );
  const key = crypto.randomUUID();
  await Promise.all([
    chat.message(guest, c.id, { body: "Synthetic question", key }, 2000),
    chat.message(guest, c.id, { body: "Synthetic question", key }, 2000),
  ]);
  assert.equal((await chat.transcript(guest, c.id)).messages.length, 1);
  assert.equal(
    (await chat.transcript(agent, c.id)).messages.length,
    0,
    "Queue must not expose transcript",
  );
  const claims = await Promise.allSettled([
    chat.transition(agent, c.id, { action: "claim", version: 1 }),
    chat.transition(agent2, c.id, { action: "claim", version: 1 }),
  ]);
  assert.equal(claims.filter((x) => x.status === "fulfilled").length, 1);
  const row = (
      await pool.query(
        "SELECT assigned_to FROM lvd_conversations WHERE id=$1",
        [c.id],
      )
    ).rows[0],
    winner = row.assigned_to === staff.id ? agent : agent2,
    loser = row.assigned_to === staff.id ? agent2 : agent;
  await assert.rejects(() => chat.transcript(loser, c.id), /quyền/);
  await chat.message(
    winner,
    c.id,
    { body: "Internal note", internal: true, key: crypto.randomUUID() },
    2000,
  );
  await chat.message(
    winner,
    c.id,
    { body: "Public response", key: crypto.randomUUID() },
    2000,
  );
  assert.equal(
    (await chat.transcript(guest, c.id)).messages.length,
    2,
    "Internal note stays private",
  );
  assert.equal((await chat.transcript(winner, c.id)).messages.length, 3);
  await chat.transition(winner, c.id, { action: "close", version: 2 });
  await assert.rejects(
    () =>
      chat.message(
        guest,
        c.id,
        { body: "Closed", key: crypto.randomUUID() },
        2000,
      ),
    /đã đóng/,
  );
  await chat.transition(guest, c.id, { action: "reopen", version: 3 });
  assert.equal(
    (await chat.transcript(guest, c.id)).conversation.state,
    "queued",
  );
  console.log(
    "System database checks passed: guest isolation, country scope, idempotent send, concurrent claim, assignment privacy, internal notes, close and reopen",
  );
  const imported=await writeKnowledgeArticle(payload,staff,{title:'Synthetic simple article',body:'Synthetic public content only.',publish:true});
  assert.equal(imported.approved,true);assert.equal(imported.jurisdiction,'BOTH');assert.ok(imported.sourceUrl.includes('/service/knowledge-source/'));assert.ok(new Date(imported.reviewDueAt)>new Date());
  const token=imported.sourceUrl.split('/').at(-1)!;
  const publicSource=await readKnowledgeSource(new Request(imported.sourceUrl),{params:Promise.resolve({token})});assert.equal(publicSource.status,200);assert.equal((await publicSource.json()).body,imported.body);
  const sharedDocument=await knowledgeArticles(payload,foreign,String(imported.id));assert.ok('id' in sharedDocument);assert.equal(sharedDocument.id,imported.id,'Shared knowledge is available to both assigned country teams');
  await assert.rejects(()=>writeKnowledgeArticle(payload,staff,{id:imported.id,updatedAt:'2000-01-01',title:'Stale edit',body:'Synthetic',publish:true}),/đã thay đổi/);
  const draft=await writeKnowledgeArticle(payload,staff,{id:imported.id,updatedAt:imported.updatedAt,title:imported.title,body:imported.body,publish:false});assert.equal(draft._status,'draft');assert.equal(draft.approved,false);
  assert.equal((await readKnowledgeSource(new Request(imported.sourceUrl),{params:Promise.resolve({token})})).status,404,'Draft or withdrawn article cannot remain a public source');
  await testEditorial(payload,owner,staff);
  await testAssistant(payload,owner,staff);
  await testRag(payload,owner,staff);
  await testSharedKnowledge(staff,foreign);
} finally {
  await payload.destroy();
  await pool.end();
}
