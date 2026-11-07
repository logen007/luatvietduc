// Video banners can be larger; images and documents retain the existing limit.
export const MAX_MEDIA_VIDEO_BYTES=50*1024*1024;
export const MAX_MEDIA_FILE_BYTES=10*1024*1024;
export const isBannerVideo=(mimeType:string)=>['video/mp4','video/webm'].includes(mimeType);
export const mediaUploadLimit=(mimeType:string)=>isBannerVideo(mimeType)?MAX_MEDIA_VIDEO_BYTES:MAX_MEDIA_FILE_BYTES;
