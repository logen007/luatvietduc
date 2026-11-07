'use client';
import {AppLink} from '../shared/AppLink';
import {Arrow,usePublicCopy} from './ui';
export function PublicNotice({retry}:{retry?:()=>void}){
 const l=usePublicCopy();
 return <div className="container page native-notice"><header className="page-heading"><p className="live-eyebrow">{retry?l('Tạm thời gián đoạn','Vorübergehend nicht verfügbar'):'404'}</p><h1>{retry?l('Chưa tải được trang.','Die Seite konnte nicht geladen werden.'):l('Không tìm thấy trang.','Diese Seite wurde nicht gefunden.')}</h1><p>{retry?l('Bạn có thể thử tải lại hoặc trở về trang chủ.','Versuchen Sie es erneut oder gehen Sie zur Startseite.'):l('Đường dẫn có thể đã thay đổi. Bạn có thể tiếp tục từ thư viện hoặc trang chủ.','Die Adresse hat sich möglicherweise geändert. Besuchen Sie die Bibliothek oder die Startseite.')}</p></header><div className="button-row">{retry&&<button type="button" className="button" onClick={retry}>{l('Thử lại','Erneut versuchen')} <Arrow/></button>}<AppLink className="button" href={retry?'/':'/thu-vien'}>{retry?l('Về trang chủ','Zur Startseite'):l('Mở thư viện','Zur Bibliothek')} <Arrow/></AppLink>{!retry&&<AppLink className="button secondary" href="/">{l('Về trang chủ','Zur Startseite')}</AppLink>}</div></div>;
}
