export type SessionUser={id:number|string;name?:string;role?:string};
export type SessionSnapshot={status:'loading'|'ready'|'error';user:SessionUser|null;data:any};
export function accountView(session:SessionSnapshot,language?:string):{href:string;label:string;management:{href:string;label:string}|null};
export function createSessionStore(request:()=>Promise<any>,now?:()=>number):{getSnapshot:()=>SessionSnapshot;subscribe:(listener:()=>void)=>()=>void;refresh:(force?:boolean)=>Promise<any>;invalidate:()=>void};
