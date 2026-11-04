export class ConnectionError extends Error{
 constructor(message:string,readonly status=0){super(message);this.name='ConnectionError';}
}
export async function requestConnection(data?:unknown){
 let response:Response;
 try{response=await fetch('/service/integrations',{method:data?'POST':'GET',cache:'no-store',headers:data?{'content-type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined});}
 catch{throw new ConnectionError('Chưa kết nối được. Kiểm tra mạng rồi thử lại.');}
 const body=await response.json().catch(()=>null);
 if(!response.ok)throw new ConnectionError(response.status===401?'Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục.':response.status===403?'Tài khoản chưa có quyền quản lý kết nối.':body?.error||'Dịch vụ đang gián đoạn. Vui lòng thử lại.',response.status);
 if(!body||(!data&&!Array.isArray(body.connections))||(data&&!body.connection))throw new ConnectionError('Chưa đọc được cấu hình. Vui lòng thử lại.');
 return body;
}
