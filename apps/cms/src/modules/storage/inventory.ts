import {bundledNames} from './bundled';
import type {PoolClient} from 'pg';
const packagedNames=bundledNames.map(name=>"'"+name.replaceAll("'","''")+"'").join(',');
export async function hasStoredFiles(db:Pick<PoolClient,'query'>){
 const result=await db.query('SELECT EXISTS(SELECT 1 FROM media WHERE filename IS NOT NULL AND NOT(filename=ANY($1::text[])) UNION ALL SELECT 1 FROM lvd_chat_files) AS used',[bundledNames]);
 return Boolean(result.rows[0]?.used);
}

// Include owned derivatives and the retained edit source in the same backup
// inventory as originals. JSON access also works during compatible rollbacks.
export const mediaInventorySQL=`
WITH media_objects AS (
 SELECT to_jsonb(m) AS data FROM media m WHERE filename <> ALL(ARRAY[${packagedNames}]::text[])
), owned AS (
 SELECT data->>'filename' AS filename,data->>'prefix' AS prefix,
 COALESCE(data->>'_objectkey',data->>'_object_key') AS _object_key,data->>'mime_type' AS mime_type FROM media_objects
 UNION
 SELECT data->>(size||'_filename'),data->>'prefix',COALESCE(data->>'_objectkey',data->>'_object_key'),data->>(size||'_mime_type')
 FROM media_objects CROSS JOIN unnest(ARRAY['sizes_thumbnail','sizes_medium','sizes_large']) size
 UNION
 SELECT regexp_replace(data->'original_file'->>'key','^.*/',''),regexp_replace(data->'original_file'->>'key','/[^/]+$',''),NULL,data->'original_file'->>'mimeType' FROM media_objects
 UNION
 SELECT split_part(object_key,'/',3),regexp_replace(object_key,'/[^/]+$',''),NULL,mime_type FROM lvd_chat_files WHERE ready=true
)
SELECT filename,prefix,_object_key,mime_type FROM owned WHERE filename IS NOT NULL AND filename<>''`;
