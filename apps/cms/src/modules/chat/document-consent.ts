export const DOCUMENT_CONSENT_VERSION='gemini-documents-v1';
export const DOCUMENT_TOTAL_BYTES=12*1024*1024;
export const documentMimeTypes=['application/pdf','image/jpeg','image/png','image/webp'] as const;
export const readableDocument=(mime:string)=>documentMimeTypes.some(value=>value===mime);
export function validDocumentBatch(files:{mimeType:string;size:number}[]){return files.length>0&&files.length<=4&&files.every(file=>readableDocument(file.mimeType)&&Number.isSafeInteger(file.size)&&file.size>0&&file.size<=10*1024*1024)&&files.reduce((total,file)=>total+file.size,0)<=DOCUMENT_TOTAL_BYTES;}
