import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
export async function testArticleCover(payload:Payload,owner:User){
 const url=new URL(process.env.DATABASE_URL||'');assert.ok(['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname==='/lvd_test');
 const media=(await pool.query("INSERT INTO media(alt,filename,mime_type,visibility,filesize,width,height) VALUES('Synthetic cover',$1,'image/webp','public',100,1200,800) RETURNING id",['synthetic-cover-'+randomUUID()+'.webp'])).rows[0];let articleId:number|undefined;
 try{
  const article=await payload.create({collection:'articles',draft:true,user:owner,overrideAccess:false,data:{title:'Synthetic featured image',body:'Synthetic body for image selection.',featuredImage:media.id,_status:'draft'}});articleId=article.id;
  const saved=await payload.findByID({collection:'articles',id:article.id,draft:true,depth:0,user:owner,overrideAccess:false});assert.equal(saved.featuredImage,media.id);
  assert.ok((await pool.query('SELECT version_featured_image_id FROM _articles_v WHERE parent_id=$1',[article.id])).rows.some(row=>row.version_featured_image_id===media.id),'Draft versions retain their cover selection');
  const cleared=await payload.update({collection:'articles',id:article.id,draft:true,user:owner,overrideAccess:false,data:{featuredImage:null}});assert.equal(cleared.featuredImage,null);
  console.log('Article cover checks passed: optional upload relation, draft persistence, version history and removal; no object storage requests.');
 }finally{if(articleId)await pool.query('DELETE FROM articles WHERE id=$1',[articleId]);await pool.query('DELETE FROM media WHERE id=$1',[media.id]);}
}
