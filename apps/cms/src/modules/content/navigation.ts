export function articleParent(kind?:string|null,jurisdiction?:string|null){
 return kind==='news'
  ?{href:'/tin-tuc',label:'Tin tức & đời sống'}
  :{href:jurisdiction==='DE'?'/phap-luat/duc':'/thu-vien',label:'Thư viện'};
}
