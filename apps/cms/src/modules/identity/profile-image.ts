import sharp from 'sharp';
import {HttpError} from '../http/errors';
export const PROFILE_IMAGE_LIMIT=5*1024*1024;
export async function profileImage(data:Buffer){
 if(!data.length||data.length>PROFILE_IMAGE_LIMIT)throw new HttpError(413,'Chọn ảnh nhỏ hơn 5 MB.');
 try{
  const image=sharp(data,{limitInputPixels:40_000_000,failOn:'error'}),meta=await image.metadata();
  if(!['jpeg','png','webp'].includes(meta.format||'')||(meta.pages??1)!==1)throw new Error('Unsupported image');
  // Decode actual pixels, strip metadata and normalize orientation. SVG and
  // animated images are never served through this public avatar surface.
  return await image.autoOrient().resize(384,384,{fit:'cover',position:'attention',withoutEnlargement:true}).webp({quality:80}).toBuffer();
 }catch{throw new HttpError(400,'Chọn ảnh JPG, PNG hoặc WebP hợp lệ.');}
}
