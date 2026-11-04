export function articleParent(kind?:string|null){
 return kind==='news'
  ?{href:'/tin-tuc',label:'Tin tức & đời sống'}
  :{href:'/thu-vien',label:'Thư viện'};
}
