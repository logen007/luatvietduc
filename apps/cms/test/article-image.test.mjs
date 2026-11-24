import test from 'node:test';
import assert from 'node:assert/strict';
import {featuredArticleImage} from '../src/modules/public-site/article-image.ts';
test('cover image projection accepts only public, safely addressable image records',()=>{
 const image={visibility:'public',mimeType:'image/webp',url:'/api/media/file/cover.webp',alt:'Cover',width:1200,height:800,updatedAt:'2026-11-09T00:00:00Z'};
 assert.deepEqual(featuredArticleImage(image),{url:'/api/media/file/cover.webp?v='+Date.parse(image.updatedAt),alt:'Cover',width:1200,height:800});
 for(const value of [null,42,{}, {...image,visibility:'private'},{...image,mimeType:'application/pdf'},{...image,url:'javascript:alert(1)'},{...image,url:'//untrusted.example/a.jpg'},{...image,url:'/service/chat-files/private'}])assert.equal(featuredArticleImage(value),undefined);
});
