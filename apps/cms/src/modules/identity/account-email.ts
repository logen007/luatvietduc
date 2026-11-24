export function accountEmail(kind:'verify'|'reset',token:string,context:Record<string,unknown>={}){
 const german=context.accountLanguage==='de',origin=process.env.APP_URL||'http://localhost:3000';
 const query=new URLSearchParams({mode:kind,token});
 if(typeof context.conversation==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(context.conversation))query.set('conversation',context.conversation);
 const url=origin+'/tai-khoan?'+query.toString();
 const title=kind==='verify'?(german?'E-Mail bestätigen':'Xác minh email'):(german?'Passwort zurücksetzen':'Đặt lại mật khẩu');
 const body=kind==='verify'?(german?'Bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren.':'Xác minh email để kích hoạt tài khoản của bạn.'):(german?'Über den folgenden Link können Sie ein neues Passwort festlegen.':'Mở liên kết bên dưới để đặt mật khẩu mới.');
 const ignore=german?'Wenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.':'Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.';
 return {subject:title+' — Luật Việt Đức',html:`<div style="font:16px/1.6 Arial,sans-serif;color:#111;max-width:520px;margin:32px auto"><h1 style="font-size:24px">${title}</h1><p>${body}</p><p><a href="${url.replaceAll('&','&amp;')}" style="display:inline-block;padding:12px 22px;background:#111;color:#fff;text-decoration:none;border-radius:6px">${title}</a></p><p style="color:#666;font-size:14px">${ignore}</p></div>`};
}
