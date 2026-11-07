'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {Arrow,usePublicCopy} from './ui';

const services=[
 {label:['Giấy tờ','Dokumente'],photo:'library',items:[
  ['Ủy quyền và giao dịch','Vollmachten und Rechtsgeschäfte','hop-dong-giao-dich-dan-su','Tìm hiểu cách chuẩn bị giấy tờ khi bạn không thể trực tiếp giải quyết công việc.','Erfahren Sie, welche Unterlagen Sie benötigen, wenn Sie eine Angelegenheit nicht persönlich erledigen können.'],
  ['Cư trú tại Đức','Aufenthalt in Deutschland','xuat-nhap-canh-cu-tru','Làm rõ loại thủ tục, giấy tờ đang có và bước cần chuẩn bị tiếp theo.','Klären Sie Ihr Anliegen, vorhandene Unterlagen und die nächsten Vorbereitungsschritte.'],
  ['Quốc tịch và giấy tờ cá nhân','Staatsangehörigkeit und Ausweispapiere','quoc-tich','Tra cứu thông tin phù hợp với tình trạng quốc tịch và giấy tờ của bạn.','Finden Sie Informationen zu Ihrer Staatsangehörigkeit und Ihren Dokumenten.']]},
 {label:['Gia đình & tài sản','Familie & Vermögen'],photo:'family',items:[
  ['Hôn nhân và gia đình','Ehe und Familie','hon-nhan-gia-dinh','Trao đổi về hôn nhân, con cái và những việc cần thu xếp giữa Việt Nam và Đức.','Besprechen Sie Fragen zu Ehe, Kindern und familiären Angelegenheiten zwischen Vietnam und Deutschland.'],
  ['Thừa kế','Erbschaft','thua-ke','Bắt đầu từ tài sản, quan hệ gia đình và những giấy tờ đang có.','Beginnen Sie mit dem Nachlass, den Familienverhältnissen und den vorhandenen Unterlagen.'],
  ['Nhà ở và đất đai','Wohnen und Grundstücke','nha-o-dat-dai','Làm rõ việc mua bán, tặng cho hoặc quản lý nhà đất của bạn.','Klären Sie Fragen zum Kauf, zur Schenkung oder zur Verwaltung Ihrer Immobilie.']]},
 {label:['Công việc & kinh doanh','Arbeit & Unternehmen'],photo:'work',items:[
  ['Hợp đồng và công việc','Verträge und Arbeit','lao-dong-viec-lam-bhxh','Hiểu những điều cần lưu ý trong hợp đồng và quan hệ lao động.','Erfahren Sie, worauf es bei Verträgen und Arbeitsverhältnissen ankommt.'],
  ['Đầu tư và kinh doanh','Investitionen und Unternehmen','dau-tu-kinh-doanh-thuong-mai','Tìm hiểu các bước chuẩn bị cho hoạt động đầu tư, kinh doanh của bạn.','Informieren Sie sich über die Vorbereitung Ihrer Investition oder Geschäftstätigkeit.'],
  ['Thuế','Steuern','thue','Xác định vấn đề cần tìm hiểu từ hoạt động và hoàn cảnh thực tế của bạn.','Grenzen Sie Ihre Steuerfrage anhand Ihrer Tätigkeit und persönlichen Situation ein.']]},
] as const;

export function HomeServices(){
 const l=usePublicCopy(),id=useId(),root=useRef<HTMLElement>(null),[tab,setTab]=useState(0),[step,setStep]=useState(3),[moving,setMoving]=useState(false),[focused,setFocused]=useState(false),[visible,setVisible]=useState(false),[reduced,setReduced]=useState(true),buttons=useRef<(HTMLButtonElement|null)[]>([]),group=services[tab];
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)'),sync=()=>setReduced(media.matches);sync();media.addEventListener('change',sync);const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));if(root.current)observer.observe(root.current);return()=>{media.removeEventListener('change',sync);observer.disconnect();};},[]);
 useEffect(()=>{if(focused||!visible||reduced)return;const timer=window.setInterval(()=>{if(document.hidden)return;setMoving(true);setStep(index=>index+1);},3000);return()=>window.clearInterval(timer);},[focused,visible,reduced,tab,group.items.length]);
 function select(index:number){setTab(index);setStep(3);setMoving(false);}
 useEffect(()=>{if(step>=3&&step<6)return;const timer=window.setTimeout(()=>{setMoving(false);setStep(3+step%3);},800);return()=>window.clearTimeout(timer);},[step]);
 function settle(){if(step<3||step>=6){setMoving(false);setStep(3+step%3);}}
 return <section ref={root} className="container lvd-home-services" aria-labelledby={id+'-title'} onFocusCapture={event=>setFocused(Boolean((event.target as HTMLElement).closest('.lvd-service-wheel')))} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setFocused(false);}}>
  <header><h2 id={id+'-title'}>{l('Bạn đang cần hỗ trợ việc gì?','Wobei benötigen Sie Unterstützung?')}</h2>
   <div className="lvd-service-tab-scroll"><div className="lvd-service-tabs" role="tablist" aria-label={l('Nhu cầu hỗ trợ','Ihr Anliegen')}>{services.map((service,index)=><button ref={el=>{buttons.current[index]=el;}} key={index} id={id+'-tab-'+index} role="tab" type="button" aria-selected={tab===index} aria-controls={id+'-panel'} tabIndex={tab===index?0:-1} onClick={()=>select(index)} onKeyDown={event=>{const next=event.key==='ArrowRight'?(index+1)%services.length:event.key==='ArrowLeft'?(index+services.length-1)%services.length:event.key==='Home'?0:event.key==='End'?services.length-1:null;if(next!==null){event.preventDefault();select(next);buttons.current[next]?.focus();}}}>{l(service.label[0],service.label[1])}</button>)}</div></div>
  </header>
  <div id={id+'-panel'} role="tabpanel" aria-labelledby={id+'-tab-'+tab} className="lvd-service-wheel-panel">
   <div className="lvd-service-wheel" aria-label={l('Chọn nội dung','Thema auswählen')}>
    <div key={tab} className={'lvd-service-wheel-track'+(moving?' is-moving':'')} style={{transform:`translate3d(0, calc(${2-step} * var(--service-pitch)), 0)`}} onTransitionEnd={event=>{if(event.target===event.currentTarget&&event.propertyName==='transform')settle();}}>{Array.from({length:9},(_,index)=>{const entry=group.items[index%group.items.length],distance=Math.abs(index-step);return <div className="lvd-service-wheel-row" data-distance={distance} key={index} aria-hidden={distance>1} inert={distance>2}><button type="button" tabIndex={index===step?0:-1} onClick={()=>{setMoving(!reduced);setStep(reduced?3+index%3:index);}}><span className="lvd-service-row-label">{l(entry[0],entry[1])}</span></button></div>;})}</div>
    <div className="lvd-service-active-frame"><span aria-hidden="true">−</span><a className="button lvd-service-ask" href="/tro-chuyen">{l('Hỏi ngay','Jetzt fragen')}</a></div>
   </div>
  </div>
 </section>;
}

const benefits=[
 ['flag','Hiểu rõ trước khi quyết định','Klarheit vor Ihrer Entscheidung','Làm rõ giấy tờ, quyền lợi và những điểm cần cân nhắc trong trường hợp của bạn.','Klären Sie Unterlagen, Rechte und die Punkte, die in Ihrer Situation zu beachten sind.'],
 ['target','Có chuyên viên cùng tháo gỡ','Mit fachkundiger Unterstützung','Trao đổi trực tiếp, bổ sung hồ sơ và nhận hướng xử lý phù hợp ngay trong cuộc trò chuyện.','Besprechen Sie Ihr Anliegen, ergänzen Sie Unterlagen und erhalten Sie passende Handlungsmöglichkeiten direkt im Gespräch.'],
 ['folder','Mọi trao đổi, cùng một nơi','Alle Gespräche an einem Ort','Giữ câu hỏi, tài liệu và phản hồi trong tài khoản để tiếp tục khi cần.','Speichern Sie Fragen, Unterlagen und Antworten in Ihrem Konto, um bei Bedarf daran anzuknüpfen.'],
] as const;
export function HomeBenefits(){
 const l=usePublicCopy(),photos=['/media/benefits/clarity.webp','/media/benefits/specialist.webp','/media/benefits/records.webp'];
 return <section className="container lvd-home-benefits" aria-label={l('Đồng hành cùng bạn','An Ihrer Seite')}><div className="lvd-benefit-grid">{benefits.map(([icon,vi,de,description,descriptionDe],index)=><article className="lvd-benefit-card has-photo" key={icon}>
  <img src={photos[index]} alt="" width={1200} height={800} loading="lazy" decoding="async"/>
  <span className="lvd-benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon==='flag'?'M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0':icon==='target'?'M12 2v3m0 14v3M2 12h3m14 0h3M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0':'M3 7V4h7l2 3h9v13H3ZM3 10h18'}/></svg></span>
  <div className="lvd-benefit-copy"><h2>{l(vi,de)}</h2><p>{l(description,descriptionDe)}</p><a className="button lvd-benefit-action" href="/tro-chuyen">{l('Hỏi đáp ngay','Jetzt Frage stellen')}</a></div>
 </article>)}</div></section>;
}
