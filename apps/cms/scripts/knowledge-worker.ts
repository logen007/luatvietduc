import {indexNext} from '../src/modules/rag/indexer';
import {pool} from '../src/modules/shared/db';
try{for(let i=0;i<3;i++){if(!await indexNext())break;}}catch{await pool.query("INSERT INTO lvd_rag_worker(id,state) VALUES(true,'index-unavailable') ON CONFLICT(id) DO UPDATE SET heartbeat_at=now(),state=EXCLUDED.state").catch(()=>{});console.error('Knowledge indexing temporarily unavailable');process.exitCode=1;}finally{await pool.end();}
