import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {up,down} from '../src/migrations/20261104_100000_three_user_roles';
export async function testThreeRoles(payload:Payload,owner:User){
 const url=new URL(process.env.DATABASE_URL||'');if(!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname!=='/lvd_test')throw new Error('Isolated test database only');
 const created:number[]=[],password=crypto.randomUUID(),args={db:payload.db.drizzle,payload} as Parameters<typeof up>[0];
 try{
 for(const role of ['operations','editor','reviewer','publisher','knowledge']){
  const account=await payload.create({collection:'users',overrideAccess:false,user:owner,data:{name:'Synthetic migration',email:`role-${crypto.randomUUID()}@example.invalid`,password,role:'support',jurisdictions:['VN']}});created.push(account.id);
 }
 await down(args);
 for(const [index,role] of ['operations','editor','reviewer','publisher','knowledge'].entries())await pool.query('UPDATE users SET role=$1 WHERE id=$2',[role,created[index]]);
 const before=(await pool.query('SELECT id,hash,salt FROM users WHERE id=ANY($1::int[]) ORDER BY id',[created])).rows;
 await up(args);
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM users WHERE id=ANY($1::int[]) AND role='support'",[created])).rows[0].n,5);
 assert.deepEqual((await pool.query('SELECT id,hash,salt FROM users WHERE id=ANY($1::int[]) ORDER BY id',[created])).rows,before,'Migration preserves password hashes and IDs');
 await assert.rejects(()=>pool.query("UPDATE users SET role='editor' WHERE id=$1",[created[0]]));
 const account=await payload.findByID({collection:'users',id:created[0],overrideAccess:true});assert.ok((await payload.login({collection:'users',data:{email:account.email,password}})).token,'Existing password still works');
 await pool.query("UPDATE users SET role='member',updated_at=clock_timestamp() WHERE id=$1",[created[1]]);
 await down(args);
 const restored=(await pool.query('SELECT id,role FROM users WHERE id=ANY($1::int[]) ORDER BY id',[created])).rows;
 assert.equal(restored[0].role,'operations');assert.equal(restored[1].role,'member','Rollback preserves subsequent administrator changes');assert.equal(restored[4].role,'knowledge');
 await up(args);
 await assert.rejects(()=>payload.update({collection:'users',overrideAccess:false,user:owner,id:created[0],data:{role:'editor' as never}}));
 console.log('Three-role checks passed: legacy mapping, unchanged passwords/IDs, login, SQL/API rejection of retired roles and guarded rollback');
 }finally{await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[created]);}
}
