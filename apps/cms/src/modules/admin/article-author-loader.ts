export type ArticleAuthorRow={record_id:string;name:string|null};
type ReadAuthors=(ids:readonly string[])=>Promise<readonly ArticleAuthorRow[]>;
export const ARTICLE_AUTHOR_BATCH_SIZE=100;
// Only the first creation audit owns attribution, even if its actor was later
// removed. Later reviewers or editors must never become the displayed author.
export const articleAuthorsQuery=`SELECT DISTINCT ON (e.record_id) e.record_id,u.name
 FROM audit_events e LEFT JOIN users u ON u.id=e.actor_id
 WHERE e.action='articles.create' AND e.record_id=ANY($1::text[])
 ORDER BY e.record_id,e.created_at,e.id`;

/** Instantiate inside React's request cache; never share names across requests. */
export function createArticleAuthorLoader(readAuthors:ReadAuthors){
 const entries=new Map<string,{promise:Promise<string>;resolve:(name:string)=>void;reject:(error:unknown)=>void}>();
 const pending:string[]=[];let scheduled=false,running=false;
 function schedule(){
  if(scheduled||running)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;void flush();});
 }
 async function flush(){
  if(running)return;
  running=true;
  try{
   while(pending.length){
    const ids=pending.splice(0,ARTICLE_AUTHOR_BATCH_SIZE);
    try{
     const rows=await readAuthors(ids),names=new Map(rows.map(row=>[row.record_id,row.name||'']));
     for(const id of ids)entries.get(id)!.resolve(names.get(id)||'');
    }catch(error){for(const id of ids)entries.get(id)!.reject(error);}
   }
  }finally{running=false;if(pending.length)schedule();}
 }
 return {load(id:string):Promise<string>{
  const existing=entries.get(id);if(existing)return existing.promise;
  let resolve!:(name:string)=>void,reject!:(error:unknown)=>void;
  const promise=new Promise<string>((accept,decline)=>{resolve=accept;reject=decline;});
  entries.set(id,{promise,resolve,reject});pending.push(id);schedule();return promise;
 }};
}
