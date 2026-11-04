// Response policy only. Authentication and resource authorization stay in services.
export function securityHeaders(){
 const privateSources=['/admin/:path*','/api/:path*','/service/:path*','/auth/:path*','/tai-khoan','/tro-chuyen'];
 return [
  {source:'/:path*',headers:[
   {key:'X-Content-Type-Options',value:'nosniff'},
   {key:'X-Frame-Options',value:'SAMEORIGIN'},
   {key:'Content-Security-Policy',value:"frame-ancestors 'self'"},
   {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  ]},
  ...privateSources.map(source=>({source,headers:[
   {key:'Cache-Control',value:'private, no-store'},
   {key:'Referrer-Policy',value:'no-referrer'},
  ]})),
 ];
}
