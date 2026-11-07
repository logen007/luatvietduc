const states:Record<string,string>={register:'verification-email',resend:'verification-email',forgot:'reset-email',verify:'verified',reset:'password-reset'};

// HTTP success alone does not confirm that this account operation completed.
export function isAccountSuccess(action:string,value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const data=value as Record<string,unknown>;
 if(data.ok!==true)return false;
 if(action==='login')return typeof data.redirectTo==='string'&&data.redirectTo.length>0;
 return Object.hasOwn(states,action)&&data.state===states[action];
}
