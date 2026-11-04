import type {Payload} from 'payload';
import type {User,SiteSetting} from '../../payload-types';
import {HttpError} from '../http/errors';
import {knowledgeArticles,writeKnowledgeArticle} from './articles';
import {retryIndex,knowledgeGaps} from '../rag/admin';
import {testSource} from './test-source';
type Context={payload:Payload;user:User|null;path:string;method:string;url:URL;data:Record<string,unknown>;settings:()=>Promise<SiteSetting>};
export async function knowledgeRequest({payload,user,path,method,url,data,settings}:Context){
 let result:unknown;
    if(path === "knowledge-gaps" && method === "GET") {
      result={conversations:await knowledgeGaps(user)};
    } else if(path === "knowledge-reindex" && method === "POST") {
      if(typeof data.id!=='number'||!Number.isSafeInteger(data.id)||data.id<1)throw new HttpError(400,'Bài viết không hợp lệ.');
      const article=await knowledgeArticles(payload,user,String(data.id));
      if(!('id' in article))throw new Error('Unexpected knowledge result');
      result=await retryIndex(user,data.id,Number(article.id));
    } else if(path === "knowledge-articles" && method === "GET") {
      result=await knowledgeArticles(payload,user,url.searchParams.get("id"),{query:url.searchParams.get("q")||"",page:Number(url.searchParams.get("page")||1)});
    } else if(path === "knowledge-articles" && method === "POST") {
      result=await writeKnowledgeArticle(payload,user,data);
    } else if (path === "knowledge-sources" && method === "GET") {
      if (!user || !["owner", "reviewer", "knowledge", "support"].includes(user.role))
        throw new HttpError(403, "Chỉ dành cho nhân sự kiến thức.");
      const sources = await payload.find({
        collection: "knowledge",
        user,
        overrideAccess: false,
        where: {
          and: [
            { approved: { equals: true } },
            { _status: { equals: "published" } },
          ],
        },
        limit: 100,
      });
      result = sources.docs.map((s) => ({
        id: s.id,
        title: s.title,
        jurisdiction: s.jurisdiction,
        reviewDueAt: s.reviewDueAt,
      }));
    } else if (path === "knowledge-test" && method === "POST")
      result = await testSource(payload, user, Number(data.id), await settings());
    else throw new HttpError(404,'Không tìm thấy chức năng.');
 return result;
}
