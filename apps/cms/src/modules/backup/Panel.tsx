"use client";
import {AppLink} from '../shared/AppLink';
import {useEffect,useState} from 'react';
import {IntegrationPanel} from '../integrations/Panel';
import {useBackups} from './useBackups';
import {driveOAuthMessage} from './oauth-result';
export function BackupPanel(){
 const {status,loading,busy,active,loadError,error,message,selected,setSelected,identity,setIdentity,run,reload,session,owner}=useBackups();
 const [oauthError,setOAuthError]=useState<string|null>(null);
 useEffect(()=>{const params=new URL(window.location.href).searchParams;setOAuthError(params.get('error')==='save-config-first'?driveOAuthMessage('failed','setup'):driveOAuthMessage(params.get('drive'),params.get('reason')));},[]);
 if(session.status==='error')return <div role="alert"><p>Chưa kiểm tra được phiên đăng nhập.</p><button type="button" onClick={()=>void reload()}>Thử lại</button></div>;
 if(session.status==='loading')return <p role="status">Đang kiểm tra phiên đăng nhập…</p>;
 if(!owner)return <p role="alert">Chỉ quản trị viên được quản lý sao lưu. <AppLink href="/admin/login">Đăng nhập lại</AppLink></p>;
 const disabled=busy||active||loading||Boolean(loadError)||!status?.runtime?.ready||!status?.drive?.enabled;
 return <div className="backup-panel">
  <p>Tự động sao lưu lúc 03:00 hằng ngày (giờ Việt Nam). Giữ 7 bản hằng ngày và 1 bản lưu theo tháng trên Google Drive. Bản sao được mã hóa trước khi gửi.</p>
  <IntegrationPanel providers={['drive']}/>
  <section className="lvd-admin-card"><h2>Kết nối tài khoản Drive</h2><p>Thêm redirect URI dưới đây vào OAuth Client dành riêng cho sao lưu:</p><code className="lvd-wrap-code">https://luatvietduc.com/service/backups/google/callback</code><p>Khóa age công khai dùng để mã hóa. Giữ khóa age bí mật ở nơi an toàn ngoài máy chủ; cần khóa này để khôi phục.</p>
   <AppLink className="lvd-admin-action" href="/service/backups/google/start">Kết nối Google Drive</AppLink> <button type="button" disabled={busy} onClick={()=>void reload()}>Làm mới trạng thái</button>
   {oauthError&&<p role="alert" className="lvd-admin-error">{oauthError}</p>}
   {loading?<p role="status">Đang tải trạng thái sao lưu…</p>:status&&!loadError&&<p>{status.authorized?'Đã cấp quyền Drive. Kiểm tra và bật kết nối ở trên.':'Chưa cấp quyền Drive.'} · {status.runtime?.ready?'Tiến trình sao lưu sẵn sàng.':'Tiến trình sao lưu chưa sẵn sàng.'}</p>}
   {loadError&&<p role="alert" className="lvd-admin-error">{loadError} <button type="button" onClick={()=>void reload()}>Thử lại</button></p>}
  </section>
  <section className="lvd-admin-card"><h2>Sao lưu ngay</h2><p>Gồm cơ sở dữ liệu, tệp R2 nếu có và cấu hình phục hồi riêng của website. Không chứa dữ liệu dịch vụ khác trên VPS.</p><button type="button" disabled={disabled} onClick={()=>void run('backup')}>{busy?'Đang gửi yêu cầu…':active?'Đã có tác vụ đang xử lý':'Tạo bản sao lưu'}</button></section>
  {error&&<p role="alert" className="lvd-admin-error">{error}</p>}{message&&<p role="status">{message}</p>}
  <section className="lvd-admin-card"><h2>Lịch sử</h2><div className="lvd-admin-table-scroll"><table><thead><tr><th>Thời điểm</th><th>Tác vụ</th><th>Trạng thái</th><th>Kết quả</th></tr></thead><tbody>{status?.jobs.map(j=><tr key={j.id}><td>{new Date(j.created_at).toLocaleString('vi-VN')}</td><td>{j.kind==='backup'?'Sao lưu':'Kiểm tra khôi phục'}</td><td>{({queued:'Chờ xử lý',running:'Đang chạy',complete:'Hoàn tất',failed:'Chưa đạt'} as Record<string,string>)[j.state]}</td><td>{j.message||'—'}</td></tr>)}</tbody></table></div>{status&&!loading&&!loadError&&!status.jobs.length&&<p>Chưa có tác vụ.</p>}</section>
  <section className="lvd-admin-card"><h2>Kiểm tra khôi phục</h2><p>Tải bản sao từ Drive, đối chiếu mã kiểm tra, giải mã và thử phục hồi trong môi trường riêng. Bước này không thay dữ liệu đang chạy.</p>
   <label>Bản sao<select disabled={disabled} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Chọn bản sao đã kiểm tra trên Drive</option>{status?.snapshots.map(s=><option key={s.id} value={s.id}>{new Date(s.created_at).toLocaleString('vi-VN')} · {Math.round(Number(s.bytes)/1024/1024)} MB{s.restore_tested_at?' · đã thử khôi phục':''}</option>)}</select></label>
   <label>Khóa age khôi phục — chỉ dùng cho lượt thử này<input disabled={disabled} type="password" autoComplete="new-password" value={identity} onChange={e=>setIdentity(e.target.value)} placeholder="AGE-SECRET-KEY-1…"/></label>
   <button type="button" disabled={disabled||!selected||!identity} onClick={()=>void run('restore-test')}>Kiểm tra ở môi trường riêng</button>
   <p>Muốn thay dữ liệu đang chạy: cần bản thử khôi phục đạt, sao lưu hiện trạng và một lượt xác nhận riêng. Không tự ghi đè website từ trang này.</p>
  </section>
 </div>;
}
