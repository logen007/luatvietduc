import {getPayload} from 'payload';
import config from '../src/payload.config';
import {pool} from '../src/modules/shared/db';
import {testDialogueCampaign} from './test-dialogue-campaign';
const url=new URL(process.env.DATABASE_URL||'');
if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/lvd_test')throw new Error('Isolated test database only');
const payload=await getPayload({config});
const users:number[]=[];
try{
 const suffix=crypto.randomUUID();
 const owner=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:'Campaign owner',email:`campaign-owner-${suffix}@example.invalid`,password:crypto.randomUUID(),role:'owner'}});users.push(owner.id);
 const support=await payload.create({collection:'users',overrideAccess:false,user:owner,data:{name:'Campaign specialist',email:`campaign-staff-${suffix}@example.invalid`,password:crypto.randomUUID(),role:'support'}});users.push(support.id);
 await pool.query("DELETE FROM lvd_ai_usage WHERE day=current_date");
 await testDialogueCampaign(payload,owner,support);
}finally{
 for(const id of users)await payload.delete({collection:'users',id,overrideAccess:true});
 await payload.destroy();await pool.end();
}
