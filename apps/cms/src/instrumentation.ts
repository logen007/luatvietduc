export async function register(){
 if(process.env.NEXT_RUNTIME==='nodejs'&&process.env.NODE_ENV==='production'&&process.env.NEXT_PHASE!=='phase-production-build'&&process.env.LVD_WORKERS_DISABLED!=='1'){
  const {startAnswerWorker}=await import('./modules/assistant/worker');
  startAnswerWorker();
 }
}
