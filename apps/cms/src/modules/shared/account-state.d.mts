export type SessionUser={id:number|string;name?:string;role?:string;jurisdictions?:string[]};
export type SessionData={user:SessionUser|null};
export type SessionSnapshot<T extends SessionData=SessionData>={status:'loading'|'ready'|'error';user:SessionUser|null;data:T|null;revision:number;failureStatus?:number|null};
export function accountView(session:SessionSnapshot,language?:string):{href:string;label:string;management:{href:string;label:string}|null};
export function createSessionStore<T extends SessionData>(request:()=>Promise<T>,now?:()=>number):{getSnapshot:()=>SessionSnapshot<T>;subscribe:(listener:()=>void)=>()=>void;refresh:(force?:boolean)=>Promise<T>;invalidate:()=>void;isCurrent:(revision:number)=>boolean};
