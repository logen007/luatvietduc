export type AccountRole='owner'|'support'|'member';
export type AccountPrincipal={role?:string|null;jurisdictions?:readonly string[]|null};
export const isAdmin=(user?:AccountPrincipal|null)=>user?.role==='owner';
export const isSpecialist=(user?:AccountPrincipal|null)=>user?.role==='support';
export const canEnterAdmin=(user?:AccountPrincipal|null)=>isAdmin(user)||isSpecialist(user);
export const canWriteContent=(user?:AccountPrincipal|null)=>canEnterAdmin(user);
