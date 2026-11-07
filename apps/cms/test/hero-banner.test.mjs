import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultHeroBanner,heroBanner,latestHeroBanner,publicMediaURL} from '../src/modules/settings/hero-banner.ts';
import {readPublicSettings} from '../src/modules/settings/public-contract.ts';
import {mediaUploadLimit} from '../src/modules/storage/upload-limits.ts';
const media=(mimeType,url='/api/media/file/banner.mp4')=>({visibility:'public',mimeType,url,updatedAt:'2026-11-07T12:00:00Z'});
test('banner projects only public playable media and preserves current defaults',()=>{
 assert.deepEqual(heroBanner({}),defaultHeroBanner);
 const video=media('video/mp4'),poster=media('image/webp','https://cdn.example.invalid/poster.webp?size=large');
 const banner=heroBanner({heroVideo:video,heroPoster:poster,updatedAt:video.updatedAt});
 assert.equal(banner.video,video.url+'?v=1794052800000');assert.equal(banner.mobileVideo,banner.video);assert.equal(banner.poster,poster.url+'&v=1794052800000');
 assert.equal(heroBanner({heroVideo:video,heroMobileVideo:media('video/webm','/phone.webm')}).mobileVideo,'/phone.webm?v=1794052800000');
 for(const bad of [42,{...video,visibility:'private'},media('image/jpeg'),media('video/mp4','javascript:alert(1)'),media('video/mp4','//evil.invalid/movie.mp4'),media('video/mp4','https://user:pass@example.invalid/v.mp4'),media('video/mp4','/v.mp4#hash')])assert.equal(publicMediaURL(bad,'video'),null);
 assert.equal(heroBanner({heroVideo:{...video,visibility:'private'}}).video,defaultHeroBanner.video);
 assert.equal(publicMediaURL(media('video/mp4'),'image'),null);
});
test('browser accepts safe runtime banner revisions, retaining newer server settings over old route cache',()=>{
 const fresh={...defaultHeroBanner,video:'/new.mp4',mobileVideo:'/new.mp4',revision:20};
 assert.equal(readPublicSettings({heroBanner:fresh}).heroBanner,fresh);
 for(const patch of [{video:'data:video/mp4;base64,AA'},{poster:'//evil.invalid/a.webp'},{revision:NaN},{revision:-1}])assert.throws(()=>readPublicSettings({heroBanner:{...fresh,...patch}}));
 assert.equal(latestHeroBanner(fresh,{...defaultHeroBanner,revision:10}),fresh);
 assert.equal(latestHeroBanner(defaultHeroBanner,fresh),fresh);
 assert.equal(mediaUploadLimit('video/mp4'),50*1024*1024);assert.equal(mediaUploadLimit('image/jpeg'),10*1024*1024);assert.equal(mediaUploadLimit('application/pdf'),10*1024*1024);
});
