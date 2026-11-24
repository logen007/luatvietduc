import type {PayloadRequest} from 'payload';
type TransactionDB={execute:(query:unknown)=>Promise<{rows:Record<string,unknown>[]}>};
export async function payloadTransaction(req:PayloadRequest):Promise<TransactionDB>{
 if(!req.transactionID)throw new Error('Payload transaction required');
 const id=await req.transactionID;
 const db=(req.payload.db as unknown as {sessions:Record<string,{db:TransactionDB}>}).sessions[String(id)]?.db;
 if(!db)throw new Error('Payload transaction unavailable');
 return db;
}
