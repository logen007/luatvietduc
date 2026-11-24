// Legacy news was already public while its CMS mirror was deliberately imported
// as a draft. Only the unchanged mirror may retain that existing public copy.
// A new draft, edit, withdrawal, publication history or deletion must not fall back.
type Seed={title:string;body:string;kind:string;jurisdiction:string;sourceUrl?:string|null};
type Mirror={title:string;body?:string|null;kind?:string|null;jurisdiction:string;sourceUrl?:string|null;reviewState?:string|null;reviewedAt?:string|null;aiAllowed?:boolean|null;_status?:string|null};
export function keepsLegacyCopy(mirror:Mirror|undefined,seed:Seed|undefined){
 return Boolean(mirror&&seed&&mirror._status==='draft'&&mirror.reviewState==='draft'&&!mirror.reviewedAt&&!mirror.aiAllowed&&mirror.title===seed.title&&mirror.body===seed.body&&mirror.kind===seed.kind&&mirror.jurisdiction===seed.jurisdiction&&(mirror.sourceUrl||'')===(seed.sourceUrl||''));
}
