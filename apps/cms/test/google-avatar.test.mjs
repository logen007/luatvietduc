import test from 'node:test';
import assert from 'node:assert/strict';
import {googlePictureURL,syncGoogleAvatar} from '../src/modules/identity/google-avatar.ts';
test('Google picture imports accept only bounded HTTPS Google image hosts without credentials or alternate ports',()=>{
 assert.equal(googlePictureURL('https://lh3.googleusercontent.com/a/synthetic=s96-c'),'https://lh3.googleusercontent.com/a/synthetic=s96-c');
 for(const url of [null,'http://lh3.googleusercontent.com/a','https://127.0.0.1/a','https://lh3.googleusercontent.com.evil.invalid/a','https://lh3.googleusercontent.com:8443/a','https://secret@lh3.googleusercontent.com/a','file:///tmp/image','https://lh3.googleusercontent.com/'+ 'a'.repeat(2048)])assert.equal(googlePictureURL(url),null);
});
test('invalid picture URLs and existing or unverified profiles cannot trigger an avatar download',async()=>{
 let calls=0;const request=async()=>{calls++;throw Error('No network permitted');};
 assert.equal(await syncGoogleAvatar({},1,'https://example.invalid/image',request),false);
 for(const user of [{avatar:3,_verified:true},{avatar:null,_verified:false}])assert.equal(await syncGoogleAvatar({findByID:async()=>user},1,'https://lh3.googleusercontent.com/synthetic',request),false);
 assert.equal(calls,0);
});
