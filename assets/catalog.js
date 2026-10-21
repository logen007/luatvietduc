'use strict';
/* A topic catalogue is not a reviewed answer bank. Source titles stay verbatim. */
(() => {
 const S=window.LVD_CATALOG_SOURCE;
 if(!S) return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/\s+/g,' ').trim();
 const url=(path,p={})=>{const q=new URLSearchParams(Object.entries(p).filter(([,v])=>v!==''&&v!=null));return '#'+path+(q.size?'?'+q:'');};
 const arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>';
 const searchIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
 const groupAliases={'gia-dinh':'hon-nhan-gia-dinh','lao-dong':'lao-dong-viec-lam-bhxh','cu-tru':'xuat-nhap-canh-cu-tru','nha-dat':'nha-o-dat-dai','dau-tu':'dau-tu-kinh-doanh-thuong-mai','ngan-hang':'tai-chinh-ngan-hang-bao-hiem','hanh-chinh':'to-tung-hanh-chinh'};
 const articleAliases={
  'uy-quyen-quan-ly-nha':'nha-o-dat-dai-14','nhan-thua-ke-tai-viet-nam':'thua-ke-13',
  'kiem-tra-giay-to-mua-nha':'nha-o-dat-dai-02','ho-chieu-quoc-tich':'giay-to-tuy-than-08',
  'uy-quyen-nhan-thua-ke':'thua-ke-12','chuyen-tien-tu-duc':'tai-chinh-ngan-hang-bao-hiem-04',
  'thu-nhap-hai-nuoc':'thue-09','dau-tu-thanh-lap-cong-ty':'dau-tu-kinh-doanh-thuong-mai-04',
  'dang-ky-ket-hon':'hon-nhan-gia-dinh-01','hop-dong-lao-dong-viet-nam':'lao-dong-viec-lam-bhxh-02',
  'nhap-canh-viet-nam':'xuat-nhap-canh-cu-tru-01','bao-ve-thuong-hieu':'so-huu-tri-tue-02',
  'tim-hieu-quyen-to-tung':'hinh-su-12','khi-nao-khieu-nai':'to-tung-hanh-chinh-02',
  'cam-nang-uy-quyen':'hop-dong-giao-dich-dan-su-08','cam-nang-tai-san':'nha-o-dat-dai-14'
 };
 const groups=S.groups.map((g,i)=>({...g,index:i+1,count:g.titles.length}));
 const topics=groups.flatMap(g=>g.titles.map((title,i)=>Object.freeze({id:g.id+'-'+String(i+1).padStart(2,'0'),title,topic:g.id,groupId:g.id,index:i+1,type:'topic',catalog:true,country:S.jurisdiction,status:'topic_only',answer:null,source:{sheet:g.sheet,cell:'C'+(g.firstRow+i),code:'1.'+(i+1)+'.'}})));
 if(groups.length!==16||topics.length!==S.expectedTotal||groups.some((g,i)=>g.count!==S.expectedCounts[i]))throw new Error('Source catalogue count mismatch');
 const groupMap=new Map(groups.map(g=>[g.id,g])),topicMap=new Map(topics.map(t=>[t.id,t]));
 const getGroup=id=>groupMap.get(groupAliases[id]||id);
 const getTopic=id=>topicMap.get(articleAliases[id]||id);
 const contextURL=t=>url('/hoi-dap-ai',{'chu-de':t.id});
 const topicURL=t=>url('/chu-de/'+t.groupId+'/'+String(t.index).padStart(2,'0'));
 const tokens=q=>norm(q).split(/[^a-z0-9]+/).filter(Boolean);
 const aliases=s=>s.replace(/\bbhxh\b/g,'bao hiem xa hoi').replace(/\bbhyt\b/g,'bao hiem y te').replace(/\bbhtn\b/g,'bao hiem that nghiep');
 const titleWords=new Map(topics.map(t=>[t.id,tokens(t.title)]));
 function search(query='',group='',order='source'){
  const qs=tokens(aliases(norm(query))),g=getGroup(group),pool=group&&!g?[]:topics.filter(t=>!g||t.groupId===g.id);
  const result=pool.map(t=>{const w=titleWords.get(t.id),extra=tokens(getGroup(t.groupId).title);const hits=qs.every(q=>w.concat(extra).some(x=>x===q||(q.length>=3&&x.startsWith(q))));const score=qs.reduce((n,q)=>n+(w.includes(q)?4:extra.includes(q)?1:0),0)+(qs.length&&norm(t.title).includes(qs.join(' '))?12:0);return{t,hits,score};}).filter(x=>x.hits);
  if(order==='a-z')result.sort((a,b)=>a.t.title.localeCompare(b.t.title,'vi'));
  else if(qs.length)result.sort((a,b)=>b.score-a.score);
  return result.map(x=>x.t);
 }
 function related(query,limit=3){
  // Match titles only, not legal rules. Do not treat German-only advice as PLVN coverage.
  const q=aliases(norm(query));
  if(/(?:giay phep cu tru|hop dong lao dong|thue|tro cap) tai duc/.test(q)&&!q.includes('viet nam'))return[];
  const ignore=new Set(['toi','minh','anh','em','ban','can','muon','hoi','ve','xin','cho','biet','co','duoc','khong','the','nao','lam','gi','nhu','khi','dang','o','tai','tu','den','va','voi','de','mot','cua','trong','la','se','thi','hay','duc','viet','nam']);
  const qs=[...new Set(tokens(q).filter(x=>!ignore.has(x)))];if(!qs.length)return[];
  const ranked=topics.map(t=>{const w=titleWords.get(t.id),hits=qs.filter(x=>w.includes(x));return{t,score:hits.length/Math.sqrt(w.length)+hits.length/qs.length,hits:hits.length};}).filter(x=>x.hits>=Math.min(2,qs.length)).sort((a,b)=>b.score-a.score);
  return ranked.slice(0,limit).map(x=>x.t);
 }
 const promptTopics=[['Hôn nhân','hon-nhan-gia-dinh-01'],['Quốc tịch','quoc-tich-04'],['Giấy tờ','giay-to-tuy-than-05'],['Thừa kế','thua-ke-13'],['Nhà đất','nha-o-dat-dai-14'],['Ủy quyền','hop-dong-giao-dich-dan-su-08']];
 const featuredGroups=[0,1,2,3,4,9,11,12].map(i=>groups[i]);
 const C=window.LVD_CATALOG=Object.freeze({groups,topics,getGroup,getTopic,search,related,contextURL,topicURL,groupAliases,articleAliases,promptTopics,featuredGroups,source:S});
 // Every form and shared topic picker now uses the same 16-group taxonomy.
 window.LVD_CONTENT=Object.freeze({...window.LVD_CONTENT,topics:groups.map(g=>[g.id,g.title,g.icon])});
 const heading=(title,description='')=>`<div class="page-heading"><div class="s-eyebrow">PHÁP LUẬT VIỆT NAM</div><h1>${esc(title)}</h1>${description?`<p>${esc(description)}</p>`:''}</div>`;
 const crumb=(label,group)=>`<div class="breadcrumb"><a href="#/">Trang chủ</a><span>/</span><a href="#/tra-cuu">Thư viện</a>${group?`<span>/</span><a href="${url('/chu-de/'+group.id)}">${esc(group.title)}</a>`:''}${label?`<span>/</span><span>${esc(label)}</span>`:''}</div>`;
 const searchForm=q=>`<form class="search-form catalog-search" data-catalog-search role="search">${searchIcon}<label class="sr-only" for="search-page">Tìm chủ đề pháp luật Việt Nam</label><input id="search-page" name="q" type="search" value="${esc(q)}" maxlength="180" placeholder="Tìm chủ đề, giấy tờ hoặc thủ tục…" autocomplete="off"><button type="submit" class="button" aria-label="Tìm kiếm"><span class="search-label">Tìm kiếm</span>${arrow}</button></form>`;
 const groupCard=g=>`<a class="catalog-group" href="${url('/chu-de/'+g.id)}" data-group="${g.id}"><span class="catalog-group-number">${String(g.index).padStart(2,'0')}</span><span class="catalog-group-body"><strong>${esc(g.title)}</strong><small>${g.count} chủ đề</small></span><span class="catalog-group-icon">${window.LVD_ICON?.(g.icon||"scales")||""}</span></a>`;
 const topicRow=t=>`<article class="catalog-topic result-item" data-catalog-topic="${t.id}"><div><div class="meta"><span class="catalog-topic-glyph">${window.LVD_ICON?.(getGroup(t.groupId).icon||"book")||""}</span><a href="${url('/chu-de/'+t.groupId)}">${esc(getGroup(t.groupId).title)}</a></div><h2><a href="${contextURL(t)}">${esc(t.title)}</a></h2></div><a class="catalog-ask" href="${contextURL(t)}" aria-label="Hỏi về: ${esc(t.title)}"><span>Đặt câu hỏi</span>${arrow}</a></article>`;
 const empty=()=>`<div class="empty-state"><h2>Không tìm thấy chủ đề</h2><p>Thử từ khóa ngắn hơn hoặc chọn lĩnh vực khác.</p><div class="button-row center"><a class="button secondary" href="#/tra-cuu">Xem các lĩnh vực</a><a class="button" href="#/hoi-dap-ai">Đặt câu hỏi ${arrow}</a></div></div>`;
 const footerCTA=()=>`<section class="catalog-help"><div><h2>Bạn cần hỏi về trường hợp của mình?</h2><p>Nêu vấn đề và các thông tin cần làm rõ.</p></div><a class="button" href="#/hoi-dap-ai">Đặt câu hỏi ${arrow}</a></section>`;
 function invalid(){return `<div class="container page catalog-page">${crumb('Không tìm thấy')}${heading('Không tìm thấy chủ đề','Vui lòng chọn một lĩnh vực hoặc tìm lại bằng từ khóa.')}<a class="button" href="#/tra-cuu">Về thư viện ${arrow}</a></div>`;}
 function topicView(t){if(!t)return invalid();const g=getGroup(t.groupId);return `<div class="container page catalog-page">${crumb('Chủ đề',g)}${heading(t.title)}<div class="catalog-topic-intro"><span class="catalog-topic-emblem">${window.LVD_ICON?.(g.icon||"scales")||""}</span><p>Bạn cần làm rõ điều gì về chủ đề này?</p><a class="button" href="${contextURL(t)}">Đặt câu hỏi ${arrow}</a></div><section class="catalog-related"><div class="section-heading"><h2>Trong cùng lĩnh vực</h2><a class="text-link" href="${url('/chu-de/'+g.id)}">Xem ${g.count} chủ đề ${arrow}</a></div>${topics.filter(x=>x.groupId===g.id&&x.id!==t.id).slice(0,5).map(topicRow).join('')}</section></div>`;}
 function view(r){
  const path=r.path,q=r.q,parts=path.split('/').filter(Boolean);
  if(['hoi-dap','bai-viet'].includes(parts[0])&&parts[1]&&articleAliases[parts[1]])return topicView(getTopic(parts[1]));
  if(parts[0]==='chu-de'&&parts[2])return topicView(getTopic((groupAliases[parts[1]]||parts[1])+'-'+parts[2].padStart(2,'0')));
  const requestedGroup=parts[0]==='chu-de'&&parts[1]?parts[1]:(q.get('linh-vuc')||'');
  const g=requestedGroup?getGroup(requestedGroup):null;if(requestedGroup&&!g)return invalid();
  let keyword=q.get('q')||'',situation=q.get('tinh-huong')||'';
  if(situation&&!keyword){keyword=({'uy-quyen':'ủy quyền','thua-ke':'thừa kế','nha-dat':'nhà đất','giay-to':'giấy tờ','dau-tu':'đầu tư','tien-thue':'chuyển tiền'}[situation]||situation);}
  const order=q.get('sap-xep')||'source',allMode=q.get('xem')==='tat-ca'||path==='/hoi-dap'||path==='/tim-kiem'||!!keyword||!!g;
  const result=q.get('quoc-gia')&&q.get('quoc-gia')!=='Việt Nam'?[]:search(keyword,g?.id||'',order);
  const pageSize=10,total=result.length,pages=Math.max(1,Math.ceil(total/pageSize)),page=Math.min(pages,Math.max(1,Number.parseInt(q.get('trang'),10)||1));
  const params={q:keyword,'linh-vuc':g?.id||'',xem:'tat-ca','sap-xep':order};
  const title=g?g.title:path==='/tim-kiem'&&keyword?'Kết quả tìm kiếm':allMode?'Chủ đề pháp luật':'Thư viện pháp luật';
  const subtitle=g?`${g.count} chủ đề · Chọn vấn đề bạn cần hỏi.`:'Tìm hiểu pháp luật Việt Nam theo lĩnh vực hoặc vấn đề cần giải quyết.';
  const tabs=`<nav class="tabs catalog-tabs" aria-label="Tra cứu nội dung"><a href="#/tra-cuu" class="${allMode?'':'active'}" ${allMode?'':'aria-current="page"'}>16 lĩnh vực</a><a href="${url('/tra-cuu',{xem:'tat-ca',q:keyword})}" class="${allMode?'active':''}" ${allMode?'aria-current="page"':''}>303 chủ đề</a><a href="${url('/tin-tuc',{q:keyword})}">Tin & cẩm nang ${arrow}</a></nav>`;
  let body;
  if(!allMode){body=`<div class="catalog-groups">${groups.map(groupCard).join('')}</div>`;}
  else{
   const opts=groups.map(x=>`<option value="${x.id}" ${g?.id===x.id?'selected':''}>${esc(x.title)} (${x.count})</option>`).join('');
   const chips=keyword||g||q.get('quoc-gia')?`<div class="active-filters">${keyword?`<a class="pill active" href="${url('/tra-cuu',{...params,q:''})}" aria-label="Bỏ từ khóa ${esc(keyword)}">${esc(keyword)} ×</a>`:''}${g?`<a class="pill active" href="${url('/tra-cuu',{...params,'linh-vuc':''})}" aria-label="Bỏ lĩnh vực ${esc(g.title)}">${esc(g.title)} ×</a>`:''}${q.get('quoc-gia')?`<a class="pill active" href="${url('/tra-cuu',params)}">${esc(q.get('quoc-gia'))} ×</a>`:''}</div>`:'';
   const pager=pages>1?`<nav class="pagination catalog-pagination" aria-label="Phân trang">${page>1?`<a href="${url('/tra-cuu',{...params,trang:page-1})}" rel="prev">← Trước</a>`:''}<span>Trang ${page} / ${pages}</span>${page<pages?`<a href="${url('/tra-cuu',{...params,trang:page+1})}" rel="next">Sau →</a>`:''}</nav>`:'';
   body=`<form id="catalog-filter-form" class="catalog-toolbar"><input type="hidden" name="q" value="${esc(keyword)}"><input type="hidden" name="xem" value="tat-ca"><div><label for="catalog-group-filter">Lĩnh vực</label><select id="catalog-group-filter" name="linh-vuc"><option value="">Tất cả lĩnh vực</option>${opts}</select></div><div><label for="sort-results">Sắp xếp</label><select id="sort-results" name="sap-xep"><option value="source" ${order==='source'?'selected':''}>Theo danh mục</option><option value="a-z" ${order==='a-z'?'selected':''}>Theo tiêu đề A–Z</option></select></div><button class="button secondary" type="submit">Áp dụng</button></form>${chips}<div class="catalog-results-caption" role="status"><span><strong>${total}</strong> chủ đề${total?` · ${1+(page-1)*pageSize}–${Math.min(page*pageSize,total)}`:''}</span><span>Chọn chủ đề để đặt câu hỏi</span></div><div class="catalog-topic-list">${total?result.slice((page-1)*pageSize,page*pageSize).map(topicRow).join(''):empty()}</div>${pager}`;
  }
  return `<div class="container page catalog-page">${crumb(g?g.title:'')}${heading(title,subtitle)}${searchForm(keyword)}${tabs}${body}${footerCTA()}</div>`;
 }
 const accepts=r=>['/tra-cuu','/chu-de','/hoi-dap','/tim-kiem'].includes(r.path)||r.path.startsWith('/chu-de/')||(/^\/(hoi-dap|bai-viet)\//.test(r.path)&&!!articleAliases[r.path.split('/')[2]]);
 window.LVD_CATALOG_UI=Object.freeze({accepts,view});
 document.addEventListener('submit',e=>{
  const f=e.target;if(!(f instanceof HTMLFormElement))return;
  if(f.matches('[data-catalog-search]')){e.preventDefault();const keyword=f.elements.q.value.trim();location.hash=url(keyword?'/tim-kiem':'/tra-cuu',keyword?{q:keyword}:{});}
  if(f.id==='catalog-filter-form'){e.preventDefault();location.hash=url('/tra-cuu',Object.fromEntries(new FormData(f)));}
 });
 document.addEventListener('change',e=>{if(e.target.closest('#catalog-filter-form'))e.target.form.requestSubmit();});
})();
