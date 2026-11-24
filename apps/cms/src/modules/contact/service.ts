import {pool,hash} from '../shared/db';
import {activeValues} from '../integrations/store';
import {HttpError,rateLimit} from '../chat/service';
import {parseContact} from './input';
import {deliverContact} from './delivery';
export async function sendContact(input:unknown){
 const contact=parseContact(input),connection=await activeValues('email');
 if(!connection)throw new HttpError(503,'Email đang được thiết lập. Bạn có thể trao đổi qua trò chuyện trực tuyến.');
 const recipient=connection.contactTo||(await pool.query("SELECT email FROM users WHERE role='owner' ORDER BY id LIMIT 1")).rows[0]?.email;
 if(!recipient)throw new HttpError(503,'Kênh email tạm thời chưa sẵn sàng. Vui lòng dùng trò chuyện trực tuyến.');
 await rateLimit('contact-email:'+contact.email,3);
 await rateLimit('contact-global',10);
 // Bound the public form's daily email budget independently of visitor cookies.
 const budget=await pool.query("INSERT INTO lvd_rate_limits(key,window_start,count) VALUES($1,date_trunc('day',now()),1) ON CONFLICT(key,window_start) DO UPDATE SET count=lvd_rate_limits.count+1 WHERE lvd_rate_limits.count<60 RETURNING count",[await hash('contact-daily')]);
 if(!budget.rowCount)throw new HttpError(429,'Kênh email đang nhận nhiều liên hệ. Vui lòng dùng trò chuyện trực tuyến.');
 try{return await deliverContact(contact,connection,recipient);}
 catch{throw new HttpError(503,'Chưa xác nhận được việc gửi email. Vui lòng thử lại hoặc dùng trò chuyện trực tuyến.');}
}
