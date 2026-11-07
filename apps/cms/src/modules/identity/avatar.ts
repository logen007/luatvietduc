// Shared by the profile and account navigation. No email or storage key in URLs.
export function avatarURL(user:{id?:unknown;avatar?:unknown;updatedAt?:unknown}|null|undefined){
 if(!user?.avatar||!Number.isSafeInteger(Number(user.id))||Number(user.id)<1)return '';
 return '/service/profile/avatar/'+Number(user.id)+'?v='+encodeURIComponent(String(user.updatedAt||''));
}
