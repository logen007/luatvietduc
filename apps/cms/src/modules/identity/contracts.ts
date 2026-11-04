// Public session response only. No cookie, vault value or private record belongs here.
export type PublicSession={
 user:{id:number;name?:string;role:string;jurisdictions?:('VN'|'DE')[]}|null;
 connections:{google:boolean;storage:boolean;email:boolean;ai:boolean;customerAI:boolean};
};
