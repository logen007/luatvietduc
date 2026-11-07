// Response policy only. Authentication and resource authorization stay in services.
export function securityHeaders(){
 const privateSources=['/admin/:path*','/api/:path*','/service/:path*','/auth/:path*','/tai-khoan','/hoi-dap','/tro-chuyen'];
 return [
  {source:'/:path*',headers:[
   {key:'X-Content-Type-Options',value:'nosniff'},
   {key:'X-Frame-Options',value:'SAMEORIGIN'},
   {key:'Content-Security-Policy',value:"frame-ancestors 'self'"},
   {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  ]},
  // Packaged public visuals/fonts can be reused across documents as well as
  // client transitions. Never apply this to uploads, transcripts or API files.
  ...['/fonts/:path*','/assets/photos/:path*','/assets/flags/:path*','/assets/team/:path*','/assets/logos/:path*','/assets/optimized-photos/:path*','/media/:path*'].map(source=>({source,headers:[
   {key:'Cache-Control',value:'public, max-age=3600'},
  ]})),
  ...privateSources.map(source=>({source,headers:[
   {key:'Cache-Control',value:'private, no-store'},
   {key:'X-Robots-Tag',value:'noindex, nofollow'},
   {key:'Referrer-Policy',value:'no-referrer'},
  ]})),
 ];
}
