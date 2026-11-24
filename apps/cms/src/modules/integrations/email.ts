import type { EmailAdapter } from 'payload';
import { activeValues } from './store';
import { validateValues } from './validation';
export const runtimeEmail: EmailAdapter = () => ({
  name:'admin-resend', defaultFromAddress:'no-reply@luatvietduc.com', defaultFromName:'Luật Việt Đức',
  sendEmail:async message => {
    const v=await activeValues('email');
    if(!v)throw new Error('Email not configured');
    validateValues('email',v);
    const recipients=Array.isArray(message.to)?message.to:[message.to];
    const to=recipients.filter(Boolean).map(item=>typeof item==='string'?item:(item as {address:string}).address);
    if(!to.length || message.attachments?.length || (message.html && typeof message.html!=='string') || (message.text && typeof message.text!=='string'))throw new Error('Unsupported email format');
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+v.apiKey,'content-type':'application/json'},
      body:JSON.stringify({from:`${v.fromName} <${v.fromAddress}>`,to,subject:message.subject||'',html:message.html||undefined,text:message.text||undefined}),
      redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Email provider rejected message');
    return response.json();
  },
});
